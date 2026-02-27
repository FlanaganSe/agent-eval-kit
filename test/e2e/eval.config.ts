/**
 * E2E smoke eval — calls a real LLM and grades the response.
 *
 * Proves the full pipeline works: config → target → graders → gates → report.
 * Uses Claude Haiku for speed and cost. Cases are cheap, factual, and deterministic.
 *
 * Prerequisites:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   pnpm add -D @anthropic-ai/sdk
 *   pnpm build
 *
 * Run:
 *   node dist/cli/index.js run --config test/e2e
 *
 * See test/e2e/README.md for all invocation examples.
 */
import Anthropic from "@anthropic-ai/sdk";
import { defineConfig } from "../../src/config/define-config.js";
import type { CaseInput, TargetOutput } from "../../src/config/types.js";
import { contains, latency } from "../../src/graders/index.js";

// ─── Target ─────────────────────────────────────────────────────────────────
// Wraps the Anthropic SDK in the Target interface.
// Swap this function body to test a different provider or model.

const client = new Anthropic();

const claude = async (input: CaseInput): Promise<TargetOutput> => {
	const start = performance.now();

	const response = await client.messages.create({
		model: "claude-haiku-4-5-20251001",
		max_tokens: 64,
		messages: [{ role: "user", content: String(input.prompt) }],
	});

	const text = response.content
		.filter((block): block is Anthropic.TextBlock => block.type === "text")
		.map((block) => block.text)
		.join("");

	return {
		text,
		latencyMs: performance.now() - start,
		tokenUsage: {
			input: response.usage.input_tokens,
			output: response.usage.output_tokens,
		},
	};
};

// ─── Suites ─────────────────────────────────────────────────────────────────
// Two suites demonstrate the multi-suite pattern.
// Each suite's defaultGraders apply uniformly to ALL its cases.

export default defineConfig({
	suites: [
		// Suite 1: Content grading with contains().
		// Single case so the substring check is unambiguous.
		{
			name: "content-check",
			description: "Known-answer case graded by exact substring match",
			target: claude,
			cases: [
				{
					id: "capital-france",
					input: { prompt: "What is the capital of France? Reply with only the city name." },
				},
			],
			defaultGraders: [
				{ grader: contains("Paris"), required: true },
				{ grader: latency(15_000) },
			],
			gates: {
				passRate: 1.0,
				p95LatencyMs: 15_000,
			},
		},

		// Suite 2: Pipeline validation across multiple cases.
		// Latency-only grader applies uniformly — proves the runner,
		// concurrency, and gate logic work end-to-end.
		{
			name: "pipeline",
			description: "Multiple cases to exercise runner concurrency and gates",
			target: claude,
			cases: [
				{
					id: "capital-japan",
					input: { prompt: "What is the capital of Japan? Reply with only the city name." },
					category: "factual",
				},
				{
					id: "multiply",
					input: { prompt: "What is 7 * 8? Reply with only the number." },
					category: "math",
				},
				{
					id: "color-list",
					input: {
						prompt: "List the three primary colors of light, comma-separated. Reply with only the list.",
					},
					category: "structured",
				},
			],
			defaultGraders: [{ grader: latency(15_000) }],
			gates: {
				passRate: 1.0,
				p95LatencyMs: 15_000,
			},
		},
	],
	run: {
		defaultMode: "live",
		timeoutMs: 30_000,
	},
});
