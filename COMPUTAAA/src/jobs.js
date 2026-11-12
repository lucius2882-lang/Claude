// The Jobs agent's memory: your job profile, résumé, and an application tracker.
// Lives in the control plane's data folder (never in the browser worker), owner-only (600).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const MAX_RESUME = 5 * 1024 * 1024;
const STATUSES = ["found", "filled", "handed_to_owner", "submitted", "skipped", "failed"];

export const EMPTY_PROFILE = {
  answers: "",          // work authorization, availability, desired pay, start date, relocation...
  coverLetterStyle: "", // a sample or notes on tone
  preferences: "",      // roles, places, schedule, minimum pay, deal-breakers
};

export class JobsStore {
  constructor(dataDir) {
    this.dir = path.join(path.resolve(dataDir), "jobs");
    fs.mkdirSync(this.dir, { recursive: true, mode: 0o700 });
  }

  #file(name) { return path.join(this.dir, name); }
  #readJson(name, fallback) {
    try { return JSON.parse(fs.readFileSync(this.#file(name), "utf8")); } catch { return fallback; }
  }
  #writeJson(name, value) {
    const tmp = this.#file(name + ".tmp");
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.#file(name));
  }

  // ---- profile ----
  getProfile() {
    return { ...EMPTY_PROFILE, ...this.#readJson("profile.json", {}) };
  }
  saveProfile(input) {
    const p = {};
    for (const k of Object.keys(EMPTY_PROFILE)) p[k] = String(input?.[k] ?? "").slice(0, 20_000);
    this.#writeJson("profile.json", p);
    return p;
  }

  // ---- résumé (PDF only) ----
  saveResume(buf, name) {
    if (!Buffer.isBuffer(buf) || buf.length === 0) throw new Error("Empty file.");
    if (buf.length > MAX_RESUME) throw new Error("Résumé must be under 5 MB.");
    if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("Résumé must be a PDF.");
    const safeName = String(name || "resume.pdf").replace(/[^\w.\- ]+/g, "").slice(0, 80) || "resume.pdf";
    fs.writeFileSync(this.#file("resume.pdf"), buf, { mode: 0o600 });
    this.#writeJson("resume.json", { name: safeName.endsWith(".pdf") ? safeName : safeName + ".pdf", size: buf.length, uploaded: new Date().toISOString() });
  }
  resumeMeta() { return this.#readJson("resume.json", null); }
  resume() {
    const meta = this.resumeMeta();
    if (!meta) return null;
    return { ...meta, data: fs.readFileSync(this.#file("resume.pdf")) };
  }

  // ---- application tracker ----
  applications() { return this.#readJson("applications.json", []); }
  record(entry) {
    const list = this.applications();
    const clean = (v, n = 300) => String(v ?? "").slice(0, n);
    const status = STATUSES.includes(entry?.status) ? entry.status : "found";
    const key = (e) => `${e.company}|${e.role}|${e.url}`.toLowerCase();
    const item = {
      company: clean(entry?.company, 120), role: clean(entry?.role, 160), site: clean(entry?.site, 80),
      url: clean(entry?.url, 500), status, notes: clean(entry?.notes, 1000), updated: new Date().toISOString(),
    };
    const existing = list.find((e) => key(e) === key(item));
    if (existing) Object.assign(existing, item);
    else list.unshift({ id: crypto.randomUUID(), created: item.updated, ...item });
    this.#writeJson("applications.json", list.slice(0, 2000));
    return existing || list[0];
  }

  // ---- recipes: saved application steps for one application system (e.g. greenhouse.io) ----
  recipes() { return this.#readJson("recipes.json", []); }

  /** Save the steps the agent just took. Values for sensitive-looking fields are never stored. */
  saveRecipe({ name, match, steps }) {
    const SENSITIVE = /ssn|social security|date of birth|birth ?date|\bdob\b|password|passcode|bank|routing|account number|credit card|card number|cvv|tax id|\bein\b|driver'?s? licen[cs]e/i;
    const clean = String(match || "").toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9.\-/]/g, "").slice(0, 120);
    if (!clean || !clean.includes(".")) throw new Error("match must be a site like boards.greenhouse.io");
    const kept = [];
    for (const st of steps || []) {
      const desc = `${st.target?.label} ${st.target?.name} ${st.target?.placeholder} ${st.target?.aria}`;
      if (st.op === "fill" && SENSITIVE.test(desc)) continue; // never keep these
      kept.push(st);
    }
    if (!kept.length) throw new Error("no steps to save yet; apply to one job on this system first");
    const list = this.recipes();
    const existing = list.find((r) => r.match === clean);
    const recipe = {
      id: existing?.id || crypto.randomUUID(),
      name: String(name || clean).slice(0, 60),
      match: clean,
      steps: kept.slice(0, 120),
      created: existing?.created || new Date().toISOString(),
      updated: new Date().toISOString(),
      runs: existing?.runs || 0,
      failures: existing?.failures || 0,
    };
    this.#writeJson("recipes.json", [recipe, ...list.filter((r) => r.id !== recipe.id)].slice(0, 200));
    return recipe;
  }

  recipeFor(url, name) {
    const list = this.recipes();
    if (name) {
      const byName = list.find((r) => r.name.toLowerCase() === String(name).toLowerCase() || r.id === name);
      if (byName) return byName;
    }
    let u;
    try { u = new URL(url); } catch { return null; }
    const target = (u.hostname + u.pathname).toLowerCase();
    // the longest matching pattern wins (most specific)
    return list.filter((r) => target === r.match || target.startsWith(r.match) || u.hostname.toLowerCase().endsWith("." + r.match.split("/")[0]) && !r.match.includes("/"))
      .sort((a, b) => b.match.length - a.match.length)[0] || null;
  }

  noteRecipeRun(id, ok) {
    const list = this.recipes();
    const r = list.find((x) => x.id === id);
    if (!r) return;
    r.runs += 1;
    if (!ok) r.failures += 1;
    r.lastRun = new Date().toISOString();
    this.#writeJson("recipes.json", list);
  }

  deleteRecipe(id) {
    const list = this.recipes();
    const next = list.filter((r) => r.id !== id);
    this.#writeJson("recipes.json", next);
    return next.length !== list.length;
  }

  /** What the agent sees at the start of each task. Marked as your own reference data. */
  briefing() {
    const p = this.getProfile();
    const r = this.resumeMeta();
    const recent = this.applications().slice(0, 40)
      .map((a) => `- ${a.company} | ${a.role} | ${a.site} | ${a.status}${a.url ? ` | ${a.url}` : ""}`).join("\n");
    const block = (t, v) => `### ${t}\n${v.trim() || "(not filled in yet)"}`;
    return [
      "## Owner's job profile (written by the owner; use it to fill applications)",
      block("Standard answers", p.answers),
      block("Job preferences", p.preferences),
      block("Cover letter style", p.coverLetterStyle),
      `### Résumé\n${r ? `On file: ${r.name}. Attach it with the upload_resume tool.` : "No résumé uploaded yet. Ask the owner to upload one before applying."}`,
      `### Applications already tracked (newest first; don't apply twice)\n${recent || "(none yet)"}`,
      `### Saved recipes (use apply_with_recipe on job URLs from these systems)\n${
        this.recipes().map((r) => `- ${r.name}: ${r.match} (${r.steps.length} steps, used ${r.runs}×${r.failures ? `, ${r.failures} needed help` : ""})`).join("\n") || "(none yet)"
      }`,
    ].join("\n\n");
  }
}
