# Examples

Working examples that demonstrate every feature of agent-eval-kit. Each is a
self-contained eval config you can run against real LLMs.

```
examples/
├── quickstart/          Minimal config — 1 suite, 1 case, 2 graders
├── text-grading/        All text, safety, metric, composition, and LLM judge graders
├── tool-agent/          Tool call grading, hallucination detection, plugins
└── README.md
```

## Setup

```bash
# 1. API key (OpenRouter — works with any model)
export OPENROUTER_API_KEY=sk-or-...

# 2. Build (required before any run)
pnpm build
```

## Run

```bash
# Quickstart — simplest possible eval
agent-eval-kit run --config examples/quickstart

# Text grading — all deterministic + LLM judge graders
agent-eval-kit run --config examples/text-grading

# Tool agent — tool call grading + plugins
agent-eval-kit run --config examples/tool-agent
```

## What each example demonstrates

### `quickstart/` — minimal config

The absolute simplest eval. One suite, one case, two graders. Start here.

| Suite | Graders | Cases |
|-------|---------|-------|
| `smoke` | `contains`, `latency` | 1 inline |

### `text-grading/` — comprehensive text grading

Eight suites covering every text, safety, metric, composition, and LLM judge grader.
Includes a judge config with `createCachingJudge` and a `category-report` plugin.

| Suite | Graders | Cases | Format |
|-------|---------|-------|--------|
| `text-matching` | `contains` | 1 inline | — |
| `exact-match` | `exactMatch` (trim) | 1 inline | — |
| `format-validation` | `regex` | 1 inline | — |
| `structured-output` | `jsonSchema` (Zod), `contains` | 1 inline | — |
| `composition` | `all`, `any`, `not`, `notContains`, `cost`, `tokenCount` | 1 inline | — |
| `safety` | `safetyKeywords`, `notContains`, `all` | 2 inline | — |
| `llm-judge` | `factuality`, `llmRubric` | 2 | YAML |
| `classification` | `llmClassify` (3 categories) | 3 | JSONL |

### `tool-agent/` — tool-using agent

Four suites grading a tool-call loop agent. Two plugins demonstrate custom graders
and all three lifecycle hooks (`beforeRun`, `afterTrial`, `afterRun`).

| Suite | Graders | Cases | Format |
|-------|---------|-------|--------|
| `tool-use` | `toolCalled`, `toolArgsMatch` (subset), `noToolErrors` (plugin) | 1 inline | — |
| `tool-sequence` | `toolSequence` (strict) | 1 inline + 1 file | YAML |
| `tool-grounding` | `noHallucinatedNumbers`, `toolCalled` | 1 inline | — |
| `safety` | `toolNotCalled`, `not(contains)`, `all` | 2 | JSONL |

## Case file formats

Cases can be defined inline in the config or loaded from external files:

| Format | When to use | Example |
|--------|------------|---------|
| **Inline** | Cases coupled to config logic, or for simplicity | `cases: [{ id: "...", input: { ... } }]` |
| **JSONL** | Bulk cases with simple structure, one per line | `cases: "classify-cases.jsonl"` |
| **YAML** | Cases with nested data or long strings | `cases: "factuality-cases.yaml"` |

Inline and file cases can be mixed in the same suite:
```typescript
cases: [
  { id: "inline-case", input: { prompt: "..." } },
  "more-cases.jsonl",
],
```

## Override models

```bash
# Target model (any OpenRouter model)
EVAL_MODEL=google/gemini-2.0-flash-001 agent-eval-kit run --config examples/text-grading

# Target + judge models
EVAL_MODEL=anthropic/claude-haiku-4.5 JUDGE_MODEL=anthropic/claude-sonnet-4 \
  agent-eval-kit run --config examples/text-grading
```

Find model IDs at [openrouter.ai/models](https://openrouter.ai/models).

## CLI flags

All flags work with any config:

```bash
agent-eval-kit run --config <config> --suite text-matching  # Single suite
agent-eval-kit run --config <config> --filter capital-france # Single case
agent-eval-kit run --config <config> --trials 3              # Flakiness detection
agent-eval-kit run --config <config> --rate-limit 30         # Requests per minute
agent-eval-kit run --config <config> --concurrency 2         # Max parallel cases
```

## Reporters

```bash
# Default console output
agent-eval-kit run --config <config>

# JUnit XML (for CI)
agent-eval-kit run --config <config> --reporter junit --output results.xml

# Markdown (for PR comments)
agent-eval-kit run --config <config> --reporter markdown
```

## Cost

Each run costs fractions of a cent with Haiku. The `text-grading` judge suites
double the calls (target + judge). The `tool-agent` uses 2-3x calls per case
due to the tool-call loop. `--trials N` multiplies by N.
