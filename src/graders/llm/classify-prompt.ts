import type { JudgeMessage, TargetOutput } from "../../config/types.js";

export interface ClassificationPromptInput {
	readonly output: TargetOutput;
	readonly categories: Readonly<Record<string, string>>;
	readonly criteria?: string | undefined;
}

export function buildClassificationPrompt(
	input: ClassificationPromptInput,
): readonly JudgeMessage[] {
	const categoryList = Object.entries(input.categories)
		.map(([name, description]) => `- "${name}": ${description}`)
		.join("\n");

	const parts: string[] = [
		"You are an impartial classification judge. Your task is to classify the given output into exactly one of the provided categories.",
		"",
		"## Categories",
		categoryList,
		"",
		"## Instructions",
		"1. Analyze the output carefully.",
		"2. Think step-by-step about which category best fits.",
		'3. Respond with a JSON object: { "reasoning": "your analysis", "classification": "category_name", "confidence": 0.0-1.0 }',
		"",
		"## Rules",
		"- You MUST choose exactly one category from the list above.",
		"- Do not create new categories.",
		"- Do not prefer longer outputs over shorter ones.",
		"- Provide reasoning BEFORE your classification.",
	];

	if (input.criteria) {
		parts.push("", `## Additional Criteria`, input.criteria);
	}

	const systemPrompt = parts.join("\n");

	const outputParts: string[] = [];
	if (input.output.text) {
		outputParts.push(input.output.text);
	}
	if (input.output.toolCalls && input.output.toolCalls.length > 0) {
		outputParts.push("\nTool calls:");
		for (const call of input.output.toolCalls) {
			outputParts.push(`  - ${call.name}(${JSON.stringify(call.args ?? {})})`);
			if (call.result !== undefined) {
				outputParts.push(`    → ${JSON.stringify(call.result)}`);
			}
		}
	}
	if (outputParts.length === 0) {
		outputParts.push("(empty output)");
	}

	const userContent = [
		"## Output to Classify",
		"<output>",
		outputParts.join("\n"),
		"</output>",
	].join("\n");

	return [
		{ role: "system" as const, content: systemPrompt },
		{ role: "user" as const, content: userContent },
	];
}
