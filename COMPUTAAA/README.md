# COMPUTAAA

Your browser, on command. You type what you want done in the owner panel of luciuscampany.com, and Claude carries it out in a real Chromium browser that stays logged in to your accounts. You watch it live, take over whenever you like, and approve anything risky with your passkey.

![Approval inside the owner panel](docs-approval.png)

![The Jobs tab: job profile, résumé and application tracker](docs-jobs.png)

> **This folder is not part of the website.** Netlify publishes this repo, so `_redirects` returns a 404 for `/COMPUTAAA/*`. COMPUTAAA runs on its own server at `agent.luciuscampany.com`. The website only has the tile that opens it (`owner.js`).

## How it's built

```
cloudflared ──edge── control ──internal── worker-main ──egress── websites
                                    └──── worker-jobs ──egress── job sites
```

| Part | Holds | Doesn't hold |
|---|---|---|
| **control** (`src/server.js`) | Dashboard, passkeys, approvals, security log, the Claude agent loop, the API key | No browser, no saved logins |
| **worker-main**, **worker-jobs** (`src/worker.js`) | One Chromium profile each, with that agent's logins; each enforces its own site allowlist | No API key, no passkeys, no dashboard, no open port, and no access to each other |
| **cloudflared** | The outbound tunnel to Cloudflare | Can't reach the worker at all |

Each worker connects *out* to the control plane over a private network with its own secret (`WORKER_TOKEN_MAIN`, `WORKER_TOKEN_JOBS`), so one can never pose as another, and only runs actions from a fixed list. A break-in at the control plane doesn't reach your logins; a hijacked browser can't see the API key or grant itself approvals. This is phase 1 of the plan: later phases add a lead agent and more workers (one per area of your life).

## The agents

The dashboard has a tab per agent. Each has its own browser, logins, allowed sites and conversation.

### Main
General tasks on the sites in `ALLOWED_SITES`.

### Jobs
Finds jobs and fills in applications from your **Job profile** (open it on the Jobs tab):

- **Résumé:** upload a PDF; uploading again replaces it straight away.
- **Standard answers:** work authorization, availability, pay, start date, contact details…
- **Job preferences:** roles, places, schedule, minimum pay, deal-breakers.
- **Cover letter style:** paste one you like or describe the tone.

Changes apply from the agent's next task. It never stores or types your Social Security number, date of birth, bank details or passwords; it stops and asks you.

**Who clicks Submit depends on the site** (`JOBS_FILL_ONLY_SITES`):

