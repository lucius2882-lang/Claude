// Control-plane side of a browser worker. Looks like a browser to the agent and the dashboard,
// but every call is a request to the worker over its private WebSocket.
import crypto from "node:crypto";
import { EventEmitter } from "node:events";

const METHODS = [
  "start", "close", "wipe", "screenshot", "zoom", "info", "describeTarget", "describeFocus",
  "navigate", "back", "move", "click", "drag", "scroll", "type", "key", "holdKey", "mouseDown", "mouseUp",
  "settle", "wheel", "pressKey", "typeText", "uploadFile", "describeForRecipe", "pageText", "recipeAct",
];
const SLOW = new Set(["holdKey", "start", "navigate"]);

export class RemoteBrowser extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.ws = null;
    this.pending = new Map();
    this.state = { open: false, url: "", cursor: { x: 0, y: 0 }, sites: [] };
    this.streaming = false; // what the dashboard wants

    for (const m of METHODS) this[m] = (...args) => this.#call(m, args);
  }

  get online() { return !!this.ws; }
  get isOpen() { return this.online && this.state.open; }
  get currentUrl() { return this.state.url; }
  get cursor() { return this.state.cursor; }
  get sites() { return this.state.sites; }
  get ephemeral() { return !!this.state.ephemeral; }

  attach(ws, hello) {
    if (this.ws) this.ws.close(4000, "replaced");
    this.ws = ws;
    Object.assign(this.state, hello.state || {});
    ws.on("message", (raw, isBinary) => {
      if (isBinary) return this.emit("frame", raw);
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      if (msg.type === "event") return this.#event(msg.event, msg.data);
      if (msg.type === "result") {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        clearTimeout(p.timer);
        if (msg.state) Object.assign(this.state, msg.state);
        if (msg.ok) p.resolve(msg.result?.__b64 !== undefined ? Buffer.from(msg.result.__b64, "base64") : msg.result);
        else p.reject(new Error(msg.error));
      }
    });
    ws.on("close", () => {
      if (this.ws !== ws) return;
      this.ws = null;
      for (const p of this.pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error("The browser worker disconnected."));
      }
      this.pending.clear();
      this.emit("worker", false);
    });
    this.emit("worker", true);
    if (this.streaming) this.#call("startStream", []).catch(() => {});
  }

  #event(event, data) {
    if (event === "navigated") this.state.url = data;
    if (event === "opened") this.state.open = true;
    if (event === "closed") this.state.open = false;
    this.emit(event, data);
  }

  #call(method, args) {
    if (!this.ws) return Promise.reject(new Error("The browser worker is offline."));
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, SLOW.has(method) ? 330_000 : 60_000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ type: "rpc", id, method, args }));
    });
  }

  async startStream() {
    this.streaming = true;
    if (this.ws) await this.#call("startStream", []);
  }

  async stopStream() {
    this.streaming = false;
    if (this.ws) await this.#call("stopStream", []).catch(() => {});
  }
}
