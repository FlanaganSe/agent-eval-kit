import type { GraderFn } from "../types.js";

/** Checks that output.toolCalls includes a call with the given tool name. */
export function toolCalled(toolName: string): GraderFn {
	const graderName = `toolCalled(${toolName})`;

	return async (output) => {
		if (!output.toolCalls || output.toolCalls.length === 0) {
			return {
				pass: false,
				score: 0,
				reason: "No tool calls in output",
				graderName,
			};
		}

		const found = output.toolCalls.some((tc) => tc.name === toolName);
		return {
			pass: found,
			score: found ? 1 : 0,
			reason: found
				? `Tool "${toolName}" was called`
				: `Tool "${toolName}" was not called. Called: ${output.toolCalls.map((tc) => tc.name).join(", ")}`,
			graderName,
		};
	};
}

/** Checks that output.toolCalls does NOT include a call with the given tool name. */
export function toolNotCalled(toolName: string): GraderFn {
	const graderName = `toolNotCalled(${toolName})`;

	return async (output) => {
		if (!output.toolCalls || output.toolCalls.length === 0) {
			return {
				pass: true,
				score: 1,
				reason: "No tool calls in output",
				graderName,
			};
		}

		const found = output.toolCalls.some((tc) => tc.name === toolName);
		return {
			pass: !found,
			score: found ? 0 : 1,
			reason: found
				? `Tool "${toolName}" was called but should not have been`
				: `Tool "${toolName}" was not called`,
			graderName,
		};
	};
}
