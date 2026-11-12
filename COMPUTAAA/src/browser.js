// Owns the single persistent Chromium profile: launching it, tracking the active tab,
// streaming frames (CDP screencast), and executing low-level mouse/keyboard input
// for both the AI agent and the human takeover controls.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { chromium } from "playwright";

import { VIEWPORT } from "./viewport.js";
export { VIEWPORT };

// Claude sends xdotool-style key names; Playwright wants its own names.
const KEY_MAP = {
  return: "Enter", enter: "Enter", kp_enter: "Enter", backspace: "Backspace", tab: "Tab",
  escape: "Escape", esc: "Escape", space: "Space", delete: "Delete", home: "Home", end: "End",
  page_up: "PageUp", pageup: "PageUp", prior: "PageUp", page_down: "PageDown", pagedown: "PageDown", next: "PageDown",
  up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", insert: "Insert",
  ctrl: "Control", control: "Control", control_l: "Control", control_r: "Control",
  shift: "Shift", shift_l: "Shift", shift_r: "Shift", alt: "Alt", alt_l: "Alt", alt_r: "Alt",
  super: "Meta", super_l: "Meta", meta: "Meta", cmd: "Meta", command: "Meta", win: "Meta",
  minus: "Minus", equal: "Equal", plus: "Equal", comma: "Comma", period: "Period", slash: "Slash",
};

export function toPlaywrightCombo(combo) {
  return String(combo)
    .split("+")
    .map((k) => {
      const t = k.trim();
      const mapped = KEY_MAP[t.toLowerCase()];
      if (mapped) return mapped;
      if (/^f\d{1,2}$/i.test(t)) return t.toUpperCase();
      return t.length === 1 ? t : t[0].toUpperCase() + t.slice(1);
    })
    .join("+");
}

export class BrowserManager extends EventEmitter {
  constructor({ profileDir, headless = true, executablePath, allowedSites = [], ephemeral = false }) {
    super();
    this.allowedSites = allowedSites; // ["*"] = anywhere
    this.lastActivity = Date.now();
    this.baseProfileDir = path.resolve(profileDir);
    this.profileDir = this.baseProfileDir;
    // Ephemeral: every session starts with an empty browser in a throwaway folder,
    // and that folder (cookies, logins, history) is deleted when the session ends.
    this.ephemeral = ephemeral;
    this.headless = headless;
    this.executablePath = executablePath || undefined;
    this.context = null;
    this.page = null;
    this.cdp = null;
    this.streaming = false;
    this.cursor = { x: 0, y: 0 };
  }

  get isOpen() {
    return !!this.context;
  }

  /** Main-frame navigations are only allowed to the sites you list in ALLOWED_SITES. */
  siteAllowed(url) {
    let u;
    try { u = new URL(url); } catch { return false; }
    if (u.href === "about:blank") return true;
    if (!["http:", "https:"].includes(u.protocol)) return false;
    if (this.allowedSites.includes("*")) return true;
    const host = u.hostname.toLowerCase();
    return this.allowedSites.some((d) => host === d || host.endsWith("." + d));
  }

