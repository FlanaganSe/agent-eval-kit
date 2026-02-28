import { describe, expect, it } from "vitest";
import type { GraderContext, JudgeCallFn, JudgeMessage, TargetOutput } from "../../config/types.js";
import { llmRubric } from "./llm-rubric.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockJudge(responses: readonly string[]): {
	judge: JudgeCallFn;
	calls: JudgeMessage[][];
} {
	const calls: JudgeMessage[][] = [];
	let index = 0;
	const judge: JudgeCallFn = async (messages) => {
		calls.push([...messages]);
		const text = responses[index] ?? responses[responses.length - 1] ?? "";
		index++;
		return { text, modelId: "mock-judge", cost: 0.001 };
	};
	return { judge, calls };
}

const defaultContext: GraderContext = {
	caseId: "test-case",
	suiteId: "test-suite",
	mode: "live",
	graderName: "",
};

const sampleOutput: TargetOutput = {
	text: "Paris is the capital of France.",
	latencyMs: 100,
};

function judgeResponse(score: number, reasoning: string): string {
	return JSON.stringify({ reasoning, score });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("llmRubric", () => {
	it("returns correct GradeResult for score 4", async () => {
		const { judge } = createMockJudge([judgeResponse(4, "Excellent response")]);
		const grader = llmRubric({ criteria: "Is the response accurate?", judge });

		const result = await grader(sampleOutput, undefined, defaultContext);

		expect(result.pass).toBe(true);
		expect(result.score).toBe(1.0);
		expect(result.graderName).toBe("llm-rubric");
		expect(result.metadata?.reasoning).toBe("Excellent response");
		expect(result.metadata?.judgeScore).toBe(4);
	});

	it("returns correct GradeResult for score 1", async () => {
		const { judge } = createMockJudge([judgeResponse(1, "Poor response")]);
		const grader = llmRubric({ criteria: "test", judge });

		const result = await grader(sampleOutput, undefined, defaultContext);

		expect(result.pass).toBe(false);
		expect(result.score).toBe(0.25);
	});

	it("score 3 passes with default threshold (0.75)", async () => {
		const { judge } = createMockJudge([judgeResponse(3, "Good response")]);
		const grader = llmRubric({ criteria: "test", judge });

		const result = await grader(sampleOutput, undefined, defaultContext);

		expect(result.pass).toBe(true);
		expect(result.score).toBe(0.75);
	});

	it("score 2 fails with default threshold", async () => {
		const { judge } = createMockJudge([judgeResponse(2, "Below average")]);
		const grader = llmRubric({ criteria: "test", judge });

		const result = await grader(sampleOutput, undefined, defaultContext);

		expect(result.pass).toBe(false);
		expect(result.score).toBe(0.5);
	});

	it("respects custom passThreshold", async () => {
		const { judge } = createMockJudge([judgeResponse(2, "Okay")]);
		const grader = llmRubric({ criteria: "test", judge, passThreshold: 0.5 });

		const result = await grader(sampleOutput, undefined, defaultContext);

		expect(result.pass).toBe(true);
		expect(result.score).toBe(0.5);
	});

	it("string shorthand works", async () => {
		const { judge } = createMockJudge([judgeResponse(4, "Perfect")]);
		const grader = llmRubric("Is the response accurate?");
		const ctx: GraderContext = { ...defaultContext, judge };

		const result = await grader(sampleOutput, undefined, ctx);

		expect(result.pass).toBe(true);
		expect(result.score).toBe(1.0);
	});

	it("returns failure when no judge configured", async () => {
		const grader = llmRubric("test");

		const result = await grader(sampleOutput, undefined, defaultContext);

		expect(result.pass).toBe(false);
		expect(result.score).toBe(0);
		expect(result.reason).toContain("No judge configured");
	});

	it("returns failure when judge call throws", async () => {
		const judge: JudgeCallFn = async () => {
			throw new Error("API rate limit exceeded");
		};
		const grader = llmRubric({ criteria: "test", judge });

		const result = await grader(sampleOutput, undefined, defaultContext);

		expect(result.pass).toBe(false);
		expect(result.score).toBe(0);
		expect(result.reason).toContain("Judge call failed");
		expect(result.reason).toContain("rate limit");
	});

	it("returns failure for malformed judge response", async () => {
		const { judge } = createMockJudge(["This is not JSON at all"]);
		const grader = llmRubric({ criteria: "test", judge });

		const result = await grader(sampleOutput, undefined, defaultContext);

		expect(result.pass).toBe(false);
		expect(result.score).toBe(0);
		expect(result.reason).toContain("unparseable");
	});

	it("includes expected reference in prompt", async () => {
		const { judge, calls } = createMockJudge([judgeResponse(4, "Good")]);
		const grader = llmRubric({ criteria: "test", judge });

		await grader(sampleOutput, { text: "Expected answer" }, defaultContext);

		const userMessage = calls[0]?.find((m) => m.role === "user");
		expect(userMessage?.content).toContain("Expected answer");
		expect(userMessage?.content).toContain("<expected_reference>");
	});

	it("works without expected reference", async () => {
		const { judge, calls } = createMockJudge([judgeResponse(4, "Good")]);
		const grader = llmRubric({ criteria: "test", judge });

		await grader(sampleOutput, undefined, defaultContext);

		const userMessage = calls[0]?.find((m) => m.role === "user");
		expect(userMessage?.content).not.toContain("<expected_reference>");
	});

	it("includes calibration examples in system prompt", async () => {
		const { judge, calls } = createMockJudge([judgeResponse(4, "Good")]);
		const grader = llmRubric({
			criteria: "test",
			judge,
			examples: [{ output: "example out", score: 4, reasoning: "excellent" }],
		});

		await grader(sampleOutput, undefined, defaultContext);

		const systemMessage = calls[0]?.find((m) => m.role === "system");
		expect(systemMessage?.content).toContain("CALIBRATION EXAMPLES");
		expect(systemMessage?.content).toContain("example out");
	});

	it("includes tool calls in user prompt", async () => {
		const { judge, calls } = createMockJudge([judgeResponse(4, "Good")]);
		const grader = llmRubric({ criteria: "test", judge });
		const outputWithTools: TargetOutput = {
			text: "Searching...",
			toolCalls: [{ name: "web_search", args: { q: "test" } }],
			latencyMs: 100,
		};

		await grader(outputWithTools, undefined, defaultContext);

		const userMessage = calls[0]?.find((m) => m.role === "user");
		expect(userMessage?.content).toContain("web_search");
	});

	it("stores reasoning in metadata", async () => {
		const { judge } = createMockJudge([judgeResponse(3, "Detailed reasoning here")]);
		const grader = llmRubric({ criteria: "test", judge });

		const result = await grader(sampleOutput, undefined, defaultContext);

		expect(result.metadata?.reasoning).toBe("Detailed reasoning here");
	});

	it("stores judge model ID and cost in metadata", async () => {
		const { judge } = createMockJudge([judgeResponse(4, "Good")]);
		const grader = llmRubric({ criteria: "test", judge });

		const result = await grader(sampleOutput, undefined, defaultContext);

		expect(result.metadata?.judgeModelId).toBe("mock-judge");
		expect(result.metadata?.judgeCost).toBe(0.001);
	});

	it("opts.judge overrides context.judge", async () => {
		const { judge: ctxJudge, calls: ctxCalls } = createMockJudge([judgeResponse(1, "Context")]);
		const { judge: optsJudge, calls: optsCalls } = createMockJudge([judgeResponse(4, "Options")]);

		const grader = llmRubric({ criteria: "test", judge: optsJudge });
		const ctx: GraderContext = { ...defaultContext, judge: ctxJudge };

		const result = await grader(sampleOutput, undefined, ctx);

		expect(result.score).toBe(1.0);
		expect(optsCalls).toHaveLength(1);
		expect(ctxCalls).toHaveLength(0);
	});

	it("system prompt contains anti-verbosity instruction", async () => {
		const { judge, calls } = createMockJudge([judgeResponse(4, "Good")]);
		const grader = llmRubric({ criteria: "test", judge });

		await grader(sampleOutput, undefined, defaultContext);

		const systemMessage = calls[0]?.find((m) => m.role === "system");
		expect(systemMessage?.content).toContain("Do NOT prefer longer responses over shorter ones");
	});

	it("output wrapped in XML delimiters", async () => {
		const { judge, calls } = createMockJudge([judgeResponse(4, "Good")]);
		const grader = llmRubric({ criteria: "test", judge });

		await grader(sampleOutput, undefined, defaultContext);

		const userMessage = calls[0]?.find((m) => m.role === "user");
		expect(userMessage?.content).toContain("<agent_output>");
		expect(userMessage?.content).toContain("</agent_output>");
	});
});
