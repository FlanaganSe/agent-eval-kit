# agent-evals

A TypeScript-native evaluation framework for AI agent workflows.

> **Work in progress** — the API is not yet stable.

## What it does

agent-evals lets you define test suites that grade AI agent outputs using deterministic checks, LLM-as-judge rubrics, or both. It supports a record-replay workflow: capture live agent responses as fixtures, then replay and grade them repeatably.

## Key concepts

- **Suite** — a collection of evaluation cases
- **Case** — a single input/output pair with graders attached
- **Grader** — a scoring function (deterministic or LLM-based)
- **Run** — the result of executing a suite
- **Fixture** — a recorded agent response used for replay

## CLI

```
agent-evals run        # run eval suites
agent-evals record     # record live fixtures
agent-evals compare    # compare two runs
agent-evals list       # list previous runs
agent-evals doctor     # validate project setup
```

## Requirements

- Node.js 20+
- pnpm

## License

MIT
