# Hackathon Backend: Working Rules

These rules apply to every session in this project. The event's own rules (AI use, starter templates, reused code, third-party services, disclosure) always come first. If anything here conflicts with them, follow the event rules and tell me.

## Project snapshot (fill in once the problem statement is out)

- Problem in one line:
- MVP (smallest demo that works):
- Stack and start command:
- API base URL / port:
- Mock mode: ON / OFF (which parts are mock):
- Current milestone:

Keep this block current. Detailed progress goes in `STATUS.md`.

## Vibe-coder mode (read this first)

I am a vibe coder, and so is the rest of the team. We cannot reliably tell broken code from working code by reading it, so part of your job is making things easy for us to check.

- **Plain language.** Explain what you did and why in simple words. If you must use a technical term, explain it in a few words. Write `STATUS.md` for a non-coder too.
- **A check step after every change.** End each change with "How to check it": one thing I can click, open or run (a URL, a button on the `/docs` page, a command), what I should see if it works, and what I would see if it is broken.
- **Proof before moving on.** Never say "done" or start the next step until you have run the check yourself and shown me the real output, or told me it is NOT TESTED and why. If the check needs me to do something, ask me to do it and wait for my answer.
- **Small steps.** One small change per turn. If a request is big, split it, tell me the pieces, and start with the first one.
- **Name what is broken.** Before a fix, say in plain words which part is failing: the screen, the API, the database, the model, or deployment. Fix one part at a time.
- **Ask before anything risky.** Deleting files, changing many files, installing or upgrading packages, changing the database structure, or any Git action that could lose work: explain the risk and wait for my yes.
- **Say when you are unsure.** If you are guessing, say so. "I don't know, let's check X" is better than a confident wrong answer.
- **When I paste an error,** first explain what it means and the most likely cause in plain words. Then propose the smallest fix. Wait for my yes unless the fix is trivial.
- **Save points.** When something works, remind me to commit and give me the exact commands.

## Start of every session

1. Check what actually exists: `ls`, `git status`, and read `STATUS.md` and `API_CONTRACT.md` if present. Do not assume a repo, framework, route, model or dependency without evidence.
2. Work out which case applies and say so:
   - Blank project: propose the minimum files to create; `git init` if allowed.
   - Organizer starter/template: inspect it and preserve its required structure.
   - Existing team code: inspect it and the Git state before touching anything.
3. Preserve uncommitted work. No destructive Git commands (`reset --hard`, `clean`, `checkout .`, force-push) without my approval.

## Plan before code

For a new problem, do not generate the backend. First return a short plan: user flow, smallest viable MVP, only the backend components actually needed, API contract, risky dependencies, env vars, test plan, and ordered milestones. State assumptions clearly. Then wait for review.

If the problem does not need a backend (static frontend, client-side calls, or a hosted service such as Firebase or Supabase covers it), say so and recommend that instead of building one.

## API contract

- `API_CONTRACT.md` at the repo root is the single source of truth: route, method, request fields (with file type and size limits if uploads), success response, error response, env vars, base URL. Include one example JSON for each response.
- Implement exactly what it says. Never change request or response shapes on your own. Propose the change to me first so I can tell the frontend owner before any code changes.
- Do not edit frontend files during backend work.

## Build in small milestones

One milestone at a time. Do not start the next until I say so.

1. **Startup:** minimal project, only required dependencies, documented start command, health endpoint if useful. Configure CORS for the frontend origin now, not at integration time.
2. **Contract:** implement the route and validation with consistent success and error shapes. Test one valid and one invalid request.
3. **Main flow:** the frontend reaches the backend and shows the result or error. A clearly labelled mock is fine here.
4. **Real model/database/service, if required:** test it on its own first, then integrate behind a service/adapter boundary. Record package versions and runtime. For PyTorch/CUDA, check whether CUDA is available instead of assuming. Test failure, slow response, invalid output and missing dependencies.
5. **Local end-to-end:** frontend, backend, services, frontend. Check API URL, ports, CORS, env vars, validation, loading and error states. Stop everything, restart, repeat the core flow.
6. **Deployment or tunnel (only if needed, only after 5):** verify the public URL and that the process is still running. Tunnel URLs change and die with the process.

Pass means the test was actually run and the output matches. A server that starts is not a finished backend.

## Every task

