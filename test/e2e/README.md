# E2E Smoke Evals

Calls real LLMs and grades the responses. Proves the full pipeline works:
config → target → graders → gates → report → storage.

```
test/e2e/
├── openrouter/              Deterministic graders (contains, latency)
├── openrouter-judge/        LLM-as-judge graders (llmRubric, factuality, mixed)
├── anthropic/               Anthropic API direct (same cases as openrouter/)
└── README.md
```

## Setup

```bash
# OpenRouter (recommended — works with any model)
export OPENROUTER_API_KEY=sk-or-...

# Or Anthropic direct
export ANTHROPIC_API_KEY=sk-ant-...

# Build (required before any run)
pnpm build
```

## Run

```bash
# Deterministic graders — proves core pipeline
node dist/cli/index.js run --config test/e2e/openrouter

# LLM judge graders — proves judge pipeline (2 LLM calls per case: target + judge)
node dist/cli/index.js run --config test/e2e/openrouter-judge

# Anthropic direct
node dist/cli/index.js run --config test/e2e/anthropic
```

## What each config tests

### `openrouter/` — deterministic graders

Sends prompts to an LLM, grades responses with `contains()` and `latency()`.
Proves: config loading, target execution, deterministic grading, gates, run storage.

### `openrouter-judge/` — LLM judge graders

Sends prompts to a **target** LLM, then sends the responses to a **judge** LLM that scores them 1-4 against criteria you define in English.

Three suites, each testing a different grading pattern:

| Suite | Graders | What it proves |
|-------|---------|----------------|
| `rubric` | `llmRubric("criteria...")` | Judge scores output against open-ended criteria. No expected answer needed. |
| `factuality` | `factuality()` | Judge checks output against a known reference in `expected.text`. |
| `mixed` | `contains()` + `llmRubric()` | Deterministic and LLM graders compose in the same suite. |

```bash
# Run a single suite
node dist/cli/index.js run --config test/e2e/openrouter-judge --suite rubric
```

### `anthropic/` — Anthropic API direct

Same cases and graders as `openrouter/`. Uses the Anthropic SDK instead of OpenAI SDK.

## Override models

```bash
# Target model (openrouter configs only)
EVAL_MODEL=google/gemini-2.0-flash-001 node dist/cli/index.js run --config test/e2e/openrouter

# Target + judge models (openrouter-judge only)
EVAL_MODEL=anthropic/claude-haiku-4.5 JUDGE_MODEL=anthropic/claude-sonnet-4 \
  node dist/cli/index.js run --config test/e2e/openrouter-judge
```

Find model IDs at [openrouter.ai/models](https://openrouter.ai/models).

## CLI flags

All flags work with any config.

```bash
node dist/cli/index.js run --config <config> --suite content-check   # Single suite
node dist/cli/index.js run --config <config> --filter capital-france  # Single case
node dist/cli/index.js run --config <config> --trials 3               # Flakiness detection
node dist/cli/index.js run --config <config> --rate-limit 30          # Requests per minute
node dist/cli/index.js run --config <config> --concurrency 2          # Max parallel cases
```

## Judge-only re-grading

Re-run judge graders on a previous run's outputs without calling the target again.
Useful for iterating on rubric criteria.

```bash
# 1. Run live
node dist/cli/index.js run --config test/e2e/openrouter-judge

# 2. Re-grade with same or updated criteria (no target cost)
node dist/cli/index.js run --config test/e2e/openrouter-judge --mode=judge-only --run-id=<id>
```

## Compare runs

```bash
node dist/cli/index.js compare --base <run-id-1> --compare <run-id-2>
```

## Other commands

```bash
node dist/cli/index.js list                                        # List previous runs
node dist/cli/index.js doctor                                      # Validate environment
node dist/cli/index.js run --config <config> --filter-failing <id> # Re-run only failures
```

## Exit codes

| Code | Meaning              |
| ---- | -------------------- |
| 0    | All gates passed     |
| 1    | A gate failed        |
| 2    | Config error         |
| 3    | Runtime/target error |
| 130  | Ctrl+C / aborted     |

## Cost

Each run with Haiku costs fractions of a cent. Judge configs double the calls (target + judge). `--trials N` multiplies by N.
