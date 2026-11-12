import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { WebSocketServer } from "ws";
import {
  PUBLIC_ORIGIN, assertAuthConfigured, authRouter, cfGate, clientIp, gateOkForUpgrade,
  originAllowed, requireAuth, requireSameOrigin, revokeAllSessions, sessionFromHeaders,
} from "./auth.js";
import { audit, readAudit } from "./audit.js";
import { VIEWPORT } from "./viewport.js";
import { RemoteBrowser } from "./remote.js";
import { Agent } from "./agent.js";
import { JobsStore } from "./jobs.js";

assertAuthConfigured();
if (!process.env.ANTHROPIC_API_KEY) console.warn("ANTHROPIC_API_KEY is not set; commands will fail.");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public");
const WEBAUTHN_JS = path.join(__dirname, "..", "node_modules", "@simplewebauthn", "browser", "dist", "bundle", "index.umd.min.js");
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const IDLE_LOCK_MS = Number(process.env.IDLE_LOCK_MINUTES || 30) * 60 * 1000;
const WORKER_PORT = Number(process.env.WORKER_PORT || 3001);
const WORKER_HOST = process.env.WORKER_HOST || "127.0.0.1";
const FRAME_ANCESTORS = process.env.FRAME_ANCESTORS || "'none'"; // your own site only
const list = (v) => String(v || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

// ---------------- Agents ----------------
// AGENTS=main:general,jobs:jobs  → one agent + one browser worker each.
const LABELS = { main: "Main", jobs: "Jobs" };
const jobsStore = new JobsStore(process.env.DATA_DIR || "./data");
const FILL_ONLY = list(process.env.JOBS_FILL_ONLY_SITES ?? "linkedin.com,indeed.com,glassdoor.com,craigslist.org");

const slots = new Map();
for (const spec of list(process.env.AGENTS || "main:general")) {
  const [name, kind = "general"] = spec.split(":");
  if (!/^[a-z][a-z0-9-]{0,20}$/.test(name) || !["general", "jobs"].includes(kind)) {
    console.error(`Bad AGENTS entry "${spec}". Use name:kind with kind general or jobs.`);
    process.exit(1);
  }
  // Each worker has its own secret, so one worker can never pose as another.
  const token = process.env[`WORKER_TOKEN_${name.toUpperCase().replace(/-/g, "_")}`] || (name === "main" ? process.env.WORKER_TOKEN : "") || "";
  if (token.length < 32) {
    console.error(`Set WORKER_TOKEN_${name.toUpperCase()} (32+ random characters; that worker needs the same value). Generate one with: openssl rand -hex 32`);
    process.exit(1);
  }
  const browser = new RemoteBrowser(name);
  const agent = new Agent(browser, { name, kind, jobs: kind === "jobs" ? jobsStore : null, fillOnlySites: FILL_ONLY });
  slots.set(name, { name, kind, label: LABELS[name] || name[0].toUpperCase() + name.slice(1), token, browser, agent, history: [], status: {}, lastActivity: Date.now() });
}
const firstSlot = () => slots.values().next().value;
const slotOf = (name) => slots.get(String(name)) || null;
const touch = (slot) => (slot.lastActivity = Date.now());

// ---------------- HTTP ----------------
const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  const wsOrigin = PUBLIC_ORIGIN.replace(/^http/, "ws");
  res.set({
    "Content-Security-Policy":
      `default-src 'self'; img-src 'self' blob: data:; connect-src 'self' ${wsOrigin}; style-src 'self'; script-src 'self'; ` +
      `frame-ancestors ${FRAME_ANCESTORS}; base-uri 'none'; form-action 'self'; object-src 'none'`,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "Cross-Origin-Resource-Policy": "same-site",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cache-Control": "no-store",
  });
  next();
});

app.use(cfGate); // lock 1: nothing at all without a valid Cloudflare Access token for the owner

