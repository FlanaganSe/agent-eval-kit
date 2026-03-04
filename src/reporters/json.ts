import type { Run } from "../config/types.js";

/**
 * Serializes a Run artifact as a JSON string.
 *
 * @param run - The completed run to serialize
 * @param pretty - Use indented formatting for readability (default: true)
 */
export function formatJsonReport(run: Run, pretty = true): string {
	return pretty ? JSON.stringify(run, null, 2) : JSON.stringify(run);
}
