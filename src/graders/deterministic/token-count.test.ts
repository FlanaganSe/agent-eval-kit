import { describe, expect, it } from "vitest";
import type { GraderContext, TargetOutput } from "../../config/types.js";
import { tokenCount } from "./token-count.js";

const ctx: GraderContext = { caseId: "t", suiteId: "s", mode: "live", graderName: "" };

describe("tokenCount", () => {
	it("passes when within limit", async () => {
		const output: TargetOutput = {
			latencyMs: 0,
			tokenUsage: { input: 100, output: 200 },
		};
		const result = await tokenCount(500)(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("passes at exact limit", async () => {
		const output: TargetOutput = {
			latencyMs: 0,
			tokenUsage: { input: 200, output: 300 },
		};
		const result = await tokenCount(500)(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("fails above limit", async () => {
		const output: TargetOutput = {
			latencyMs: 0,
			tokenUsage: { input: 300, output: 300 },
		};
		const result = await tokenCount(500)(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("passes when tokenUsage is undefined (skips)", async () => {
		const output: TargetOutput = { latencyMs: 0 };
		const result = await tokenCount(500)(output, undefined, ctx);
		expect(result.pass).toBe(true);
		expect(result.reason).toContain("not reported");
	});
});
