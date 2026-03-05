# Immutable Rules

1. **No `z.any()` in schemas** — use `z.unknown()` + type narrowing
2. **Schemas use `z.strictObject()`** — reject unexpected properties to catch typos and drift
3. **All deterministic graders are pure functions** — no I/O, no side effects, no external state. LLM graders (via `judge()`) are the intentional exception.
4. **Locked terminology: Grader, Case, Suite, Trial, Run, Fixture, Gate** — no synonyms in code, tests, docs, or comments
5. **All grading config is suite-level via `defaultGraders`** — cases have no grader field; split into separate suites for different grader sets
6. **`schemaVersion` on every persisted artifact** — enables backward-compatible loading
7. **ESM-only, no enums** — `erasableSyntaxOnly` for Node.js native TS execution compatibility
8. **`types` before `default` in exports conditions** — TypeScript resolves the first matching condition
