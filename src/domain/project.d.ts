export interface ProjectValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CreateProjectOptions {
  id?: string;
  name?: string;
}

export declare const CURRENT_SCHEMA_VERSION: number;
export declare function createProject(options?: CreateProjectOptions): Record<string, unknown>;
export declare function validateProject(project: unknown): ProjectValidationResult;