const file = (name) => (req, res) => res.sendFile(path.join(PUBLIC, name));
for (const f of ["login.html", "login.js", "enroll.html", "enroll.js", "approve.html", "approve.js", "passkey.js", "style.css"]) {
  app.get("/" + f, file(f));
}
app.get("/vendor/webauthn.js", (req, res) => res.sendFile(WEBAUTHN_JS));
// Your website's tile calls this (cross-origin, with cookies) to see whether you're past Cloudflare yet.
const SITE_ORIGINS = FRAME_ANCESTORS.split(/\s+/).filter((o) => /^https?:\/\//.test(o));
app.get("/api/ping", (req, res) => {
  const origin = req.get("origin");
  if (origin && SITE_ORIGINS.includes(origin)) {
    res.set({ "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true", Vary: "Origin" });
  }
  res.json({ ok: true });
});

const findApproval = (id) => [...slots.values()].find((s) => s.agent.approval?.id === id) || null;

app.use(authRouter({
  stepUpPurposes: ["approve", "wipe"],
  onStepUp: async (purpose, ref) => {
    if (purpose === "approve") {
      const slot = findApproval(ref);
      if (!slot || !slot.agent.settleApproval(ref, true)) throw new Error("That approval is no longer pending.");
      touch(slot);
    }
    if (purpose === "wipe") {
      const slot = slotOf(ref);
      if (!slot) throw new Error("Unknown agent.");
      await wipeProfile(slot);
    }
  },
}));

// lock 2: everything below needs a passkey session
app.use(requireAuth);
app.get("/", file("index.html"));
app.get("/app.js", file("app.js"));
app.get("/api/approval", (req, res) => {
  const slot = findApproval(String(req.query.id || ""));
  const a = slot?.agent.approval;
  res.json(a ? { id: a.id, description: a.description, agent: slot.label } : null);
});
app.get("/api/audit", (req, res) => res.json(readAudit(200)));

// ---- Jobs agent: profile, résumé, tracker ----
app.get("/api/jobs/profile", (req, res) => res.json({ profile: jobsStore.getProfile(), resume: jobsStore.resumeMeta() }));
app.put("/api/jobs/profile", requireSameOrigin, express.json({ limit: "100kb" }), (req, res) => {
  const profile = jobsStore.saveProfile(req.body);
  audit("jobs_profile_saved", {});
  res.json({ profile });
});
app.put("/api/jobs/resume", requireSameOrigin, express.raw({ type: "application/pdf", limit: "5mb" }), (req, res) => {
  try {
    jobsStore.saveResume(req.body, req.get("x-file-name"));
    audit("jobs_resume_uploaded", { name: jobsStore.resumeMeta()?.name });
    res.json({ resume: jobsStore.resumeMeta() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.get("/api/jobs/applications", (req, res) => res.json(jobsStore.applications()));

const server = http.createServer(app);

// ---------------- WebSocket: live view + controls ----------------
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

server.on("upgrade", async (req, socket, head) => {
  const ok = req.url === "/ws" && originAllowed(req.headers.origin) && sessionFromHeaders(req.headers) && (await gateOkForUpgrade(req));
  if (!ok) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    return socket.destroy();
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

const send = (ws, obj) => ws.readyState === 1 && ws.send(JSON.stringify(obj));
const broadcast = (obj) => wss.clients.forEach((c) => send(c, obj));
const viewers = (slot) => [...wss.clients].filter((c) => c.view === slot.name);
const log = (slot, kind, text) => {
  const l = { kind, text, at: Date.now() };
  slot.history.push(l);
  if (slot.history.length > 300) slot.history.shift();
  broadcast({ type: "log", agent: slot.name, ...l });
};
const summary = (s) => ({
  name: s.name, label: s.label, kind: s.kind, state: s.agent.state, status: s.status,
  approval: s.agent.approval && { id: s.agent.approval.id, description: s.agent.approval.description, point: s.agent.approval.point },
  url: s.browser.currentUrl, browserOpen: s.browser.isOpen, sites: s.browser.sites, workerOnline: s.browser.online,
  ephemeral: s.browser.ephemeral, history: s.history,
});

async function ensureLive(slot) {
  if (!slot.browser.online) return;
  if (!slot.browser.isOpen) await slot.browser.start();
  if (viewers(slot).length) await slot.browser.startStream(); // nobody watching (tab switched meanwhile)? don't stream
}
function maybeStopStream(slot) {
  if (viewers(slot).length === 0 && slot.browser.streaming) slot.browser.stopStream();
}

for (const slot of slots.values()) {
  const { browser, agent } = slot;
  // Each frame starts with [name length][name] so the dashboard never shows one agent's screen on another's tab.
  const tag = Buffer.concat([Buffer.from([Buffer.byteLength(slot.name)]), Buffer.from(slot.name)]);
  browser.on("frame", (buf) => {
    const framed = Buffer.concat([tag, buf]);
    viewers(slot).forEach((c) => c.readyState === 1 && c.bufferedAmount < 2_000_000 && c.send(framed, { binary: true }));
  });
  browser.on("navigated", (url) => broadcast({ type: "url", agent: slot.name, url }));
  browser.on("opened", () => broadcast({ type: "browser", agent: slot.name, open: true }));
  browser.on("closed", () => broadcast({ type: "browser", agent: slot.name, open: false }));
  browser.on("worker", (online) => {
    audit(online ? "worker_connected" : "worker_disconnected", { worker: slot.name });
    broadcast({ type: "worker", agent: slot.name, online, sites: browser.sites, browserOpen: browser.isOpen, url: browser.currentUrl, ephemeral: browser.ephemeral });
  });
  browser.on("blocked", (url) => {
    log(slot, "error", `Blocked: ${url} is not in this agent's allowed sites.`);
    audit("navigation_blocked", { agent: slot.name, url: url.slice(0, 300) });
  });
  agent.on("status", (s) => { touch(slot); slot.status = s; broadcast({ type: "status", agent: slot.name, ...s }); });
  agent.on("log", (l) => { touch(slot); log(slot, l.kind, l.text); });
  agent.on("applications", () => broadcast({ type: "applications", agent: slot.name }));
}

wss.on("connection", async (ws, req) => {
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));
  ws.view = firstSlot().name;
  send(ws, { type: "hello", viewport: VIEWPORT, view: ws.view, agents: [...slots.values()].map(summary) });

  // Listen before doing anything slow, so an early click (like switching tabs) is never dropped.
  ws.on("message", async (raw, isBinary) => {
    if (isBinary) return;
    if (!sessionFromHeaders(req.headers)) return ws.close(4001, "session expired");
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const target = slotOf(msg.agent) || slotOf(ws.view);
    touch(target);
    try {
      await handle(ws, target, msg, clientIp(req));
    } catch (err) {
      send(ws, { type: "log", agent: target.name, kind: "error", text: err.message, at: Date.now() });
    }
  });
  ws.on("close", () => slots.forEach(maybeStopStream));

  const slot = slotOf(ws.view);
  touch(slot);
  await ensureLive(slot).catch((e) => log(slot, "error", "Browser failed to start: " + e.message));
});

async function handle(ws, slot, msg, ip) {
  const { agent, browser } = slot;
  switch (msg.type) {
    case "view": {
      const prev = slotOf(ws.view);
      ws.view = slot.name;
      if (prev && prev !== slot) maybeStopStream(prev);
      return ensureLive(slot);
    }
    case "command":
      if (typeof msg.text !== "string" || !msg.text.trim()) return;
      if (agent.state !== "idle") throw new Error(`${slot.label} is busy. Stop it or wait.`);
      agent.run(msg.text.trim().slice(0, 4000));
      return;
    case "pause": return agent.pause();
    case "resume": return agent.resume(typeof msg.note === "string" ? msg.note.slice(0, 2000) : "");
    case "stop": return agent.stop();
    case "deny": return agent.settleApproval(String(msg.id), false); // denying needs no passkey
    case "reset":
      if (!agent.reset()) throw new Error("Stop the agent before starting a new task.");
      return;
    case "wake": return ensureLive(slot);
    case "end_session":
      // Close this agent's browser now. In ephemeral mode, that also deletes the whole session.
      agent.stop();
      audit("end_session", { agent: slot.name, ephemeral: browser.ephemeral });
      await browser.close();
      log(slot, "info", browser.ephemeral ? "Session ended. Every cookie and login from it was deleted." : "Browser closed. Saved logins are kept.");
      return;
    case "panic": return panic(ip);
  }

  if (!agent.humanCanDrive()) throw new Error("Pause the agent before taking control.");
  if (!browser.isOpen) throw new Error("The browser is asleep. Wake it first.");
  const num = (v) => Math.max(0, Math.min(Number(v) || 0, 5000));
  switch (msg.type) {
    case "navigate":
      audit("owner_navigate", { agent: slot.name, url: String(msg.url).slice(0, 300) });
      return browser.navigate(msg.url);
    case "back": return browser.back();
    case "click": return browser.click([num(msg.x), num(msg.y)], { button: msg.button === "right" ? "right" : "left", clickCount: msg.double ? 2 : 1 });
    case "move": return browser.move(num(msg.x), num(msg.y));
    case "wheel": return browser.wheel(Number(msg.dx) || 0, Number(msg.dy) || 0);
    case "key": return browser.pressKey(String(msg.key).slice(0, 40));
    case "type": return browser.typeText(String(msg.text).slice(0, 2000));
  }
}

// Panic button: stop every agent, close every browser, sign out every session.
async function panic(ip) {
  audit("panic", { ip });
  for (const s of slots.values()) {
    s.agent.stop();
    await s.browser.close().catch(() => {});
  }
  revokeAllSessions();
  broadcast({ type: "panic" });
  wss.clients.forEach((c) => c.close(4001, "panic"));
}

// Wipe saved logins (needs a fresh passkey tap): deletes that agent's whole browser profile.
async function wipeProfile(slot) {
  audit("wipe_profile", { agent: slot.name });
  slot.agent.stop();
  await slot.browser.wipe();
  log(slot, "info", "Saved logins wiped. The browser starts fresh next time.");
  if (viewers(slot).length) await ensureLive(slot);
}

// Idle lock: close a browser (and its logged-in sessions in memory) when nothing has happened for a while.
setInterval(async () => {
  for (const s of slots.values()) {
    if (s.browser.isOpen && s.agent.state === "idle" && Date.now() - s.lastActivity > IDLE_LOCK_MS) {
      audit("idle_lock", { agent: s.name });
      await s.browser.close().catch(() => {});
      log(s, "info", s.browser.ephemeral ? "Session ended after being idle; it was deleted." : "Browser closed after being idle. It wakes when you need it.");
    }
  }
}, 30_000);

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30_000);

// ---------------- Worker channel (private network only; never routed through the tunnel) ----------------
const workerServer = http.createServer((req, res) => { res.writeHead(404).end(); });
const workerWss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 * 1024 });
const tokenOk = (header, want) => {
  const given = Buffer.from(String(header || "").replace(/^Bearer\s+/i, ""));
  const w = Buffer.from(want);
  return given.length === w.length && crypto.timingSafeEqual(given, w);
};
workerServer.on("upgrade", (req, socket, head) => {
  const name = String(req.headers["x-worker-name"] || "");
  const slot = slotOf(name);
  if (req.url !== "/worker" || !slot || !tokenOk(req.headers.authorization, slot.token)) {
    audit("worker_rejected", { ip: req.socket.remoteAddress, name: name.slice(0, 40) });
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    return socket.destroy();
  }
  workerWss.handleUpgrade(req, socket, head, (ws) => {
    ws.once("message", (raw, isBinary) => {
      let hello;
      try { hello = !isBinary && JSON.parse(raw); } catch {}
      if (hello?.type !== "hello") return ws.close(4003, "expected hello");
      slot.browser.attach(ws, hello);
      if (viewers(slot).length) ensureLive(slot).catch((e) => log(slot, "error", "Browser failed to start: " + e.message));
    });
  });
});
workerServer.listen(WORKER_PORT, WORKER_HOST, () => console.log(`Worker channel on ${WORKER_HOST}:${WORKER_PORT} for: ${[...slots.keys()].join(", ")}`));

server.listen(PORT, HOST, () => console.log(`COMPUTAAA listening on http://${HOST}:${PORT} (public origin ${PUBLIC_ORIGIN})`));

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    slots.forEach((s) => s.agent.stop());
    process.exit(0); // workers keep their browsers; they reconnect when we're back
  });
}
