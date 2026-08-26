---
name: teach
description: >
  Use this skill when the user types "/teach", "$teach", "teach",
  "montre l'architecture", "explique l'architecture",
  "show the architecture", or asks for a visual explanation of how the app works.
---

# Architecture

Generate and publish a rich visual explanation of this app's architecture as an Artifact.

## What to cover

The artifact must include these four sections:

1. **Stack** — Next.js 16 App Router · React 19 · Supabase Postgres · Spacefill REST API · OpenAI GPT-4o · Vercel
2. **Pipeline d'import** — the 4-step wizard: Import → Mapping → Validation & Envoi → Résultat, with the API route for each step
3. **Ce qui se passe sous le capot** — the 6 sub-steps of a file import: file read, column fingerprint, profile detection, auto/manual mapping, data formatting, Spacefill API send with retry
4. **Algorithme de détection** — fingerprint normalisation (strip accents + apostrophes + special chars → sort → join) + Jaccard ≥ 0.80 fuzzy match + fallback to manual
5. **Données sauvegardées** — Supabase tables: mapping_profiles + mapping_rules, imports + orders, spacefill_fields (43 visible fields)
6. **APIs externes** — Spacefill REST API (exit/entry/search), OpenAI GPT-4o (SSE streaming), Supabase

## Design rules

- Dark background (#0D1621), amber accent (#F5961F), teal for positive states (#3EB89A)
- Support both dark and light themes via CSS custom properties
- Pipeline shown left → right with step arrows
- Monospace font for route names and technical identifiers
- No jargon in section titles — write for the Spacefill team

## How to build it

1. Read the key source files to get up-to-date details:
   - `app/api/mapping-profiles/detect/route.js` — fingerprint + Jaccard logic
   - `app/api/spacefill-fields/route.js` — visible fields query
   - `app/api/spacefill-custom-fields/route.js` — custom fields from API
   - `app/api/orders/route.js` — order creation
   - `lib/spacefill-api.js` — retry logic
2. Build the HTML artifact (write to scratchpad, then publish via Artifact tool)
3. Share the artifact link with the user in plain words — no jargon

## Existing artifact

A version was published on 2026-07-08:
https://claude.ai/code/artifact/bc06634e-8a66-40e2-bf5e-d9c4cf903aed

If the app has changed since then, rebuild from scratch with the updated source files.
If nothing has changed, share the existing link directly.
