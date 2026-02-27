import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadCases } from "./case-loader.js";

let tempDir: string;

beforeEach(async () => {
	tempDir = await mkdtemp(join(tmpdir(), "case-loader-"));
});

afterEach(async () => {
	await rm(tempDir, { recursive: true, force: true });
});

describe("loadCases — JSONL", () => {
	it("loads valid JSONL with multiple cases", async () => {
		const content = [
			JSON.stringify({ id: "H01", input: { query: "hello" } }),
			JSON.stringify({ id: "H02", input: { query: "world" } }),
		].join("\n");
		const file = join(tempDir, "cases.jsonl");
		await writeFile(file, content);

		const cases = await loadCases(file);
		expect(cases).toHaveLength(2);
		expect(cases[0]?.id).toBe("H01");
		expect(cases[1]?.id).toBe("H02");
	});

	it("skips empty lines and comments", async () => {
		const content = [
			"// This is a comment",
			JSON.stringify({ id: "H01", input: { query: "hello" } }),
			"",
			"# Another comment",
			JSON.stringify({ id: "H02", input: { query: "world" } }),
			"",
		].join("\n");
		const file = join(tempDir, "cases.jsonl");
		await writeFile(file, content);

		const cases = await loadCases(file);
		expect(cases).toHaveLength(2);
	});

	it("handles BOM marker", async () => {
		const content = `\uFEFF${JSON.stringify({ id: "H01", input: { query: "hello" } })}`;
		const file = join(tempDir, "cases.jsonl");
		await writeFile(file, content);

		const cases = await loadCases(file);
		expect(cases).toHaveLength(1);
	});

	it("rejects malformed JSON with line number", async () => {
		const content = [
			JSON.stringify({ id: "H01", input: { query: "hello" } }),
			"not valid json",
		].join("\n");
		const file = join(tempDir, "cases.jsonl");
		await writeFile(file, content);

		await expect(loadCases(file)).rejects.toThrow(/line.*2|:2/i);
	});

	it("rejects duplicate case IDs", async () => {
		const content = [
			JSON.stringify({ id: "H01", input: { query: "hello" } }),
			JSON.stringify({ id: "H01", input: { query: "world" } }),
		].join("\n");
		const file = join(tempDir, "cases.jsonl");
		await writeFile(file, content);

		await expect(loadCases(file)).rejects.toThrow(/duplicate.*H01/i);
	});

	it("returns empty array for empty file", async () => {
		const file = join(tempDir, "cases.jsonl");
		await writeFile(file, "");

		const cases = await loadCases(file);
		expect(cases).toHaveLength(0);
	});
});

describe("loadCases — YAML", () => {
	it("loads valid YAML with multiple cases", async () => {
		const content = `
- id: H01
  input:
    query: hello
- id: H02
  input:
    query: world
`;
		const file = join(tempDir, "cases.yaml");
		await writeFile(file, content);

		const cases = await loadCases(file);
		expect(cases).toHaveLength(2);
		expect(cases[0]?.id).toBe("H01");
	});

	it("rejects non-array YAML", async () => {
		const file = join(tempDir, "cases.yaml");
		await writeFile(file, "name: not-an-array\n");

		await expect(loadCases(file)).rejects.toThrow(/array/i);
	});

	it("rejects duplicate IDs in YAML", async () => {
		const content = `
- id: H01
  input:
    query: hello
- id: H01
  input:
    query: world
`;
		const file = join(tempDir, "cases.yml");
		await writeFile(file, content);

		await expect(loadCases(file)).rejects.toThrow(/duplicate.*H01/i);
	});
});

describe("loadCases — unsupported format", () => {
	it("rejects unsupported file extension", async () => {
		const file = join(tempDir, "cases.csv");
		await writeFile(file, "id,input\nH01,hello\n");

		await expect(loadCases(file)).rejects.toThrow(/unsupported/i);
	});
});
