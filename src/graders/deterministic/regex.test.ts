import { describe, expect, it } from "vitest";
import type { GraderContext, TargetOutput } from "../../config/types.js";
import { regex } from "./regex.js";

const ctx: GraderContext = { caseId: "t", suiteId: "s", mode: "live", graderName: "" };

describe("regex", () => {
	it("passes when pattern matches (string)", async () => {
		const output: TargetOutput = { text: "Error code: 404", latencyMs: 0 };
		const result = await regex("\\d{3}")(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("passes when pattern matches (RegExp)", async () => {
		const output: TargetOutput = { text: "Hello World", latencyMs: 0 };
		const result = await regex(/hello/i)(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("fails when pattern does not match", async () => {
		const output: TargetOutput = { text: "Hello World", latencyMs: 0 };
		const result = await regex("\\d+")(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("handles flags option", async () => {
		const output: TargetOutput = { text: "Hello World", latencyMs: 0 };
		const result = await regex("hello", { flags: "i" })(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("handles empty text", async () => {
		const output: TargetOutput = { latencyMs: 0 };
		const result = await regex(".")(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("catches invalid regex at factory time", () => {
		expect(() => regex("[invalid")).toThrow();
	});

	it("is pure with global flag (g flag does not cause stateful failures)", async () => {
		const grader = regex(/hello/gi);
		const output: TargetOutput = { text: "Hello World", latencyMs: 0 };
		const result1 = await grader(output, undefined, ctx);
		const result2 = await grader(output, undefined, ctx);
		expect(result1.pass).toBe(true);
		expect(result2.pass).toBe(true);
	});

	it("is pure with sticky flag (y flag does not cause stateful failures)", async () => {
		const grader = regex(/\d+/y);
		const output: TargetOutput = { text: "123 abc", latencyMs: 0 };
		const result1 = await grader(output, undefined, ctx);
		const result2 = await grader(output, undefined, ctx);
		expect(result1.pass).toBe(true);
		expect(result2.pass).toBe(true);
	});

	it("does not mutate the caller's RegExp instance", async () => {
		const callerRegex = /test/g;
		callerRegex.lastIndex = 3;
		regex(callerRegex);
		expect(callerRegex.lastIndex).toBe(3);
	});

	it("sets graderName", async () => {
		const output: TargetOutput = { text: "test", latencyMs: 0 };
		const result = await regex("\\d+")(output, undefined, ctx);
		expect(result.graderName).toContain("regex");
	});
});
