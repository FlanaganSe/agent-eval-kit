/** Change direction for a metric or status between two runs. */
export type ChangeDirection = "improvement" | "regression" | "unchanged" | "added" | "removed";

/** Per-grader comparison within a case. Scores are undefined when the grader was added or removed between runs. */
export interface GraderChange {
	readonly graderName: string;
	readonly direction: ChangeDirection;
	/** Grader score in the base run. Undefined if the grader was added in the compare run. */
	readonly baseScore: number | undefined;
	/** Grader score in the compare run. Undefined if the grader was removed. */
	readonly compareScore: number | undefined;
	readonly basePass: boolean | undefined;
	readonly comparePass: boolean | undefined;
	/** Score difference (compare - base). Positive means improvement. */
	readonly scoreDelta: number;
}

/** Per-case comparison between two runs. Status fields are undefined when the case was added or removed. */
export interface CaseComparison {
	readonly caseId: string;
	readonly direction: ChangeDirection;
	/** Case status in the base run. Undefined if the case was added in the compare run. */
	readonly baseStatus: "pass" | "fail" | "error" | undefined;
	/** Case status in the compare run. Undefined if the case was removed. */
	readonly compareStatus: "pass" | "fail" | "error" | undefined;
	readonly baseScore: number | undefined;
	readonly compareScore: number | undefined;
	/** Score difference (compare - base). Positive means improvement. */
	readonly scoreDelta: number;
	readonly graderChanges: readonly GraderChange[];
}

/** Per-category comparison summary between two runs. */
export interface CategoryComparisonSummary {
	readonly category: string;
	readonly basePassRate: number | undefined;
	readonly comparePassRate: number | undefined;
	/** Pass rate difference (compare - base). Positive means improvement. */
	readonly passRateDelta: number;
	readonly direction: ChangeDirection;
}

/** Aggregate comparison summary across all cases. All deltas are computed as compare minus base. */
export interface ComparisonSummary {
	readonly totalCases: number;
	readonly regressions: number;
	readonly improvements: number;
	readonly unchanged: number;
	readonly added: number;
	readonly removed: number;
	/** Total cost difference in dollars (compare - base). Positive means the compare run was more expensive. */
	readonly costDelta: number;
	/** Total duration difference in milliseconds (compare - base). Positive means the compare run was slower. */
	readonly durationDelta: number;
	readonly baseGatePass: boolean;
	readonly compareGatePass: boolean;
	readonly byCategory: readonly CategoryComparisonSummary[];
}

/** Full comparison result between two runs. Never persisted — computed on demand by `compareRuns()`. */
export interface RunComparison {
	readonly baseRunId: string;
	readonly compareRunId: string;
	readonly suiteId: string;
	readonly cases: readonly CaseComparison[];
	readonly summary: ComparisonSummary;
}
