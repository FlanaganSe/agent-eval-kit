import type { GraderFn } from "../types.js";

/** Options for the `regex` grader. */
export interface RegexOptions {
	/** RegExp flags (e.g., `"i"` for case-insensitive, `"s"` for dotAll). Only used when `pattern` is a string. */
	readonly flags?: string | undefined;
}

/** Checks that output.text matches the given regex pattern. */
export function regex(pattern: string | RegExp, options?: RegexOptions): GraderFn {
	// Compile regex eagerly in factory (catch errors at config time, not grade time)
	// Always create a new RegExp to avoid mutating a caller-owned instance (Immutable Rule #3)
	const re =
		pattern instanceof RegExp
			? new RegExp(pattern.source, pattern.flags)
			: new RegExp(pattern, options?.flags);
	const graderName = `regex(${re.source})`;

	return async (output) => {
		const text = output.text ?? "";
		re.lastIndex = 0;
		const matched = re.test(text);

		return {
			pass: matched,
			score: matched ? 1 : 0,
			reason: matched
				? `Output matches pattern /${re.source}/${re.flags}`
				: `Output does not match pattern /${re.source}/${re.flags}`,
			graderName,
		};
	};
}
