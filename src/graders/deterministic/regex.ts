import type { GraderFn } from "../types.js";

export interface RegexOptions {
	readonly flags?: string | undefined;
}

/** Checks that output.text matches the given regex pattern. */
export function regex(pattern: string | RegExp, options?: RegexOptions): GraderFn {
	// Compile regex eagerly in factory (catch errors at config time, not grade time)
	const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, options?.flags);
	const graderName = `regex(${re.source})`;

	return async (output) => {
		const text = output.text ?? "";
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
