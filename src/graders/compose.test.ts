import { describe, expect, it } from "vitest";
import type { GraderContext, GraderFn, TargetOutput } from "../config/types.js";
import { all, any, not } from "./compose.js";

const ctx: GraderContext = {
	caseId: "test",
	suiteId: "test",
	mode: "live",
	graderName: "",
};

const output: TargetOutput = { text: "hello world", latencyMs: 100 };

const passingGrader: GraderFn = async () => ({
	pass: true,
	score: 1,
	reason: "passed",
	graderName: "pass",
});

const failingGrader: GraderFn = async () => ({
	pass: false,
	score: 0,
	reason: "failed",
	graderName: "fail",
});

const partialGrader: GraderFn = async () => ({
	pass: true,
	score: 0.7,
	reason: "partial",
	graderName: "partial",
});

describe("all", () => {
	it("passes when all graders pass", async () => {
		const grader = all([passingGrader, partialGrader]);
		const result = await grader(output, undefined, ctx);
		expect(result.pass).toBe(true);
		expect(result.score).toBe(0.7); // min score
	});

	it("fails when any grader fails", async () => {
		const grader = all([passingGrader, failingGrader]);
		const result = await grader(output, undefined, ctx);
		expect(result.pass).toBe(false);
		expect(result.score).toBe(0);
	});

	it("handles empty grader list (vacuous truth)", async () => {
		const grader = all([]);
		const result = await grader(output, undefined, ctx);
		expect(result.pass).toBe(true);
		expect(result.score).toBe(1);
	});

	it("includes grader names in composite name", async () => {
		const grader = all([passingGrader, failingGrader]);
		const result = await grader(output, undefined, ctx);
		expect(result.graderName).toContain("all(");
		expect(result.graderName).toContain("pass");
		expect(result.graderName).toContain("fail");
	});
});

describe("any", () => {
	it("passes when at least one grader passes", async () => {
		const grader = any([failingGrader, passingGrader]);
		const result = await grader(output, undefined, ctx);
		expect(result.pass).toBe(true);
		expect(result.score).toBe(1); // max score
	});

	it("fails when all graders fail", async () => {
		const grader = any([failingGrader, failingGrader]);
		const result = await grader(output, undefined, ctx);
		expect(result.pass).toBe(false);
		expect(result.score).toBe(0);
	});

	it("handles empty grader list (no successes)", async () => {
		const grader = any([]);
		const result = await grader(output, undefined, ctx);
		expect(result.pass).toBe(false);
		expect(result.score).toBe(0);
	});
});

describe("not", () => {
	it("inverts pass to fail", async () => {
		const grader = not(passingGrader);
		const result = await grader(output, undefined, ctx);
		expect(result.pass).toBe(false);
		expect(result.score).toBe(0);
	});

	it("inverts fail to pass", async () => {
		const grader = not(failingGrader);
		const result = await grader(output, undefined, ctx);
		expect(result.pass).toBe(true);
		expect(result.score).toBe(1);
	});

	it("inverts partial score", async () => {
		const grader = not(partialGrader);
		const result = await grader(output, undefined, ctx);
		expect(result.score).toBeCloseTo(0.3);
	});

	it("includes NOT in grader name", async () => {
		const grader = not(passingGrader);
		const result = await grader(output, undefined, ctx);
		expect(result.graderName).toContain("not(");
	});
});

describe("nested composition", () => {
	it("all([any([...]), not(...)])", async () => {
		const grader = all([any([failingGrader, passingGrader]), not(failingGrader)]);
		const result = await grader(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});
});
