# Copilot instructions

- This project is `sonyoungberlin/Patientenpfad`; development and release work normally happens in GitHub Codespaces.
- Production uses Vercel, Neon PostgreSQL, and Prisma. Pushing an approved release to GitHub `main` starts Vercel's Production deployment automatically.
- For each change, inspect the current branch and worktree, make only the requested change, run the relevant tests, compare with `origin/main`, then push the approved release to `main`. Verify the Vercel deployment is `Ready` and corresponds to the expected commit.
- GitHub CLI is not required for `git push`. Codespaces normally provides Git authentication. A new Codespace may have different shell state or lack local `.env` files; do not infer that credentials or configuration are invalid from that alone.
- If Copilot's command environment cannot see GitHub authentication while the normal Codespace terminal is authenticated, distinguish those environments. Do not request a PAT, suggest installing tools on the user's computer, or repeat broad authentication diagnosis. If the agent cannot push, provide one exact `git push` command for the authenticated Codespace terminal.
- Do not install unnecessary software, create infrastructure, rotate secrets preemptively, or print credentials in logs, chat, or tracked files.
- Never use the Production database as a development database without explicitly verifying the target and assessing the risks.
- Production database migrations require inspecting the actual target's migration history and schema, reviewing pending SQL and dependencies, and obtaining explicit approval for the exact changes. Never run `prisma db push`, `prisma migrate deploy`, or `prisma migrate reset` blindly against Production.
- If Prisma reports `P1001` in the Codespace, first consult [the deployment and database runbook](../docs/deployment-and-database.md) and consider the previously successful, temporary Vercel Sandbox migration runner. Do not restart already-resolved general Neon/Vercel network investigations.
- The GitHub push for KIOSK release commit `5674709` was confirmed on `main` on 2026-10-21; its Vercel Production deployment was confirmed `Ready`. Treat this as a historical verification, not a guarantee of current deployment state.
- The user is not a developer. Work independently where safe and request at most one necessary manual action at a time.
