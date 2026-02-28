import { describe, expect, it } from "vitest";
import type {
	GraderConfig,
	JudgeCallFn,
	JudgeMessage,
	ResolvedSuite,
	Run,
	RunOptions,
	TargetOutput,
} from "../config/types.js";
import { runJudgeOnly } from "./judge-only.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockJudge(responses: readonly string[]): {
	judge: JudgeCallFn;
	calls: JudgeMessage[][];
} {
	const calls: JudgeMessage[][] = [];
	let index = 0;
	const judge: JudgeCallFn = async (messages) => {
		calls.push([...messages]);
		const text = responses[index] ?? responses[responses.length - 1] ?? "";
		index++;
		return { text, modelId: "mock-judge", cost: 0.001 };
	};
	return { judge, calls };
}

const sampleOutput: TargetOutput = {
	text: "Hello world",
	latencyMs: 100,
	cost: 0.005,
	tokenUsage: { input: 50, output: 50 },
};

function makeRun(trials: Run["trials"], suiteId = "test-suite"): Run {
	return {
		schemaVersion: "1.0.0",
		id: "prev-run-id",
		suiteId,
		mode: "live",
		trials,
		summary: {
			totalCases: trials.length,
			passed: trials.filter((t) => t.status === "pass").length,
			failed: trials.filter((t) => t.status === "fail").length,
			errors: 0,
			passRate: 1,
			totalCost: 0.01,
			totalDurationMs: 200,
			p95LatencyMs: 100,
			gateResult: { pass: true, results: [] },
		},
		timestamp: new Date().toISOString(),
		configHash: "abc123",
		frameworkVersion: "0.0.1",
	};
}

const alwaysPassGrader: GraderConfig = {
	grader: async () => ({
		pass: true,
		score: 1,
		reason: "Always passes",
		graderName: "always-pass",
	}),
};

const alwaysFailGrader: GraderConfig = {
	grader: async () => ({
		pass: false,
		score: 0,
		reason: "Always fails",
		graderName: "always-fail",
	}),
};

function makeSuite(graders: readonly GraderConfig[]): ResolvedSuite {
	return {
		name: "test-suite",
		target: async () => ({ text: "unused", latencyMs: 0 }),
		cases: [{ id: "C01", input: { query: "test" }, expected: { text: "Hello world" } }],
		defaultGraders: graders,
	};
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("runJudgeOnly", () => {
	it("re-grades trials with different graders, preserving outputs", async () => {
		const previousRun = makeRun([
			{
				caseId: "C01",
				status: "pass",
				output: sampleOutput,
				grades: [{ pass: true, score: 1, reason: "original", graderName: "old" }],
				score: 1,
				durationMs: 100,
			},
		]);

		const newSuite = makeSuite([alwaysFailGrader]);
		const runOptions: RunOptions = {
			mode: "judge-only",
			timeoutMs: 30_000,
		};

		const trials = await runJudgeOnly({
			previousRun,
			suiteConfig: newSuite,
			runOptions,
		});

		expect(trials).toHaveLength(1);
		const trial = trials[0];
		// Output preserved from previous run
		expect(trial.output).toEqual(sampleOutput);
		expect(trial.durationMs).toBe(100);
		// Grades come from new graders
		expect(trial.status).toBe("fail");
		expect(trial.grades[0]?.graderName).toBe("always-fail");
	});

	it("target function is never called", async () => {
		let targetCalled = false;
		const suite: ResolvedSuite = {
			name: "test-suite",
			target: async () => {
				targetCalled = true;
				return { text: "should not run", latencyMs: 0 };
			},
			cases: [{ id: "C01", input: { query: "test" } }],
			defaultGraders: [alwaysPassGrader],
		};

		const previousRun = makeRun([
			{
				caseId: "C01",
				status: "fail",
				output: sampleOutput,
				grades: [],
				score: 0,
				durationMs: 50,
			},
		]);

		await runJudgeOnly({
			previousRun,
			suiteConfig: suite,
			runOptions: { mode: "judge-only", timeoutMs: 30_000 },
		});

		expect(targetCalled).toBe(false);
	});

	it("passes judge to graders via runOptions", async () => {
		const { judge, calls } = createMockJudge([JSON.stringify({ reasoning: "Good", score: 4 })]);

		// Use the llmRubric import indirectly by creating a grader that uses context.judge
		const judgeGrader: GraderConfig = {
			grader: async (_output, _expected, context) => {
				if (!context.judge) {
					return { pass: false, score: 0, reason: "No judge", graderName: "test-judge" };
				}
				const resp = await context.judge([{ role: "user", content: "test" }]);
				return {
					pass: true,
					score: 1,
					reason: resp.text,
					graderName: "test-judge",
				};
			},
		};

		const suite = makeSuite([judgeGrader]);
		const previousRun = makeRun([
			{ caseId: "C01", status: "pass", output: sampleOutput, grades: [], score: 1, durationMs: 50 },
		]);

		await runJudgeOnly({
			previousRun,
			suiteConfig: suite,
			runOptions: { mode: "judge-only", timeoutMs: 30_000, judge },
		});

		expect(calls).toHaveLength(1);
	});

	it("preserves trialIndex from previous run", async () => {
		const previousRun = makeRun([
			{
				caseId: "C01",
				status: "pass",
				output: sampleOutput,
				grades: [],
				score: 1,
				durationMs: 50,
				trialIndex: 0,
			},
			{
				caseId: "C01",
				status: "pass",
				output: sampleOutput,
				grades: [],
				score: 1,
				durationMs: 50,
				trialIndex: 1,
			},
		]);

		const suite = makeSuite([alwaysPassGrader]);

		const trials = await runJudgeOnly({
			previousRun,
			suiteConfig: suite,
			runOptions: { mode: "judge-only", timeoutMs: 30_000 },
		});

		expect(trials).toHaveLength(2);
		expect(trials[0]?.trialIndex).toBe(0);
		expect(trials[1]?.trialIndex).toBe(1);
	});

	it("looks up expected from suite config cases", async () => {
		const expectedTracker: string[] = [];
		const trackingGrader: GraderConfig = {
			grader: async (_output, expected) => {
				if (expected?.text) expectedTracker.push(expected.text);
				return { pass: true, score: 1, reason: "ok", graderName: "tracker" };
			},
		};

		const suite: ResolvedSuite = {
			name: "test-suite",
			target: async () => ({ text: "unused", latencyMs: 0 }),
			cases: [{ id: "C01", input: { query: "test" }, expected: { text: "expected-value" } }],
			defaultGraders: [trackingGrader],
		};

		const previousRun = makeRun([
			{ caseId: "C01", status: "pass", output: sampleOutput, grades: [], score: 1, durationMs: 50 },
		]);

		await runJudgeOnly({
			previousRun,
			suiteConfig: suite,
			runOptions: { mode: "judge-only", timeoutMs: 30_000 },
		});

		expect(expectedTracker).toEqual(["expected-value"]);
	});
});
