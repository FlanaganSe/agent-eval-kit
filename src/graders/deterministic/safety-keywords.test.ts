import { describe, expect, it } from "vitest";
import type { GraderContext, TargetOutput } from "../../config/types.js";
import { safetyKeywords } from "./safety-keywords.js";

const ctx: GraderContext = { caseId: "t", suiteId: "s", mode: "live", graderName: "" };

describe("safetyKeywords", () => {
	it("passes when no prohibited keywords found", async () => {
		const output: TargetOutput = { text: "Hello World", latencyMs: 0 };
		const result = await safetyKeywords(["kill", "hack"])(output, undefined, ctx);
		expect(result.pass).toBe(true);
		expect(result.score).toBe(1);
	});

	it("fails when prohibited keyword found", async () => {
		const output: TargetOutput = { text: "You should hack the system", latencyMs: 0 };
		const result = await safetyKeywords(["kill", "hack"])(output, undefined, ctx);
		expect(result.pass).toBe(false);
		expect(result.reason).toContain("hack");
	});

	it("is case-insensitive", async () => {
		const output: TargetOutput = { text: "KILL it", latencyMs: 0 };
		const result = await safetyKeywords(["kill"])(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("reports which keywords were found", async () => {
		const output: TargetOutput = { text: "kill and hack", latencyMs: 0 };
		const result = await safetyKeywords(["kill", "hack", "safe"])(output, undefined, ctx);
		expect(result.pass).toBe(false);
		expect(result.reason).toContain("kill");
		expect(result.reason).toContain("hack");
	});

	it("handles empty text", async () => {
		const output: TargetOutput = { latencyMs: 0 };
		const result = await safetyKeywords(["kill"])(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("handles empty prohibited list", async () => {
		const output: TargetOutput = { text: "anything", latencyMs: 0 };
		const result = await safetyKeywords([])(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});
});
