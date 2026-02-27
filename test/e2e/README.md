# E2E Smoke Eval

Calls a real LLM and grades the response. Proves the full pipeline works:
config → target → graders → gates → report → storage.

## Setup

```bash
# 1. Install the Anthropic SDK (dev dependency — does not ship with the lib)
pnpm add -D @anthropic-ai/sdk

# 2. Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# 3. Build
pnpm build
```

## Run

```bash
# Basic run — executes all suites
node dist/cli/index.js run --config test/e2e

# Single suite
node dist/cli/index.js run --config test/e2e --suite content-check

# Single case by ID
node dist/cli/index.js run --config test/e2e --filter capital-france

# Multiple trials (flakiness detection)
node dist/cli/index.js run --config test/e2e --trials 3

# Rate-limited (requests per minute)
node dist/cli/index.js run --config test/e2e --rate-limit 30

# Concurrency control
node dist/cli/index.js run --config test/e2e --concurrency 2

# Combine flags
node dist/cli/index.js run --config test/e2e --trials 3 --rate-limit 30 --suite pipeline
```

## What to expect

| Exit code | Meaning |
| --------- | ---------------------- |
| 0 | All gates passed |
| 1 | A gate failed |
| 2 | Config error |
| 3 | Runtime / target error |
| 130 | Ctrl+C / aborted |

Check the exit code after a run:

```bash
node dist/cli/index.js run --config test/e2e; echo "Exit: $?"
```

## Verify SIGINT handling

Start a run and press Ctrl+C — it should abort gracefully and exit 130.

## Verify stdout/stderr separation

```bash
# Human-readable report only (stderr)
node dist/cli/index.js run --config test/e2e 1>/dev/null

# Machine-readable output only (stdout)
node dist/cli/index.js run --config test/e2e 2>/dev/null
```

## Verify GitHub Actions summary

```bash
GITHUB_STEP_SUMMARY=/tmp/summary.md node dist/cli/index.js run --config test/e2e
cat /tmp/summary.md
```

## Other commands to test

```bash
# List previous runs (shows runs from .eval-runs/)
node dist/cli/index.js list

# Doctor — validates environment and config
node dist/cli/index.js doctor

# Re-run only failing cases from a previous run
node dist/cli/index.js run --config test/e2e --filter-failing <run-id>
```

## Cost

Each full run (4 cases × Haiku) costs fractions of a cent. Running with `--trials 3` triples the invocations.

## Adapting for other providers

The target function in `eval.config.ts` is a plain async function returning `TargetOutput`.
Swap the function body to use OpenAI, OpenRouter, or any other SDK —
the framework doesn't care how the target produces its output.
