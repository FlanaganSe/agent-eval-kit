import type { GraderFn } from "../types.js";

/** Checks that output.latencyMs is within the allowed threshold. */
export function latency(maxMs: number): GraderFn {
	const graderName = `latency(${maxMs}ms)`;

	return async (output) => {
		const pass = output.latencyMs <= maxMs;
		return {
			pass,
			score: pass ? 1 : 0,
			reason: pass
				? `Latency ${output.latencyMs}ms <= ${maxMs}ms`
				: `Latency ${output.latencyMs}ms > ${maxMs}ms`,
			graderName,
		};
	};
}
