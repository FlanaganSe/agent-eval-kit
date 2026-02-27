import { describe, expect, it } from "vitest";
import { RunSchema } from "../config/schema.js";
import type { ResolvedSuite, RunOptions, TargetOutput } from "../config/types.js";
import { runSuite } from "./runner.js";

const mockTarget = async (input: Record<string, unknown>): Promise<TargetOutput> => ({
	text: `Response for: ${input.query}`,
	toolCalls: [{ name: "search", args: { q: input.query } }],
	latencyMs: 50,
	tokenUsage: { input: 100, output: 200 },
	cost: 0.001,
});

const suite: ResolvedSuite = {
	name: "test-suite",
	target: mockTarget,
	cases: [
		{ id: "H01", input: { query: "hello" } },
		{ id: "H02", input: { query: "world" } },
	],
	defaultGraders: [
		{
			grader: async (output) => ({
				pass: (output.text ?? "").includes("Response"),
				score: (output.text ?? "").includes("Response") ? 1 : 0,
				reason: "contains check",
				graderName: "contains(Response)",
			}),
		},
	],
};

const options: RunOptions = { mode: "live", timeoutMs: 5000 };

describe("runSuite", () => {
	it("produces valid Run artifact", async () => {
		const run = await runSuite(suite, options);
		const result = RunSchema.safeParse(run);
		expect(result.success).toBe(true);
	});

	it("runs all cases", async () => {
		const run = await runSuite(suite, options);
		expect(run.trials).toHaveLength(2);
	});

	it("sets correct suite metadata", async () => {
		const run = await runSuite(suite, options);
		expect(run.suiteId).toBe("test-suite");
		expect(run.mode).toBe("live");
		expect(run.schemaVersion).toBe("1.0.0");
	});

	it("computes summary correctly", async () => {
		const run = await runSuite(suite, options);
		expect(run.summary.totalCases).toBe(2);
		expect(run.summary.passed).toBe(2);
		expect(run.summary.failed).toBe(0);
		expect(run.summary.passRate).toBe(1);
	});

	it("handles target error without crashing", async () => {
		const errorSuite: ResolvedSuite = {
			...suite,
			target: async () => {
				throw new Error("API unavailable");
			},
		};
		const run = await runSuite(errorSuite, options);
		expect(run.trials).toHaveLength(2);
		expect(run.trials[0]?.status).toBe("error");
		expect(run.trials[0]?.output.text).toContain("API unavailable");
	});

	it("enforces timeout", async () => {
		const slowSuite: ResolvedSuite = {
			...suite,
			target: async () => {
				await new Promise((resolve) => setTimeout(resolve, 10_000));
				return { latencyMs: 10_000, text: "slow" };
			},
			cases: [{ id: "T01", input: { query: "slow" } }],
		};

		const run = await runSuite(slowSuite, { mode: "live", timeoutMs: 100 });
		expect(run.trials[0]?.status).toBe("error");
		expect(run.trials[0]?.output.text).toContain("Timeout");
	});

	it("evaluates gates", async () => {
		const gatedSuite: ResolvedSuite = {
			...suite,
			gates: { passRate: 1.0 },
		};
		const run = await runSuite(gatedSuite, options);
		expect(run.summary.gateResult.pass).toBe(true);
	});

	it("runs cases sequentially", async () => {
		const order: string[] = [];
		const sequentialSuite: ResolvedSuite = {
			...suite,
			target: async (input) => {
				order.push(input.query as string);
				return { latencyMs: 0, text: `Response for: ${input.query}` };
			},
		};
		await runSuite(sequentialSuite, options);
		expect(order).toEqual(["hello", "world"]);
	});
});
