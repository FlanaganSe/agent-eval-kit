export const VERSION = "0.0.1";

// Config
export { defineConfig } from "./config/define-config.js";
// Schemas
export {
	CaseCategorySchema,
	CaseExpectedSchema,
	CaseInputSchema,
	CaseSchema,
	EvalConfigSchema,
	GateConfigSchema,
	GradeResultSchema,
	RunSchema,
	RunSummarySchema,
	SerializedGraderConfigSchema,
	SuiteConfigSchema,
	TargetOutputSchema,
	TokenUsageSchema,
	ToolCallSchema,
	TrialSchema,
} from "./config/schema.js";
export type {
	CaseCategory,
	CaseExpected,
	CaseInput,
	EvalConfig,
	GateConfig,
	GraderConfig,
	GraderContext,
	GraderFn,
	Run,
	RunSummary,
	SuiteConfig,
	Target,
	TargetOutput,
	TokenUsage,
	ToolCall,
	Trial,
} from "./config/types.js";
// Reporters
export { formatJsonReport } from "./reporters/json.js";
// Runner
export { runSuite } from "./runner/runner.js";
// Storage
export { listRuns, loadRun, saveRun } from "./storage/run-store.js";
