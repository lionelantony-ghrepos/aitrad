# ADR-0002 — Optional `negate` on decision-table condition cells

Date: 2026-09-05
Status: accepted

## Context

Doc 05 §2 lists operators `eq neq lt lte gt gte in not_in between regex is_null any` and does not include `not_between`. Doc 05 §6.2 / §7 vector 5 still requires “trail_value not between [inclusive bounds]”. AND-across-cells cannot express the complementary range as a single row.

## Decision

`decisionConditionSchema` may include optional `negate` (default false). The engine evaluates the operator, then inverts the boolean when `negate` is true. This encodes “not between” and any other negated cell without adding operators.

## Consequences

- Seed and admin UIs (PBI-011/012) should persist `negate` on the condition jsonb.
- New operators are still added to the enum when they are not simple negations.

Related: [as-built PBI-010](../as-built/PBI-010.md).

## Alternatives considered

- Two COLLECT rows (`lt` / `gt`) — would pass the vector without testing `between`.
- A `not_between` operator — duplicates invert semantics and is not in §2.
