# SentinelVault — 3-Minute Judge Demo Script

**Goal:** show that SentinelVault detects log tampering and points at the exact five-minute window that was changed or deleted, and be honest about what protects against a root attacker.

**Rule for every claim:** say only what we have actually run. Local mode is tamper-*evidence*. Protection against a root attacker needs a public blockchain, which we have **not** run yet.

---

## Who does what

- **Problem (0:00–0:30):** PPT teammate, with the problem slide.
- **How it works (0:30–1:10):** backend owner.
- **Live demo (1:10–2:30):** frontend teammate clicks; backend owner narrates.
- **Close + questions (2:30–3:00):** backend owner; research teammate helps with limitation questions.

Change this to fit your team, but decide it before judging starts.

---

## Before judges arrive (off-camera checklist)

1. Laptop plugged in. Close the Claude app, extra Chrome tabs and anything not needed (this laptop has frozen twice).
2. **Terminal 1 (backend):**
   `cd C:\hackathon\log-vault`
   `python -m uvicorn src.server:app --reload`
3. **Terminal 2 (frontend):**
   `cd C:\hackathon\log-vault\frontend`
   `npm run dev`
   Never set `VITE_MOCK_MODE=true` for the demo.
4. Open `http://localhost:5173` in Chrome. Refresh with **Ctrl + Shift + R**.
5. Check the top bar: **"API: :8000 LIVE"** and **"Ledger: Local (set by server)"**. There must be **no** red "MOCK DATA" banner.
6. Click **Reset Demo**. The message should say *"Demo reset complete. Ledger cleared. Click Anchor Logs to record fresh fingerprints."* and the timeline shows 0 windows. **Do not anchor yet**; we anchor live.
7. Open `http://localhost:8000/docs` in a second tab (Plan B).
8. Backup video ready to play (Plan C).

If the sample log was changed since the last rehearsal: Reset Demo → Anchor Logs → Verify Integrity must show all INTACT. Then Reset Demo again.

---

## 0:00 – 0:30 · The problem

> "When attackers break into a server, one of the first things they do is **edit or delete the logs** to hide what they did. Anyone with admin access, including a malicious insider, can quietly change log files, and later nobody can prove what the original logs said. Investigators lose the evidence, and compliance rules that require trustworthy logs can't be met. That's the gap we close."

## 0:30 – 1:10 · How it works

> "SentinelVault cuts the logs into **five-minute windows** and takes a **SHA-256 fingerprint** of each one. Change even one character and the fingerprint changes completely."
>
> "Each window's fingerprint is also chained to the previous one, like a mini blockchain, so you can't quietly remove or reorder a window."
>
> "We save these fingerprints in a ledger. Later, we re-read the logs, fingerprint them again, and compare. A changed window shows **TAMPERED**, a deleted window shows **MISSING**, and we record **when each fingerprint was saved** and **when the tampering was first noticed**, which is exactly what the problem asks for."

*(Show the architecture slide here if you have one.)*

## 1:10 – 2:30 · Live demo: the attack story

Our synthetic log tells a story: a **brute-force attack on root**, then a **successful login as `analyst`** at 10:09, then that user **reads the system password file** (`sudo cat /etc/shadow`) at 10:11. We play the attacker who hides it.

The three windows:
- **Window 0 (10:00–10:05):** normal admin activity.
- **Window 1 (10:05–10:10):** brute force + the suspicious login.
- **Window 2 (10:10–10:15):** the password-file read.

**Step 1: click Anchor Logs.**
*You see:* the message "anchored 3 new time windows (total 3)", three windows in the timeline, and a code in the **Chain Tip Hash** card.
> "We've fingerprinted all three windows and chained them together. This is our record of what the logs originally said."

**Step 2: click Verify Integrity.**
*You see:* three green **INTACT** windows and a green **VERIFIED** pill.
> "Verify re-reads the logs, fingerprints them again and compares. Everything matches."

**Step 3: attack #1 — Attacker Tamper Console: Target Time Window = Window 1, Attack Vector = Delete Log Line, click Execute Attack.**
*You see:* the Attack Execution Log shows the deleted line (the 10:09 `analyst` login). The console re-verifies automatically: window 1 turns **red, TAMPERED**, and "Cryptographic chain broken" appears between windows 0 and 1.
> "I'm the attacker. I delete my login line from window 1. The vault re-checks immediately, and window 1 is flagged."

**Step 4: attack #2 — Target Time Window = Window 2, Attack Vector = Delete Whole Window, click Execute Attack.**
*You see:* the log lists the 4 removed lines, including `sudo ... cat /etc/shadow`. Window 2 shows **MISSING**.
> "Now I delete the entire five minutes where I read the password file. The whole window is gone, and it's flagged MISSING."

**Step 5: point at the dashboard.**
*You see:* a red **COMPROMISED** pill, and the timeline filters show **Intact 1 · Tampered 1 · Missing 1**.
> "Window 0 is still green. Only the windows the attacker touched are flagged."

**Step 6: click window 1 (or "Inspect Cryptographic Diff" on it).**
*You see:* the saved fingerprint (green) vs. the current one (red), **4 lines → 3 lines**, **Originally recorded** and **First noticed** times.
> "Here's the proof: the fingerprint we saved, the fingerprint now, the line count dropped from 4 to 3, when the original was recorded, and when we first caught the change."

