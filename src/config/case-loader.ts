import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import YAML from "yaml";
import { CaseSchema } from "./schema.js";
import type { Case } from "./types.js";

/**
 * Loads test cases from a JSONL or YAML file.
 * Validates each case against CaseSchema and checks for duplicate IDs.
 */
export async function loadCases(filePath: string): Promise<readonly Case[]> {
	const ext = extname(filePath).toLowerCase();

	if (ext === ".jsonl") {
		return loadJsonlCases(filePath);
	}

	if (ext === ".yaml" || ext === ".yml") {
		return loadYamlCases(filePath);
	}

	throw new Error(`Unsupported case file format: "${ext}". Use .jsonl, .yaml, or .yml.`);
}

async function loadJsonlCases(filePath: string): Promise<readonly Case[]> {
	const raw = await readFile(filePath, "utf-8");
	const content = stripBom(raw);
	const lines = content.split("\n");
	const cases: Case[] = [];
	const seenIds = new Set<string>();

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]?.trim();
		if (!line || line.startsWith("//") || line.startsWith("#")) {
			continue;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(line);
		} catch {
			throw new Error(`Invalid JSON at ${filePath}:${i + 1} — expected a valid JSON object.`);
		}

		const result = CaseSchema.safeParse(parsed);
		if (!result.success) {
			throw new Error(`Invalid case at ${filePath}:${i + 1} — ${formatZodError(result.error)}`);
		}

		if (seenIds.has(result.data.id)) {
			throw new Error(
				`Duplicate case ID "${result.data.id}" at ${filePath}:${i + 1}. Case IDs must be unique within a file.`,
			);
		}

		seenIds.add(result.data.id);
		cases.push(result.data);
	}

	return cases;
}

async function loadYamlCases(filePath: string): Promise<readonly Case[]> {
	const raw = await readFile(filePath, "utf-8");
	const content = stripBom(raw);
	const parsed: unknown = YAML.parse(content);

	if (!Array.isArray(parsed)) {
		throw new Error(
			`Expected YAML file ${filePath} to contain an array of cases, got ${typeof parsed}.`,
		);
	}

	const cases: Case[] = [];
	const seenIds = new Set<string>();

	for (let i = 0; i < parsed.length; i++) {
		const result = CaseSchema.safeParse(parsed[i]);
		if (!result.success) {
			throw new Error(`Invalid case at ${filePath}[${i}] — ${formatZodError(result.error)}`);
		}

		if (seenIds.has(result.data.id)) {
			throw new Error(
				`Duplicate case ID "${result.data.id}" at ${filePath}[${i}]. Case IDs must be unique within a file.`,
			);
		}

		seenIds.add(result.data.id);
		cases.push(result.data);
	}

	return cases;
}

function stripBom(content: string): string {
	return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

function formatZodError(error: {
	issues: readonly { message: string; path: readonly PropertyKey[] }[];
}): string {
	return error.issues
		.map(
			(issue) =>
				`${issue.path.length > 0 ? `${issue.path.map(String).join(".")}: ` : ""}${issue.message}`,
		)
		.join("; ");
}
