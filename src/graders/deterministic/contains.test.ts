import { describe, expect, it } from "vitest";
import type { GraderContext, TargetOutput } from "../../config/types.js";
import { contains, notContains } from "./contains.js";

const ctx: GraderContext = { caseId: "t", suiteId: "s", mode: "live", graderName: "" };

describe("contains", () => {
	it("passes when substring is found (case-insensitive default)", async () => {
		const output: TargetOutput = { text: "Hello World", latencyMs: 0 };
		const result = await contains("hello")(output, undefined, ctx);
		expect(result.pass).toBe(true);
		expect(result.score).toBe(1);
	});

	it("fails when substring is not found", async () => {
		const output: TargetOutput = { text: "Hello World", latencyMs: 0 };
		const result = await contains("xyz")(output, undefined, ctx);
		expect(result.pass).toBe(false);
		expect(result.score).toBe(0);
	});

	it("respects caseSensitive option", async () => {
		const output: TargetOutput = { text: "Hello World", latencyMs: 0 };
		const result = await contains("hello", { caseSensitive: true })(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("handles empty text", async () => {
		const output: TargetOutput = { latencyMs: 0 };
		const result = await contains("anything")(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("handles empty substring", async () => {
		const output: TargetOutput = { text: "Hello", latencyMs: 0 };
		const result = await contains("")(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("sets graderName", async () => {
		const output: TargetOutput = { text: "Hello", latencyMs: 0 };
		const result = await contains("Hello")(output, undefined, ctx);
		expect(result.graderName).toBe("contains(Hello)");
	});
});

describe("notContains", () => {
	it("passes when substring is not found", async () => {
		const output: TargetOutput = { text: "Hello World", latencyMs: 0 };
		const result = await notContains("xyz")(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("fails when substring is found", async () => {
		const output: TargetOutput = { text: "Hello World", latencyMs: 0 };
		const result = await notContains("hello")(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("handles empty text (passes — nothing to find)", async () => {
		const output: TargetOutput = { latencyMs: 0 };
		const result = await notContains("anything")(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});
});
