/** Change direction for a metric or status */
export type ChangeDirection = "improvement" | "regression" | "unchanged" | "added" | "removed";

/** Per-grader comparison within a case */
export interface GraderChange {
	readonly graderName: string;
	readonly direction: ChangeDirection;
	readonly baseScore: number | undefined;
	readonly compareScore: number | undefined;
	readonly basePass: boolean | undefined;
	readonly comparePass: boolean | undefined;
	readonly scoreDelta: number;
}

/** Per-case comparison */
export interface CaseComparison {
	readonly caseId: string;
	readonly direction: ChangeDirection;
	readonly baseStatus: "pass" | "fail" | "error" | undefined;
	readonly compareStatus: "pass" | "fail" | "error" | undefined;
	readonly baseScore: number | undefined;
	readonly compareScore: number | undefined;
	readonly scoreDelta: number;
	readonly graderChanges: readonly GraderChange[];
}

/** Per-category comparison */
export interface CategoryComparisonSummary {
	readonly category: string;
	readonly basePassRate: number | undefined;
	readonly comparePassRate: number | undefined;
	readonly passRateDelta: number;
	readonly direction: ChangeDirection;
}

/** Aggregate comparison summary */
export interface ComparisonSummary {
	readonly totalCases: number;
	readonly regressions: number;
	readonly improvements: number;
	readonly unchanged: number;
	readonly added: number;
	readonly removed: number;
	readonly costDelta: number;
	readonly durationDelta: number;
	readonly baseGatePass: boolean;
	readonly compareGatePass: boolean;
	readonly byCategory: readonly CategoryComparisonSummary[];
}

/** Full comparison result */
export interface RunComparison {
	readonly baseRunId: string;
	readonly compareRunId: string;
	readonly suiteId: string;
	readonly cases: readonly CaseComparison[];
	readonly summary: ComparisonSummary;
}
