import type { GraderFn } from "../types.js";

/** Checks that total token usage (input + output) is within the allowed limit. */
export function tokenCount(maxTokens: number): GraderFn {
	const graderName = `tokenCount(${maxTokens})`;

	return async (output) => {
		if (!output.tokenUsage) {
			return {
				pass: true,
				score: 1,
				reason: "Token usage not reported by target — skipping",
				graderName,
			};
		}

		const total = output.tokenUsage.input + output.tokenUsage.output;
		const pass = total <= maxTokens;
		return {
			pass,
			score: pass ? 1 : 0,
			reason: pass ? `Token count ${total} <= ${maxTokens}` : `Token count ${total} > ${maxTokens}`,
			graderName,
		};
	};
}
