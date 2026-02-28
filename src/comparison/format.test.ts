import { describe, expect, it } from "vitest";
import { formatComparisonReport } from "./format.js";
import type { RunComparison } from "./types.js";

function makeComparison(overrides?: Partial<RunComparison>): RunComparison {
	return {
		baseRunId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
		compareRunId: "11111111-2222-3333-4444-555555555555",
		suiteId: "test-suite",
		cases: [],
		summary: {
			totalCases: 0,
			regressions: 0,
			improvements: 0,
			unchanged: 0,
			added: 0,
			removed: 0,
			costDelta: 0,
			durationDelta: 0,
			baseGatePass: true,
			compareGatePass: true,
			byCategory: [],
		},
		...overrides,
	};
}

describe("formatComparisonReport", () => {
	it("shows run IDs and suite name", () => {
		const report = formatComparisonReport(makeComparison(), { color: false });

		expect(report).toContain("aaaaaaaa");
		expect(report).toContain("11111111");
		expect(report).toContain("test-suite");
	});

	it("shows regression with down arrow", () => {
		const comparison = makeComparison({
			cases: [
				{
					caseId: "C01",
					direction: "regression",
					baseStatus: "pass",
					compareStatus: "fail",
					baseScore: 1,
					compareScore: 0,
					scoreDelta: -1,
					graderChanges: [],
				},
			],
			summary: {
				totalCases: 1,
				regressions: 1,
				improvements: 0,
				unchanged: 0,
				added: 0,
				removed: 0,
				costDelta: 0,
				durationDelta: 0,
				baseGatePass: true,
				compareGatePass: true,
				byCategory: [],
			},
		});

		const report = formatComparisonReport(comparison, { color: false });

		expect(report).toContain("▼");
		expect(report).toContain("1 regression");
	});

	it("shows improvement with up arrow", () => {
		const comparison = makeComparison({
			cases: [
				{
					caseId: "C01",
					direction: "improvement",
					baseStatus: "fail",
					compareStatus: "pass",
					baseScore: 0,
					compareScore: 1,
					scoreDelta: 1,
					graderChanges: [],
				},
			],
			summary: {
				totalCases: 1,
				regressions: 0,
				improvements: 1,
				unchanged: 0,
				added: 0,
				removed: 0,
				costDelta: 0,
				durationDelta: 0,
				baseGatePass: true,
				compareGatePass: true,
				byCategory: [],
			},
		});

		const report = formatComparisonReport(comparison, { color: false });

		expect(report).toContain("▲");
		expect(report).toContain("1 improvement");
	});

	it("hides unchanged cases without verbose", () => {
		const comparison = makeComparison({
			cases: [
				{
					caseId: "C01",
					direction: "unchanged",
					baseStatus: "pass",
					compareStatus: "pass",
					baseScore: 1,
					compareScore: 1,
					scoreDelta: 0,
					graderChanges: [],
				},
			],
			summary: {
				totalCases: 1,
				regressions: 0,
				improvements: 0,
				unchanged: 1,
				added: 0,
				removed: 0,
				costDelta: 0,
				durationDelta: 0,
				baseGatePass: true,
				compareGatePass: true,
				byCategory: [],
			},
		});

		const report = formatComparisonReport(comparison, { color: false, verbose: false });

		expect(report).not.toContain("C01");
		expect(report).toContain("1 unchanged");
	});

	it("shows unchanged cases with verbose", () => {
		const comparison = makeComparison({
			cases: [
				{
					caseId: "C01",
					direction: "unchanged",
					baseStatus: "pass",
					compareStatus: "pass",
					baseScore: 1,
					compareScore: 1,
					scoreDelta: 0,
					graderChanges: [],
				},
			],
			summary: {
				totalCases: 1,
				regressions: 0,
				improvements: 0,
				unchanged: 1,
				added: 0,
				removed: 0,
				costDelta: 0,
				durationDelta: 0,
				baseGatePass: true,
				compareGatePass: true,
				byCategory: [],
			},
		});

		const report = formatComparisonReport(comparison, { color: false, verbose: true });

		expect(report).toContain("C01");
	});

	it("shows cost delta", () => {
		const comparison = makeComparison({
			summary: {
				totalCases: 0,
				regressions: 0,
				improvements: 0,
				unchanged: 0,
				added: 0,
				removed: 0,
				costDelta: 0.03,
				durationDelta: 0,
				baseGatePass: true,
				compareGatePass: true,
				byCategory: [],
			},
		});

		const report = formatComparisonReport(comparison, { color: false });

		expect(report).toContain("+$0.0300");
	});

	it("shows gate change", () => {
		const comparison = makeComparison({
			summary: {
				totalCases: 0,
				regressions: 0,
				improvements: 0,
				unchanged: 0,
				added: 0,
				removed: 0,
				costDelta: 0,
				durationDelta: 0,
				baseGatePass: true,
				compareGatePass: false,
				byCategory: [],
			},
		});

		const report = formatComparisonReport(comparison, { color: false });

		expect(report).toContain("Gate: PASS → FAIL");
	});

	it("shows category breakdown", () => {
		const comparison = makeComparison({
			summary: {
				totalCases: 1,
				regressions: 1,
				improvements: 0,
				unchanged: 0,
				added: 0,
				removed: 0,
				costDelta: 0,
				durationDelta: 0,
				baseGatePass: true,
				compareGatePass: true,
				byCategory: [
					{
						category: "happy_path",
						basePassRate: 1,
						comparePassRate: 0,
						passRateDelta: -1,
						direction: "regression",
					},
				],
			},
		});

		const report = formatComparisonReport(comparison, { color: false });

		expect(report).toContain("By category:");
		expect(report).toContain("happy_path");
		expect(report).toContain("100%");
		expect(report).toContain("0%");
	});
});
