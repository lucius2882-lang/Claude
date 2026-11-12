// Prints a one-time link (valid 15 minutes) to register a passkey.
// Run it on the server: `npm run enroll` (or `docker compose exec computaaa npm run enroll`).
import { issueEnrollToken, PUBLIC_ORIGIN } from "../src/auth.js";

if (!PUBLIC_ORIGIN) {
  console.error("Set PUBLIC_ORIGIN in .env first.");
  process.exit(1);
}
const token = issueEnrollToken();
console.log(`
Open this link within 15 minutes, on the device whose passkey you want to use:

  ${PUBLIC_ORIGIN}/enroll.html#${token}

It works once. Running this again replaces any unused link.
The first passkey also gives you 8 recovery codes. Store them offline.`);
