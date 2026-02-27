import type { GateCheckResult, GateConfig, GateResult, RunSummary } from "../config/types.js";

/**
 * Evaluates suite-level gates against the run summary.
 * Returns pass/fail per gate plus an overall result.
 */
export function evaluateGates(
	summary: Omit<RunSummary, "gateResult">,
	gates: GateConfig | undefined,
): GateResult {
	if (!gates) {
		return { pass: true, results: [] };
	}

	const results: GateCheckResult[] = [];

	if (gates.passRate !== undefined) {
		const pass = summary.passRate >= gates.passRate;
		results.push({
			gate: "passRate",
			pass,
			actual: summary.passRate,
			threshold: gates.passRate,
			reason: pass
				? `Pass rate ${(summary.passRate * 100).toFixed(1)}% >= ${(gates.passRate * 100).toFixed(1)}%`
				: `Pass rate ${(summary.passRate * 100).toFixed(1)}% < ${(gates.passRate * 100).toFixed(1)}%`,
		});
	}

	if (gates.maxCost !== undefined) {
		const pass = summary.totalCost <= gates.maxCost;
		results.push({
			gate: "maxCost",
			pass,
			actual: summary.totalCost,
			threshold: gates.maxCost,
			reason: pass
				? `Total cost $${summary.totalCost} <= $${gates.maxCost}`
				: `Total cost $${summary.totalCost} > $${gates.maxCost}`,
		});
	}

	if (gates.p95LatencyMs !== undefined) {
		const pass = summary.p95LatencyMs <= gates.p95LatencyMs;
		results.push({
			gate: "p95LatencyMs",
			pass,
			actual: summary.p95LatencyMs,
			threshold: gates.p95LatencyMs,
			reason: pass
				? `p95 latency ${summary.p95LatencyMs}ms <= ${gates.p95LatencyMs}ms`
				: `p95 latency ${summary.p95LatencyMs}ms > ${gates.p95LatencyMs}ms`,
		});
	}

	return {
		pass: results.every((r) => r.pass),
		results,
	};
}
