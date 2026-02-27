import { describe, expect, it } from "vitest";
import type { GradeResult, GraderConfig, GraderFn } from "../config/types.js";
import { computeCaseResult } from "./scoring.js";

const dummyGrader: GraderFn = async () => ({
	pass: true,
	score: 1,
	reason: "",
	graderName: "dummy",
});

function makeGrade(pass: boolean, score: number, name: string): GradeResult {
	return { pass, score, reason: pass ? "ok" : "failed", graderName: name };
}

function makeConfig(
	opts: { weight?: number; required?: boolean; threshold?: number } = {},
): GraderConfig {
	return { grader: dummyGrader, ...opts };
}

describe("computeCaseResult", () => {
	it("passes with all passing grades", () => {
		const grades = [makeGrade(true, 1, "a"), makeGrade(true, 0.8, "b")];
		const configs = [makeConfig(), makeConfig()];
		const result = computeCaseResult(grades, configs, 0.5);
		expect(result.pass).toBe(true);
		expect(result.score).toBe(0.9); // average of 1 and 0.8
	});

	it("fails when required grader fails", () => {
		const grades = [makeGrade(false, 0, "required-a"), makeGrade(true, 1, "b")];
		const configs = [makeConfig({ required: true }), makeConfig()];
		const result = computeCaseResult(grades, configs, 0.5);
		expect(result.pass).toBe(false);
		expect(result.failedGraders).toContain("required-a");
		expect(result.reason).toContain("Required grader");
	});

	it("computes weighted average correctly", () => {
		const grades = [makeGrade(true, 1, "a"), makeGrade(true, 0, "b")];
		const configs = [makeConfig({ weight: 3 }), makeConfig({ weight: 1 })];
		const result = computeCaseResult(grades, configs, 0.5);
		expect(result.score).toBe(0.75); // (1*3 + 0*1) / (3+1)
		expect(result.pass).toBe(true);
	});

	it("fails when score is below threshold", () => {
		const grades = [makeGrade(false, 0.3, "a")];
		const configs = [makeConfig()];
		const result = computeCaseResult(grades, configs, 0.5);
		expect(result.pass).toBe(false);
	});

	it("passes when score is exactly at threshold", () => {
		const grades = [makeGrade(true, 0.5, "a")];
		const configs = [makeConfig()];
		const result = computeCaseResult(grades, configs, 0.5);
		expect(result.pass).toBe(true);
	});

	it("passes when just below threshold fails", () => {
		const grades = [makeGrade(false, 0.499, "a")];
		const configs = [makeConfig()];
		const result = computeCaseResult(grades, configs, 0.5);
		expect(result.pass).toBe(false);
	});

	it("returns score 1.0 when all required pass and no optional", () => {
		const grades = [makeGrade(true, 1, "a"), makeGrade(true, 1, "b")];
		const configs = [makeConfig({ required: true }), makeConfig({ required: true })];
		const result = computeCaseResult(grades, configs, 0.5);
		expect(result.pass).toBe(true);
		expect(result.score).toBe(1);
	});

	it("handles empty grades list", () => {
		const result = computeCaseResult([], [], 0.5);
		expect(result.pass).toBe(true);
		expect(result.score).toBe(1);
	});
});
