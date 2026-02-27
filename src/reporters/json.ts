import type { Run } from "../config/types.js";

/**
 * Formats a Run artifact as a JSON string.
 * The Run type IS the report format — this is intentionally trivial.
 */
export function formatJsonReport(run: Run, pretty = true): string {
	return pretty ? JSON.stringify(run, null, 2) : JSON.stringify(run);
}
