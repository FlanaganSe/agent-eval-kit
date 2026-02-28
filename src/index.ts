export const VERSION = "0.0.1";

// Comparison
export { type CompareOptions, compareRuns } from "./comparison/compare.js";
export { type ComparisonFormatOptions, formatComparisonReport } from "./comparison/format.js";
export type {
	CaseComparison,
	CategoryComparisonSummary,
	ChangeDirection,
	ComparisonSummary,
	GraderChange,
	RunComparison,
} from "./comparison/types.js";
// Config
export { defineConfig } from "./config/define-config.js";
export type { LoadConfigOptions, ValidatedConfig } from "./config/loader.js";
export { loadConfig } from "./config/loader.js";
// Schemas
export {
	CaseCategorySchema,
	CaseExpectedSchema,
	CaseInputSchema,
	CaseSchema,
	CategorySummarySchema,
	EvalConfigSchema,
	FixtureEntrySchema,
	FixtureMetaSchema,
	GateCheckResultSchema,
	GateConfigSchema,
	GateResultSchema,
	GradeResultSchema,
	RunModeSchema,
	RunSchema,
	RunSummarySchema,
	SerializedGraderConfigSchema,
	SuiteConfigSchema,
	TargetOutputSchema,
	TokenUsageSchema,
	ToolCallSchema,
	TrialSchema,
	TrialStatsSchema,
} from "./config/schema.js";
export type {
	Case,
	CaseCategory,
	CaseExpected,
	CaseInput,
	CaseResult,
	CategorySummary,
	EvalConfig,
	GateCheckResult,
	GateConfig,
	GateResult,
	GraderConfig,
	GraderContext,
	GraderFactory,
	GraderFn,
	JudgeCallFn,
	JudgeCallOptions,
	JudgeConfig,
	JudgeMessage,
	JudgeResponse,
	RateLimiter,
	ResolvedSuite,
	Run,
	RunMeta,
	RunMode,
	RunOptions,
	RunSummary,
	SuiteConfig,
	Target,
	TargetOutput,
	TokenUsage,
	ToolCall,
	Trial,
	TrialStats,
} from "./config/types.js";
// LLM Graders
export { factuality } from "./graders/llm/factuality.js";
export { llmRubric } from "./graders/llm/llm-rubric.js";
// Plugin
export type { EvalPlugin } from "./plugin/types.js";
// Reporters
export { formatConsoleReport, formatMarkdownSummary } from "./reporters/console.js";
export { formatJsonReport } from "./reporters/json.js";
export { createTokenBucketLimiter } from "./runner/rate-limiter.js";
// Runner
export { runSuite } from "./runner/runner.js";
export { computeAllTrialStats, computeTrialStats, wilsonInterval } from "./runner/statistics.js";
// Storage
export { listRuns, loadRun, saveRun } from "./storage/run-store.js";
