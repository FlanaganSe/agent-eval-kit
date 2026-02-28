/**
 * E2E smoke eval via OpenRouter — works with any model.
 *
 * Uses the OpenAI SDK, which is OpenRouter's native compatibility layer.
 * Change EVAL_MODEL to test any model OpenRouter serves.
 *
 * Prerequisites:
 *   export OPENROUTER_API_KEY=sk-or-...
 *   pnpm build
 *
 * Run:
 *   node dist/cli/index.js run --config test/e2e/openrouter
 *
 * Run with a different model:
 *   EVAL_MODEL=google/gemini-2.0-flash-001 node dist/cli/index.js run --config test/e2e/openrouter
 */
import OpenAI from "openai";
import { defineConfig } from "../../../src/config/define-config.js";
import type { CaseInput, TargetOutput } from "../../../src/config/types.js";
import { contains, latency } from "../../../src/graders/index.js";

// ─── Target ─────────────────────────────────────────────────────────────────

const model = process.env.EVAL_MODEL ?? "bytedance-seed/seed-2.0-mini";

const client = new OpenAI({
	baseURL: "https://openrouter.ai/api/v1",
	apiKey: process.env.OPENROUTER_API_KEY,
});

const target = async (input: CaseInput): Promise<TargetOutput> => {
	const start = performance.now();

	const response = await client.chat.completions.create({
		model,
		max_tokens: 64,
		messages: [{ role: "user", content: String(input.prompt) }],
	});

	return {
		text: response.choices[0]?.message.content ?? "",
		latencyMs: performance.now() - start,
		tokenUsage: {
			input: response.usage?.prompt_tokens ?? 0,
			output: response.usage?.completion_tokens ?? 0,
		},
	};
};

// ─── Suites ─────────────────────────────────────────────────────────────────

export default defineConfig({
	suites: [
		{
			name: "content-check",
			description: "Known-answer case graded by exact substring match",
			target,
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
		{
			name: "pipeline",
			description: "Multiple cases to exercise runner concurrency and gates",
			target,
			cases: [
				{
					id: "capital-japan",
					input: { prompt: "What is the capital of Japan? Reply with only the city name." },
					category: "happy_path",
				},
				{
					id: "multiply",
					input: { prompt: "What is 7 * 8? Reply with only the number." },
					category: "happy_path",
				},
				{
					id: "color-list",
					input: {
						prompt: "List the three primary colors of light, comma-separated. Reply with only the list.",
					},
					category: "happy_path",
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
