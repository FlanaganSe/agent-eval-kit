import { describe, expect, it } from "vitest";
import type { GraderContext, JudgeCallFn, JudgeMessage, TargetOutput } from "../../config/types.js";
import { factuality } from "./factuality.js";

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

describe("factuality", () => {
	it("passes when judge scores high", async () => {
		const { judge } = createMockJudge([
			JSON.stringify({ reasoning: "All facts are correct", score: 4 }),
		]);
		const grader = factuality({ judge });

		const result = await grader(
			sampleOutput,
			{ text: "The capital of France is Paris." },
			defaultContext,
		);

		expect(result.pass).toBe(true);
		expect(result.score).toBe(1.0);
		expect(result.graderName).toBe("factuality");
	});

	it("fails when judge scores low", async () => {
		const { judge } = createMockJudge([
			JSON.stringify({ reasoning: "Major factual errors", score: 1 }),
		]);
		const grader = factuality({ judge });

		const result = await grader(sampleOutput, { text: "reference" }, defaultContext);

		expect(result.pass).toBe(false);
		expect(result.score).toBe(0.25);
	});

	it("returns failure when expected.text is missing", async () => {
		const { judge } = createMockJudge([JSON.stringify({ reasoning: "test", score: 4 })]);
		const grader = factuality({ judge });

		const result = await grader(sampleOutput, undefined, defaultContext);

		expect(result.pass).toBe(false);
		expect(result.score).toBe(0);
		expect(result.reason).toContain("expected.text");
		expect(result.graderName).toBe("factuality");
	});

	it("returns failure when expected has no text field", async () => {
		const { judge } = createMockJudge([JSON.stringify({ reasoning: "test", score: 4 })]);
		const grader = factuality({ judge });

		const result = await grader(sampleOutput, { metadata: { key: "val" } }, defaultContext);

		expect(result.pass).toBe(false);
		expect(result.reason).toContain("expected.text");
	});

	it("always has graderName 'factuality'", async () => {
		const { judge } = createMockJudge([JSON.stringify({ reasoning: "test", score: 3 })]);
		const grader = factuality({ judge });

		const result = await grader(sampleOutput, { text: "reference" }, defaultContext);

		expect(result.graderName).toBe("factuality");
	});

	it("judge receives the prompt with factuality criteria", async () => {
		const { judge, calls } = createMockJudge([JSON.stringify({ reasoning: "test", score: 4 })]);
		const grader = factuality({ judge });

		await grader(sampleOutput, { text: "reference" }, defaultContext);

		const systemMessage = calls[0]?.find((m) => m.role === "system");
		expect(systemMessage?.content).toContain("factually consistent");
		expect(systemMessage?.content).toContain("ACCURACY");
		expect(systemMessage?.content).toContain("COMPLETENESS");
		expect(systemMessage?.content).toContain("NO FABRICATION");
	});

	it("supports custom passThreshold", async () => {
		const { judge } = createMockJudge([JSON.stringify({ reasoning: "Ok", score: 2 })]);
		const grader = factuality({ judge, passThreshold: 0.5 });

		const result = await grader(sampleOutput, { text: "reference" }, defaultContext);

		expect(result.pass).toBe(true);
		expect(result.score).toBe(0.5);
	});
});
