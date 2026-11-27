import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const form = document.getElementById("business-submission-form");
const status = document.getElementById("business-form-status");
const button = document.getElementById("business-submit-button");

function normalizePakistanMobile(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");

  if (/^03\d{9}$/.test(compact)) return "0092" + compact.slice(1);
  if (/^\+923\d{9}$/.test(compact)) return "0092" + compact.slice(1);
  if (/^00923\d{9}$/.test(compact)) return compact;

  return null;
}

if (form && status && button) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";

    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const turnstileToken = String(data.get("cf-turnstile-response") || "");

    if (!turnstileToken) {
      status.textContent = "Please complete the security check.";
      status.style.color = "#b42318";
      return;
    }

    const website = String(data.get("website") || "");
    if (website.trim()) return;

    const mobileInput = String(data.get("mobile_number") || "").trim();
    const mobileNumber = normalizePakistanMobile(mobileInput);

    if (!mobileNumber) {
      status.textContent = "Enter a valid Pakistani mobile number: 03XXXXXXXXX, +923XXXXXXXXX or 00923XXXXXXXXX.";
      status.style.color = "#b42318";
      return;
    }

    const payload = {
      submitter_name: String(data.get("submitter_name") || "").trim(),
      mobile_number: mobileNumber,
      name_eng: String(data.get("name_eng") || "").trim(),
      name_urdu: String(data.get("name_urdu") || "").trim(),
      category: String(data.get("category") || "").trim(),
      description: String(data.get("description") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      location: String(data.get("location") || "").trim(),
      tags: String(data.get("tags") || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20),
      website,
      turnstileToken,
    };

    button.disabled = true;
    button.textContent = "Submitting…";
    status.textContent = "Sending your business listing for admin review…";
    status.style.color = "#475569";

    try {
      const { data: result, error } = await supabase.functions.invoke(
        "submit-business",
        { body: payload }
      );

      if (error) {
        let detail = error.message || "Submission failed.";
        try {
          const response = error.context;
          if (response && typeof response.json === "function") {
            const body = await response.json();
            if (body?.error) detail = body.error;
          }
        } catch {
          // Keep the original function error message.
        }
        throw new Error(detail);
      }

      if (!result?.success) {
        throw new Error(result?.error || "Your business listing could not be submitted.");
      }

      form.reset();
      status.textContent = "Thank you. Your business listing has been submitted privately and is awaiting admin approval.";
      status.style.color = "#18794e";

      if (window.turnstile) window.turnstile.reset();
    } catch (error) {
      status.textContent = error instanceof Error
        ? error.message
        : "Submission failed. Please try again.";
      status.style.color = "#b42318";

      if (window.turnstile) window.turnstile.reset();
    } finally {
      button.disabled = false;
      button.textContent = "Submit for Admin Review";
    }
  });
}
