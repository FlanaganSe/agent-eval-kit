import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RunSchema } from "../config/schema.js";
import type { ResolvedSuite, TargetOutput } from "../config/types.js";
import { contains, cost, latency, toolCalled, toolSequence } from "../graders/index.js";
import { formatJsonReport } from "../reporters/json.js";
import { runSuite } from "../runner/runner.js";
import { loadRun, saveRun } from "../storage/run-store.js";

let tempDir: string;

beforeEach(async () => {
	tempDir = await mkdtemp(join(tmpdir(), "integration-"));
});

afterEach(async () => {
	await rm(tempDir, { recursive: true, force: true });
});

const mockTarget = async (input: Record<string, unknown>): Promise<TargetOutput> => ({
	text: `Response for: ${input.query}`,
	toolCalls: [
		{ name: "search", args: { query: input.query }, result: { found: true } },
		{ name: "format", args: { style: "markdown" }, result: { formatted: true } },
	],
	latencyMs: 50,
	tokenUsage: { input: 100, output: 200 },
	cost: 0.002,
});

describe("Live mode integration", () => {
	it("full pipeline: config → runner → graders → report → storage", async () => {
		const suite: ResolvedSuite = {
			name: "smoke",
			target: mockTarget,
			cases: [
				{
					id: "H01",
					input: { query: "Hello world" },
					category: "happy_path",
				},
				{
					id: "H02",
					input: { query: "Search and format" },
					category: "happy_path",
				},
			],
			defaultGraders: [
				{ grader: contains("Response for") },
				{ grader: toolCalled("search"), required: true },
				{ grader: latency(1000) },
			],
			gates: {
				passRate: 1.0,
				maxCost: 0.05,
				p95LatencyMs: 2000,
			},
		};

		// 1. Run the suite
		const run = await runSuite(suite, { mode: "live", timeoutMs: 5000 });

		// 2. Validate Run artifact
		const schemaResult = RunSchema.safeParse(run);
		expect(schemaResult.success).toBe(true);

		// 3. Check expected results
		expect(run.trials).toHaveLength(2);
		expect(run.trials[0]?.status).toBe("pass");
		expect(run.trials[1]?.status).toBe("pass");
		expect(run.summary.passRate).toBe(1);
		expect(run.summary.totalCost).toBeCloseTo(0.004);

		// 4. Gates should pass
		expect(run.summary.gateResult.pass).toBe(true);

		// 5. JSON report is valid
		const json = formatJsonReport(run);
		const parsed = JSON.parse(json);
		expect(RunSchema.safeParse(parsed).success).toBe(true);

		// 6. Save and reload
		await saveRun(run, tempDir);
		const loaded = await loadRun(run.id, tempDir);
		expect(loaded.id).toBe(run.id);
		expect(loaded.summary.passRate).toBe(1);
	});

	it("handles failing graders correctly", async () => {
		const suite: ResolvedSuite = {
			name: "fail-suite",
			target: mockTarget,
			cases: [{ id: "F01", input: { query: "test" } }],
			defaultGraders: [{ grader: contains("NONEXISTENT"), required: true }],
		};

		const run = await runSuite(suite, { mode: "live", timeoutMs: 5000 });
		expect(run.trials[0]?.status).toBe("fail");
		expect(run.summary.passRate).toBe(0);
	});

	it("handles target errors gracefully", async () => {
		const suite: ResolvedSuite = {
			name: "error-suite",
			target: async () => {
				throw new Error("Service unavailable");
			},
			cases: [{ id: "E01", input: { query: "test" } }],
		};

		const run = await runSuite(suite, { mode: "live", timeoutMs: 5000 });
		expect(run.trials[0]?.status).toBe("error");
		expect(run.trials[0]?.output.text).toContain("Service unavailable");
	});

	it("tool graders with sequence check", async () => {
		const suite: ResolvedSuite = {
			name: "tool-suite",
			target: mockTarget,
			cases: [{ id: "T01", input: { query: "test" } }],
			defaultGraders: [
				{ grader: toolSequence(["search", "format"], "strict") },
				{ grader: cost(0.01) },
			],
		};

		const run = await runSuite(suite, { mode: "live", timeoutMs: 5000 });
		expect(run.trials[0]?.status).toBe("pass");
	});

	it("gate failure: pass rate below threshold", async () => {
		const suite: ResolvedSuite = {
			name: "gate-fail-suite",
			target: mockTarget,
			cases: [
				{ id: "P01", input: { query: "pass" } },
				{ id: "F01", input: { query: "fail" } },
			],
			defaultGraders: [{ grader: contains("pass"), required: true }],
			gates: {
				passRate: 0.95,
			},
		};

		const run = await runSuite(suite, { mode: "live", timeoutMs: 5000 });

		// Only the first case has "pass" in the response text ("Response for: pass")
		expect(run.summary.passRate).toBe(0.5);
		expect(run.summary.gateResult.pass).toBe(false);

		const passRateGate = run.summary.gateResult.results.find((r) => r.gate === "passRate");
		expect(passRateGate?.pass).toBe(false);
		expect(passRateGate?.actual).toBe(0.5);
		expect(passRateGate?.threshold).toBe(0.95);

		// Validate schema round-trip
		const schemaResult = RunSchema.safeParse(run);
		expect(schemaResult.success).toBe(true);
	});

	it("computes byCategory summary when cases have categories", async () => {
		const suite: ResolvedSuite = {
			name: "category-suite",
			target: mockTarget,
			cases: [
				{ id: "H01", input: { query: "hello" }, category: "happy_path" },
				{ id: "H02", input: { query: "world" }, category: "happy_path" },
				{ id: "E01", input: { query: "edge" }, category: "edge_case" },
			],
			defaultGraders: [{ grader: contains("Response for") }],
		};

		const run = await runSuite(suite, { mode: "live", timeoutMs: 5000 });

		expect(run.summary.byCategory).toBeDefined();
		expect(run.summary.byCategory?.happy_path).toEqual({
			total: 2,
			passed: 2,
			failed: 0,
			errors: 0,
			passRate: 1,
		});
		expect(run.summary.byCategory?.edge_case).toEqual({
			total: 1,
			passed: 1,
			failed: 0,
			errors: 0,
			passRate: 1,
		});
	});

	it("byCategory is undefined when no cases have categories", async () => {
		const suite: ResolvedSuite = {
			name: "no-category-suite",
			target: mockTarget,
			cases: [{ id: "H01", input: { query: "test" } }],
			defaultGraders: [{ grader: contains("Response for") }],
		};

		const run = await runSuite(suite, { mode: "live", timeoutMs: 5000 });
		expect(run.summary.byCategory).toBeUndefined();
	});
});
