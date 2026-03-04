import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RunSchema } from "../config/schema.js";
import type { Run } from "../config/types.js";
import { formatJsonReport } from "./json.js";
import { jsonReporterPlugin } from "./json-reporter-plugin.js";

const validRun: Run = {
	schemaVersion: "1.0.0",
	id: "test-run",
	suiteId: "smoke",
	mode: "live",
	trials: [
		{
			caseId: "H01",
			status: "pass",
			output: { latencyMs: 100 },
			grades: [{ pass: true, score: 1, reason: "ok", graderName: "test" }],
			score: 1,
			durationMs: 150,
		},
	],
	summary: {
		totalCases: 1,
		passed: 1,
		failed: 0,
		errors: 0,
		passRate: 1,
		totalCost: 0,
		totalDurationMs: 150,
		p95LatencyMs: 100,
		gateResult: { pass: true, results: [] },
	},
	timestamp: "2026-02-28T12:00:00.000Z",
	configHash: "abc123",
	frameworkVersion: "0.0.1",
};

describe("formatJsonReport", () => {
	it("outputs valid JSON", () => {
		const json = formatJsonReport(validRun);
		expect(() => JSON.parse(json)).not.toThrow();
	});

	it("round-trips through RunSchema", () => {
		const json = formatJsonReport(validRun);
		const parsed = JSON.parse(json);
		const result = RunSchema.safeParse(parsed);
		expect(result.success).toBe(true);
	});

	it("outputs minified JSON when not pretty", () => {
		const json = formatJsonReport(validRun, false);
		expect(json).not.toContain("\n");
	});
});

describe("jsonReporterPlugin", () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), "json-report-"));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	it("returns JSON string when no output path", async () => {
		const result = await jsonReporterPlugin.report(validRun, {});
		expect(typeof result).toBe("string");
		expect(() => JSON.parse(result as string)).not.toThrow();
	});

	it("writes JSON to file when output path given", async () => {
		const outputPath = join(tmpDir, "results.json");
		const result = await jsonReporterPlugin.report(validRun, { output: outputPath });
		expect(result).toBeUndefined();
		const content = await readFile(outputPath, "utf-8");
		expect(() => JSON.parse(content)).not.toThrow();
		expect(content).toContain("smoke");
	});
});
