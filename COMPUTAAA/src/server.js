import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { WebSocketServer } from "ws";
import {
  PUBLIC_ORIGIN, assertAuthConfigured, authRouter, cfGate, clientIp, gateOkForUpgrade,
  originAllowed, requireAuth, revokeAllSessions, sessionFromHeaders,
} from "./auth.js";
import { audit, readAudit } from "./audit.js";
import { BrowserManager, VIEWPORT } from "./browser.js";
import { Agent } from "./agent.js";

assertAuthConfigured();
const ALLOWED_SITES = (process.env.ALLOWED_SITES || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
if (!ALLOWED_SITES.length) {
  console.error('Set ALLOWED_SITES (e.g. "google.com,gmail.com,amazon.com"), or "*" to allow every site.');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) console.warn("ANTHROPIC_API_KEY is not set; commands will fail.");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public");
const WEBAUTHN_JS = path.join(__dirname, "..", "node_modules", "@simplewebauthn", "browser", "dist", "bundle", "index.umd.min.js");
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const IDLE_LOCK_MS = Number(process.env.IDLE_LOCK_MINUTES || 30) * 60 * 1000;
const PROFILE_DIR = path.resolve(process.env.PROFILE_DIR || "./data/profile");
// Who may show this dashboard inside a frame: your own site only.
const FRAME_ANCESTORS = process.env.FRAME_ANCESTORS || "'none'";

const browser = new BrowserManager({
  profileDir: PROFILE_DIR,
  headless: process.env.HEADLESS !== "false",
  executablePath: process.env.CHROMIUM_PATH,
  allowedSites: ALLOWED_SITES,
});
const agent = new Agent(browser);
let lastActivity = Date.now();
const touch = () => (lastActivity = Date.now());

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

app.use(authRouter({
  stepUpPurposes: ["approve", "wipe"],
  onStepUp: async (purpose, ref) => {
    touch();
    if (purpose === "approve" && !agent.settleApproval(ref, true)) throw new Error("That approval is no longer pending.");
    if (purpose === "wipe") await wipeProfile();
  },
}));

// lock 2: everything below needs a passkey session
app.use(requireAuth);
app.get("/", file("index.html"));
app.get("/app.js", file("app.js"));
app.get("/api/approval", (req, res) => {
  const a = agent.approval;
  res.json(a ? { id: a.id, description: a.description } : null);
});
app.get("/api/audit", (req, res) => res.json(readAudit(200)));

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
const history = [];
const log = (kind, text) => {
  const l = { kind, text, at: Date.now() };
  history.push(l);
  if (history.length > 300) history.shift();
  broadcast({ type: "log", ...l });
};

browser.on("frame", (buf) => wss.clients.forEach((c) => c.readyState === 1 && c.bufferedAmount < 2_000_000 && c.send(buf, { binary: true })));
browser.on("navigated", (url) => broadcast({ type: "url", url }));
browser.on("opened", () => broadcast({ type: "browser", open: true }));
browser.on("closed", () => broadcast({ type: "browser", open: false }));
browser.on("blocked", (url) => {
  log("error", `Blocked: ${url} is not in ALLOWED_SITES.`);
  audit("navigation_blocked", { url: url.slice(0, 300) });
});
agent.on("status", (s) => { touch(); broadcast({ type: "status", ...s }); });
agent.on("log", (l) => { touch(); log(l.kind, l.text); });

wss.on("connection", async (ws, req) => {
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));
  touch();
  send(ws, {
    type: "hello", viewport: VIEWPORT, state: agent.state, approval: agent.approval && { id: agent.approval.id, description: agent.approval.description, point: agent.approval.point },
    url: browser.page?.url() || "", browserOpen: browser.isOpen, history, sites: ALLOWED_SITES,
  });
  if (!browser.isOpen) await browser.start().catch((e) => log("error", "Browser failed to start: " + e.message));
  if (!browser.streaming || wss.clients.size === 1) await browser.startStream().catch(() => {});

  ws.on("message", async (raw, isBinary) => {
    if (isBinary) return;
    if (!sessionFromHeaders(req.headers)) return ws.close(4001, "session expired");
    touch();
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    try {
      await handle(msg, clientIp(req));
    } catch (err) {
      send(ws, { type: "log", kind: "error", text: err.message, at: Date.now() });
    }
  });
  ws.on("close", () => wss.clients.size === 0 && browser.stopStream());
});

async function handle(msg, ip) {
  switch (msg.type) {
    case "command":
      if (typeof msg.text !== "string" || !msg.text.trim()) return;
      if (agent.state !== "idle") throw new Error("The agent is busy. Stop it or wait.");
      agent.run(msg.text.trim().slice(0, 4000));
      return;
    case "pause": return agent.pause();
    case "resume": return agent.resume(typeof msg.note === "string" ? msg.note.slice(0, 2000) : "");
    case "stop": return agent.stop();
    case "deny": return agent.settleApproval(String(msg.id), false); // denying needs no passkey
    case "reset":
      if (!agent.reset()) throw new Error("Stop the agent before starting a new task.");
      return;
    case "wake":
      await browser.start();
      if (browser.streaming || wss.clients.size) await browser.startStream();
      return;
    case "panic": return panic(ip);
  }

  if (!agent.humanCanDrive()) throw new Error("Pause the agent before taking control.");
  if (!browser.isOpen) throw new Error("The browser is asleep. Wake it first.");
  const num = (v) => Math.max(0, Math.min(Number(v) || 0, 5000));
  switch (msg.type) {
    case "navigate":
      audit("owner_navigate", { url: String(msg.url).slice(0, 300) });
      return browser.navigate(msg.url);
    case "back": return browser.back();
    case "click": return browser.click([num(msg.x), num(msg.y)], { button: msg.button === "right" ? "right" : "left", clickCount: msg.double ? 2 : 1 });
    case "move": return browser.move(num(msg.x), num(msg.y));
    case "wheel": return browser.page.mouse.wheel(Number(msg.dx) || 0, Number(msg.dy) || 0);
    case "key": return browser.page.keyboard.press(String(msg.key).slice(0, 40));
    case "type": return browser.page.keyboard.type(String(msg.text).slice(0, 2000));
  }
}

// Panic button: stop everything, close the browser, sign out every session.
async function panic(ip) {
  audit("panic", { ip });
  agent.stop();
  await browser.close();
  revokeAllSessions();
  broadcast({ type: "panic" });
  wss.clients.forEach((c) => c.close(4001, "panic"));
}

// Wipe saved logins (needs a fresh passkey tap): deletes the whole browser profile.
async function wipeProfile() {
  audit("wipe_profile", {});
  agent.stop();
  await browser.close();
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  log("info", "Saved logins wiped. The browser starts fresh next time.");
  if (wss.clients.size) {
    await browser.start();
    await browser.startStream();
  }
}

// Idle lock: close the browser (and its logged-in sessions in memory) when nothing has happened for a while.
setInterval(async () => {
  if (browser.isOpen && agent.state === "idle" && Date.now() - lastActivity > IDLE_LOCK_MS) {
    audit("idle_lock", {});
    await browser.close();
    log("info", "Browser closed after being idle. It wakes when you need it.");
  }
}, 30_000);

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30_000);

server.listen(PORT, HOST, () => console.log(`COMPUTAAA listening on http://${HOST}:${PORT} (public origin ${PUBLIC_ORIGIN})`));

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => {
    agent.stop();
    await browser.close().catch(() => {});
    process.exit(0);
  });
}
