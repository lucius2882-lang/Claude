// Shared helpers for the passkey pages. Passkey prompts always run in a top-level window
// (a small pop-up when the dashboard is shown inside your website), which works in every browser.
window.PK = (() => {
  const W = window.SimpleWebAuthnBrowser;
  const framed = window.top !== window.self;

  async function post(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function login() {
    const { options, challengeId } = await post("/api/login/options");
    const response = await W.startAuthentication({ optionsJSON: options });
    return post("/api/login/verify", { challengeId, response });
  }

  async function stepUp(purpose, ref) {
    const { options, challengeId } = await post("/api/stepup/options", { purpose, ref });
    const response = await W.startAuthentication({ optionsJSON: options });
    return post("/api/stepup/verify", { purpose, challengeId, response });
  }

  async function enroll(token, name) {
    const { options, challengeId } = await post("/api/enroll/options", { token });
    const response = await W.startRegistration({ optionsJSON: options });
    return post("/api/enroll/verify", { token, challengeId, response, name });
  }

  function popup(url) {
    const w = window.open(url, "computaaa-auth", "popup,width=460,height=620");
    if (!w) throw new Error("Pop-up blocked. Allow pop-ups for this site and try again.");
    return w;
  }

  const niceError = (e) =>
    e?.name === "NotAllowedError" ? "Cancelled or timed out." : e?.message || String(e);

  return { post, login, stepUp, enroll, popup, framed, niceError };
})();
