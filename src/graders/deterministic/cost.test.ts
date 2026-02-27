import { describe, expect, it } from "vitest";
import type { GraderContext, TargetOutput } from "../../config/types.js";
import { cost } from "./cost.js";

const ctx: GraderContext = { caseId: "t", suiteId: "s", mode: "live", graderName: "" };

describe("cost", () => {
	it("passes when within budget", async () => {
		const output: TargetOutput = { latencyMs: 0, cost: 0.001 };
		const result = await cost(0.01)(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("passes at exact budget", async () => {
		const output: TargetOutput = { latencyMs: 0, cost: 0.01 };
		const result = await cost(0.01)(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("fails above budget", async () => {
		const output: TargetOutput = { latencyMs: 0, cost: 0.02 };
		const result = await cost(0.01)(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("passes when cost is undefined (skips)", async () => {
		const output: TargetOutput = { latencyMs: 0 };
		const result = await cost(0.01)(output, undefined, ctx);
		expect(result.pass).toBe(true);
		expect(result.reason).toContain("not reported");
	});

	it("passes with zero cost", async () => {
		const output: TargetOutput = { latencyMs: 0, cost: 0 };
		const result = await cost(0.01)(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});
});
