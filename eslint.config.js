import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";

export default [
  // Global ignores (must be first)
  {
    ignores: [
      "dist/**/*",
      "node_modules/**/*",
      "*.min.js",
      "*.min.css",
      "package-lock.json",
      "yarn.lock",
      ".env*",
      "*.log",
      ".DS_Store",
      ".git/**/*",
    ],
  },
  // Recommended configurations
  js.configs.recommended,
  // JavaScript files
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        require: "readonly",
      },
    },
    plugins: {
      prettier: prettier,
    },
    rules: {
      "prettier/prettier": "error",
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
      "no-unused-expressions": "error",
      eqeqeq: "error",
      curly: "error",
      ...prettierConfig.rules,
    },
  },
  // TypeScript files
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      prettier: prettier,
    },
    rules: {
      // Prettier integration
      "prettier/prettier": "error",

      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // General JavaScript/TypeScript rules
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
      "no-unused-expressions": "error",
      eqeqeq: "error",
      curly: "error",

      // Turn off rules that conflict with Prettier
      ...prettierConfig.rules,
    },
  },
];