*(Optional, 10 seconds: close the inspector, click Verify Integrity again, reopen window 1 — "First noticed" hasn't moved.)*

## 2:30 – 3:00 · Honest close

> "Everything you just saw is real: real hashing, real chaining, real detection against our live backend, not a mock. We also check the ledger itself: if someone edits a saved fingerprint, even recalculating it, the broken link to the next window is flagged as **LEDGER_TAMPERED**. That's covered by our automated tests: 24 of them."
>
> "We're honest about the limit: on a single machine, an attacker with full root control could rewrite the whole ledger. The real fix is an **independent witness**: anchoring the fingerprints on a public blockchain, where there's no admin to compromise. We've built that as a smart contract and tested it on a local chain; running it on a public testnet is our next step."
>
> "So: tampering caught, pinpointed to the exact window in seconds, with a clear path to protection even against root. That's SentinelVault."

---

## Plan B: dashboard fails → use the /docs page

Open `http://localhost:8000/docs`. For each POST, click **Try it out**, enter `demo-key-123` in **x-api-key**, then **Execute**.

1. **POST /api/anchor**
2. **POST /api/verify** → `"overall_status": "INTACT"`
3. **POST /api/tamper-demo** with body:
   `{ "window_index": 1, "action": "delete" }`
4. **POST /api/tamper-demo** with body:
   `{ "window_index": 2, "action": "delete_window" }`
5. **POST /api/verify** → window 0 `INTACT`, window 1 `TAMPERED`, window 2 `MISSING`, `"overall_status": "COMPROMISED"`.

Say the same lines as above; point at `status`, the two hashes, `anchored_at` and `first_noticed_at` in the JSON.

**If the dashboard shows a red error box at the buttons ("Cannot reach backend"):** the backend stopped. Restart it in Terminal 1, click Reset Demo, and continue. If it doesn't come back, switch to Plan C.

## Plan C: laptop freezes → play the backup video

Say: "Our laptop froze; here's a recording of the same run from earlier." Narrate it with the same script.

## Between rehearsals / judge groups

Click **Reset Demo**, then stop. Anchor live at the start of the next run.
Never reset in the middle of a demo.

---

## Things NOT to say or show

- ❌ "Even root can't tamper with it." (Only true with a public blockchain, which we haven't run.)
- ❌ "The database refuses all edits, so it's tamper-proof." (Root can bypass the database triggers.)
- ❌ "It works on a public testnet." (Never run. Say "next step.")
- ❌ "These are real attack logs." (All data is synthetic, using reserved example IP addresses.)
- ❌ Don't run the frontend in mock mode, and don't open the hidden Admin Panel (its login is a browser-only demo, not connected to the backend).

---

## Likely judge questions (honest answers)

**"Can't root just rewrite your ledger too?"**
Yes, on a single machine. Our self-check catches partial edits, including a recalculated fingerprint, but a full rewrite of every row is only stopped by an independent witness: a public blockchain. That's built and tested on a local chain; public testnet is next.

**"Why blockchain at all?"**
The fingerprints must live somewhere the attacker doesn't control. A public blockchain has no single admin to hack or bribe. A separate server or write-once cloud storage are alternatives.

**"Can I see LEDGER_TAMPERED?"**
It's triggered by editing the ledger database directly, which has no button in the demo. It's proven by our automated tests (show `python -m pytest -q` → 24 passed if asked), and the dashboard has a purple status ready for it.

**"What if the attacker was already in before you collected the logs?"**
Then the bad log becomes our baseline. We detect changes after fingerprinting, not lies written before it. It's in our threat model.

**"Can you tell which exact line changed?"**
We pinpoint the window and infer edit vs. deletion from the line count. Per-line proof with Merkle trees is a planned enhancement.

**"Why five-minute windows?"**
A trade-off: smaller windows catch changes sooner but mean more fingerprints to store. It's configurable.

**"Why do the times look different (10:05 vs. 01:30)?"**
The 10:00–10:15 times are from our synthetic sample log. "Originally recorded" and "First noticed" are the real moments we anchored and detected, shown in local time.

**"Is this real or a mock?"**
Real. The top bar shows "API: :8000 LIVE" and "Ledger: Local (set by server)". If the backend were down, the dashboard shows "Backend offline" and an error instead of fake data.

**"Did you use AI?"**
Yes: Claude Code for the backend and Codex for the frontend, disclosed in our README. We tested every feature ourselves.

---

## Before the real demo, confirm in rehearsal

- [ ] Delete Log Line on window 1 removes the 10:09 `analyst` login line.
- [ ] Delete Whole Window on window 2 lists 4 removed lines including `/etc/shadow`.
- [ ] Timeline ends at Intact 1 · Tampered 1 · Missing 1, with a red COMPROMISED pill.
- [ ] Window 1's inspector shows both hashes, 4 → 3 lines, Originally recorded and First noticed.
- [ ] Full run fits in 3 minutes. Rehearse 3 times, with Reset Demo between runs.
- [ ] Backup video recorded from a clean run.