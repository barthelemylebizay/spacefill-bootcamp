---
description: Security sweep before deploying — secrets, git history, client-exposed keys, Supabase RLS, and debug leftovers.
---

# Pre-deploy security check

Run this whenever the user types `/pre-deploy`. This is a **read-only audit**. Do not edit, delete,
move, or `git rm` anything, and do not run `git filter-branch`/`git rebase`/BFG or touch git history,
even if you find something. Only investigate and report. If a fix requires a change, describe it and
wait for explicit confirmation before making it — a later message, not this run.

Work through the five checks below in order. For every finding, give:
- **File and line** (exact path, line number if applicable — use `grep -n` to get real line numbers, never guess)
- **What a stranger could do with it** — one plain sentence, concrete, not generic ("could read every
  client's Spacefill API token and impersonate their account" — not "could be a security risk")
- **The fix** — one or two sentences, specific to this repo (e.g. "move to `.env.local`, read via
  `process.env.X` in a route handler, add to Vercel env vars" — not "use environment variables")

Skip a check only if you can show why it doesn't apply (e.g. no Supabase project configured) — say so
explicitly rather than silently omitting it.

## 1. Secrets in the repo

- Check whether `.env` or `.env.local` is tracked by git: `git ls-files | grep -E '^\.env'`. If either is
  tracked, that's a critical finding regardless of what's inside it.
- Check `.gitignore` covers `.env*` (or at least `.env.local`) — read it, don't assume.
- Grep the whole tree (excluding `node_modules`, `.next`, `.git`) for hardcoded secrets: API keys, bearer
  tokens, passwords, connection strings with credentials, private keys. Look for patterns like
  `sk-`, `Bearer `, `api_key`, `apiKey =`, `password =`, `postgres://.*:.*@`, long opaque hex/base64
  strings assigned to a variable, and provider-specific prefixes (`sk-ant-`, `sk-proj-`, `re_`, `AIza`,
  `AKIA`). Check every `.js`/`.jsx`/`.ts`/`.tsx` file, including Supabase Edge Functions under
  `supabase/functions/` — specifically check whether any Edge Function's secret was copy-pasted into a
  client component (`app/**` outside `app/api/**`, anything with `"use client"`) rather than staying
  server-side.
- A secret referenced only via `process.env.X` in a server file (route handler, Edge Function) is fine —
  don't flag those. Flag literal values.

## 2. Git history

- Run `git log --all --diff-filter=A -- '*.env' '*.env.local' '*.env.production'` to check if an env
  file was ever added and later removed.
- Search history for secret patterns that may have been committed and then "fixed" by deleting the line:
  `git log -p --all -S"sk-" --source` and repeat for a couple of the other patterns from check 1 that are
  plausible for this project (Supabase service role key, OpenAI key, Bearer tokens). Keep this targeted —
  a handful of `-S` searches on the patterns actually seen in check 1 or known from `AGENTS.md`
  (OPENAI_KEY, Supabase keys), not an exhaustive scan of the whole history.
- If anything turns up, state plainly: the secret is still reachable in git history even though it's not
  in the current files, and the fix is **not** a new commit — it requires rewriting history
  (`git filter-repo` or BFG) and rotating the exposed credential. Do not attempt this yourself.

## 3. Keys that reach the browser

- Read `.env.example` and `.env.local` (if present) to see what env vars this project defines.
- This project's convention (per `AGENTS.md`): the browser should only ever see
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Any other `NEXT_PUBLIC_*` variable, or
  any variable referenced from a `"use client"` file or anything under `app/**` that isn't
  `app/api/**`, ships to the browser in a Next.js app — list every one you find.
- Specifically flag, as critical, any of the following found in client-reachable code (not behind
  `app/api/*/route.js` or `supabase/functions/*`): a Supabase **service role** key, an OpenAI/Anthropic
  key, a Stripe secret key, a Resend/SendGrid key, or any token that looks like it was pasted in to
  bypass an Edge Function during debugging. Search for `service_role`, `OPENAI`, `STRIPE_SECRET`,
  `RESEND`, and check `next.config.js`/`next.config.mjs` for anything under `env:` that isn't the two
  expected Supabase values.

## 4. Database exposure (Supabase)

- Skip this check with a one-line note if there's no Supabase project connected (no `lib/supabase.js`
  client, or `.env.local` has no real Supabase URL).
- Otherwise, list the tables this app actually queries — grep `app/api/**/route.js` for
  `.from("...")` / `.from('...')` calls to get the real list, don't guess from memory.
- For each one, check RLS status using the Supabase MCP tools available in this session (list tables /
  advisors, or `get_advisors` for security). Report the ones with RLS **off**, or RLS **on but with a
  permissive `true` policy that defeats it**, as open — name the table and what that means concretely
  (e.g. "any anon key holder can read every client's API token").
- Note that this app's Supabase client is anon-key-only and used server-side in route handlers — if RLS
  is off, the API routes themselves are the only gate today.

## 5. Leftovers

- List any route under `app/api/**` that looks like a debug/test endpoint left in — names like `test`,
  `debug`, `dev`, `seed`, `sandbox`, `_scratch`, or one that returns raw internal data with no auth check.
- Grep for `console.log(` across `app/**` and flag any that print request bodies, tokens, emails, full
  row objects, or anything resembling PII — not every `console.log`, just ones leaking user/request data.
- Check for hardcoded seeded/test accounts or credentials left in seed scripts, fixtures, or committed
  directly in a route (e.g. a hardcoded admin token or bypass check like `if (token === "test123")`).

## Output format

Report **worst first** — critical (real secret exposed or DB wide open) before medium (a debug route)
before low (a stray console.log). Group by the five checks, but order findings within and across groups
by severity, most dangerous at the top. Use this shape per finding:

```
### [SEVERITY] short title
**File:** path/to/file.js:42
**Risk:** one sentence, concrete
**Fix:** one or two sentences, specific
```

If a whole category is clean, say so in one line ("No secrets found in tracked files.") — don't pad it.

End with exactly one line, nothing after it:

`VERDICT: safe to deploy` or `VERDICT: not safe to deploy`

Not safe to deploy if there is any critical finding (tracked `.env`, a secret in git history, a
service-role/provider key reachable from the browser, or a table with real user data and RLS off).
Otherwise safe to deploy, and say so even if there are medium/low findings — just list them as
follow-ups.
