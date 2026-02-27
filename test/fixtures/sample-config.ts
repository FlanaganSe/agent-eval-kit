import { defineConfig } from "../../src/config/define-config.js";
import type { TargetOutput } from "../../src/config/types.js";
import { all, contains, cost, latency, toolCalled, toolSequence } from "../../src/graders/index.js";

const mockTarget = async (input: Record<string, unknown>): Promise<TargetOutput> => ({
	text: `Response for: ${input.query}`,
	toolCalls: [
		{ name: "search", args: { query: input.query }, result: { found: true } },
		{ name: "format", args: { style: "markdown" }, result: { formatted: true } },
	],
	latencyMs: 150,
	tokenUsage: { input: 100, output: 200 },
	cost: 0.002,
});

export const sampleConfig = defineConfig({
	suites: [
		{
			name: "smoke",
			target: mockTarget,
			cases: [
				{
					id: "H01",
					description: "Basic query response",
					input: { query: "Hello world" },
					category: "happy_path",
				},
				{
					id: "H02",
					description: "Tool sequence check",
					input: { query: "Search and format" },
					category: "happy_path",
				},
			],
			defaultGraders: [
				{ grader: contains("Response for") },
				{ grader: toolCalled("search"), required: true },
				{ grader: all([toolSequence(["search", "format"], "strict"), latency(1000)]) },
				{ grader: cost(0.01) },
			],
			gates: {
				passRate: 1.0,
				maxCost: 0.05,
				p95LatencyMs: 2000,
			},
		},
	],
	run: {
		defaultMode: "live",
		timeoutMs: 5000,
	},
});
