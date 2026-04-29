import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

let content: string;

beforeAll(() => {
  content = readFileSync(resolve(__dirname, "CLAUDE.md"), "utf-8");
});

describe("CLAUDE.md structure", () => {
  it("has a project identity section with one-liner description", () => {
    expect(content).toMatch(/# PromptOPS/);
    expect(content).toMatch(/LLMOps|prompt|eval/i);
  });

  it("has a tech stack quick reference", () => {
    expect(content).toMatch(/## Tech Stack/i);
    expect(content).toMatch(/Next\.js/);
    expect(content).toMatch(/Hono/);
    expect(content).toMatch(/Cloudflare Workers/i);
    expect(content).toMatch(/D1/);
    expect(content).toMatch(/Tailwind/);
    expect(content).toMatch(/shadcn/i);
    expect(content).toMatch(/TypeScript/);
    expect(content).toMatch(/pnpm/);
    expect(content).toMatch(/Turborepo/i);
  });

  it("has a monorepo structure section listing all workspaces", () => {
    expect(content).toMatch(/## Monorepo Structure/i);
    expect(content).toMatch(/apps\/web/);
    expect(content).toMatch(/apps\/api/);
    expect(content).toMatch(/packages\/shared/);
    expect(content).toMatch(/packages\/sdk/);
  });
});

describe("CLAUDE.md commands", () => {
  it("documents all essential dev commands", () => {
    expect(content).toMatch(/## Commands/i);
    expect(content).toMatch(/pnpm dev/);
    expect(content).toMatch(/pnpm build/);
    expect(content).toMatch(/pnpm test/);
    expect(content).toMatch(/pnpm lint/);
    expect(content).toMatch(/pnpm format/);
    expect(content).toMatch(/pnpm typecheck/);
    expect(content).toMatch(/pnpm fix/);
  });

  it("documents the install command", () => {
    expect(content).toMatch(/pnpm install:deps/);
  });

  it("documents filtering by workspace", () => {
    expect(content).toMatch(/--filter/);
  });
});

describe("CLAUDE.md code conventions", () => {
  it("has a code conventions section", () => {
    expect(content).toMatch(/## Code Conventions/i);
  });

  it("specifies formatting rules", () => {
    expect(content).toMatch(/double quotes|".*singleQuote.*false"/i);
    expect(content).toMatch(/semicolons/i);
    expect(content).toMatch(/trailing comma/i);
  });

  it("specifies ID generation strategy", () => {
    expect(content).toMatch(/ULID/i);
  });

  it("specifies error handling pattern", () => {
    expect(content).toMatch(/AppError/);
    expect(content).toMatch(/ValidationError|AuthenticationError|NotFoundError/);
  });

  it("specifies the API response envelope format", () => {
    expect(content).toMatch(/error.*message|ApiErrorResponse/i);
  });
});

describe("CLAUDE.md import boundaries", () => {
  it("has import rules section", () => {
    expect(content).toMatch(/import|boundar/i);
  });

  it("specifies shared package is the contract boundary", () => {
    expect(content).toMatch(/@promptops\/shared/);
  });

  it("prohibits cross-workspace deep imports", () => {
    expect(content).toMatch(
      /must not import|no direct import|never import|do not import/i
    );
  });
});

describe("CLAUDE.md architecture rules", () => {
  it("documents the middleware chain order", () => {
    expect(content).toMatch(/middleware/i);
    expect(content).toMatch(
      /requestContext|security.*headers|CORS|auth|audit/i
    );
  });

  it("documents RBAC roles", () => {
    expect(content).toMatch(/RBAC|role/i);
    expect(content).toMatch(/OWNER|ADMIN|MEMBER|VIEWER/);
  });

  it("documents the BYOK architecture", () => {
    expect(content).toMatch(/BYOK|Bring Your Own Key/i);
  });
});

describe("CLAUDE.md testing instructions", () => {
  it("has testing section", () => {
    expect(content).toMatch(/## Testing/i);
  });

  it("specifies the test framework", () => {
    expect(content).toMatch(/Vitest/i);
  });

  it("specifies test file naming convention", () => {
    expect(content).toMatch(/\.test\.ts|\.spec\.ts/);
  });
});

describe("CLAUDE.md environment setup", () => {
  it("has environment section", () => {
    expect(content).toMatch(/environment|env/i);
  });

  it("lists the key env files", () => {
    expect(content).toMatch(/\.env\.local/);
    expect(content).toMatch(/\.dev\.vars/);
    expect(content).toMatch(/wrangler\.toml/);
  });
});

describe("CLAUDE.md context file references", () => {
  it("references all domain context files", () => {
    expect(content).toMatch(/CONTEXT_FRONTEND/);
    expect(content).toMatch(/CONTEXT_BACKEND/);
    expect(content).toMatch(/CONTEXT_AUTH/);
    expect(content).toMatch(/CONTEXT_DATABASE/);
    expect(content).toMatch(/CONTEXT_EVAL_ENGINE/);
    expect(content).toMatch(/CONTEXT_UI_DESIGN/);
    expect(content).toMatch(/CONTEXT_SDK/);
    expect(content).toMatch(/CONTEXT_DEPLOYMENT/);
  });

  it("instructs when to read each context file", () => {
    expect(content).toMatch(
      /read.*context|context.*read|before.*working|when.*working/i
    );
  });
});

describe("CLAUDE.md critical rules", () => {
  it("has a critical rules or guardrails section", () => {
    expect(content).toMatch(/critical|guardrail|must|never/i);
  });

  it("warns about not committing secrets", () => {
    expect(content).toMatch(/secret|\.env|\.dev\.vars/i);
    expect(content).toMatch(/never commit|do not commit|gitignore/i);
  });

  it("specifies PR and commit conventions", () => {
    expect(content).toMatch(/commit|PR|pull request/i);
  });
});
