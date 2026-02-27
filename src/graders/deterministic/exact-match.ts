import type { GraderFn } from "../types.js";

export interface ExactMatchOptions {
	readonly trim?: boolean | undefined;
	readonly caseSensitive?: boolean | undefined;
}

/** Checks that output.text exactly matches the expected text. */
export function exactMatch(expected: string, options?: ExactMatchOptions): GraderFn {
	const trim = options?.trim ?? true;
	const caseSensitive = options?.caseSensitive ?? true;
	const graderName = `exactMatch(${expected.slice(0, 30)}${expected.length > 30 ? "..." : ""})`;

	return async (output) => {
		const text = output.text ?? "";
		let actual = trim ? text.trim() : text;
		let target = trim ? expected.trim() : expected;

		if (!caseSensitive) {
			actual = actual.toLowerCase();
			target = target.toLowerCase();
		}

		const matched = actual === target;

		return {
			pass: matched,
			score: matched ? 1 : 0,
			reason: matched
				? "Output matches expected text exactly"
				: `Expected "${expected.slice(0, 50)}${expected.length > 50 ? "..." : ""}", got "${text.slice(0, 50)}${text.length > 50 ? "..." : ""}"`,
			graderName,
		};
	};
}
