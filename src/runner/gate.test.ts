import { describe, expect, it } from "vitest";
import type { RunSummary } from "../config/types.js";
import { evaluateGates } from "./gate.js";

const baseSummary: Omit<RunSummary, "gateResult"> = {
	totalCases: 4,
	passed: 3,
	failed: 1,
	errors: 0,
	passRate: 0.75,
	totalCost: 0.05,
	totalDurationMs: 5000,
	p95LatencyMs: 500,
};

describe("evaluateGates", () => {
	it("passes with no gates configured", () => {
		const result = evaluateGates(baseSummary, undefined);
		expect(result.pass).toBe(true);
		expect(result.results).toHaveLength(0);
	});

	it("fails when pass rate is below threshold", () => {
		const result = evaluateGates(baseSummary, { passRate: 0.95 });
		expect(result.pass).toBe(false);
		expect(result.results[0]?.gate).toBe("passRate");
		expect(result.results[0]?.pass).toBe(false);
	});

	it("passes when pass rate meets threshold", () => {
		const result = evaluateGates(baseSummary, { passRate: 0.75 });
		expect(result.pass).toBe(true);
	});

	it("fails when cost exceeds max", () => {
		const result = evaluateGates(baseSummary, { maxCost: 0.01 });
		expect(result.pass).toBe(false);
	});

	it("passes when cost is within max", () => {
		const result = evaluateGates(baseSummary, { maxCost: 0.1 });
		expect(result.pass).toBe(true);
	});

	it("fails when p95 latency exceeds threshold", () => {
		const result = evaluateGates(baseSummary, { p95LatencyMs: 200 });
		expect(result.pass).toBe(false);
	});

	it("passes when all gates meet thresholds", () => {
		const result = evaluateGates(baseSummary, {
			passRate: 0.5,
			maxCost: 1.0,
			p95LatencyMs: 1000,
		});
		expect(result.pass).toBe(true);
		expect(result.results).toHaveLength(3);
	});

	it("fails if any one gate fails", () => {
		const result = evaluateGates(baseSummary, {
			passRate: 0.5,
			maxCost: 0.001, // This will fail
			p95LatencyMs: 1000,
		});
		expect(result.pass).toBe(false);
	});
});
