import { describe, expect, it } from "vitest";
import type { GraderContext, TargetOutput } from "../../config/types.js";
import { toolSequence } from "./tool-sequence.js";

const ctx: GraderContext = { caseId: "t", suiteId: "s", mode: "live", graderName: "" };

const output: TargetOutput = {
	toolCalls: [{ name: "search" }, { name: "parse" }, { name: "format" }],
	latencyMs: 0,
};

describe("toolSequence — strict", () => {
	it("passes with exact match", async () => {
		const result = await toolSequence(["search", "parse", "format"], "strict")(
			output,
			undefined,
			ctx,
		);
		expect(result.pass).toBe(true);
	});

	it("fails with wrong order", async () => {
		const result = await toolSequence(["parse", "search", "format"], "strict")(
			output,
			undefined,
			ctx,
		);
		expect(result.pass).toBe(false);
	});

	it("fails with different length", async () => {
		const result = await toolSequence(["search", "parse"], "strict")(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});
});

describe("toolSequence — unordered", () => {
	it("passes with same tools in different order", async () => {
		const result = await toolSequence(["format", "search", "parse"], "unordered")(
			output,
			undefined,
			ctx,
		);
		expect(result.pass).toBe(true);
	});

	it("fails with missing tool", async () => {
		const result = await toolSequence(["search", "parse", "missing"], "unordered")(
			output,
			undefined,
			ctx,
		);
		expect(result.pass).toBe(false);
	});
});

describe("toolSequence — subset", () => {
	it("passes when expected tools are present (extra ok)", async () => {
		const result = await toolSequence(["search", "format"], "subset")(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("fails when expected tool is missing", async () => {
		const result = await toolSequence(["search", "missing"], "subset")(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});
});

describe("toolSequence — superset", () => {
	it("passes when actual is subset of expected", async () => {
		const result = await toolSequence(["search", "parse", "format", "extra"], "superset")(
			output,
			undefined,
			ctx,
		);
		expect(result.pass).toBe(true);
	});

	it("fails when actual has unexpected tool", async () => {
		const result = await toolSequence(["search", "parse"], "superset")(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});
});

describe("toolSequence — edge cases", () => {
	it("no tool calls with no expected tools passes", async () => {
		const emptyOutput: TargetOutput = { latencyMs: 0 };
		const result = await toolSequence([], "strict")(emptyOutput, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("no tool calls with expected tools fails", async () => {
		const emptyOutput: TargetOutput = { latencyMs: 0 };
		const result = await toolSequence(["search"], "strict")(emptyOutput, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("default mode is unordered", async () => {
		const result = await toolSequence(["format", "search", "parse"])(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});
});
