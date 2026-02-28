# E2E Smoke Evals

Calls real LLMs and grades the responses. Proves the full pipeline works:
config → target → graders → gates → report → storage.

```
test/e2e/
├── openrouter/              Deterministic graders (contains, latency)
├── openrouter-judge/        LLM-as-judge graders (llmRubric, factuality, classify, mixed)
├── openrouter-tool-agent/   Tool-using agent with tool call graders + plugins
├── openrouter-multi-grader/ Grader composition, JSON schema, safety, categories
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

# Tool-using agent — proves tool call grading pipeline
node dist/cli/index.js run --config test/e2e/openrouter-tool-agent

# Grader composition — proves all/any/not, jsonSchema, regex, safety, categories
node dist/cli/index.js run --config test/e2e/openrouter-multi-grader

# Anthropic direct
node dist/cli/index.js run --config test/e2e/anthropic
```

## What each config tests

### `openrouter/` — deterministic graders

Sends prompts to an LLM, grades responses with `contains()` and `latency()`.
Proves: config loading, target execution, deterministic grading, gates, run storage.

### `openrouter-judge/` — LLM judge graders

Sends prompts to a **target** LLM, then sends the responses to a **judge** LLM that scores them 1-4 against criteria you define in English.

Four suites, each testing a different grading pattern:

| Suite | Graders | What it proves |
|-------|---------|----------------|
| `rubric` | `llmRubric("criteria...")` | Judge scores output against open-ended criteria. No expected answer needed. |
| `factuality` | `factuality()` | Judge checks output against a known reference in `expected.text`. |
| `mixed` | `contains()` + `llmRubric()` | Deterministic and LLM graders compose in the same suite. |
| `classify` | `llmClassify({ categories })` | Judge classifies output into predefined categories. |

The judge is wrapped with `createCachingJudge()` so repeated identical calls are served from cache.

```bash
# Run a single suite
node dist/cli/index.js run --config test/e2e/openrouter-judge --suite rubric
```

### `openrouter-tool-agent/` — tool-using agent

Simulates an agent with two tools (`get_weather`, `convert_temperature`). The target runs a tool-call loop: send prompt → receive tool calls → execute tools → feed results back → get final answer.

Five suites covering different aspects of tool use:

| Suite | Graders | What it proves |
|-------|---------|----------------|
| `tool-use` | `toolCalled` (required), custom `noToolErrors` (required) | Agent calls the right tools with no errors |
| `tool-sequence` | `toolSequence("strict")`, `toolArgsMatch("subset")` | Agent follows the correct multi-step tool call order |
| `safety` | `all(not(), safetyKeywords(), toolNotCalled())` | Adversarial inputs are refused, no tools invoked |
| `edge-cases` | `latency` (from external `cases.jsonl`) | Boundary conditions loaded from an external case file |

Demonstrates:
- **Plugins**: `tool-health` plugin contributes a custom grader (`noToolErrors`) and logs tool call counts per trial. `cost-tracker` plugin reports total cost after each suite.
- **Grader composition**: `all()`, `not()` combined with `toolNotCalled()` and `safetyKeywords()`.
- **External cases**: `cases.jsonl` loaded at runtime.
- **Case categories**: `happy_path`, `multi_step`, `edge_case`, `adversarial`.

```bash
# Run a single suite
node dist/cli/index.js run --config test/e2e/openrouter-tool-agent --suite tool-use
```

### `openrouter-multi-grader/` — grader composition

Exercises the broadest range of deterministic graders in a single config:

| Suite | Graders | What it proves |
|-------|---------|----------------|
| `structured-output` | `jsonSchema(ZodSchema)`, `contains` | LLM returns valid JSON matching a Zod schema |
| `text-patterns` | `any(regex(), exactMatch())` | Text format validation with disjunction |
| `composition` | `all(contains, notContains, not(contains))` | Composed graders in conjunction |
| `safety` | `all(safetyKeywords(), notContains())` | Model refuses harmful requests |
| `edge-cases` | `latency`, `tokenCount` (from external `cases.jsonl`) | Boundary conditions from external file |

Demonstrates:
- **`jsonSchema()`**: Validates LLM output against a Zod `z.strictObject()` schema.
- **`any()`**: Disjunction — at least one grader must pass.
- **`not()`**: Negation — inverts a grader's result.
- **Metric graders**: `cost()`, `tokenCount()` alongside `latency()`.
- **Plugin**: `category-report` logs per-category pass rates after each run.

```bash
# Run a single suite
node dist/cli/index.js run --config test/e2e/openrouter-multi-grader --suite structured-output
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
node dist/cli/index.js run --config <config> --confirm-cost --auto-approve  # Show cost estimate
```

## Reporters

```bash
# Default console output
node dist/cli/index.js run --config <config>

# JUnit XML (for CI pipelines)
node dist/cli/index.js run --config <config> --reporter junit --output results.xml

# Markdown (for PR comments / GitHub Actions step summary)
node dist/cli/index.js run --config <config> --reporter markdown
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

Each run with Haiku costs fractions of a cent. Judge configs double the calls (target + judge). `--trials N` multiplies by N. The tool-agent config may use 2-3x calls per case due to the tool-call loop.
