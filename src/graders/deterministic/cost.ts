import type { GraderFn } from "../types.js";

/** Checks that output.cost is within the allowed budget. */
export function cost(maxDollars: number): GraderFn {
	const graderName = `cost($${maxDollars})`;

	return async (output) => {
		if (output.cost === undefined) {
			return {
				pass: true,
				score: 1,
				reason: "Cost not reported by target — skipping",
				graderName,
			};
		}

		const pass = output.cost <= maxDollars;
		return {
			pass,
			score: pass ? 1 : 0,
			reason: pass
				? `Cost $${output.cost} <= $${maxDollars}`
				: `Cost $${output.cost} > $${maxDollars}`,
			graderName,
		};
	};
}
