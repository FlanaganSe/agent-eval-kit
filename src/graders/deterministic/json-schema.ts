import type { z } from "zod";
import type { GraderFn } from "../types.js";

/**
 * Parses output.text as JSON and validates against a Zod schema.
 * Fails if text is not valid JSON or doesn't match the schema.
 */
export function jsonSchema(schema: z.ZodType): GraderFn {
	const graderName = "jsonSchema";

	return async (output) => {
		const text = output.text ?? "";

		if (text.trim() === "") {
			return {
				pass: false,
				score: 0,
				reason: "Output text is empty",
				graderName,
			};
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(text);
		} catch {
			return {
				pass: false,
				score: 0,
				reason: "Output is not valid JSON",
				graderName,
			};
		}

		const result = schema.safeParse(parsed);
		if (!result.success) {
			const issues = result.error.issues
				.map(
					(i: { path: readonly PropertyKey[]; message: string }) =>
						`${i.path.map(String).join(".")}: ${i.message}`,
				)
				.join("; ");
			return {
				pass: false,
				score: 0,
				reason: `JSON does not match schema: ${issues}`,
				graderName,
			};
		}

		return {
			pass: true,
			score: 1,
			reason: "JSON matches schema",
			graderName,
		};
	};
}
