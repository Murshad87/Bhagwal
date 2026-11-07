(() => {
  // Replace this with the Google Analytics 4 Measurement ID (for example: G-XXXXXXXXXX).
  // Analytics stays disabled until a real ID is configured.
  const GA_MEASUREMENT_ID = "G-XXXXXXXXXX";
  const analyticsReady = /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID) &&
    GA_MEASUREMENT_ID !== "G-XXXXXXXXXX";

  if (analyticsReady) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID);

    const analyticsScript = document.createElement("script");
    analyticsScript.async = true;
    analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(analyticsScript);
  }

  function track(eventName, parameters = {}) {
    if (analyticsReady && typeof window.gtag === "function") {
      window.gtag("event", eventName, parameters);
    }
  }

  // The GA4 config above records page_view events once a real Measurement ID is set.
  let deferredInstallPrompt = null;

  function showInstallControl() {
    if (document.getElementById("bhagwal-install-control")) return;

    const control = document.createElement("section");
    control.id = "bhagwal-install-control";
    control.setAttribute("aria-labelledby", "bhagwal-install-title");
    control.style.cssText = "max-width:980px;margin:16px auto;padding:16px;background:#fff;border-radius:14px;box-shadow:0 5px 18px rgba(16,33,35,.08);text-align:center";

    const title = document.createElement("h2");
    title.id = "bhagwal-install-title";
    title.textContent = "Install the Bhagwal App";
    title.style.cssText = "margin:0 0 8px;color:#2c7a7b;font-size:1.35rem";

    const description = document.createElement("p");
    description.textContent = "Add Bhagwal Village to your home screen for quick access.";
    description.style.margin = "0 0 12px";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Install App";
    button.style.cssText = "border:0;border-radius:10px;background:#2c7a7b;color:#fff;font:inherit;font-weight:700;padding:11px 20px;cursor:pointer";
    button.hidden = true;

    const help = document.createElement("p");
    help.textContent = "If no install button appears, use your browser menu and choose ‘Install app’ or ‘Add to Home Screen’.";
    help.style.cssText = "margin:10px 0 0;color:#50656a;font-size:.9rem";

    control.append(title, description, button, help);
    const header = document.querySelector("header");
    if (header) header.insertAdjacentElement("afterend", control);
    else document.body.prepend(control);

    button.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      track("install_prompt_choice", { outcome: choice.outcome });
      deferredInstallPrompt = null;
      button.hidden = true;
    });

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      button.hidden = false;
      track("install_prompt_available");
    });

    window.addEventListener("appinstalled", () => {
      track("app_install");
      deferredInstallPrompt = null;
      button.hidden = true;
      description.textContent = "Bhagwal Village is installed on your device. Thank you!";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showInstallControl, { once: true });
  } else {
    showInstallControl();
  }
})();