| Sites | What happens at the final submit |
|---|---|
| LinkedIn, Indeed, Glassdoor, Craigslist | Their rules ban bots, so the agent fills everything, then **hands the Submit to you**: a ring shows the button, you click it in the live view (or don't), and press Done. The agent's own click is never made. |
| Culinary Agents, company career sites (Greenhouse, Lever, Workday, Harri…), Gmail | The agent submits or sends, **after your passkey tap**. |

Every job it touches lands in the **Applications** tracker (found → filled → waiting on you / submitted / skipped), so it never applies twice. Moving through a form ("Easy Apply", "Next", "Continue", "Review", "Upload résumé") doesn't ask; the final send always does.

### Recipes (cheaper applications)
The first time the Jobs agent applies through an application system (Culinary Agents, Greenhouse, Workday…), it saves the steps as a **recipe**: which fields it filled and which buttons it pressed, recorded by their labels and names rather than screen positions, so they still work on a different job on the same system. After that, an application there takes **one** agent step instead of about 30:

- Short answers (name, email, phone, work authorization) are reused.
- Cover letters and "why do you want this job" answers are written fresh for each job from the posting (the posting is treated as untrusted text).
- The final submit still goes through the same checks: your passkey, or handed to you on LinkedIn, Indeed, Glassdoor and Craigslist.
- If a form has changed, the recipe stops at the first field it can't find and the agent finishes by hand (and can save an updated recipe).
- Fields that look sensitive (Social Security number, date of birth, bank, passwords) are never saved in a recipe.

See and delete recipes in the **Recipes** panel on the Jobs tab.

### Claude in Chrome (no API cost)
For job hunting on your own computer under your Claude subscription: on the Jobs tab, open **Job profile → Copy as Claude in Chrome shortcut** and save it as a shortcut in the Claude side panel (e.g. `/apply`). It carries your profile and the same rules: you click every final Submit, it never posts on LinkedIn/Indeed/Glassdoor/Craigslist, and it never types passwords or sensitive numbers. At the end it lists what it worked on as `Company | Role | Site | URL | status` lines; paste them into **Applications → Log applications from Claude in Chrome** to keep one tracker. It runs in your real browser while you're there, without COMPUTAAA's isolation or passkey approvals.

### Throwaway sessions
Set `JOBS_EPHEMERAL=true` (or `MAIN_EPHEMERAL=true`) and that agent starts every session with an empty browser, asks you to sign in when a site needs it, and **deletes everything** (cookies, logins, history) when you press **End session**, when it goes idle, or on Panic. Nothing is left on disk. The trade-off: you sign in, often with 2FA, every session, and sites may send more "new device" emails.

## Cost (estimate)

| | Monthly |
|---|---|
| Server, 8 GB (Hetzner; check current prices) | ~$8–18 |
| Cloudflare tunnel + Access, ntfy alerts | $0 |
| Claude API (Opus 5.5), billed separately from a Claude subscription | ~$1–1.50 for a job application done by hand; with a recipe, roughly a tenth of that or less (mostly the cover letter); ~$0.25–1 per everyday task |

Roughly **$40–60/month** for light use (~20 applications plus a few tasks a week), **$100–140** for regular use. Set a spending limit on the API key.

## How it's protected

Each layer assumes the one before it might fail.

| # | Layer | Where | What it stops |
|---|---|---|---|
| 0 | Owner PIN on the website | `owner.js` | Hides the tile from visitors. **Not security**: it's checked in the visitor's browser and can be guessed offline. Everything below is the real lock. |
| 1 | **Cloudflare Tunnel + Access** | Cloudflare + `src/auth.js` | The server has no open ports. Cloudflare only lets your email through, and the app re-checks Cloudflare's signed token on every request and connection, so getting around the tunnel gets you nothing. |
| 2 | **Passkey sign-in** (Face ID / Touch ID / security key) | `src/auth.js` | Phishing and stolen passwords; there's no password to steal. Eight single-use recovery codes are your backup. Sessions end after 30 min idle or 8 h. |
| 3 | **Approvals enforced by code** | `src/agent.js` | Before every click or Enter, the server reads what's under the cursor or in focus. Buy, send, post, delete, submit, confirm, sign, save, and clicks inside embedded payment frames all wait for a **fresh passkey tap**. A web page can trick the AI into *trying*; it can't skip this check. |
| 4 | **Site allowlist** | `src/browser.js` | The browser can only open sites in `ALLOWED_SITES`, for the agent and for you. That stops hijack attempts from sending your data to an attacker's site. |
| 5 | **Isolation** | `docker-compose.yml` | Logins live only in the workers, the API key only in the control plane, on separate networks; workers are refused by the dashboard even on the private network. Read-only containers, non-root, no Linux capabilities, memory and process limits, no open ports. Data lives on an encrypted folder, and containers refuse to start while it's locked. The browser closes after 30 idle minutes. |
| 6 | **Panic button + wipe** | dashboard | Panic stops the agent, closes the browser, and signs out every session. "Wipe saved logins" (passkey required) deletes the whole browser profile. |
| 7 | **Security log + phone alerts** | `src/audit.js` | Every sign-in, command, approval, denial and blocked site is written to `data/audit.log` and shown in the dashboard. Important events also ping your phone via ntfy. |

### What's still on you (honest limits)

- **Approval rules are pattern-based.** They catch the usual risky buttons and keys, but a site with an oddly labelled "Buy" button could slip past. That's why the allowlist and the next point matter.
- **Keep high-value accounts out.** Don't log this browser into your bank or your main email unless you need to. A separate Google account for COMPUTAAA work is the safest setup.
- **Your recovery codes are as powerful as your passkey.** Keep them offline.
- **Set a spending limit** on the Anthropic API key (Console → Settings → Limits).
- **Anyone who controls your Cloudflare account controls layer 1.** Turn on a passkey or security key for your Cloudflare login too.

## Deploy it (about 30 minutes, once)

Do the Cloudflare part first (it gives you three values the setup script asks for), then run one script on the server.

### 1. Cloudflare (free plan, in your browser)
1. Add `luciuscampany.com` to Cloudflare and switch your domain's nameservers to Cloudflare's. Recreate the DNS records that point the website at Netlify (Cloudflare usually imports them), and the website keeps working.
2. **Zero Trust → Networks → Tunnels → Create tunnel** (type *Cloudflared*). Copy the **tunnel token**. Add a public hostname `agent.luciuscampany.com` → `http://control:3000`. (Never route port 3001; that's the private worker channel.)
3. **Zero Trust → Access → Applications → Add → Self-hosted**, domain `agent.luciuscampany.com`.
   - Policy: **Allow**, Include → **Emails** → your email only.
   - Session duration: 24 hours.
   - Advanced → Cookies: SameSite **Lax**, HttpOnly on. This lets the dashboard load inside your owner panel.
   - Copy the **Application Audience (AUD) tag** and your **team domain** (`<team>.cloudflareaccess.com`).
4. Turn on a passkey or security key for your Cloudflare account login.
5. Create an API key at console.anthropic.com and **set a monthly spending limit** on it.

### 2. Rent a VPS
Hetzner or DigitalOcean, **Ubuntu 24.04**, 4 GB RAM to start (8 GB once you run both agents a lot). Add your SSH key when you create it.

### 3. Run the setup script
```bash
ssh root@YOUR-SERVER-IP
git clone https://github.com/lucius2882-lang/claude.git && cd claude/COMPUTAAA
sudo bash scripts/setup-server.sh
```
(If the repo is private, GitHub will ask you to sign in: use a [personal access token](https://github.com/settings/tokens) with read-only access to this repo as the password. Until the COMPUTAAA branch is merged, add `-b claude/gracious-davinci-hcx6a6` to the clone command.)
It installs and locks everything down, then asks you for:
- an **encryption passphrase** (you'll need it after every reboot) and shows a **master key** to write down offline,
- your **email**, the **Anthropic API key**, and the three **Cloudflare values** from step 1 (secrets are typed hidden).

What it does, in order: installs Docker, encryption and firewall tools; turns on automatic security updates; blocks all incoming traffic except SSH (the tunnel only goes out); turns off password sign-in for SSH (only if your SSH key is already set up, so you can't lock yourself out); creates the encrypted folder; writes `.env` with fresh per-worker secrets (owner-only permissions); builds and starts COMPUTAAA; and prints your **passkey link**.

### 4. Create your passkey
Open the printed link on your phone within 15 minutes, create the passkey, and **write down the 8 recovery codes**. To add another device later: `sudo docker compose exec control node scripts/enroll.js`.

### 5. Sign in to your accounts once
Open the owner panel → COMPUTAAA. Type the site in the address bar, click into the live view and sign in. Use the "Type" box for passwords and 2FA codes. Sessions are saved on the encrypted disk.

### After a reboot
```bash
cd claude/COMPUTAAA && sudo bash scripts/unlock.sh
```
Until you do, the containers **refuse to start**: they never fall back to writing to an unencrypted folder. A stolen disk or snapshot is useless without your passphrase.

### Settings you may want to change later
`sudo nano .env`, then `sudo docker compose up -d`: `ALLOWED_SITES` (Main agent), `JOBS_ALLOWED_SITES` (comes filled in with job boards and common application systems), `JOBS_FILL_ONLY_SITES`, `JOBS_EPHEMERAL` / `MAIN_EPHEMERAL` (throwaway sessions), `NTFY_URL` (phone alerts), `IDLE_LOCK_MINUTES`.

## Using it

- **Send a command**, e.g. "Open Gmail and summarize today's unread emails."
- **Pause for human** hands you the controls. **Stop** ends the task. **New task** clears the conversation.
- The agent pauses by itself for logins, 2FA and CAPTCHAs ("The agent needs you").
- **Approval needed**: a red ring shows where it wants to click. Approve with your passkey, or Deny.
- **Panic** (top right) shuts everything and signs you out everywhere.

## Updating

```bash
cd claude && git pull && cd COMPUTAAA && docker compose up -d --build
```
When you change the `playwright` version in `package.json`, change the image tag in `Dockerfile.worker` to match.

## Local development

```bash
npm install && npx playwright install chromium
cp .env.example .env    # set PUBLIC_ORIGIN=http://localhost:3000, CF_ACCESS_DISABLED=true, WORKER_TOKEN
npm start               # terminal 1: control plane
WORKER_NAME=main WORKER_TOKEN=$WORKER_TOKEN_MAIN npm run worker   # terminal 2
WORKER_NAME=jobs WORKER_TOKEN=$WORKER_TOKEN_JOBS ALLOWED_SITES=$JOBS_ALLOWED_SITES PROFILE_DIR=./data/jobs-profile npm run worker   # terminal 3
npm run enroll          # prints your passkey link
```
`CF_ACCESS_DISABLED` is refused for anything but `http://localhost`.

## Files

| File | Purpose |
|---|---|
| `src/server.js` | Control plane: HTTP + WebSocket server, worker channel, panic, wipe, idle sleep |
| `src/worker.js` | Browser worker: runs the allowed browser actions the control plane asks for |
| `src/remote.js` | The control plane's handle on a worker |
| `src/jobs.js` | Job profile, résumé and application tracker (control plane only) |
| `src/auth.js` | Cloudflare Access check, passkeys, recovery codes, sessions, step-up approvals |
| `src/agent.js` | Claude agent loop (`claude-opus-5-5`, computer use toolset) and the approval rules |
| `src/browser.js` | Persistent Chromium profile, site allowlist, live view, input (runs in the worker) |
| `src/audit.js` | Security log and ntfy alerts |
| `public/` | Dashboard, sign-in, passkey enrollment and approval pages |
| `scripts/enroll.js` | Prints a one-time passkey enrollment link |
