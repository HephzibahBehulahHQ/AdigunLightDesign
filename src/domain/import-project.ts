import {validateProject} from "./project.js";

export interface ProjectImportResult {
  valid: boolean;
  errors: string[];
  project: unknown | null;
}

export interface ProjectImportFile {
  readonly size: number;
  readonly type: string;
  text(): Promise<string>;
}

export interface ReadProjectFileOptions {
  maxBytes?: number;
}

export function parseProjectJson(source: string): ProjectImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return {valid: false, errors: ["Project JSON could not be parsed."], project: null};
  }
  const result = validateProject(parsed);
  return {...result, project: result.valid ? structuredClone(parsed) : null};
}

export async function readProjectFile(
  file: ProjectImportFile | null | undefined,
  {maxBytes = 5_000_000}: ReadProjectFileOptions = {},
): Promise<ProjectImportResult> {
  if (!file || file.size > maxBytes) {
    return {valid: false, errors: ["Project file is missing or exceeds 5 MB."], project: null};
  }
  if (file.type && !["application/json", "text/json"].includes(file.type)) {
    return {valid: false, errors: ["Project import must be JSON."], project: null};
  }
  try {
    return parseProjectJson(await file.text());
  } catch {
    return {valid: false, errors: ["Project file could not be read."], project: null};
  }
}

