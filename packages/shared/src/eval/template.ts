/**
 * Template rendering and variable extraction for prompt templates.
 * Supports mustache-style {{variable}} placeholders.
 */

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * Extracts all unique variable names from a mustache-style template.
 * Returns deduplicated variable names in the order of first appearance.
 */
export function extractVariables(template: string): string[] {
  const seen = new Set<string>();
  const variables: string[] = [];
  let match: RegExpExecArray | null;

  const regex = new RegExp(VARIABLE_PATTERN.source, VARIABLE_PATTERN.flags);
  while ((match = regex.exec(template)) !== null) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      variables.push(name);
    }
  }

  return variables;
}

/**
 * Renders a mustache-style template by replacing {{variable}} placeholders
 * with values from the provided variables object.
 *
 * WARNING: Values are interpolated raw. If the rendered template is used as an LLM prompt,
 * variable values could contain prompt injection content. Consider sanitizing inputs.
 *
 * Throws if a variable in the template is not provided in the variables object.
 * Values are coerced to strings via String().
 *
 * @param template - The template string with {{variable}} placeholders
 * @param variables - Key-value pairs to substitute into the template
 * @param maxValueLength - Optional maximum length for each interpolated value (truncates if exceeded)
 */
export function renderTemplate(
  template: string,
  variables: Record<string, unknown>,
  maxValueLength?: number
): string {
  const required = extractVariables(template);
  const missing = required.filter(
    (name) => variables[name] === undefined || variables[name] === null
  );

  if (missing.length > 0) {
    throw new TemplateMissingVariableError(missing);
  }

  return template.replace(VARIABLE_PATTERN, (_match, name: string) => {
    const value = String(variables[name]);
    if (maxValueLength !== undefined && value.length > maxValueLength) {
      return value.slice(0, maxValueLength);
    }
    return value;
  });
}

/**
 * Error thrown when required template variables are missing.
 */
export class TemplateMissingVariableError extends Error {
  public readonly missingVariables: string[];

  constructor(missingVariables: string[]) {
    super(
      `Missing required template variable${missingVariables.length > 1 ? "s" : ""}: ${missingVariables.join(", ")}`
    );
    this.name = "TemplateMissingVariableError";
    this.missingVariables = missingVariables;
  }
}
