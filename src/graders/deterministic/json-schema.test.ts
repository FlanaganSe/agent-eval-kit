import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { GraderContext, TargetOutput } from "../../config/types.js";
import { jsonSchema } from "./json-schema.js";

const ctx: GraderContext = { caseId: "t", suiteId: "s", mode: "live", graderName: "" };

const schema = z.strictObject({
	name: z.string(),
	age: z.number(),
});

describe("jsonSchema", () => {
	it("passes when JSON matches schema", async () => {
		const output: TargetOutput = {
			text: JSON.stringify({ name: "Alice", age: 30 }),
			latencyMs: 0,
		};
		const result = await jsonSchema(schema)(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("fails when JSON doesn't match schema", async () => {
		const output: TargetOutput = {
			text: JSON.stringify({ name: "Alice" }),
			latencyMs: 0,
		};
		const result = await jsonSchema(schema)(output, undefined, ctx);
		expect(result.pass).toBe(false);
		expect(result.reason).toContain("schema");
	});

	it("fails when text is not JSON", async () => {
		const output: TargetOutput = { text: "not json", latencyMs: 0 };
		const result = await jsonSchema(schema)(output, undefined, ctx);
		expect(result.pass).toBe(false);
		expect(result.reason).toContain("not valid JSON");
	});

	it("fails when text is empty", async () => {
		const output: TargetOutput = { text: "", latencyMs: 0 };
		const result = await jsonSchema(schema)(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("fails when text is undefined", async () => {
		const output: TargetOutput = { latencyMs: 0 };
		const result = await jsonSchema(schema)(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("rejects extra properties in strict schema", async () => {
		const output: TargetOutput = {
			text: JSON.stringify({ name: "Alice", age: 30, extra: true }),
			latencyMs: 0,
		};
		const result = await jsonSchema(schema)(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});
});
