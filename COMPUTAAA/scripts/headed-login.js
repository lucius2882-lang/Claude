// Optional: open the agent's profile in a normal visible browser window on your own
// machine so you can log in to sites natively. Stop the server first (one process per profile).
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const dir = path.resolve(process.env.PROFILE_DIR || "./data/profile");
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

const ctx = await chromium.launchPersistentContext(dir, {
  headless: false,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  viewport: null,
  args: ["--disable-blink-features=AutomationControlled"],
});
const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto(process.argv[2] || "https://accounts.google.com");
console.log("Log in to whatever you need, then close the browser window. Sessions are saved to", dir);
await new Promise((r) => ctx.on("close", r));
