const $ = (id) => document.getElementById(id);
const screen = $("screen"), viewer = $("viewer"), logEl = $("log");
let ws, viewport = { width: 1280, height: 800 }, state = "idle", lastFrameUrl = null, retry = 500;

// ---------------- connection ----------------
function connect() {
  ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.binaryType = "blob";
  ws.onopen = () => (retry = 500);
  ws.onmessage = (e) => {
    if (e.data instanceof Blob) return showFrame(e.data);
    const m = JSON.parse(e.data);
    if (m.type === "hello") {
      viewport = m.viewport;
      logEl.innerHTML = "";
      m.history.forEach(addLog);
      setUrl(m.url);
      setSites(m.sites);
      setWorker(m.workerOnline);
      setAsleep(m.workerOnline && !m.browserOpen);
      setState(m.state, { approval: m.approval });
    } else if (m.type === "status") {
      setState(m.state, m);
    } else if (m.type === "log") addLog(m);
    else if (m.type === "url") setUrl(m.url);
    else if (m.type === "browser") setAsleep(!m.open);
    else if (m.type === "worker") {
      setWorker(m.online);
      setSites(m.sites);
      setAsleep(m.online && !m.browserOpen);
      if (m.url) setUrl(m.url);
    }
    else if (m.type === "panic") location.replace("/login.html");
  };
  ws.onclose = async () => {
    setState("offline");
    // Session expired or logged out elsewhere? Go to login instead of retrying forever.
    const r = await fetch("/app.js", { method: "HEAD" }).catch(() => null);
    if (r && r.status === 401) return location.replace("/login.html");
    setTimeout(connect, (retry = Math.min(retry * 2, 10000)));
  };
}
const send = (obj) => ws?.readyState === 1 && ws.send(JSON.stringify(obj));

function showFrame(blob) {
  const url = URL.createObjectURL(blob);
  screen.onload = () => lastFrameUrl && lastFrameUrl !== url && URL.revokeObjectURL(lastFrameUrl);
  const prev = lastFrameUrl;
  lastFrameUrl = url;
  screen.src = url;
  if (prev) setTimeout(() => URL.revokeObjectURL(prev), 1000);
}

// ---------------- UI state ----------------
const LABELS = { idle: "Idle", running: "Working", paused: "Paused", waiting_human: "Needs you", awaiting_approval: "Approval needed", offline: "Offline" };
let approvalId = null;
function setAsleep(asleep) {
  $("asleep").hidden = !asleep;
}
function setWorker(online) {
  $("offline").hidden = !!online;
}
function setSites(sites = []) {
  $("sites").textContent = !sites.length ? "" : sites.includes("*") ? "Allowed sites: any" : `Allowed sites: ${sites.join(", ")}`;
}
function setState(s, extra = {}) {
  const reason = extra.reason;
  state = s;
  const pill = $("status");
  pill.textContent = LABELS[s] || s;
  pill.className = `pill ${s}`;
  const canDrive = ["idle", "paused", "waiting_human"].includes(s);
  $("locked").textContent = s === "awaiting_approval" ? "Waiting for your approval" : "Agent is working · Pause to take control";
  $("locked").hidden = canDrive;
  $("pause").disabled = s !== "running";
  $("resume").disabled = s !== "paused";
  $("stop").disabled = s === "idle" || s === "offline";
  $("send").disabled = s !== "idle";
  $("reset").disabled = s !== "idle";
  $("human").hidden = s !== "waiting_human";
  $("approval").hidden = s !== "awaiting_approval";
  approvalId = null;
  $("marker").hidden = true;
  if (s === "awaiting_approval" && extra.approval) {
    approvalId = extra.approval.id;
    $("approvalText").textContent = extra.approval.description;
    if (extra.approval.point) showMarker(extra.approval.point);
    notify("Approval needed: " + extra.approval.description);
  }
  if (s === "waiting_human") {
    $("humanReason").textContent = reason || "";
    $("humanNote").value = "";
    notify(reason);
  }
  if (!canDrive) releaseControl();
}

function setUrl(u) {
  if (document.activeElement !== $("url")) $("url").value = u || "";
}

function showMarker({ x, y }) {
  const m = $("marker");
  m.style.left = `${(x / viewport.width) * 100}%`;
  m.style.top = `${(y / viewport.height) * 100}%`;
  m.hidden = false;
}

