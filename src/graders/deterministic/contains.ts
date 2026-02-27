import type { GraderFn } from "../types.js";

export interface ContainsOptions {
	readonly caseSensitive?: boolean | undefined;
}

/** Checks that output.text contains the given substring. */
export function contains(substring: string, options?: ContainsOptions): GraderFn {
	const caseSensitive = options?.caseSensitive ?? false;
	const graderName = `contains(${substring})`;

	return async (output) => {
		const text = output.text ?? "";
		const haystack = caseSensitive ? text : text.toLowerCase();
		const needle = caseSensitive ? substring : substring.toLowerCase();
		const found = haystack.includes(needle);

		return {
			pass: found,
			score: found ? 1 : 0,
			reason: found ? `Output contains "${substring}"` : `Output does not contain "${substring}"`,
			graderName,
		};
	};
}

/** Checks that output.text does NOT contain the given substring. */
export function notContains(substring: string, options?: ContainsOptions): GraderFn {
	const caseSensitive = options?.caseSensitive ?? false;
	const graderName = `notContains(${substring})`;

	return async (output) => {
		const text = output.text ?? "";
		const haystack = caseSensitive ? text : text.toLowerCase();
		const needle = caseSensitive ? substring : substring.toLowerCase();
		const found = haystack.includes(needle);

		return {
			pass: !found,
			score: found ? 0 : 1,
			reason: found
				? `Output contains prohibited substring "${substring}"`
				: `Output does not contain "${substring}"`,
			graderName,
		};
	};
}
