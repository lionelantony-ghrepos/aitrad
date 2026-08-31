# Meridian — Documentation Index

AI-native agentic trading terminal (US equities/ETFs, paper trading v1). Frontend: Next.js 15. Backend: InsForge. Built entirely by coding agents in Cursor.

| Doc | Purpose |
|---|---|
| [01 Market Survey & Business Blueprint](01-Market-Survey-and-Business-Blueprint.md) | Competitor survey, positioning, personas, pillars, roadmap, business model |
| [02 Technical Architecture Blueprint](02-Technical-Architecture-Blueprint.md) | Full-stack design: stack choices, system diagram, data model, order FSM, AI architecture, security, risks |
| [03 PRD — PBIs & Cursor Prompts](03-PRD-PBIs-and-Cursor-Prompts.md) | 31 PBIs in build order, each with a ready-to-paste Cursor prompt |
| [04 Test Plan](04-Test-Plan.md) | Acceptance Criteria + Test Cases per PBI, traceability, release gate |
| [05 Business Rules & Decision Tables](05-Business-Rules-and-Decision-Tables.md) | Rules architecture + 12 baseline decision tables (normative seed content) |
| [06 Mock Data & Seeding](06-Mock-Data-and-Seeding.md) | Generator specs, seed pipeline, expected counts; source files in `../mock-data/` |
| [07 Agent Build Guide](07-Agent-Build-Guide.md) | Cursor setup, `.cursor/rules`, session protocol, Definition of Done, copilot system prompt |
| [08 User Guide](08-User-Guide.md) | End-user manual (finalize after build) |

**Human README:** [../README.md](../README.md) (product overview, stack, build-order summary).  
**Agent profile:** [../AGENTS.md](../AGENTS.md) and `.cursor/rules/aitrad.mdc`.

**Start here:** doc 07 §1 (setup), then execute doc 03 PBI-001 → PBI-031.
Traceability: PBI-nnn → AC-nnn-xx → TC-nnn-xx (doc 04 is the single source of truth; agents tick status boxes as tests pass).

Seed JSON in this clone lives in `../mock_data/` (doc 06 also refers to `mock-data/` for the `@meridian/mock-data` package).