const KIND_LABEL = { user: "You", assistant: "Agent", note: "…", action: "▸", human: "⚑ Needs you", approval: "🔒 Approval needed", error: "Error", info: "Info" };
function addLog({ kind, text, at }) {
  const li = document.createElement("li");
  li.className = `log-${kind}`;
  const time = new Date(at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const head = document.createElement("span");
  head.className = "log-head";
  head.textContent = `${KIND_LABEL[kind] || kind} · ${time}`;
  const body = document.createElement("div");
  body.textContent = text; // never innerHTML: page/agent text is untrusted
  li.append(head, body);
  logEl.prepend(li);
  while (logEl.children.length > 300) logEl.lastChild.remove();
}

function notify(reason) {
  try {
    if (document.hidden && Notification.permission === "granted") new Notification("Browser agent needs you", { body: reason });
  } catch {}
}

// ---------------- commands & controls ----------------
$("cmdForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("cmd").value.trim();
  if (!text || state !== "idle") return;
  send({ type: "command", text });
  $("cmd").value = "";
  try { if (Notification.permission === "default") Notification.requestPermission(); } catch {}
});
$("cmd").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) $("cmdForm").requestSubmit();
});
$("pause").onclick = () => send({ type: "pause" });
$("resume").onclick = () => send({ type: "resume" });
$("stop").onclick = () => send({ type: "stop" });
$("reset").onclick = () => send({ type: "reset" });
$("humanResume").onclick = () => send({ type: "resume", note: $("humanNote").value.trim() });
$("humanNote").addEventListener("keydown", (e) => e.key === "Enter" && $("humanResume").click());
$("approve").onclick = () => {
  if (!approvalId) return;
  window.open(`/approve.html#approve:${approvalId}`, "computaaa-auth", "popup,width=460,height=620");
};
$("deny").onclick = () => approvalId && send({ type: "deny", id: approvalId });
$("wake").onclick = () => send({ type: "wake" });
$("panic").onclick = () => {
  if (confirm("Panic: stop the agent, close the browser, and sign out everywhere?")) send({ type: "panic" });
};
$("wipe").onclick = () => {
  if (confirm("Delete every saved login in the agent's browser? You'll confirm with your passkey next.")) {
    window.open("/approve.html#wipe", "computaaa-auth", "popup,width=460,height=620");
  }
};
$("securityLog").addEventListener("toggle", async (e) => {
  if (!e.target.open) return;
  const rows = await fetch("/api/audit").then((r) => r.json()).catch(() => []);
  const ol = $("audit");
  ol.innerHTML = "";
  rows.forEach((r) => {
    const li = document.createElement("li");
    const { at, event, ...rest } = r;
    const extra = Object.entries(rest).map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join(" · ");
    li.textContent = `${new Date(at).toLocaleString()}  ${event.replace(/_/g, " ")}${extra ? "  —  " + extra : ""}`;
    ol.append(li);
  });
});
$("logout").onclick = async () => {
  await fetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  location.replace("/login.html");
};

$("go").onclick = () => send({ type: "navigate", url: $("url").value.trim() });
$("url").addEventListener("keydown", (e) => e.key === "Enter" && $("go").click());
$("back").onclick = () => send({ type: "back" });
$("typeSend").onclick = () => {
  const t = $("typeText").value;
  if (t) send({ type: "type", text: t });
  $("typeText").value = "";
};
$("typeText").addEventListener("keydown", (e) => e.key === "Enter" && $("typeSend").click());
$("enterKey").onclick = () => send({ type: "key", key: "Enter" });

// ---------------- human takeover in the live view ----------------
let driving = false;
function takeControl() {
  if (state === "running" || state === "offline") return;
  driving = true;
  $("driving").hidden = false;
  viewer.classList.add("is-driving");
  viewer.focus();
}
function releaseControl() {
  driving = false;
  $("driving").hidden = true;
  viewer.classList.remove("is-driving");
}

function toPage(e) {
  const r = screen.getBoundingClientRect();
  return {
    x: Math.round(((e.clientX - r.left) / r.width) * viewport.width),
    y: Math.round(((e.clientY - r.top) / r.height) * viewport.height),
  };
}

screen.addEventListener("mousedown", (e) => e.preventDefault());
screen.addEventListener("click", (e) => {
  takeControl();
  if (driving) send({ type: "click", ...toPage(e) });
});
screen.addEventListener("dblclick", (e) => driving && send({ type: "click", double: true, ...toPage(e) }));
screen.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (driving) send({ type: "click", button: "right", ...toPage(e) });
});
let lastMove = 0;
screen.addEventListener("mousemove", (e) => {
  if (!driving || Date.now() - lastMove < 100) return;
  lastMove = Date.now();
  send({ type: "move", ...toPage(e) });
});
viewer.addEventListener("wheel", (e) => {
  if (!driving) return;
  e.preventDefault();
  send({ type: "wheel", dx: e.deltaX, dy: e.deltaY });
}, { passive: false });

viewer.addEventListener("keydown", (e) => {
  if (!driving) return;
  if (e.key === "Escape" && !e.shiftKey) return releaseControl(); // Shift+Esc sends Esc to the page
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") return; // let paste event handle it
  e.preventDefault();
  const mods = [e.ctrlKey && "Control", e.altKey && "Alt", e.metaKey && "Meta", e.shiftKey && e.key.length > 1 && "Shift"].filter(Boolean);
  const key = e.key === " " ? "Space" : e.key;
  send({ type: "key", key: [...mods, key].join("+") });
});
viewer.addEventListener("paste", (e) => {
  if (!driving) return;
  e.preventDefault();
  const t = e.clipboardData.getData("text");
  if (t) send({ type: "type", text: t });
});
viewer.addEventListener("blur", releaseControl);

connect();
