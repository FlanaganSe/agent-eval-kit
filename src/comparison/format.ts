import pc from "picocolors";
import type { CaseComparison, ChangeDirection, RunComparison } from "./types.js";

export interface ComparisonFormatOptions {
	readonly color?: boolean | undefined;
	readonly verbose?: boolean | undefined;
}

/**
 * Formats a RunComparison as a human-readable console report.
 */
export function formatComparisonReport(
	comparison: RunComparison,
	options?: ComparisonFormatOptions,
): string {
	const useColor = options?.color !== false;
	const c = useColor ? pc : noColor;
	const lines: string[] = [];

	lines.push(
		`Comparing ${c.dim(comparison.baseRunId.slice(0, 8))} → ${c.bold(comparison.compareRunId.slice(0, 8))} (${comparison.suiteId})`,
	);
	lines.push("");

	// Show changed cases (skip unchanged unless verbose)
	for (const cc of comparison.cases) {
		if (cc.direction === "unchanged" && !options?.verbose) continue;
		lines.push(formatCaseComparison(cc, c));

		if (options?.verbose && cc.graderChanges.length > 0) {
			for (const gc of cc.graderChanges) {
				if (gc.direction === "unchanged" && !options.verbose) continue;
				const arrow = directionArrow(gc.direction, c);
				const baseLabel = gc.basePass !== undefined ? (gc.basePass ? "PASS" : "FAIL") : "—";
				const compareLabel =
					gc.comparePass !== undefined ? (gc.comparePass ? "PASS" : "FAIL") : "—";
				lines.push(`    ${gc.graderName}: ${baseLabel} → ${compareLabel} ${arrow}`);
			}
		}
	}

	lines.push("");

	// Summary
	const s = comparison.summary;
	const parts: string[] = [];
	if (s.regressions > 0)
		parts.push(c.red(`${s.regressions} regression${s.regressions > 1 ? "s" : ""}`));
	if (s.improvements > 0)
		parts.push(c.green(`${s.improvements} improvement${s.improvements > 1 ? "s" : ""}`));
	if (s.unchanged > 0) parts.push(c.dim(`${s.unchanged} unchanged`));
	if (s.added > 0) parts.push(c.blue(`${s.added} added`));
	if (s.removed > 0) parts.push(c.yellow(`${s.removed} removed`));
	lines.push(`Summary: ${parts.join(" | ")}`);

	// Cost delta
	const costSign = s.costDelta >= 0 ? "+" : "";
	lines.push(`Cost delta: ${costSign}$${s.costDelta.toFixed(4)}`);

	// Category breakdown
	if (s.byCategory.length > 0) {
		lines.push("");
		lines.push("By category:");
		for (const cat of s.byCategory) {
			const arrow = directionArrow(cat.direction, c);
			const baseLabel =
				cat.basePassRate !== undefined ? `${(cat.basePassRate * 100).toFixed(0)}%` : "—";
			const compareLabel =
				cat.comparePassRate !== undefined ? `${(cat.comparePassRate * 100).toFixed(0)}%` : "—";
			lines.push(`  ${cat.category}: ${baseLabel} → ${compareLabel} ${arrow}`);
		}
	}

	// Gate change
	if (s.baseGatePass !== s.compareGatePass) {
		lines.push("");
		if (s.baseGatePass && !s.compareGatePass) {
			lines.push(c.red("Gate: PASS → FAIL (regression)"));
		} else {
			lines.push(c.green("Gate: FAIL → PASS (improvement)"));
		}
	}

	return lines.join("\n");
}

function formatCaseComparison(cc: CaseComparison, c: Colors): string {
	const arrow = directionArrow(cc.direction, c);
	const baseLabel = cc.baseStatus ?? "—";
	const compareLabel = cc.compareStatus ?? "—";
	const scoreDeltaLabel =
		cc.scoreDelta !== 0 ? ` (${cc.scoreDelta > 0 ? "+" : ""}${cc.scoreDelta.toFixed(2)})` : "";

	return `  ${cc.caseId.padEnd(8)} ${baseLabel.padEnd(5)} → ${compareLabel.padEnd(5)} ${arrow}${scoreDeltaLabel}`;
}

function directionArrow(dir: ChangeDirection, c: Colors): string {
	switch (dir) {
		case "regression":
			return c.red("▼");
		case "improvement":
			return c.green("▲");
		case "unchanged":
			return c.dim("=");
		case "added":
			return c.blue("+");
		case "removed":
			return c.yellow("−");
	}
}

type Colors = typeof pc;

const noColor: Colors = new Proxy(pc, {
	get(_target, prop: string) {
		if (typeof prop === "string") return (s: string) => s;
		return undefined;
	},
}) as Colors;
