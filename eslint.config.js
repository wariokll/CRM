import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const browserGlobals = {
  Blob: "readonly",
  File: "readonly",
  FormData: "readonly",
  Headers: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  alert: "readonly",
  confirm: "readonly",
  document: "readonly",
  fetch: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  sessionStorage: "readonly",
  window: "readonly",
};
const nodeGlobals = {
  Buffer: "readonly",
  __dirname: "readonly",
  clearInterval: "readonly",
  console: "readonly",
  process: "readonly",
  setInterval: "readonly",
};

export default tseslint.config(
  { ignores: ["dist/**", "backend/dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: browserGlobals },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "no-unused-vars": "off",
      "prefer-const": "warn",
    },
  },
  {
    files: ["backend/src/**/*.ts"],
    languageOptions: { globals: nodeGlobals },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "no-unused-vars": "off",
      "prefer-const": "warn",
    },
  },
  prettier,
);
