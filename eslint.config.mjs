import js from "@eslint/js";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

const baseTypeScriptConfig = {
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaFeatures: {
        jsx: true
      },
      ecmaVersion: "latest",
      sourceType: "module"
    }
  },
  plugins: {
    "@typescript-eslint": tseslintPlugin
  },
  rules: {
    "no-undef": "off",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }
    ]
  }
};

export default [
  {
    ignores: [
      "**/.next/**",
      "**/.turbo/**",
      "**/.wrangler/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/*.d.ts",
      "**/*.tsbuildinfo"
    ]
  },
  js.configs.recommended,
  baseTypeScriptConfig,
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    files: ["apps/api/src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.serviceworker
      }
    }
  },
  {
    files: ["packages/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.node
    }
  }
];