Before changing anything: state which files you will change and why. Make one focused change and preserve unrelated working code.

After: run the relevant test and report the exact command and actual output, the files changed, the result, and unresolved issues. If a test cannot run, say why and mark it NOT TESTED.

Never:
- claim a test passed when it was not run
- rewrite everything to fix one bug
- install or upgrade packages without evidence (capture the full error and current versions first)
- guess at APIs, env vars or dependencies; check the docs or the installed package

## Mock honesty

- Mock behaviour sits behind a `MOCK_MODE` env var.
- Every mock response carries `"mock": true`; real responses carry `"mock": false` (or the field named in the contract).
- Log a warning at startup when mock mode is on.
- Never present mock output as a real model or service result, in code, logs, docs or the demo. Tell me and the frontend owner so the UI shows a visible label.
- Mock or cached output may be used as a demo fallback only if the event rules allow it, and it stays labelled.

## External and AI services

- Before building on a third-party or AI API, check its rate limits, quota, cost and whether the team shares one key. Report what you found.
- Set timeouts. On 429 or 5xx, use a small bounded retry with backoff, then return a clear error. No unbounded retry loops.
- Use mock mode or cache identical requests during development so quota is left for the demo.
- If the service is down or the key is missing, fail with a clear error, not a hang or a stack trace.

## Config, security, logs

- Secrets only in environment variables, never in source or Git. Commit `.env.example` with placeholders. Keep `.env` and large artifacts (model weights, datasets, venvs, `node_modules`) in `.gitignore`.
- No hardcoded machine paths or tunnel URLs.
- Validate all input. Uploads get size and type limits (check content, not just the extension).
- Use appropriate HTTP status codes. Tracebacks stay in server logs, not responses. Never log keys, tokens, passwords or unnecessary personal data.
- No database, queue, microservice or extra infrastructure unless the core use case needs it.

## Git checkpoints

After each working milestone: review the diff, run its test, commit with a clear message. Checkpoints: (1) backend starts, (2) contract passes, (3) main flow with mock passes, (4) real integration passes, (5) final demo passes.

If a change breaks a passing milestone, fix or revert that specific change. Never overwrite a teammate's work.

## STATUS.md

Keep a short `STATUS.md`: current milestone, what works (real vs mock), exact start commands, env vars, known issues, next step. Update it after every milestone and before a session ends, so a fresh session or teammate can pick up cold.

## When stuck

If the same problem survives about 30 minutes or three failed fixes, stop. Summarise the evidence and what was tried, then give me options, including the simplest scope cut. Do not keep thrashing or destabilise a working MVP. If we are behind, cut features, not stability.

## Demo and submission

- Assume venue Wi-Fi is unreliable. Make sure the core demo runs locally.
- Keep a backup (screen recording or screenshots of the working flow).
- The README covers: how to run, env vars, what is real vs mock, and AI tools used if the event requires disclosure.

## Final checklist

Report each as PASS, FAIL or NOT TESTED:

- Startup command works
- Health endpoint works (if any)
- Valid request returns the documented response
- Invalid request returns a clear error
- Model/service works on a known sample (if applicable)
- Frontend-to-backend main flow works
- Loading and error states are good enough for the demo
- Fresh restart does not break the flow
- Public URL works (if used)

## Time plan (default; adjust to the challenge)

- 0-2h: understand the problem, rules, MVP, architecture, contract
- 2-4h: minimal startup and contract
- 4-6h: main flow, with labelled mock if needed
- 6-12h: core integration and model/service work
- 12-16h: full integration, validation, error handling
- 16-19h: restart tests, critical fixes, deployment if needed
- 19-21h: feature freeze, demo rehearsal
- 21-24h: critical fixes only, final tests, submission, backup

## Definition of done

The main flow has been tested end to end, real vs mock status is clear, failures are handled, startup instructions work after a fresh restart, and I can explain what is and is not working.

## Git Automation Rules
- After completing any logical unit of work, feature implementation, or bug fix:
  1. Run `git status` to verify modified and untracked files.
  2. Run `git add .` to stage all changes.
  3. Commit using conventional commit format (e.g., `git commit -m "feat: implement SHA-256 log window hashing"`).
  4. Immediately push to GitHub: `git push origin main`.
- Never leave unstaged or uncommitted code at the end of a response.