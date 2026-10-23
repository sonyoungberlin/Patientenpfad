# Deployment and Production Database

This runbook records the project's deployment and database practices, including
verified historical incidents. Deployment status and database configuration can
change; verify them for each release rather than treating historical results as
current state.

## Release flow

1. Develop and test in the GitHub Codespace.
2. Check the working tree and branch, fetch and compare with `origin/main`, and
   confirm the release contains the intended changes.
3. Do not commit, push, or trigger a Production deployment without the user's
   explicit approval. After approval, push the approved release to GitHub
   `main`.
4. The existing GitHub-to-Vercel integration starts a Production deployment
   automatically. Confirm the deployment is `Ready` and its commit SHA matches
   the release. Do not assume that a successful push means deployment succeeded.

The repository's Vercel build command is `next build` (`vercel-build` in
`package.json`). It does **not** run Prisma migrations. The repository has
manual migration scripts, but their presence does not cause migrations to run
automatically.

## Infrastructure boundaries

Use the existing GitHub repository, Vercel project, and Neon PostgreSQL
database. Do not independently create another database, Vercel project, or
development environment. Do not run `vercel link` or `vercel env pull`, or
independently modify `.env` files, credentials, or deployment configuration.
Explain proposed infrastructure changes and obtain the user's approval before
making them.

Do not run database migrations or resets, or change authentication or database
connections, unless explicitly requested. Production migration work additionally
requires the exact-target checks and approval described below. Never print
credentials in command output, logs, chat, or Git.

## Neon and Prisma connections

`prisma/schema.prisma` defines two connection variables:

- `DATABASE_URL`: Prisma's application/runtime connection; this may use Neon's
  pooler.
- `DIRECT_DATABASE_URL`: Prisma's direct connection for migration commands.

Vercel environment variables are managed outside the repository. Before any
database operation, verify the intended environment and which URL the operation
will use without printing either URL. A missing local `.env` after switching
Codespaces is not evidence that Production configuration is missing.

Do not use the Production database as a development database unless its target
and the consequences have been explicitly checked. Do not expose credentials
in command output, logs, chat, or Git.

## P1001 and the verified Vercel Sandbox route

**Historical incident, verified 2026-10-21:** Prisma in the Codespace returned
`P1001` when connecting to Neon Production. The configured credentials and the
Vercel-Neon integration were known to be valid. Loading Production variables
locally, including through `vercel env run`, did not make the Codespace-to-Neon
connection work. The Vercel build itself only ran `next build`; it was not a
migration runner.

The successful workaround was a short-lived Vercel Sandbox used as a remote
migration runner:

1. Use the existing `patientenpfad` Vercel project and obtain fresh Production
   environment values without displaying them.
2. Transfer only the required Prisma files and environment variables securely
   to a temporary Sandbox.
3. From the Sandbox, perform read-only migration-status and schema checks
   before considering any write.
4. Review the exact migration SQL, Production history, missing migration
   sources, dependencies, and data/locking effects. Obtain explicit approval
   for the specific Production changes before executing them.
5. Execute only the approved changes, then verify schema and migration history.
   Stop the Sandbox and remove temporary secret files afterward.

In that incident the direct Neon connection also returned `P1001` from the
initial Sandbox setup. Read-only Prisma status succeeded using the existing
pooled `DATABASE_URL` via a temporary schema copy without `directUrl`. This is
a record of that specific route, not a blanket recommendation to migrate
through a pooler; select and verify the connection method for the actual
operation.

## Historical migration-history exception

During the 2026-10-21 Production inspection, `_prisma_migrations` contained
finished entries for these migrations, but their source files were absent from
the release repository:

- `20260915000000_add_practice_documentation_content`
- `20260915010000_add_practice_documentation_templates`
- `20260915020000_add_documentation_template_selections`

Preserve these history entries. Do not recreate or baseline them, and do not
assume that repository migrations and Production history match just because a
standard status command succeeds. Recheck read-only state before future
migrations.

## Safe Production migration sequence

For a release that requires a database change:

1. Identify the exact target database and environment without exposing secrets.
2. Read the target's actual migration history and relevant schema. Compare them
   with the release's migration files; identify missing source files,
   partially applied work, and dependencies.
3. Review each proposed SQL operation for affected data, locks, compatibility,
   and rollback/recovery constraints. Produce the minimal ordered migration
   plan.
4. Get explicit approval for that exact Production plan before running writes.
5. Use only the verified, authorized runner and changes. Never run
   `prisma db push`, `prisma migrate deploy`, or `prisma migrate reset`
   blindly against Production. In particular, do not use `db push` or reset to
   reconcile drift.
6. Verify the resulting schema, exact migration-history/checksum state, and
   Prisma status with read-only checks. Do not push dependent application code
   until the approved database step is verified, unless the reviewed rollout
   explicitly requires a different compatible sequence.
7. Push the approved release to `main`; verify Vercel Production is `Ready` for
   the expected commit. Clean up temporary runners and secret files.

## GitHub authentication in Codespaces

GitHub CLI is not a prerequisite for HTTPS `git push`; the normal Codespaces
Git credential helper uses Codespaces authentication. On 2026-10-21, the
Copilot command environment did not see the same GitHub authentication as the
normal Codespace terminal. The generic `unable to get password from user`
failure alone does not prove that a token lacks repository write permission:
first distinguish an unavailable credential in the command environment from
a GitHub rejection of a supplied credential.

Do not request a new personal access token, rotate secrets, or ask the user to
install GitHub CLI on a personal computer. If Copilot cannot push but the
normal Codespace terminal is authenticated, provide one exact push command for
that terminal rather than repeating general diagnosis.

## Confirmed KIOSK release (historical)

On 2026-10-21, commit `5674709` was confirmed on GitHub `main`. Vercel's
Production deployment for that commit was checked and reported `Ready`.
This records the verified release at that time; always check the live
deployment and commit again for subsequent releases.
