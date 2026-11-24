// Supabase Edge Function: review-submission
// Deploy with: supabase functions deploy review-submission
// Required secret: SUPABASE_SERVICE_ROLE_KEY (set in Supabase, never in browser/GitHub).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sign-in required." }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("BHAGWAL_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Server configuration is incomplete." }, 500);

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Invalid admin session." }, 401);

    const { data: profile, error: profileError } = await admin
      .from("admin_profiles").select("role").eq("user_id", authData.user.id)
      .eq("role", "admin").maybeSingle();
    if (profileError || !profile) return json({ error: "Admin access required." }, 403);

    const body = await req.json();
    const kind = String(body.kind || "");
    const id = Number(body.id);
    const action = String(body.action || "");
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";

    if (!["notice", "business", "photo"].includes(kind) || !Number.isSafeInteger(id) || id < 1)
      return json({ error: "Invalid submission." }, 400);
    if (!["approve", "reject"].includes(action)) return json({ error: "Invalid action." }, 400);
    if (action === "reject" && !reason) return json({ error: "Please provide a rejection reason." }, 400);

    const table = kind === "notice" ? "notice_submissions" :
      kind === "business" ? "business_submissions" : "gallery_submissions";
    const { data: submission, error: readError } = await admin
      .from(table).select("*").eq("id", id).eq("status", "pending").maybeSingle();
    if (readError) return json({ error: readError.message }, 400);
    if (!submission) return json({ error: "Submission not found or already reviewed." }, 404);

    const reviewed = {
      status: action === "approve" ? "approved" : "rejected",
      reviewed_by: authData.user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: action === "reject" ? reason : null,
    };

    if (action === "reject") {
      const patch: Record<string, unknown> = { ...reviewed };
      if (kind === "photo") patch.moderation_status = "rejected";
      const { error } = await admin.from(table).update(patch).eq("id", id).eq("status", "pending");
      if (error) return json({ error: error.message }, 400);
      if (kind === "photo" && submission.storage_path) {
        await admin.storage.from("gallery-submissions").remove([submission.storage_path]);
      }
      return json({ ok: true, message: "Submission rejected." });
    }

    if (kind === "notice") {
      const { data: published, error } = await admin.from("notices").insert({
        title: submission.title,
        description: submission.description,
        category: submission.category || "Notice",
        author_name: null,
        contact_phone: null,
        status: "approved",
      }).select("id").single();
      if (error) return json({ error: error.message }, 400);
      const { error: updateError } = await admin.from(table)
        .update({ ...reviewed, published_notice_id: published.id })
        .eq("id", id).eq("status", "pending");
      if (updateError) return json({ error: updateError.message, publishedId: published.id }, 500);
    } else if (kind === "business") {
      const { data: published, error } = await admin.from("businesses").insert({
        name_urdu: submission.name_urdu,
        name_eng: submission.name_eng,
        category: submission.category,
        tags: submission.tags || [],
        phone: submission.phone || null,
        location: submission.location || null,
        is_active: true,
      }).select("id").single();
      if (error) return json({ error: error.message }, 400);
      const { error: updateError } = await admin.from(table)
        .update({ ...reviewed, published_business_id: published.id })
        .eq("id", id).eq("status", "pending");
      if (updateError) return json({ error: updateError.message, publishedId: published.id }, 500);
    } else {
      if (!submission.storage_path) return json({ error: "Photo storage path is missing." }, 400);
      const source = admin.storage.from("gallery-submissions");
      const destination = admin.storage.from("gallery");
      const { data: file, error: downloadError } = await source.download(submission.storage_path);
      if (downloadError || !file) return json({ error: "Could not access the submitted photo." }, 400);

      const extension = submission.mime_type === "image/png" ? "png" :
        submission.mime_type === "image/webp" ? "webp" : "jpg";
      const publicPath = `community/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await destination.upload(publicPath, file, {
        contentType: submission.mime_type || "image/jpeg", upsert: false,
      });
      if (uploadError) return json({ error: uploadError.message }, 400);

      const { data: publicUrl } = destination.getPublicUrl(publicPath);
      const { data: published, error } = await admin.from("gallery_photos").insert({
        title: submission.title,
        description: submission.description || null,
        image_url: publicUrl.publicUrl,
        is_published: true,
      }).select("id").single();
      if (error) {
        await destination.remove([publicPath]);
        return json({ error: error.message }, 400);
      }
      const { error: updateError } = await admin.from(table)
        .update({ ...reviewed, moderation_status: "approved", published_photo_id: published.id })
        .eq("id", id).eq("status", "pending");
      if (updateError) return json({ error: updateError.message, publishedId: published.id }, 500);
      await source.remove([submission.storage_path]);
    }

    return json({ ok: true, message: "Submission approved and published." });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected server error." }, 500);
  }
});
