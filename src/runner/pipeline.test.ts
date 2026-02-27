import { describe, expect, it } from "vitest";
import type { GraderConfig, TargetOutput } from "../config/types.js";
import { runGraderPipeline } from "./pipeline.js";

const output: TargetOutput = { text: "hello world", latencyMs: 100 };
const pipelineCtx = { caseId: "H01", suiteId: "smoke", mode: "live" as const };

const passingConfig: GraderConfig = {
	grader: async () => ({
		pass: true,
		score: 1,
		reason: "ok",
		graderName: "pass",
	}),
};

const failingConfig: GraderConfig = {
	grader: async () => ({
		pass: false,
		score: 0,
		reason: "failed",
		graderName: "fail",
	}),
	required: true,
};

describe("runGraderPipeline", () => {
	it("runs all graders and collects results", async () => {
		const result = await runGraderPipeline(
			output,
			undefined,
			undefined,
			[passingConfig, passingConfig],
			pipelineCtx,
		);
		expect(result.grades).toHaveLength(2);
		expect(result.caseResult.pass).toBe(true);
	});

	it("case graders replace suite defaults", async () => {
		const caseGraders: readonly GraderConfig[] = [passingConfig];
		const suiteGraders: readonly GraderConfig[] = [failingConfig];

		const result = await runGraderPipeline(
			output,
			undefined,
			caseGraders,
			suiteGraders,
			pipelineCtx,
		);
		expect(result.grades).toHaveLength(1);
		expect(result.caseResult.pass).toBe(true);
	});

	it("uses suite defaults when no case graders", async () => {
		const result = await runGraderPipeline(
			output,
			undefined,
			undefined,
			[failingConfig],
			pipelineCtx,
		);
		expect(result.grades).toHaveLength(1);
		expect(result.caseResult.pass).toBe(false);
	});

	it("handles mixed required + optional graders", async () => {
		const result = await runGraderPipeline(
			output,
			undefined,
			undefined,
			[passingConfig, failingConfig],
			pipelineCtx,
		);
		expect(result.caseResult.pass).toBe(false);
		expect(result.caseResult.failedGraders).toContain("fail");
	});

	it("passes with empty graders list", async () => {
		const result = await runGraderPipeline(output, undefined, undefined, [], pipelineCtx);
		expect(result.grades).toHaveLength(0);
		expect(result.caseResult.pass).toBe(true);
	});
});
