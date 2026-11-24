import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const form = document.getElementById("gallery-submission-form");
const status = document.getElementById("gallery-form-status");
const button = document.getElementById("gallery-submit-button");

function normalizePakistanMobile(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");

  if (/^03\d{9}$/.test(compact)) return "0092" + compact.slice(1);
  if (/^\+923\d{9}$/.test(compact)) return "0092" + compact.slice(1);
  if (/^00923\d{9}$/.test(compact)) return compact;

  return null;
}

function setStatus(message, color = "#b42318") {
  status.textContent = message;
  status.style.color = color;
}

if (form && status && button) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";

    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const website = String(data.get("website") || "");
    if (website.trim()) return;

    const turnstileToken = String(data.get("cf-turnstile-response") || "");
    if (!turnstileToken) {
      setStatus("Please complete the security check.");
      return;
    }

    const mobileInput = String(data.get("mobile_number") || "").trim();
    const mobileNumber = normalizePakistanMobile(mobileInput);
    if (!mobileNumber) {
      setStatus("Enter a valid Pakistani mobile number: 03XXXXXXXXX, +923XXXXXXXXX or 00923XXXXXXXXX.");
      return;
    }

    const file = data.get("file");
    if (!(file instanceof File) || file.size < 1) {
      setStatus("Please select a photo.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus("Photo must be smaller than 10 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setStatus("Only JPG, JPEG, PNG and WebP photos are allowed.");
      return;
    }

    data.set("mobile_number", mobileNumber);

    button.disabled = true;
    button.textContent = "Submitting…";
    setStatus("Uploading your photo securely for admin review…", "#475569");

    try {
      const { data: result, error } = await supabase.functions.invoke(
        "submit-gallery",
        { body: data }
      );

      if (error) {
        let detail = error.message || "Photo submission failed.";
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
        throw new Error(result?.error || "Your photo could not be submitted.");
      }

      form.reset();
      setStatus("Thank you. Your photo has been submitted privately and is awaiting admin approval.", "#18794e");
      if (window.turnstile) window.turnstile.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Photo submission failed. Please try again.");
      if (window.turnstile) window.turnstile.reset();
    } finally {
      button.disabled = false;
      button.textContent = "Submit Photo for Review";
    }
  });
}
