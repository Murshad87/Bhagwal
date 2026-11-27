import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const form = document.getElementById("notice-submission-form");
const status = document.getElementById("notice-form-status");
const button = document.getElementById("notice-submit-button");

function normalizePakistanMobile(value) {
  const compact = String(value || "").replace(/[\s()-]/g, "");

  if (/^03\d{9}$/.test(compact)) {
    return "0092" + compact.slice(1);
  }

  if (/^\+923\d{9}$/.test(compact)) {
    return "0092" + compact.slice(1);
  }

  if (/^00923\d{9}$/.test(compact)) {
    return compact;
  }

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
    const normalizedMobile = normalizePakistanMobile(mobileInput);

    if (!normalizedMobile) {
      status.textContent = "Enter a valid Pakistani mobile number: 03XXXXXXXXX or +923XXXXXXXXX.";
      status.style.color = "#b42318";
      return;
    }

    const payload = {
      submitter_name: String(data.get("submitter_name") || "").trim(),
      mobile_number: normalizedMobile,
      category: String(data.get("category") || "").trim(),
      title: String(data.get("title") || "").trim(),
      description: String(data.get("description") || "").trim(),
      website,
      turnstileToken,
    };

    button.disabled = true;
    button.textContent = "Submitting…";
    status.textContent = "Sending your notice for admin review…";
    status.style.color = "#475569";

    try {
      const { data: result, error } = await supabase.functions.invoke(
        "submit-notice",
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
        throw new Error(result?.error || "Your notice could not be submitted.");
      }

      form.reset();
      status.textContent =
        "Thank you. Your notice has been submitted privately and is awaiting admin approval.";
      status.style.color = "#18794e";

      if (window.turnstile) {
        window.turnstile.reset();
      }
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Submission failed. Please try again.";
      status.style.color = "#b42318";

      if (window.turnstile) {
        window.turnstile.reset();
      }
    } finally {
      button.disabled = false;
      button.textContent = "Submit for Admin Review";
    }
  });
}
