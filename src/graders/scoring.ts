import type { CaseResult, GradeResult, GraderConfig } from "./types.js";

/**
 * Computes the aggregate case result from individual grade results.
 *
 * Algorithm:
 * 1. Check required graders first — any failure is immediate case failure.
 * 2. Compute weighted average of all grader scores.
 * 3. Compare against caseThreshold.
 */
export function computeCaseResult(
	grades: readonly GradeResult[],
	configs: readonly GraderConfig[],
	caseThreshold: number,
): CaseResult {
	if (grades.length === 0) {
		return {
			pass: true,
			score: 1,
			failedGraders: [],
			reason: "No graders configured",
		};
	}

	// Check required graders first
	const failedRequired: string[] = [];
	for (let i = 0; i < grades.length; i++) {
		const grade = grades[i];
		const config = configs[i];
		if (!grade || !config) continue;

		if (config.required && !grade.pass) {
			failedRequired.push(grade.graderName);
		}
	}

	if (failedRequired.length > 0) {
		const failedGrade = grades.find((g) => failedRequired.includes(g.graderName) && !g.pass);
		return {
			pass: false,
			score: 0,
			failedGraders: failedRequired,
			reason: `Required grader '${failedRequired[0]}' failed: ${failedGrade?.reason ?? "unknown"}`,
		};
	}

	// Compute weighted average
	let weightedSum = 0;
	let totalWeight = 0;
	const failedGraders: string[] = [];

	for (let i = 0; i < grades.length; i++) {
		const grade = grades[i];
		const config = configs[i];
		if (!grade || !config) continue;

		const weight = config.weight ?? 1.0;
		weightedSum += grade.score * weight;
		totalWeight += weight;

		if (!grade.pass) {
			failedGraders.push(grade.graderName);
		}
	}

	const score = totalWeight > 0 ? weightedSum / totalWeight : 1;
	const pass = score >= caseThreshold;

	const reason = pass
		? `Score ${score.toFixed(3)} >= threshold ${caseThreshold}`
		: `Score ${score.toFixed(3)} < threshold ${caseThreshold}. Failed: ${failedGraders.join(", ")}`;

	return { pass, score, failedGraders, reason };
}
