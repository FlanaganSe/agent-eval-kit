import { describe, expect, it } from "vitest";
import type { GraderContext, TargetOutput } from "../../config/types.js";
import { toolCalled, toolNotCalled } from "./tool-called.js";

const ctx: GraderContext = { caseId: "t", suiteId: "s", mode: "live", graderName: "" };

describe("toolCalled", () => {
	it("passes when tool is found", async () => {
		const output: TargetOutput = {
			toolCalls: [{ name: "search" }, { name: "format" }],
			latencyMs: 0,
		};
		const result = await toolCalled("search")(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("fails when tool is not found", async () => {
		const output: TargetOutput = {
			toolCalls: [{ name: "format" }],
			latencyMs: 0,
		};
		const result = await toolCalled("search")(output, undefined, ctx);
		expect(result.pass).toBe(false);
		expect(result.reason).toContain("format");
	});

	it("fails with no tool calls", async () => {
		const output: TargetOutput = { latencyMs: 0 };
		const result = await toolCalled("search")(output, undefined, ctx);
		expect(result.pass).toBe(false);
		expect(result.reason).toContain("No tool calls");
	});

	it("fails with empty tool calls array", async () => {
		const output: TargetOutput = { toolCalls: [], latencyMs: 0 };
		const result = await toolCalled("search")(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("handles multiple calls of same tool", async () => {
		const output: TargetOutput = {
			toolCalls: [{ name: "search" }, { name: "search" }],
			latencyMs: 0,
		};
		const result = await toolCalled("search")(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});
});

describe("toolNotCalled", () => {
	it("passes when tool is not found", async () => {
		const output: TargetOutput = {
			toolCalls: [{ name: "format" }],
			latencyMs: 0,
		};
		const result = await toolNotCalled("search")(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("fails when tool is found", async () => {
		const output: TargetOutput = {
			toolCalls: [{ name: "search" }],
			latencyMs: 0,
		};
		const result = await toolNotCalled("search")(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("passes with no tool calls", async () => {
		const output: TargetOutput = { latencyMs: 0 };
		const result = await toolNotCalled("search")(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});
});
