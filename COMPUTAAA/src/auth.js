// Two locks, both on this server:
//   1. Cloudflare Access: every request must carry a valid Cloudflare Access JWT for OWNER_EMAIL,
//      so even if someone finds the server's address, they can't get past the tunnel.
//   2. Passkeys (Face ID / Touch ID / security key): the only way to sign in, with one-time
//      recovery codes as a backup. Risky actions need a *fresh* passkey tap ("step-up").
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  generateAuthenticationOptions, generateRegistrationOptions,
  verifyAuthenticationResponse, verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { audit } from "./audit.js";

// ---------------- config ----------------
export const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || "";
const RP_ID = PUBLIC_ORIGIN ? new URL(PUBLIC_ORIGIN).hostname : "";
const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
const STORE = path.join(DATA_DIR, "auth.json");
const COOKIE = "__Host-sid";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h absolute
const IDLE_TTL_MS = 30 * 60 * 1000; // 30 min idle

const GATE_DISABLED = process.env.CF_ACCESS_DISABLED === "true";
const TEAM = (process.env.CF_ACCESS_TEAM_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const AUD = process.env.CF_ACCESS_AUD || "";
const OWNER_EMAIL = (process.env.OWNER_EMAIL || "").toLowerCase();
const JWKS = TEAM ? createRemoteJWKSet(new URL(`https://${TEAM}/cdn-cgi/access/certs`)) : null;

export function assertAuthConfigured() {
  const problems = [];
  if (!/^https?:\/\/[^/]+$/.test(PUBLIC_ORIGIN)) problems.push("PUBLIC_ORIGIN must be like https://agent.example.com (no trailing slash)");
  if (GATE_DISABLED) {
    if (!/^http:\/\/localhost(:\d+)?$/.test(PUBLIC_ORIGIN)) problems.push("CF_ACCESS_DISABLED=true is only allowed with PUBLIC_ORIGIN=http://localhost:<port>");
    else console.warn("\n⚠️  Cloudflare Access check is OFF (local development only).\n");
  } else if (!TEAM || !AUD || !OWNER_EMAIL) {
    problems.push("Set CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD and OWNER_EMAIL (see README)");
  }
  if (problems.length) {
    console.error("Config error:\n - " + problems.join("\n - "));
    process.exit(1);
  }
}

// ---------------- persistent store (data/auth.json, mode 600) ----------------
function load() {
  try {
    return JSON.parse(fs.readFileSync(STORE, "utf8"));
  } catch {
    return { userId: crypto.randomBytes(16).toString("base64url"), credentials: [], recovery: [], enroll: null };
  }
}
function save(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  const tmp = STORE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, STORE);
}
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Used by `npm run enroll`: one-time link to register a passkey, valid 15 minutes. */
export function issueEnrollToken() {
  const db = load();
  const token = crypto.randomBytes(24).toString("base64url");
  db.enroll = { hash: sha256(token), expires: Date.now() + 15 * 60 * 1000 };
  save(db);
  return token;
}

// ---------------- Cloudflare Access ----------------
export async function verifyAccessJwt(token, jwks = JWKS, { team = TEAM, aud = AUD, email = OWNER_EMAIL } = {}) {
  const { payload } = await jwtVerify(token, jwks, { issuer: `https://${team}`, audience: aud, algorithms: ["RS256"] });
  if (String(payload.email || "").toLowerCase() !== email) throw new Error("wrong identity");
  return payload;
}

async function gateOk(headers) {
  if (GATE_DISABLED) return true;
  const token = headers["cf-access-jwt-assertion"];
  if (!token) return false;
  try {
    await verifyAccessJwt(token);
    return true;
  } catch {
    return false;
  }
}

export function clientIp(req) {
  return (!GATE_DISABLED && req.headers["cf-connecting-ip"]) || req.socket.remoteAddress;
}

export async function cfGate(req, res, next) {
  if (await gateOk(req.headers)) return next();
  audit("gate_rejected", { ip: clientIp(req), path: req.path });
  res.status(403).send("Forbidden");
}
export const gateOkForUpgrade = (req) => gateOk(req.headers);

// ---------------- sessions ----------------
const sessions = new Map(); // token -> { created, lastSeen }

function parseCookies(header = "") {
  return Object.fromEntries(
    header.split(";").map((p) => p.trim()).filter(Boolean).map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), decodeURIComponent(p.slice(i + 1))];
    }),
  );
}

export function sessionFromHeaders(headers) {
  const token = parseCookies(headers.cookie)[COOKIE];
  const s = token && sessions.get(token);
  const now = Date.now();
  if (!s) return null;
  if (now - s.created > SESSION_TTL_MS || now - s.lastSeen > IDLE_TTL_MS) {
    sessions.delete(token);
    return null;
  }
  s.lastSeen = now;
  return token;
}

