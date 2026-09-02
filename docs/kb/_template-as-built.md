# PBI-NNN — short title

Copy to `docs/kb/as-built/PBI-NNN.md`. Replace placeholders. Keep to 1–2 pages. Facts only. Cite decision tables by ID; never copy business thresholds, fees, or limits into this file.

## PBI / ACs / TCs

- PBI: [PBI-NNN](../03-PRD-PBIs-and-Cursor-Prompts.md)
- ACs: AC-NNN-xx (see [doc 04](../04-Test-Plan.md))
- TCs: TC-NNN-xx

## Shipped vs spec

| Item | Status |
| --- | --- |
| Spec intent | done / deferred / spec gap |
| Notes | what differs from docs 03/02 and why |

## Surfaces

- Packages:
- `apps/web` routes / panels:
- InsForge functions:
- Migrations:

## Contracts

- Zod schemas (`@meridian/schemas`):
- Endpoints / records tables:
- Events / realtime:
- Generated reference: [generated/](../generated/) (after `pnpm docs:generate`)

## Rules

- Decision tables evaluated or seeded: DT-\* (IDs only)
- Entitlements / `authorize()`: n/a or which actions

## How to extend

- Bullet for the next dependent PBI
- Where to register a new panel / function / schema
- What not to fork

## Ops

- Env vars (names only, never values):
- Seed / fixtures:
- Test harness notes:

## Trace

- Commit: `feat(PBI-NNN): …`
- SHA: (fill at commit time or leave “this commit”)
