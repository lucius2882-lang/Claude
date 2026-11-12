const msg = document.getElementById("msg");
// Opened as a pop-up from the owner panel (?popup=1): close when done, else go to the dashboard.
const isPopup = new URLSearchParams(location.search).has("popup");
function done() {
  if (!isPopup) return location.replace("/");
  window.close();
  setTimeout(() => {
    msg.className = "ok";
    msg.textContent = "Signed in. You can close this window.";
  }, 300);
}

if (PK.framed) document.getElementById("framedNote").hidden = false;

// Inside the website's owner panel: sign in through a pop-up, and watch for it to finish.
function waitForSession() {
  const t = setInterval(async () => {
    const me = await fetch("/api/me").then((r) => r.json()).catch(() => null);
    if (me?.authed) { clearInterval(t); location.replace("/"); }
  }, 1500);
}

document.getElementById("signin").onclick = async () => {
  msg.textContent = "";
  try {
    if (PK.framed) {
      PK.popup("/login.html?popup=1");
      msg.className = "muted";
      msg.textContent = "Finish signing in in the pop-up…";
      return waitForSession();
    }
    await PK.login();
    done();
  } catch (e) {
    msg.className = "error";
    msg.textContent = PK.niceError(e);
  }
};

document.getElementById("recovery").onsubmit = async (e) => {
  e.preventDefault();
  msg.textContent = "";
  try {
    const r = await PK.post("/api/login/recovery", { code: e.target.code.value });
    alert(`Signed in. ${r.remaining} recovery codes left. Enroll a new passkey soon (npm run enroll).`);
    PK.framed ? location.replace("/") : done();
  } catch (err) {
    msg.className = "error";
    msg.textContent = err.message;
  }
};
