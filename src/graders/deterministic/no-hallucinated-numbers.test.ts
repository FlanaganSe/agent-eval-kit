import { describe, expect, it } from "vitest";
import type { GraderContext, TargetOutput } from "../../config/types.js";
import { noHallucinatedNumbers } from "./no-hallucinated-numbers.js";

const ctx: GraderContext = { caseId: "t", suiteId: "s", mode: "live", graderName: "" };

describe("noHallucinatedNumbers", () => {
	it("passes when all numbers are grounded in tool results", async () => {
		const output: TargetOutput = {
			text: "The total is $1,234.56",
			toolCalls: [{ name: "calc", result: { total: 1234.56 } }],
			latencyMs: 0,
		};
		const result = await noHallucinatedNumbers()(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("fails when numbers are hallucinated", async () => {
		const output: TargetOutput = {
			text: "The price is $99.99",
			toolCalls: [{ name: "lookup", result: { price: 49.99 } }],
			latencyMs: 0,
		};
		const result = await noHallucinatedNumbers()(output, undefined, ctx);
		expect(result.pass).toBe(false);
		expect(result.reason).toContain("99.99");
	});

	it("passes with no numbers in output", async () => {
		const output: TargetOutput = {
			text: "Hello world",
			toolCalls: [{ name: "search", result: { count: 42 } }],
			latencyMs: 0,
		};
		const result = await noHallucinatedNumbers()(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("skips year-like numbers", async () => {
		const output: TargetOutput = {
			text: "Founded in 2024",
			toolCalls: [],
			latencyMs: 0,
		};
		const result = await noHallucinatedNumbers()(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("skips small integers by default", async () => {
		const output: TargetOutput = {
			text: "There are 3 items",
			toolCalls: [],
			latencyMs: 0,
		};
		const result = await noHallucinatedNumbers()(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("does not skip small integers when configured", async () => {
		const output: TargetOutput = {
			text: "There are 3 items",
			toolCalls: [],
			latencyMs: 0,
		};
		const result = await noHallucinatedNumbers({ skipSmallIntegers: false })(
			output,
			undefined,
			ctx,
		);
		expect(result.pass).toBe(false);
	});

	it("handles numbers with commas", async () => {
		const output: TargetOutput = {
			text: "Revenue: 1,234,567",
			toolCalls: [{ name: "report", result: { revenue: 1234567 } }],
			latencyMs: 0,
		};
		const result = await noHallucinatedNumbers()(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("handles negative numbers", async () => {
		const output: TargetOutput = {
			text: "Change: -15.5%",
			toolCalls: [{ name: "calc", result: { change: -15.5 } }],
			latencyMs: 0,
		};
		const result = await noHallucinatedNumbers()(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("applies tolerance", async () => {
		const output: TargetOutput = {
			text: "Value: 100.04",
			toolCalls: [{ name: "calc", result: { value: 100 } }],
			latencyMs: 0,
		};
		// 0.04% difference < 0.5% tolerance
		const result = await noHallucinatedNumbers({ tolerance: 0.005 })(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("fails outside tolerance", async () => {
		const output: TargetOutput = {
			text: "Value: 110",
			toolCalls: [{ name: "calc", result: { value: 100 } }],
			latencyMs: 0,
		};
		// 10% difference > 0.5% tolerance
		const result = await noHallucinatedNumbers({ tolerance: 0.005 })(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("handles deeply nested tool results", async () => {
		const output: TargetOutput = {
			text: "Found 42 results",
			toolCalls: [
				{
					name: "search",
					result: { data: { meta: { count: 42 } } },
				},
			],
			latencyMs: 0,
		};
		const result = await noHallucinatedNumbers()(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("computes partial score", async () => {
		const output: TargetOutput = {
			text: "Found 42 items costing $999",
			toolCalls: [{ name: "search", result: { count: 42 } }],
			latencyMs: 0,
		};
		const result = await noHallucinatedNumbers()(output, undefined, ctx);
		expect(result.pass).toBe(false);
		expect(result.score).toBeGreaterThan(0);
		expect(result.score).toBeLessThan(1);
	});
});