function startSession(res) {
  const token = crypto.randomBytes(32).toString("base64url");
  sessions.set(token, { created: Date.now(), lastSeen: Date.now() });
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}`);
}

export function revokeAllSessions() {
  sessions.clear();
}

export function requireAuth(req, res, next) {
  if (sessionFromHeaders(req.headers)) return next();
  if (req.method === "GET" && req.path === "/") return res.redirect("/login.html");
  res.status(401).json({ error: "unauthorized" });
}

export function requireSameOrigin(req, res, next) {
  if (req.get("origin") === PUBLIC_ORIGIN) return next();
  res.status(403).json({ error: "bad origin" });
}
export const originAllowed = (o) => o === PUBLIC_ORIGIN;

// ---------------- brute-force limits ----------------
const failures = new Map();
let globalFails = [];
const WINDOW = 15 * 60 * 1000;
function limited(ip) {
  const now = Date.now();
  const mine = (failures.get(ip) || []).filter((t) => now - t < WINDOW);
  failures.set(ip, mine);
  globalFails = globalFails.filter((t) => now - t < 60 * 60 * 1000);
  return mine.length >= 5 || globalFails.length >= 20;
}
function fail(ip, why) {
  failures.set(ip, [...(failures.get(ip) || []), Date.now()]);
  globalFails.push(Date.now());
  audit("login_failed", { ip, why });
  if (failures.get(ip).length === 5) audit("login_failed_burst", { ip });
}

// ---------------- WebAuthn challenges ----------------
const challenges = new Map(); // id -> { challenge, purpose, ref, expires }
function holdChallenge(challenge, purpose, ref) {
  const id = crypto.randomBytes(16).toString("base64url");
  challenges.set(id, { challenge, purpose, ref, expires: Date.now() + 2 * 60 * 1000 });
  return id;
}
function takeChallenge(id, purpose) {
  const c = challenges.get(id);
  challenges.delete(id);
  if (!c || c.purpose !== purpose || c.expires < Date.now()) throw new Error("challenge expired, try again");
  return c;
}

async function verifyPasskey(response, expectedChallenge) {
  const db = load();
  const cred = db.credentials.find((c) => c.id === response?.id);
  if (!cred) throw new Error("unknown passkey");
  const { verified, authenticationInfo } = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: PUBLIC_ORIGIN,
    expectedRPID: RP_ID,
    credential: { id: cred.id, publicKey: Buffer.from(cred.publicKey, "base64url"), counter: cred.counter, transports: cred.transports },
    requireUserVerification: true,
  });
  if (!verified) throw new Error("passkey not verified");
  cred.counter = authenticationInfo.newCounter;
  cred.lastUsed = new Date().toISOString();
  save(db);
  return cred;
}

async function authOptions() {
  const db = load();
  return generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "required",
    allowCredentials: db.credentials.map((c) => ({ id: c.id, transports: c.transports })),
  });
}

// ---------------- routes ----------------
/**
 * @param {{ onStepUp: (purpose: string, ref: string) => void, stepUpPurposes: string[] }} hooks
 */
export function authRouter({ onStepUp, stepUpPurposes }) {
  const r = express.Router();
  const j = express.json({ limit: "20kb" });

  r.get("/api/me", (req, res) => {
    res.json({ authed: !!sessionFromHeaders(req.headers), enrolled: load().credentials.length > 0 });
  });

  // ----- enrollment (needs the one-time token from `npm run enroll`) -----
  r.post("/api/enroll/options", requireSameOrigin, j, async (req, res) => {
    const ip = clientIp(req);
    if (limited(ip)) return res.status(429).json({ error: "Too many attempts. Try later." });
    const db = load();
    const token = String(req.body?.token || "");
    if (!db.enroll || db.enroll.expires < Date.now() || !safeEq(sha256(token), db.enroll.hash)) {
      fail(ip, "bad enroll token");
      return res.status(401).json({ error: "This enrollment link is invalid or expired. Run `npm run enroll` again." });
    }
    const options = await generateRegistrationOptions({
      rpName: "COMPUTAAA",
      rpID: RP_ID,
      userName: OWNER_EMAIL || "owner",
      userID: Buffer.from(db.userId, "base64url"),
      attestationType: "none",
      excludeCredentials: db.credentials.map((c) => ({ id: c.id, transports: c.transports })),
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
    });
    res.json({ options, challengeId: holdChallenge(options.challenge, "enroll") });
  });

  r.post("/api/enroll/verify", requireSameOrigin, j, async (req, res) => {
    const ip = clientIp(req);
    try {
      const db = load();
      const token = String(req.body?.token || "");
      if (!db.enroll || db.enroll.expires < Date.now() || !safeEq(sha256(token), db.enroll.hash)) throw new Error("enrollment link expired");
      const { challenge } = takeChallenge(req.body?.challengeId, "enroll");
      const { verified, registrationInfo } = await verifyRegistrationResponse({
        response: req.body?.response,
        expectedChallenge: challenge,
        expectedOrigin: PUBLIC_ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: true,
      });
      if (!verified) throw new Error("passkey not verified");
      const c = registrationInfo.credential;
      db.credentials.push({
        id: c.id, publicKey: Buffer.from(c.publicKey).toString("base64url"), counter: c.counter,
        transports: c.transports || [], name: String(req.body?.name || "Passkey").slice(0, 40), created: new Date().toISOString(),
      });
      db.enroll = null; // single use
      let recoveryCodes = null;
      if (db.recovery.length === 0) {
        recoveryCodes = Array.from({ length: 8 }, () => crypto.randomBytes(8).toString("hex").replace(/(.{4})/g, "$1-").slice(0, 19));
        db.recovery = recoveryCodes.map((code) => sha256(code));
      }
      save(db);
      audit("enroll", { ip, passkeys: db.credentials.length });
      startSession(res);
      res.json({ ok: true, recoveryCodes });
    } catch (err) {
      fail(ip, "enroll: " + err.message);
      res.status(400).json({ error: err.message });
    }
  });

  // ----- sign in -----
  r.post("/api/login/options", requireSameOrigin, async (req, res) => {
    if (limited(clientIp(req))) return res.status(429).json({ error: "Too many attempts. Try later." });
    if (!load().credentials.length) return res.status(409).json({ error: "No passkey yet. Run `npm run enroll` on the server." });
    const options = await authOptions();
    res.json({ options, challengeId: holdChallenge(options.challenge, "login") });
  });

  r.post("/api/login/verify", requireSameOrigin, j, async (req, res) => {
    const ip = clientIp(req);
    if (limited(ip)) return res.status(429).json({ error: "Too many attempts. Try later." });
    try {
      const { challenge } = takeChallenge(req.body?.challengeId, "login");
      const cred = await verifyPasskey(req.body?.response, challenge);
      startSession(res);
      audit("login", { ip, passkey: cred.name });
      res.json({ ok: true });
    } catch (err) {
      fail(ip, err.message);
      res.status(401).json({ error: "Sign-in failed." });
    }
  });

  r.post("/api/login/recovery", requireSameOrigin, j, async (req, res) => {
    const ip = clientIp(req);
    if (limited(ip)) return res.status(429).json({ error: "Too many attempts. Try later." });
    const db = load();
    const h = sha256(String(req.body?.code || "").trim().toLowerCase());
    const idx = db.recovery.findIndex((x) => safeEq(x, h));
    if (idx < 0) {
      fail(ip, "bad recovery code");
      await new Promise((r) => setTimeout(r, 500));
      return res.status(401).json({ error: "Invalid code." });
    }
    db.recovery.splice(idx, 1); // each code works once
    save(db);
    startSession(res);
    audit("login_recovery_code", { ip, remaining: db.recovery.length });
    res.json({ ok: true, remaining: db.recovery.length });
  });

  r.post("/api/logout", requireSameOrigin, (req, res) => {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    if (token) sessions.delete(token);
    res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
    res.json({ ok: true });
  });

  // ----- step-up: a fresh passkey tap to approve one specific risky thing -----
  r.post("/api/stepup/options", requireSameOrigin, requireAuth, j, async (req, res) => {
    const purpose = String(req.body?.purpose || "");
    if (!stepUpPurposes.includes(purpose)) return res.status(400).json({ error: "bad purpose" });
    const options = await authOptions();
    res.json({ options, challengeId: holdChallenge(options.challenge, "stepup:" + purpose, String(req.body?.ref || "")) });
  });

  r.post("/api/stepup/verify", requireSameOrigin, requireAuth, j, async (req, res) => {
    const ip = clientIp(req);
    try {
      const purpose = String(req.body?.purpose || "");
      const c = takeChallenge(req.body?.challengeId, "stepup:" + purpose);
      await verifyPasskey(req.body?.response, c.challenge);
      audit("stepup_ok", { ip, purpose, ref: c.ref });
      await onStepUp(purpose, c.ref);
      res.json({ ok: true });
    } catch (err) {
      audit("stepup_failed", { ip, error: err.message });
      res.status(400).json({ error: err.message });
    }
  });

  return r;
}