  async start() {
    if (this.context) return;
    if (this.ephemeral) {
      fs.mkdirSync(os.tmpdir(), { recursive: true });
      this.profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "computaaa-session-"));
    }
    // Profile = cookies, localStorage, IndexedDB. Owner-only permissions.
    fs.mkdirSync(this.profileDir, { recursive: true, mode: 0o700 });
    fs.chmodSync(this.profileDir, 0o700);

    this.context = await chromium.launchPersistentContext(this.profileDir, {
      headless: this.headless,
      executablePath: this.executablePath,
      viewport: VIEWPORT,
      deviceScaleFactor: 2, // lets `zoom` return real extra detail
      locale: "en-US",
      acceptDownloads: false,
      serviceWorkers: "block", // so every request goes through the allowlist below
      permissions: [],
      args: ["--disable-blink-features=AutomationControlled"],
    });
    await this.context.route("**/*", (route) => {
      const req = route.request();
      let mainFrame = false;
      try { mainFrame = req.isNavigationRequest() && req.frame() === req.frame().page().mainFrame(); } catch {}
      if (mainFrame && !this.siteAllowed(req.url())) {
        this.emit("blocked", req.url());
        return route.abort("blockedbyclient");
      }
      return route.continue();
    });
    this.context.on("page", (p) => this.#setActive(p));
    this.context.on("close", () => { this.context = null; this.page = null; this.cdp = null; });
    const pages = this.context.pages();
    await this.#setActive(pages[pages.length - 1] || (await this.context.newPage()));
    this.emit("opened");
  }

  async #setActive(page) {
    if (this.page === page) return;
    this.page = page;
    page.on("close", () => {
      if (this.page !== page || !this.context) return;
      const rest = this.context.pages();
      if (rest.length) this.#setActive(rest[rest.length - 1]);
      else this.context.newPage(); // fires "page" -> becomes active
    });
    page.on("framenavigated", (f) => f === page.mainFrame() && this.emit("navigated", page.url()));
    await page.bringToFront().catch(() => {});
    this.emit("navigated", page.url());
    if (this.streaming) await this.#startScreencast();
  }

  // ---------- live view ----------
  async startStream() {
    this.streaming = true;
    if (this.context) await this.#startScreencast();
  }

  async stopStream() {
    this.streaming = false;
    await this.cdp?.send("Page.stopScreencast").catch(() => {});
    await this.cdp?.detach().catch(() => {});
    this.cdp = null;
  }

  async #startScreencast() {
    await this.cdp?.send("Page.stopScreencast").catch(() => {});
    await this.cdp?.detach().catch(() => {});
    const page = this.page;
    const cdp = await this.context.newCDPSession(page);
    this.cdp = cdp;
    cdp.on("Page.screencastFrame", ({ data, sessionId }) => {
      cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
      if (this.cdp === cdp) this.emit("frame", Buffer.from(data, "base64"));
    });
    await cdp.send("Page.startScreencast", {
      format: "jpeg", quality: 60, maxWidth: VIEWPORT.width, maxHeight: VIEWPORT.height, everyNthFrame: 1,
    });
    // Static pages may not emit frames until something changes; push one now.
    this.page.screenshot({ type: "jpeg", quality: 60, scale: "css" }).then((b) => this.emit("frame", b)).catch(() => {});
  }

  // ---------- state for the agent ----------
  async screenshot() {
    return this.page.screenshot({ type: "png", scale: "css" }); // exactly 1280x800
  }

  async zoom([x0, y0, x1, y1]) {
    const clip = { x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.abs(x1 - x0), height: Math.abs(y1 - y0) };
    if (clip.width < 4 || clip.height < 4) throw new Error("zoom region too small");
    return this.page.screenshot({ type: "png", scale: "device", clip });
  }

  /** What's under (x, y)? Used by the approval guard before the agent clicks. */
  async describeTarget(x, y) {
    return this.page.evaluate(([x, y]) => {
      let el = document.elementFromPoint(x, y);
      if (!el) return null;
      while (el.shadowRoot) {
        const inner = el.shadowRoot.elementFromPoint(x, y);
        if (!inner || inner === el) break;
        el = inner;
      }
      if (el.tagName === "IFRAME" || el.tagName === "FRAME") return { iframe: true, src: el.src || "" };
      const t = el.closest("button,a,[role=button],[role=link],[role=menuitem],[role=tab],input,label,summary") || el;
      const text = [t.innerText, t.getAttribute("aria-label"), t.getAttribute("title"), t.value, t.getAttribute("alt")]
        .filter((v) => typeof v === "string" && v.trim()).join(" ").replace(/\s+/g, " ").trim().slice(0, 160);
      const form = t.closest("form");
      const isSubmit = !!form && t.matches("button:not([type=button]):not([type=reset]), input[type=submit], input[type=image]");
      return { tag: t.tagName.toLowerCase(), text, isSubmit };
    }, [x, y]);
  }

  /** What has keyboard focus? Used to decide whether Enter would submit something. */
  async describeFocus() {
    return this.page.evaluate(() => {
      let el = document.activeElement;
      while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
      if (!el || el === document.body) return { kind: "none" };
      if (el.tagName === "IFRAME") return { kind: "iframe" };
      const label = [el.getAttribute("aria-label"), el.getAttribute("placeholder"), el.getAttribute("name"), el.id].filter(Boolean).join(" ");
      const form = el.closest("form");
      return {
        kind: el.isContentEditable ? "editable" : el.tagName.toLowerCase(),
        type: (el.getAttribute("type") || "").toLowerCase(),
        role: el.getAttribute("role") || "",
        label: label.slice(0, 120),
        inForm: !!form,
        searchForm: !!form && (form.getAttribute("role") === "search" || /search/i.test(form.action || "")),
      };
    });
  }

  async info() {
    const title = await this.page.title().catch(() => "");
    const tabs = this.context.pages().length;
    return `URL: ${this.page.url()}\nTitle: ${title}\nOpen tabs: ${tabs}`;
  }

  // ---------- input (used by agent and human) ----------
  async navigate(url) {
    let u = String(url).trim();
    if (!/^[a-z]+:\/\//i.test(u)) u = "https://" + u;
    const parsed = new URL(u);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only http(s) URLs are allowed");
    if (!this.siteAllowed(parsed.href)) {
      this.emit("blocked", parsed.href);
      throw new Error(`${parsed.hostname} is not in ALLOWED_SITES`);
    }
    await this.page.goto(parsed.href, { waitUntil: "domcontentloaded", timeout: 30000 });
  }

  async back() {
    await this.page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 });
  }

  async move(x, y) {
    this.cursor = { x, y };
    await this.page.mouse.move(x, y);
  }

  async click([x, y] = [this.cursor.x, this.cursor.y], { button = "left", clickCount = 1, modifiers } = {}) {
    const mods = modifiers ? toPlaywrightCombo(modifiers).split("+") : [];
    for (const m of mods) await this.page.keyboard.down(m);
    try {
      await this.move(x, y);
      await this.page.mouse.click(x, y, { button, clickCount });
    } finally {
      for (const m of mods.reverse()) await this.page.keyboard.up(m);
    }
  }

  async drag([sx, sy], [ex, ey]) {
    await this.move(sx, sy);
    await this.page.mouse.down();
    await this.page.mouse.move(ex, ey, { steps: 12 });
    await this.page.mouse.up();
    this.cursor = { x: ex, y: ey };
  }

  async scroll(direction, amount = 3, coordinate) {
    if (coordinate) await this.move(...coordinate);
    const px = 100 * amount;
    const d = { up: [0, -px], down: [0, px], left: [-px, 0], right: [px, 0] }[direction];
    if (!d) throw new Error(`bad scroll_direction ${direction}`);
    await this.page.mouse.wheel(d[0], d[1]);
  }

  async type(text) {
    await this.page.keyboard.type(String(text), { delay: 15 });
  }

  async key(combo, repeat = 1) {
    const k = toPlaywrightCombo(combo);
    for (let i = 0; i < Math.min(repeat, 100); i++) await this.page.keyboard.press(k);
  }

  async holdKey(combo, seconds) {
    const keys = toPlaywrightCombo(combo).split("+");
    for (const k of keys) await this.page.keyboard.down(k);
    await sleep(Math.min(seconds, 300) * 1000);
    for (const k of keys.reverse()) await this.page.keyboard.up(k);
  }

  async mouseDown() { await this.page.mouse.down(); }
  async mouseUp() { await this.page.mouse.up(); }

  async settle() {
    await this.page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
    await sleep(400);
  }

  /**
   * Attach a file (your résumé) to the upload control at (x, y). Works with a visible
   * file input, a label/button that opens the file picker, or a page's single hidden input.
   */
  async uploadFile([x, y], file) {
    const payload = { name: String(file?.name || "resume.pdf"), mimeType: "application/pdf", buffer: Buffer.from(String(file?.b64 || ""), "base64") };
    if (!payload.buffer.length) throw new Error("no file to upload");
    const direct = await this.page.evaluateHandle(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      const input = el?.closest("label")?.control || el?.querySelector?.("input[type=file]") || el;
      return input?.tagName === "INPUT" && input.type === "file" ? input : null;
    }, [x, y]);
    const el = direct.asElement();
    if (el) {
      await el.setInputFiles(payload);
      return "attached";
    }
    try {
      const [chooser] = await Promise.all([
        this.page.waitForEvent("filechooser", { timeout: 8000 }),
        this.page.mouse.click(x, y),
      ]);
      await chooser.setFiles(payload);
      return "attached";
    } catch {
      const inputs = this.page.locator("input[type=file]");
      if ((await inputs.count()) === 1) {
        await inputs.first().setInputFiles(payload);
        return "attached";
      }
      throw new Error("couldn't find an upload control there; point at the résumé upload button or field");
    }
  }

  // ---- recipes: describe fields/buttons by name so steps can be replayed on another job ----

  /** A stable description of the field or button at (x, y), or of the focused element. */
  async describeForRecipe(x, y) {
    return this.page.evaluate(DESCRIBE, x == null ? null : [x, y]);
  }

  /** Visible text of the page (for writing a cover letter about this job). */
  async pageText() {
    return this.page.evaluate(() => (document.body?.innerText || "").replace(/\n{3,}/g, "\n\n").slice(0, 12000));
  }

  /**
   * Find the element a recipe step describes and act on it.
   * op: "locate" (just report where it is) | "click" | "fill" | "upload"
   */
  async recipeAct(op, target, payload = {}) {
    const handle = await this.page.evaluateHandle(FIND, target);
    const el = handle.asElement();
    const what = target?.label || target?.text || target?.placeholder || target?.name || target?.tag || "element";
    if (!el) return { ok: false, reason: `couldn't find "${what}" on this page` };
    await el.scrollIntoViewIfNeeded().catch(() => {});
    const box = await el.boundingBox();
    const point = box ? [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)] : null;
    if (op === "locate") return { ok: !!point, point, reason: point ? "" : `"${what}" isn't visible` };
    if (op === "click") {
      if (!point) return { ok: false, reason: `"${what}" isn't visible` };
      await this.click(point);
    } else if (op === "fill") {
      const tag = await el.evaluate((n) => n.tagName.toLowerCase());
      const value = String(payload.value ?? "");
      if (tag === "select") {
        await el.selectOption({ label: value }).catch(() => el.selectOption(value));
      } else {
        await el.fill(value);
      }
    } else if (op === "upload") {
      const isFile = await el.evaluate((n) => n.tagName === "INPUT" && n.type === "file");
      if (isFile) {
        await el.setInputFiles({ name: String(payload.name || "resume.pdf"), mimeType: "application/pdf", buffer: Buffer.from(String(payload.b64 || ""), "base64") });
      } else {
        if (!point) return { ok: false, reason: `"${what}" isn't visible` };
        await this.uploadFile(point, payload);
      }
    } else {
      return { ok: false, reason: `unknown step ${op}` };
    }
    return { ok: true, point };
  }

  // ---- raw input from the owner's own hands (no approval checks: it's you) ----
  async wheel(dx, dy) { await this.page.mouse.wheel(Number(dx) || 0, Number(dy) || 0); }
  async pressKey(key) { await this.page.keyboard.press(String(key).slice(0, 40)); }
  async typeText(text) { await this.page.keyboard.type(String(text).slice(0, 2000)); }

  state() {
    return { open: this.isOpen, url: this.page?.url() || "", cursor: this.cursor, sites: this.allowedSites, ephemeral: this.ephemeral };
  }

  /** Delete every saved login: close the browser and remove the whole profile folder. */
  async wipe() {
    await this.close();
    fs.rmSync(this.profileDir, { recursive: true, force: true });
  }

  async close() {
    const wasStreaming = this.streaming;
    await this.stopStream();
    this.streaming = wasStreaming; // resume streaming if the browser is reopened
    const ctx = this.context;
    this.context = null;
    this.page = null;
    await ctx?.close().catch(() => {});
    if (this.ephemeral && this.profileDir !== this.baseProfileDir) {
      fs.rmSync(this.profileDir, { recursive: true, force: true }); // the session dies with everything in it
      this.profileDir = this.baseProfileDir;
    }
    this.emit("closed");
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- page-side helpers for recipes (run inside the web page) ----

// Describe the element at [x, y] (or the focused element) by things that survive across job postings:
// label text, name, placeholder, aria-label, button text. Auto-generated ids are ignored.
const DESCRIBE = (pt) => {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim().slice(0, 120);
  let el = pt ? document.elementFromPoint(pt[0], pt[1]) : document.activeElement;
  while (el?.shadowRoot && (pt ? el.shadowRoot.elementFromPoint(pt[0], pt[1]) : el.shadowRoot.activeElement)) {
    const inner = pt ? el.shadowRoot.elementFromPoint(pt[0], pt[1]) : el.shadowRoot.activeElement;
    if (!inner || inner === el) break;
    el = inner;
  }
  if (!el || el === document.body) return null;
  const field = el.closest("input,textarea,select,[contenteditable=''],[contenteditable=true]");
  const control = field || el.closest("label")?.control || el.closest("button,a,[role=button],[role=option],[role=radio],[role=checkbox],input[type=submit],summary,label") || el;
  const labelText = () => {
    if (control.labels?.length) return norm([...control.labels].map((l) => l.innerText).join(" "));
    const by = control.getAttribute("aria-labelledby");
    if (by) return norm(by.split(/\s+/).map((id) => document.getElementById(id)?.innerText || "").join(" "));
    const wrap = control.closest("label");
    return wrap ? norm(wrap.innerText) : "";
  };
  const id = control.id && !/\d{3,}|[a-f0-9]{8,}|^:r|^react|^ember|^mui/i.test(control.id) ? control.id : "";
  return {
    tag: control.tagName.toLowerCase(),
    type: (control.getAttribute("type") || "").toLowerCase(),
    role: control.getAttribute("role") || "",
    id,
    name: control.getAttribute("name") || "",
    label: labelText(),
    placeholder: norm(control.getAttribute("placeholder")),
    aria: norm(control.getAttribute("aria-label")),
    text: field ? "" : norm(control.innerText || control.value || control.getAttribute("title")),
  };
};

// Find the element that best matches a description. Returns null when nothing matches well enough.
const FIND = (t) => {
  if (!t) return null;
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return (r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none") || (el.tagName === "INPUT" && el.type === "file");
  };
  const labelOf = (el) => {
    if (el.labels?.length) return norm([...el.labels].map((l) => l.innerText).join(" "));
    const by = el.getAttribute("aria-labelledby");
    if (by) return norm(by.split(/\s+/).map((id) => document.getElementById(id)?.innerText || "").join(" "));
    return norm(el.closest("label")?.innerText);
  };
  const sel = ["input", "textarea", "select"].includes(t.tag) ? "input,textarea,select"
    : "button,a,[role=button],[role=option],[role=radio],[role=checkbox],input[type=submit],input[type=button],summary,label";
  let best = null, bestScore = 0;
  for (const el of document.querySelectorAll(sel)) {
    if (!visible(el)) continue;
    let s = 0;
    if (t.id && el.id === t.id) s += 6;
    if (t.name && el.getAttribute("name") === t.name) s += 5;
    if (t.label && labelOf(el) === norm(t.label)) s += 5;
    if (t.placeholder && norm(el.getAttribute("placeholder")) === norm(t.placeholder)) s += 4;
    if (t.aria && norm(el.getAttribute("aria-label")) === norm(t.aria)) s += 4;
    if (t.text && norm(el.innerText || el.value) === norm(t.text)) s += 5;
    if (t.type && (el.getAttribute("type") || "").toLowerCase() === t.type) s += 1;
    if (el.tagName.toLowerCase() === t.tag) s += 1;
    if (s > bestScore) { best = el; bestScore = s; }
  }
  return bestScore >= 4 ? best : null;
};
