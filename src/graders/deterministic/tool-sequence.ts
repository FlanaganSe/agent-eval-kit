import type { GraderFn } from "../types.js";

export type ToolSequenceMode = "strict" | "unordered" | "subset" | "superset";

/**
 * Checks that output.toolCalls matches the expected tool sequence.
 *
 * Modes:
 * - strict: exact order and count
 * - unordered: same tools, any order
 * - subset: expected tools appear in actual (actual may have extras)
 * - superset: actual tools appear in expected (actual did fewer steps)
 */
export function toolSequence(
	tools: readonly string[],
	mode: ToolSequenceMode = "unordered",
): GraderFn {
	const graderName = `toolSequence(${tools.join(",")}|${mode})`;

	return async (output) => {
		if (!output.toolCalls || output.toolCalls.length === 0) {
			if (tools.length === 0) {
				return {
					pass: true,
					score: 1,
					reason: "No tools expected and none called",
					graderName,
				};
			}
			return {
				pass: false,
				score: 0,
				reason: `No tool calls in output, expected: ${tools.join(", ")}`,
				graderName,
			};
		}

		const actualNames = output.toolCalls.map((tc) => tc.name);
		const result = matchSequence(actualNames, [...tools], mode);

		return {
			pass: result.pass,
			score: result.pass ? 1 : 0,
			reason: result.pass
				? `Tool sequence matches (${mode}): ${actualNames.join(" → ")}`
				: `Tool sequence mismatch (${mode}). Expected: ${tools.join(" → ")}. Actual: ${actualNames.join(" → ")}. ${result.reason}`,
			graderName,
		};
	};
}

function matchSequence(
	actual: readonly string[],
	expected: string[],
	mode: ToolSequenceMode,
): { readonly pass: boolean; readonly reason: string } {
	switch (mode) {
		case "strict": {
			if (actual.length !== expected.length) {
				return {
					pass: false,
					reason: `Length mismatch: ${actual.length} vs ${expected.length}`,
				};
			}
			for (let i = 0; i < actual.length; i++) {
				if (actual[i] !== expected[i]) {
					return {
						pass: false,
						reason: `Mismatch at position ${i}: "${actual[i]}" vs "${expected[i]}"`,
					};
				}
			}
			return { pass: true, reason: "" };
		}

		case "unordered": {
			const sortedActual = [...actual].sort();
			const sortedExpected = [...expected].sort();
			if (sortedActual.length !== sortedExpected.length) {
				return {
					pass: false,
					reason: `Count mismatch: ${sortedActual.length} vs ${sortedExpected.length}`,
				};
			}
			for (let i = 0; i < sortedActual.length; i++) {
				if (sortedActual[i] !== sortedExpected[i]) {
					return {
						pass: false,
						reason: `Different tools called (unordered comparison)`,
					};
				}
			}
			return { pass: true, reason: "" };
		}

		case "subset": {
			const actualSet = new Set(actual);
			const missing = expected.filter((t) => !actualSet.has(t));
			if (missing.length > 0) {
				return {
					pass: false,
					reason: `Missing expected tools: ${missing.join(", ")}`,
				};
			}
			return { pass: true, reason: "" };
		}

		case "superset": {
			const expectedSet = new Set(expected);
			const extra = actual.filter((t) => !expectedSet.has(t));
			if (extra.length > 0) {
				return {
					pass: false,
					reason: `Unexpected tools called: ${extra.join(", ")}`,
				};
			}
			return { pass: true, reason: "" };
		}
	}
}
