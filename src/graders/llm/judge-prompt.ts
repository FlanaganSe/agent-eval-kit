import type { CaseExpected, JudgeMessage, TargetOutput } from "../../config/types.js";
import type { LlmRubricExample } from "./llm-rubric.js";

export interface JudgePromptInput {
	readonly criteria: string;
	readonly output: TargetOutput;
	readonly expected?: CaseExpected | undefined;
	readonly examples?: readonly LlmRubricExample[] | undefined;
}

/**
 * Builds the judge prompt messages.
 * Chain-of-thought is enforced: the model must produce reasoning BEFORE score.
 */
export function buildJudgePrompt(input: JudgePromptInput): readonly JudgeMessage[] {
	const messages: JudgeMessage[] = [];

	messages.push({
		role: "system",
		content: buildSystemPrompt(input.criteria, input.examples),
	});

	messages.push({
		role: "user",
		content: buildUserPrompt(input.output, input.expected),
	});

	return messages;
}

function buildSystemPrompt(
	criteria: string,
	examples?: readonly LlmRubricExample[] | undefined,
): string {
	const parts: string[] = [];

	parts.push(`You are an expert evaluator. Your task is to score an AI agent's output against specific criteria.

EVALUATION CRITERIA:
${criteria}

SCORING SCALE (use ONLY these integer scores):
1 — Poor: Fails to meet the criteria. Major issues present.
2 — Below Average: Partially meets criteria but with significant gaps.
3 — Good: Meets the criteria with minor issues or room for improvement.
4 — Excellent: Fully meets or exceeds the criteria.

IMPORTANT RULES:
- Do NOT prefer longer responses over shorter ones. A concise, correct answer scores higher than a verbose, correct answer.
- Evaluate ONLY against the stated criteria. Do not add your own criteria.
- Think step-by-step about how well the output meets each aspect of the criteria BEFORE assigning a score.
- If the output is empty or clearly broken, score 1.

RESPONSE FORMAT:
You MUST respond with a JSON object containing exactly these fields:
{
  "reasoning": "Your step-by-step evaluation of how the output meets (or fails to meet) the criteria.",
  "score": <integer 1-4>
}

Respond ONLY with the JSON object. No other text.`);

	if (examples && examples.length > 0) {
		parts.push("\nCALIBRATION EXAMPLES:");
		for (const [i, ex] of examples.entries()) {
			parts.push(`\nExample ${i + 1}:
Output: "${ex.output}"
Expected score: ${ex.score}
Expected reasoning: "${ex.reasoning}"`);
		}
		parts.push(
			"\nUse these examples to calibrate your scoring. Apply the same standards consistently.",
		);
	}

	return parts.join("\n");
}

function buildUserPrompt(output: TargetOutput, expected?: CaseExpected | undefined): string {
	const parts: string[] = [];

	parts.push("<agent_output>");
	if (output.text) {
		parts.push(output.text);
	}
	if (output.toolCalls && output.toolCalls.length > 0) {
		parts.push("\nTool calls:");
		for (const call of output.toolCalls) {
			parts.push(`  - ${call.name}(${JSON.stringify(call.args ?? {})})`);
			if (call.result !== undefined) {
				parts.push(`    → ${JSON.stringify(call.result)}`);
			}
		}
	}
	parts.push("</agent_output>");

	if (expected) {
		parts.push("\n<expected_reference>");
		if (expected.text) parts.push(expected.text);
		if (expected.toolCalls && expected.toolCalls.length > 0) {
			parts.push("Expected tool calls:");
			for (const call of expected.toolCalls) {
				parts.push(`  - ${call.name}(${JSON.stringify(call.args ?? {})})`);
			}
		}
		if (expected.metadata) {
			parts.push(`Additional context: ${JSON.stringify(expected.metadata)}`);
		}
		parts.push("</expected_reference>");
	}

	parts.push(
		"\nEvaluate the agent output against the criteria and respond with your JSON evaluation.",
	);

	return parts.join("\n");
}
