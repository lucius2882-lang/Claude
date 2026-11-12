import crypto from "node:crypto";
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
import { VIEWPORT } from "./viewport.js";
import { RemoteBrowser } from "./remote.js";
import { Agent } from "./agent.js";

assertAuthConfigured();
const WORKER_TOKEN = process.env.WORKER_TOKEN || "";
if (WORKER_TOKEN.length < 32) {
  console.error("Set WORKER_TOKEN (32+ random characters; the worker needs the same value). Generate one with: openssl rand -hex 32");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) console.warn("ANTHROPIC_API_KEY is not set; commands will fail.");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public");
const WEBAUTHN_JS = path.join(__dirname, "..", "node_modules", "@simplewebauthn", "browser", "dist", "bundle", "index.umd.min.js");
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const IDLE_LOCK_MS = Number(process.env.IDLE_LOCK_MINUTES || 30) * 60 * 1000;
const WORKER_PORT = Number(process.env.WORKER_PORT || 3001);
const WORKER_HOST = process.env.WORKER_HOST || "127.0.0.1";
// Who may show this dashboard inside a frame: your own site only.
const FRAME_ANCESTORS = process.env.FRAME_ANCESTORS || "'none'";

// The browser lives in a separate worker process/container. This is our handle to it.
const browser = new RemoteBrowser("main");
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
browser.on("worker", (online) => {
  audit(online ? "worker_connected" : "worker_disconnected", { worker: browser.name });
  broadcast({ type: "worker", online, sites: browser.sites, browserOpen: browser.isOpen, url: browser.currentUrl });
});
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
    url: browser.currentUrl, browserOpen: browser.isOpen, history, sites: browser.sites, workerOnline: browser.online,
  });
  if (browser.online && !browser.isOpen) await browser.start().catch((e) => log("error", "Browser failed to start: " + e.message));
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
    case "wheel": return browser.wheel(Number(msg.dx) || 0, Number(msg.dy) || 0);
    case "key": return browser.pressKey(String(msg.key).slice(0, 40));
    case "type": return browser.typeText(String(msg.text).slice(0, 2000));
  }
}

// Panic button: stop everything, close the browser, sign out every session.
async function panic(ip) {
  audit("panic", { ip });
  agent.stop();
  await browser.close().catch(() => {});
  revokeAllSessions();
  broadcast({ type: "panic" });
  wss.clients.forEach((c) => c.close(4001, "panic"));
}

// Wipe saved logins (needs a fresh passkey tap): deletes the whole browser profile.
async function wipeProfile() {
  audit("wipe_profile", {});
  agent.stop();
  await browser.wipe();
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

// ---------------- Worker channel (private network only; never routed through the tunnel) ----------------
const workerServer = http.createServer((req, res) => { res.writeHead(404).end(); });
const workerWss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 * 1024 });
const tokenOk = (header = "") => {
  const given = Buffer.from(String(header).replace(/^Bearer\s+/i, ""));
  const want = Buffer.from(WORKER_TOKEN);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
};
workerServer.on("upgrade", (req, socket, head) => {
  const name = String(req.headers["x-worker-name"] || "");
  if (req.url !== "/worker" || !tokenOk(req.headers.authorization) || name !== browser.name) {
    audit("worker_rejected", { ip: req.socket.remoteAddress, name: name.slice(0, 40) });
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    return socket.destroy();
  }
  workerWss.handleUpgrade(req, socket, head, (ws) => {
    ws.once("message", (raw, isBinary) => {
      let hello;
      try { hello = !isBinary && JSON.parse(raw); } catch {}
      if (hello?.type !== "hello") return ws.close(4003, "expected hello");
      browser.attach(ws, hello);
      if (wss.clients.size) {
        (async () => {
          if (!browser.isOpen) await browser.start();
          await browser.startStream();
        })().catch((e) => log("error", "Browser failed to start: " + e.message));
      }
    });
  });
});
workerServer.listen(WORKER_PORT, WORKER_HOST, () => console.log(`Worker channel on ${WORKER_HOST}:${WORKER_PORT}`));

server.listen(PORT, HOST, () => console.log(`COMPUTAAA listening on http://${HOST}:${PORT} (public origin ${PUBLIC_ORIGIN})`));

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => {
    agent.stop();
    process.exit(0); // the worker keeps its browser; it reconnects when we're back
  });
}
