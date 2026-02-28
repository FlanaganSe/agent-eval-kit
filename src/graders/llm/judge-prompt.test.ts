import { describe, expect, it } from "vitest";
import type { CaseExpected, TargetOutput } from "../../config/types.js";
import { buildJudgePrompt } from "./judge-prompt.js";

const sampleOutput: TargetOutput = {
	text: "Paris is the capital of France.",
	latencyMs: 100,
};

const sampleExpected: CaseExpected = {
	text: "The capital of France is Paris.",
};

describe("buildJudgePrompt", () => {
	it("produces system and user messages", () => {
		const messages = buildJudgePrompt({
			criteria: "Is the response accurate?",
			output: sampleOutput,
		});

		expect(messages).toHaveLength(2);
		expect(messages[0]?.role).toBe("system");
		expect(messages[1]?.role).toBe("user");
	});

	it("includes criteria in system prompt", () => {
		const messages = buildJudgePrompt({
			criteria: "Evaluate factual accuracy",
			output: sampleOutput,
		});

		expect(messages[0]?.content).toContain("Evaluate factual accuracy");
	});

	it("includes anti-verbosity instruction", () => {
		const messages = buildJudgePrompt({
			criteria: "test",
			output: sampleOutput,
		});

		expect(messages[0]?.content).toContain("Do NOT prefer longer responses over shorter ones");
	});

	it("includes scoring scale 1-4", () => {
		const messages = buildJudgePrompt({
			criteria: "test",
			output: sampleOutput,
		});

		const system = messages[0]?.content ?? "";
		expect(system).toContain("1 —");
		expect(system).toContain("2 —");
		expect(system).toContain("3 —");
		expect(system).toContain("4 —");
	});

	it("includes JSON response format instruction", () => {
		const messages = buildJudgePrompt({
			criteria: "test",
			output: sampleOutput,
		});

		expect(messages[0]?.content).toContain('"reasoning"');
		expect(messages[0]?.content).toContain('"score"');
	});

	it("wraps output in <agent_output> tags", () => {
		const messages = buildJudgePrompt({
			criteria: "test",
			output: sampleOutput,
		});

		const user = messages[1]?.content ?? "";
		expect(user).toContain("<agent_output>");
		expect(user).toContain("Paris is the capital of France.");
		expect(user).toContain("</agent_output>");
	});

	it("includes expected reference when provided", () => {
		const messages = buildJudgePrompt({
			criteria: "test",
			output: sampleOutput,
			expected: sampleExpected,
		});

		const user = messages[1]?.content ?? "";
		expect(user).toContain("<expected_reference>");
		expect(user).toContain("The capital of France is Paris.");
		expect(user).toContain("</expected_reference>");
	});

	it("omits expected reference when not provided", () => {
		const messages = buildJudgePrompt({
			criteria: "test",
			output: sampleOutput,
		});

		const user = messages[1]?.content ?? "";
		expect(user).not.toContain("<expected_reference>");
	});

	it("includes tool calls in output", () => {
		const outputWithTools: TargetOutput = {
			text: "I'll search for that.",
			toolCalls: [{ name: "search", args: { query: "France capital" }, result: "Paris" }],
			latencyMs: 200,
		};

		const messages = buildJudgePrompt({
			criteria: "test",
			output: outputWithTools,
		});

		const user = messages[1]?.content ?? "";
		expect(user).toContain("search");
		expect(user).toContain("France capital");
	});

	it("includes calibration examples", () => {
		const messages = buildJudgePrompt({
			criteria: "test",
			output: sampleOutput,
			examples: [{ output: "sample", score: 4, reasoning: "perfect" }],
		});

		const system = messages[0]?.content ?? "";
		expect(system).toContain("CALIBRATION EXAMPLES");
		expect(system).toContain("sample");
		expect(system).toContain("perfect");
		expect(system).toContain("Expected score: 4");
	});

	it("includes expected metadata as additional context", () => {
		const messages = buildJudgePrompt({
			criteria: "test",
			output: sampleOutput,
			expected: { text: "ref", metadata: { key: "value" } },
		});

		const user = messages[1]?.content ?? "";
		expect(user).toContain("Additional context");
		expect(user).toContain("value");
	});
});
