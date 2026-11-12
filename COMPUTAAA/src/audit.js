// Append-only audit trail (data/audit.log, one JSON object per line) plus optional
// phone alerts through ntfy (https://ntfy.sh or your own ntfy server).
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
const LOG = path.join(DATA_DIR, "audit.log");
fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });

// Events that also ping your phone.
const ALERT_ON = new Set([
  "login", "login_recovery_code", "login_failed_burst", "enroll", "approval_requested",
  "panic", "wipe_profile", "gate_rejected",
]);

export function audit(event, details = {}) {
  const line = JSON.stringify({ at: new Date().toISOString(), event, ...details });
  try {
    fs.appendFileSync(LOG, line + "\n", { mode: 0o600 });
  } catch (err) {
    console.error("audit write failed", err.message);
  }
  if (ALERT_ON.has(event)) alert(event, details);
}

let lastAlert = 0;
function alert(event, details) {
  const url = process.env.NTFY_URL;
  if (!url) return;
  if (Date.now() - lastAlert < 2000 && event === "gate_rejected") return; // don't spam
  lastAlert = Date.now();
  const body = `${event.replace(/_/g, " ")}${details.description ? `: ${details.description}` : ""}${details.ip ? ` (from ${details.ip})` : ""}`;
  fetch(url, {
    method: "POST",
    headers: { Title: "COMPUTAAA", Priority: event.includes("approval") || event === "panic" ? "high" : "default", Tags: "lock" },
    body: body.slice(0, 500),
  }).catch(() => {});
}

export function readAudit(limit = 200) {
  try {
    const lines = fs.readFileSync(LOG, "utf8").trim().split("\n");
    return lines.slice(-limit).map((l) => JSON.parse(l)).reverse();
  } catch {
    return [];
  }
}
