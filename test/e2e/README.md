# E2E Smoke Evals

Calls a real LLM and grades the response. Proves the full pipeline:
config → target → graders → gates → report → storage.

Two configs are provided — pick whichever matches your API key.

## Directory layout

```
test/e2e/
├── anthropic/eval.config.ts   # Anthropic API direct (needs ANTHROPIC_API_KEY)
├── openrouter/eval.config.ts  # OpenRouter — any model (needs OPENROUTER_API_KEY)
└── README.md
```

---

## OpenRouter (any model)

```bash
# Setup
export OPENROUTER_API_KEY=sk-or-...
pnpm build

# Run (default model: bytedance-seed/seed-2.0-mini)
node dist/cli/index.js run --config test/e2e/openrouter

# Use a different model
EVAL_MODEL=anthropic/claude-haiku-4.5 node dist/cli/index.js run --config test/e2e/openrouter
EVAL_MODEL=google/gemini-2.0-flash-001 node dist/cli/index.js run --config test/e2e/openrouter
EVAL_MODEL=meta-llama/llama-4-scout node dist/cli/index.js run --config test/e2e/openrouter
```

Find model IDs at [openrouter.ai/models](https://openrouter.ai/models).

## Anthropic (direct)

```bash
# Setup
export ANTHROPIC_API_KEY=sk-ant-...
pnpm build

# Run (uses claude-haiku-4-5-20251001)
node dist/cli/index.js run --config test/e2e/anthropic
```

---

## CLI flags to try

All flags work with either config. Replace `<config>` with the path you're using.

```bash
# Single suite
node dist/cli/index.js run --config <config> --suite content-check

# Single case
node dist/cli/index.js run --config <config> --filter capital-france

# Trials (flakiness detection)
node dist/cli/index.js run --config <config> --trials 3

# Rate limiting (requests per minute)
node dist/cli/index.js run --config <config> --rate-limit 30

# Concurrency
node dist/cli/index.js run --config <config> --concurrency 2

# Combine
node dist/cli/index.js run --config <config> --trials 3 --rate-limit 30 --suite pipeline
```

## Exit codes

| Code | Meaning              |
| ---- | -------------------- |
| 0    | All gates passed     |
| 1    | A gate failed        |
| 2    | Config error         |
| 3    | Runtime/target error |
| 130  | Ctrl+C / aborted     |

```bash
node dist/cli/index.js run --config <config>; echo "Exit: $?"
```

## Other commands

```bash
# List previous runs
node dist/cli/index.js list

# Validate environment
node dist/cli/index.js doctor

# Re-run only failures from a previous run
node dist/cli/index.js run --config <config> --filter-failing <run-id>
```

## SIGINT test

```bash
node dist/cli/index.js run --config <config> --trials 10
# Press Ctrl+C mid-run — should exit 130
```

## stdout/stderr separation

```bash
# stderr only (human-readable report)
node dist/cli/index.js run --config <config> 1>/dev/null

# stdout only (machine-readable)
node dist/cli/index.js run --config <config> 2>/dev/null
```

## GitHub Actions summary

```bash
GITHUB_STEP_SUMMARY=/tmp/summary.md node dist/cli/index.js run --config <config>
cat /tmp/summary.md
```

## Cost

Each full run is 4 cases. With Haiku or similarly cheap models, a run costs fractions of a cent. `--trials N` multiplies invocations by N.

## Modifying

Each `eval.config.ts` is a standalone file. To add cases, graders, or suites, edit the config directly. The framework resolves the config at runtime — no code generation or build step needed beyond `pnpm build`.

The `target` function is just `(input) => Promise<TargetOutput>`. Swap the SDK, the model, or the entire provider — the framework only sees what comes back.
