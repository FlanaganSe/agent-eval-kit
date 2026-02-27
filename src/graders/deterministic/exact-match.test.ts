import { describe, expect, it } from "vitest";
import type { GraderContext, TargetOutput } from "../../config/types.js";
import { exactMatch } from "./exact-match.js";

const ctx: GraderContext = { caseId: "t", suiteId: "s", mode: "live", graderName: "" };

describe("exactMatch", () => {
	it("passes on exact match", async () => {
		const output: TargetOutput = { text: "Hello", latencyMs: 0 };
		const result = await exactMatch("Hello")(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("trims by default", async () => {
		const output: TargetOutput = { text: "  Hello  ", latencyMs: 0 };
		const result = await exactMatch("Hello")(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("fails with case mismatch (case-sensitive default)", async () => {
		const output: TargetOutput = { text: "hello", latencyMs: 0 };
		const result = await exactMatch("Hello")(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("case-insensitive option", async () => {
		const output: TargetOutput = { text: "hello", latencyMs: 0 };
		const result = await exactMatch("Hello", { caseSensitive: false })(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});

	it("no-trim option", async () => {
		const output: TargetOutput = { text: "  Hello  ", latencyMs: 0 };
		const result = await exactMatch("Hello", { trim: false })(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("handles empty text", async () => {
		const output: TargetOutput = { latencyMs: 0 };
		const result = await exactMatch("something")(output, undefined, ctx);
		expect(result.pass).toBe(false);
	});

	it("empty expected matches empty output", async () => {
		const output: TargetOutput = { text: "", latencyMs: 0 };
		const result = await exactMatch("")(output, undefined, ctx);
		expect(result.pass).toBe(true);
	});
});
