import type { GraderFn } from "../types.js";

export interface NoHallucinatedNumbersOptions {
	readonly tolerance?: number | undefined;
	readonly skipSmallIntegers?: boolean | undefined;
}

/**
 * Checks that numbers in output.text are grounded in tool call results.
 * Catches the #1 most dangerous agent failure mode: fabricated numbers.
 *
 * Algorithm:
 * 1. Extract all numbers from output.text
 * 2. Extract all numbers from tool call results
 * 3. For each number in text, check if any tool result number matches within tolerance
 * 4. Report hallucinated numbers (text numbers with no source in tool results)
 */
export function noHallucinatedNumbers(options?: NoHallucinatedNumbersOptions): GraderFn {
	const tolerance = options?.tolerance ?? 0.005;
	const skipSmallIntegers = options?.skipSmallIntegers ?? true;
	const graderName = "noHallucinatedNumbers";

	return async (output) => {
		const text = output.text ?? "";
		const textNumbers = extractNumbersFromText(text);

		if (textNumbers.length === 0) {
			return {
				pass: true,
				score: 1,
				reason: "No numbers found in output text",
				graderName,
			};
		}

		const sourceNumbers = extractNumbersFromToolResults(output.toolCalls ?? []);

		const hallucinated: number[] = [];

		for (const num of textNumbers) {
			// Skip year-like numbers (1900-2100)
			if (Number.isInteger(num) && num >= 1900 && num <= 2100) {
				continue;
			}

			// Skip small integers if configured
			if (skipSmallIntegers && Number.isInteger(num) && Math.abs(num) < 10) {
				continue;
			}

			const grounded = sourceNumbers.some((src) => isWithinTolerance(num, src, tolerance));

			if (!grounded) {
				hallucinated.push(num);
			}
		}

		const totalChecked = textNumbers.length;
		const hallucinatedCount = hallucinated.length;
		const score = totalChecked > 0 ? (totalChecked - hallucinatedCount) / totalChecked : 1;
		const pass = hallucinatedCount === 0;

		return {
			pass,
			score,
			reason: pass
				? `All ${totalChecked} numbers in output are grounded in tool results`
				: `Hallucinated numbers: ${hallucinated.join(", ")}`,
			graderName,
			metadata: { hallucinated, totalChecked },
		};
	};
}

const NUMBER_PATTERN = /-?\d[\d,.]*\d|\d/g;

function extractNumbersFromText(text: string): number[] {
	const matches = text.match(NUMBER_PATTERN);
	if (!matches) return [];

	const numbers: number[] = [];
	for (const match of matches) {
		const cleaned = match.replace(/,/g, "");
		const num = Number.parseFloat(cleaned);
		if (!Number.isNaN(num)) {
			numbers.push(num);
		}
	}
	return numbers;
}

function extractNumbersFromToolResults(
	toolCalls: readonly { readonly name: string; readonly result?: unknown }[],
): number[] {
	const numbers: number[] = [];
	for (const call of toolCalls) {
		if (call.result !== undefined) {
			extractNumbers(call.result, numbers);
		}
	}
	return numbers;
}

function extractNumbers(value: unknown, out: number[]): void {
	if (typeof value === "number" && !Number.isNaN(value)) {
		out.push(value);
		return;
	}

	if (typeof value === "string") {
		const num = Number.parseFloat(value);
		if (!Number.isNaN(num)) {
			out.push(num);
		}
		return;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			extractNumbers(item, out);
		}
		return;
	}

	if (value !== null && typeof value === "object") {
		for (const val of Object.values(value as Record<string, unknown>)) {
			extractNumbers(val, out);
		}
	}
}

function isWithinTolerance(a: number, b: number, tolerance: number): boolean {
	if (a === b) return true;
	const denominator = Math.max(Math.abs(a), Math.abs(b));
	if (denominator === 0) return true;
	return Math.abs(a - b) / denominator <= tolerance;
}
