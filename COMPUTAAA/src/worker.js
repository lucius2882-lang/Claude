// A browser worker: owns one logged-in browser profile and nothing else.
// It holds no API key, no passkeys and no dashboard. It connects OUT to the control plane
// (so it needs no open port) and only runs the browser actions the control plane asks for.
import WebSocket from "ws";
import { BrowserManager } from "./browser.js";

const NAME = process.env.WORKER_NAME || "main";
const TOKEN = process.env.WORKER_TOKEN || "";
const CONTROL_URL = process.env.CONTROL_URL || "ws://127.0.0.1:3001/worker";
const SITES = (process.env.ALLOWED_SITES || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

if (TOKEN.length < 32) {
  console.error("Set WORKER_TOKEN (32+ random characters, the same value the control plane has). Generate one with: openssl rand -hex 32");
  process.exit(1);
}
if (!SITES.length) {
  console.error('Set ALLOWED_SITES (e.g. "google.com,amazon.com"), or "*" to allow every site.');
  process.exit(1);
}

const browser = new BrowserManager({
  profileDir: process.env.PROFILE_DIR || "./data/profile",
  headless: process.env.HEADLESS !== "false",
  executablePath: process.env.CHROMIUM_PATH,
  allowedSites: SITES,
  ephemeral: process.env.EPHEMERAL === "true",
});

// The only things the control plane may ask for. Anything else is refused.
const METHODS = new Set([
  "start", "close", "wipe", "state", "screenshot", "zoom", "info", "describeTarget", "describeFocus",
  "navigate", "back", "move", "click", "drag", "scroll", "type", "key", "holdKey", "mouseDown", "mouseUp",
  "settle", "startStream", "stopStream", "wheel", "pressKey", "typeText", "uploadFile",
  "describeForRecipe", "pageText", "recipeAct",
]);

let ws = null;
let backoff = 1000;

const send = (obj) => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify(obj));
const encode = (v) => (Buffer.isBuffer(v) ? { __b64: v.toString("base64") } : v);

browser.on("frame", (buf) => ws?.readyState === WebSocket.OPEN && ws.bufferedAmount < 4_000_000 && ws.send(buf, { binary: true }));
for (const ev of ["navigated", "blocked", "opened", "closed"]) {
  browser.on(ev, (data) => send({ type: "event", event: ev, data }));
}

function connect() {
  ws = new WebSocket(CONTROL_URL, {
    headers: { authorization: `Bearer ${TOKEN}`, "x-worker-name": NAME },
    maxPayload: 16 * 1024 * 1024, // room for a résumé upload
    handshakeTimeout: 10_000,
  });

  ws.on("open", () => {
    backoff = 1000;
    console.log(`[${NAME}] connected to control plane`);
    send({ type: "hello", name: NAME, state: browser.state() });
  });

  ws.on("message", async (raw, isBinary) => {
    if (isBinary) return;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type !== "rpc") return;
    const { id, method, args = [] } = msg;
    if (!METHODS.has(method) || !Array.isArray(args)) return send({ type: "result", id, ok: false, error: `refused: ${method}` });
    try {
      const result = await browser[method](...args);
      send({ type: "result", id, ok: true, result: encode(result), state: browser.state() });
    } catch (err) {
      send({ type: "result", id, ok: false, error: err?.message || String(err), state: browser.isOpen ? browser.state() : undefined });
    }
  });

  ws.on("close", (code) => {
    browser.stopStream().catch(() => {});
    if (code === 4003) console.error(`[${NAME}] control plane rejected this worker (check WORKER_TOKEN and WORKER_NAME)`);
    setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 30_000);
  });
  ws.on("error", () => {}); // "close" handles reconnects
}

connect();

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => {
    await browser.close().catch(() => {});
    process.exit(0);
  });
}
