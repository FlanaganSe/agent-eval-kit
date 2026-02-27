import { describe, expect, it } from "vitest";
import type { GraderContext, TargetOutput } from "../../config/types.js";
import { latency } from "./latency.js";

const ctx: GraderContext = { caseId: "t", suiteId: "s", mode: "live", graderName: "" };

describe("latency", () => {
	it("passes when within threshold", async () => {
		const output: TargetOutput = { latencyMs: 100 };
		const result = await latency(200)(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("passes at exact threshold", async () => {
		const output: TargetOutput = { latencyMs: 200 };
		const result = await latency(200)(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("fails above threshold", async () => {
		const output: TargetOutput = { latencyMs: 201 };
		const result = await latency(200)(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("handles zero latency", async () => {
		const output: TargetOutput = { latencyMs: 0 };
		const result = await latency(200)(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("sets graderName", async () => {
		const output: TargetOutput = { latencyMs: 100 };
		const result = await latency(200)(output, undefined, ctx);
		expect(result.graderName).toBe("latency(200ms)");
	});
});
