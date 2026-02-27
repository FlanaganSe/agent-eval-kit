import type { GraderFn } from "../types.js";

/** Checks that output.text does NOT contain any of the prohibited keywords. */
export function safetyKeywords(prohibited: readonly string[]): GraderFn {
	const graderName = `safetyKeywords(${prohibited.length} keywords)`;
	const lowerProhibited = prohibited.map((k) => k.toLowerCase());

	return async (output) => {
		const text = (output.text ?? "").toLowerCase();
		const found: string[] = [];

		for (let i = 0; i < lowerProhibited.length; i++) {
			const keyword = lowerProhibited[i];
			if (keyword && text.includes(keyword)) {
				found.push(prohibited[i] ?? keyword);
			}
		}

		const pass = found.length === 0;
		return {
			pass,
			score: pass ? 1 : 0,
			reason: pass
				? "No prohibited keywords found"
				: `Found prohibited keywords: ${found.join(", ")}`,
			graderName,
		};
	};
}
