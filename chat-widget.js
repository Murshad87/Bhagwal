(() => {
  if (window.__bhagwalChatLoaded || document.getElementById("bhagwal-ai-launcher")) return;
  window.__bhagwalChatLoaded = true;

  const style = document.createElement("style");
  style.textContent = '#bhagwal-ai-launcher{position:fixed;right:20px;bottom:20px;z-index:9998;border:0;border-radius:999px;background:#2c7a7b;color:#fff;padding:13px 18px;font:600 15px Arial,sans-serif;box-shadow:0 5px 22px #0003;cursor:pointer}#bhagwal-ai-panel{position:fixed;padding:0;margin:0;right:20px;bottom:82px;z-index:9999;width:min(370px,calc(100vw - 28px));height:min(540px,calc(100dvh - 112px));background:#fff;border:1px solid #d8e3e2;border-radius:16px;box-shadow:0 10px 40px #0003;display:none;overflow:hidden;font:14px/1.5 Arial,sans-serif;color:#1f2a2d}#bhagwal-ai-panel.open{display:flex;flex-direction:column}#bhagwal-ai-header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 15px;background:#2c7a7b;color:#fff}#bhagwal-ai-header strong{font-size:16px}#bhagwal-ai-close{border:0;background:transparent;color:#fff;font-size:24px;cursor:pointer;line-height:1}#bhagwal-ai-subtitle{font-size:12px;opacity:.9}#bhagwal-ai-messages{flex:1;overflow:auto;padding:14px;background:#f6f8f8}.bhagwal-ai-message{max-width:88%;margin:0 0 10px;padding:10px 12px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere}.bhagwal-ai-message.bot{background:#fff;border:1px solid #e2e9e8;margin-right:auto}.bhagwal-ai-message.user{background:#d9eeee;margin-left:auto}.bhagwal-ai-message.error{background:#fff1f0;color:#9b2822}#bhagwal-ai-form{display:flex;gap:8px;padding:12px;border-top:1px solid #e4ebea;background:#fff}#bhagwal-ai-input{min-width:0;flex:1;resize:none;max-height:100px;border:1px solid #cbd8d7;border-radius:10px;padding:10px;font:14px Arial,sans-serif}#bhagwal-ai-send{border:0;border-radius:10px;padding:0 15px;background:#2c7a7b;color:#fff;font-weight:700;cursor:pointer}#bhagwal-ai-send:disabled{opacity:.55;cursor:wait}#bhagwal-ai-note{padding:0 12px 9px;color:#667574;background:#fff;font-size:11px}@media(max-width:480px){#bhagwal-ai-launcher{right:14px;bottom:14px}#bhagwal-ai-panel{right:8px;bottom:72px;width:calc(100vw - 16px);height:min(560px,calc(100dvh - 90px))}}';
  document.head.appendChild(style);

  const launcher = document.createElement("button");
  launcher.id = "bhagwal-ai-launcher";
  launcher.type = "button";
  launcher.textContent = "💬 Ask Bhagwal AI";
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "bhagwal-ai-panel");

  const panel = document.createElement("section");
  panel.id = "bhagwal-ai-panel";
  panel.setAttribute("aria-label", "Bhagwal AI Assistant");

  const header = document.createElement("header");
  header.id = "bhagwal-ai-header";
  const headingWrap = document.createElement("div");
  const heading = document.createElement("strong");
  heading.textContent = "Bhagwal AI Assistant";
  const subtitle = document.createElement("div");
  subtitle.id = "bhagwal-ai-subtitle";
  subtitle.textContent = "Village information and general help";
  headingWrap.append(heading, subtitle);
  const close = document.createElement("button");
  close.id = "bhagwal-ai-close";
  close.type = "button";
  close.setAttribute("aria-label", "Close chat");
  close.textContent = "×";
  header.append(headingWrap, close);

  const messages = document.createElement("div");
  messages.id = "bhagwal-ai-messages";
  messages.setAttribute("aria-live", "polite");

  const form = document.createElement("form");
  form.id = "bhagwal-ai-form";
  const input = document.createElement("textarea");
  input.id = "bhagwal-ai-input";
  input.rows = 1;
  input.maxLength = 1200;
  input.placeholder = "Ask in English, اردو, Punjabi...";
  input.setAttribute("aria-label", "Your message");
  const send = document.createElement("button");
  send.id = "bhagwal-ai-send";
  send.type = "submit";
  send.textContent = "Send";
  form.append(input, send);

  const note = document.createElement("div");
  note.id = "bhagwal-ai-note";
  note.textContent = "Please avoid sharing passwords or sensitive personal information.";

  panel.append(header, messages, form, note);
  document.body.append(launcher, panel);

  const history = [];
  let busy = false;

  function addMessage(text, role) {
    const item = document.createElement("div");
    item.className = "bhagwal-ai-message " + role;
    item.textContent = text;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    return item;
  }

  addMessage("Assalamu Alaikum! I can help with Bhagwal village information and general questions. You can write in English, Urdu, Punjabi or Roman Urdu.", "bot");

  function setOpen(open) {
    panel.classList.toggle("open", open);
    launcher.setAttribute("aria-expanded", String(open));
    if (open) input.focus();
  }

  launcher.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
  close.addEventListener("click", () => setOpen(false));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || busy) return;

    addMessage(message, "user");
    input.value = "";
    busy = true;
    send.disabled = true;
    send.textContent = "...";
    const pending = addMessage("Thinking...", "bot");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: history.slice(-8) }),
      });
      const data = await response.json().catch(() => ({}));
      pending.remove();

      if (!response.ok) {
        addMessage(data.error || "Sorry, I could not answer right now. Please try again.", "error");
      } else {
        const answer = typeof data.answer === "string" ? data.answer : "I couldn't prepare an answer.";
        addMessage(answer, "bot");
        history.push({ role: "user", content: message }, { role: "assistant", content: answer });
        if (history.length > 8) history.splice(0, history.length - 8);
      }
    } catch {
      pending.remove();
      addMessage("Connection problem. Please check your internet connection and try again.", "error");
    } finally {
      busy = false;
      send.disabled = false;
      send.textContent = "Send";
      input.focus();
    }
  });
})();