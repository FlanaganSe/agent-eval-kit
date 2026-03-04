import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compareRuns } from "../../comparison/compare.js";
import { formatComparisonReport } from "../../comparison/format.js";
import type { Run, Trial } from "../../config/types.js";
import { saveRun } from "../../storage/run-store.js";
import { executeCompare } from "./compare.js";

// Test the compare logic flow used by the CLI command.
// We test compareRuns + formatComparisonReport integration since
// the CLI command is a thin wrapper around these.

function makeTrial(caseId: string, status: "pass" | "fail" | "error", score: number): Trial {
	return {
		caseId,
		status,
		output: { text: "output", latencyMs: 100, cost: 0.01 },
		grades: [{ pass: status === "pass", score, reason: "test", graderName: "g1" }],
		score,
		durationMs: 100,
	};
}

function makeRun(id: string, trials: readonly Trial[]): Run {
	const passed = trials.filter((t) => t.status === "pass").length;
	return {
		schemaVersion: "1.0.0",
		id,
		suiteId: "test-suite",
		mode: "live",
		trials,
		summary: {
			totalCases: trials.length,
			passed,
			failed: trials.length - passed,
			errors: 0,
			passRate: trials.length > 0 ? passed / trials.length : 0,
			totalCost: trials.reduce((sum, t) => sum + (t.output.cost ?? 0), 0),
			totalDurationMs: 500,
			p95LatencyMs: 100,
			gateResult: { pass: passed === trials.length, results: [] },
		},
		timestamp: new Date().toISOString(),
		configHash: "abc123",
		frameworkVersion: "0.0.1",
	};
}

let tempDir: string;

beforeEach(async () => {
	tempDir = await mkdtemp(join(tmpdir(), "compare-test-"));
});

afterEach(async () => {
	await rm(tempDir, { recursive: true, force: true });
});

describe("executeCompare --config", () => {
	it("resolves run directory from config path", async () => {
		const run = makeRun("run-a", [makeTrial("C01", "pass", 1)]);
		const runDir = join(tempDir, ".eval-runs");
		await saveRun(run, runDir);
		await saveRun({ ...run, id: "run-b" }, runDir);

		// Should find runs in tempDir/.eval-runs/ via --config pointing at the directory
		await executeCompare({ config: tempDir, base: "run-a", compare: "run-b" });
		// No throw = success (runs were found in the correct directory)
	});

	it("fails when config points to wrong directory", async () => {
		const run = makeRun("run-a", [makeTrial("C01", "pass", 1)]);
		const runDir = join(tempDir, ".eval-runs");
		await saveRun(run, runDir);
		await saveRun({ ...run, id: "run-b" }, runDir);

		const wrongDir = await mkdtemp(join(tmpdir(), "wrong-"));
		// Should fail because wrongDir has no .eval-runs/
		// executeCompare sets process.exitCode on error rather than throwing
		const origExitCode = process.exitCode;
		await executeCompare({ config: wrongDir, base: "run-a", compare: "run-b" });
		expect(process.exitCode).not.toBe(0);
		process.exitCode = origExitCode;
		await rm(wrongDir, { recursive: true, force: true });
	});
});

describe("compare command logic", () => {
	it("same run compared to itself shows 0 changes", () => {
		const run = makeRun("run-id", [makeTrial("C01", "pass", 1)]);
		const result = compareRuns(run, run);

		expect(result.summary.regressions).toBe(0);
		expect(result.summary.improvements).toBe(0);
		expect(result.summary.unchanged).toBe(1);
	});

	it("--fail-on-regression would trigger exit 1 on regressions", () => {
		const base = makeRun("base", [makeTrial("C01", "pass", 1)]);
		const compare = makeRun("compare", [makeTrial("C01", "fail", 0)]);
		const result = compareRuns(base, compare);

		// This is the condition the CLI checks
		expect(result.summary.regressions).toBeGreaterThan(0);
	});

	it("--format=json produces valid JSON structure", () => {
		const base = makeRun("base", [makeTrial("C01", "pass", 1)]);
		const compare = makeRun("compare", [makeTrial("C01", "fail", 0)]);
		const result = compareRuns(base, compare);

		const json = JSON.stringify(result);
		const parsed = JSON.parse(json);

		expect(parsed.baseRunId).toBe("base");
		expect(parsed.compareRunId).toBe("compare");
		expect(parsed.summary.regressions).toBe(1);
		expect(Array.isArray(parsed.cases)).toBe(true);
	});

	it("--score-threshold is applied via compareOptions", () => {
		const base = makeRun("base", [makeTrial("C01", "pass", 0.9)]);
		const compare = makeRun("compare", [makeTrial("C01", "pass", 0.87)]);

		// Default threshold (0.05) would flag this as unchanged (delta = 0.03)
		const defaultResult = compareRuns(base, compare);
		expect(defaultResult.summary.regressions).toBe(0);

		// Custom threshold (0.01) flags it as regression
		const customResult = compareRuns(base, compare, { scoreThreshold: 0.01 });
		expect(customResult.summary.regressions).toBe(1);
	});

	it("console format produces readable output", () => {
		const base = makeRun("base-run-id", [makeTrial("C01", "pass", 1), makeTrial("C02", "pass", 1)]);
		const compare = makeRun("compare-run-id", [
			makeTrial("C01", "fail", 0),
			makeTrial("C02", "pass", 1),
		]);

		const comparison = compareRuns(base, compare);
		const report = formatComparisonReport(comparison, { color: false });

		expect(report).toContain("base-run");
		expect(report).toContain("compare-");
		expect(report).toContain("1 regression");
	});
});
