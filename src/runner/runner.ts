import { createHash, randomUUID } from "node:crypto";
import type {
	Case,
	CaseCategory,
	CategorySummary,
	ResolvedSuite,
	Run,
	RunOptions,
	RunSummary,
	TargetOutput,
	Trial,
} from "../config/types.js";
import { VERSION } from "../index.js";
import { evaluateGates } from "./gate.js";
import { runGraderPipeline } from "./pipeline.js";

const SCHEMA_VERSION = "1.0.0";

/**
 * Executes a suite against the target function in live mode.
 * Runs cases sequentially, grades each, and aggregates into a Run artifact.
 */
export async function runSuite(suite: ResolvedSuite, options: RunOptions): Promise<Run> {
	const runId = randomUUID();
	const startTime = Date.now();
	const trials: Trial[] = [];

	for (const testCase of suite.cases) {
		const trial = await executeCase(testCase, suite, options);
		trials.push(trial);
	}

	const totalDurationMs = Date.now() - startTime;
	const partialSummary = computePartialSummary(trials, totalDurationMs);
	const gateResult = evaluateGates(partialSummary, suite.gates);

	const summary: RunSummary = {
		...partialSummary,
		gateResult,
	};

	return {
		schemaVersion: SCHEMA_VERSION,
		id: runId,
		suiteId: suite.name,
		mode: options.mode,
		trials,
		summary,
		timestamp: new Date().toISOString(),
		configHash: computeConfigHash(suite),
		frameworkVersion: VERSION,
	};
}

async function executeCase(
	testCase: Case,
	suite: ResolvedSuite,
	options: RunOptions,
): Promise<Trial> {
	const caseStart = Date.now();

	let output: TargetOutput;
	try {
		output = await withTimeout(() => suite.target(testCase.input), options.timeoutMs);
	} catch (err) {
		const durationMs = Date.now() - caseStart;
		const message = err instanceof Error ? err.message : String(err);
		return {
			caseId: testCase.id,
			status: "error",
			output: {
				text: `Target error: ${message}`,
				latencyMs: durationMs,
			},
			grades: [],
			score: 0,
			durationMs,
		};
	}

	const durationMs = Date.now() - caseStart;
	const pipelineResult = await runGraderPipeline(
		output,
		testCase.expected,
		undefined, // Case-level graders come from config; not in Case schema
		suite.defaultGraders,
		{
			caseId: testCase.id,
			suiteId: suite.name,
			mode: options.mode,
		},
	);

	const status = pipelineResult.caseResult.pass ? "pass" : "fail";

	return {
		caseId: testCase.id,
		status,
		output,
		grades: pipelineResult.grades,
		score: pipelineResult.caseResult.score,
		durationMs,
	};
}

async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const result = await Promise.race([
			fn(),
			new Promise<never>((_, reject) => {
				controller.signal.addEventListener("abort", () => {
					reject(new Error(`Timeout after ${timeoutMs}ms`));
				});
			}),
		]);
		return result;
	} finally {
		clearTimeout(timer);
	}
}

function computePartialSummary(
	trials: readonly Trial[],
	totalDurationMs: number,
): Omit<RunSummary, "gateResult"> {
	const passed = trials.filter((t) => t.status === "pass").length;
	const failed = trials.filter((t) => t.status === "fail").length;
	const errors = trials.filter((t) => t.status === "error").length;
	const totalCases = trials.length;
	const passRate = totalCases > 0 ? passed / totalCases : 0;
	const totalCost = trials.reduce((sum, t) => sum + (t.output.cost ?? 0), 0);
	const p95LatencyMs = computeP95(trials.map((t) => t.output.latencyMs));
	const byCategory = computeByCategory(trials);

	return {
		totalCases,
		passed,
		failed,
		errors,
		passRate,
		totalCost,
		totalDurationMs,
		p95LatencyMs,
		byCategory: Object.keys(byCategory).length > 0 ? byCategory : undefined,
	};
}

function computeP95(values: readonly number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const idx = Math.ceil(0.95 * sorted.length) - 1;
	return sorted[Math.max(0, idx)] ?? 0;
}

function computeByCategory(_trials: readonly Trial[]): Record<CaseCategory, CategorySummary> {
	// TODO: populate when cases carry category information through the pipeline
	return {} as Record<CaseCategory, CategorySummary>;
}

// TODO(phase2): This hash covers suite structure only — not target identity (model, system prompt,
// tool schemas, targetVersion). Phase 2 replay uses configHash as the fixture staleness key, so
// this must be extended before fixtures are meaningful. Changing the hash will invalidate all
// existing Run artifacts' configHash values; plan the migration accordingly.
function computeConfigHash(suite: ResolvedSuite): string {
	const hashInput = JSON.stringify({
		name: suite.name,
		caseCount: suite.cases.length,
		caseIds: suite.cases.map((c) => c.id),
		gates: suite.gates,
	});
	return createHash("sha256").update(hashInput).digest("hex").slice(0, 16);
}
