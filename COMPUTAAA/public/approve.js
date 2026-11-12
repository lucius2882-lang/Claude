// Opened as a pop-up by the dashboard. #approve:<id> or #wipe
const [purpose, ref = ""] = location.hash.slice(1).split(":");
const $ = (id) => document.getElementById(id);

(async () => {
  if (purpose === "wipe") {
    $("title").textContent = "Wipe saved logins?";
    $("what").textContent = "This deletes the agent browser's whole profile: every cookie and saved login. You'll have to log in to your accounts again. It can't be undone.";
    $("ok").textContent = "Wipe with passkey";
    $("ok").className = "danger-solid";
    return;
  }
  const a = await fetch("/api/approval").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!a || a.id !== ref) {
    $("what").textContent = "This approval is no longer pending.";
    $("ok").disabled = true;
    return;
  }
  $("what").textContent = a.description;
})();

$("cancel").onclick = () => window.close();
$("ok").onclick = async () => {
  $("msg").textContent = "";
  try {
    await PK.stepUp(purpose, ref);
    $("msg").className = "ok";
    $("msg").textContent = purpose === "wipe" ? "Wiped." : "Approved.";
    setTimeout(() => {
      window.close();
      $("msg").textContent += " You can close this window.";
    }, 700);
  } catch (e) {
    $("msg").textContent = PK.niceError(e);
  }
};
