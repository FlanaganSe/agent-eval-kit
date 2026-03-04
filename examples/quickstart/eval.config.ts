/**
 * Quickstart eval — the simplest possible config.
 *
 * One suite, one case, two graders. Copy this and swap in your own target.
 *
 * Setup:
 *   export OPENROUTER_API_KEY=sk-or-...
 *   pnpm build
 *
 * Run:
 *   agent-eval-kit run --config examples/quickstart
 */

import type { CaseInput, TargetOutput } from "agent-eval-kit";
import { contains, defineConfig, latency } from "agent-eval-kit";
import OpenAI from "openai";

// ─── Target ──────────────────────────────────────────────────────────────────
// Replace this with your own agent or LLM call.

const model = process.env.EVAL_MODEL ?? "anthropic/claude-haiku-4.5";

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
	};
};

// ─── Config ──────────────────────────────────────────────────────────────────

export default defineConfig({
	suites: [
		{
			name: "smoke",
			description: "Basic Q&A — does the model answer correctly?",
			target,
			cases: [
				{
					id: "capital-france",
					input: { prompt: "What is the capital of France? Reply with only the city name." },
				},
			],
			defaultGraders: [{ grader: contains("Paris"), required: true }, { grader: latency(15_000) }],
			gates: { passRate: 1.0 },
		},
	],
});
