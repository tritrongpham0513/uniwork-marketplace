import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import pluginQuery from "@tanstack/eslint-plugin-query";

/**
 * Lưu ý về cấu hình:
 * - Dùng trực tiếp `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin`
 *   thay cho meta package `typescript-eslint` (meta package chặn TypeScript >= 7).
 * - `tsPlugin.configs.recommended` là cấu hình kiểu eslintrc (có `extends` dạng chuỗi)
 *   nên không dùng được trong flat config -> chỉ lấy `rules` và tự khai báo plugin/parser.
 */
const tsRules = tsPlugin.configs.recommended.rules;

export default defineConfig([
  globalIgnores(["dist", ".tmp-verify"]),
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "@tanstack/query": pluginQuery,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: globals.browser,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsRules,
      ...reactHooks.configs.flat.recommended.rules,
      ...reactRefresh.configs.vite.rules,
      ...pluginQuery.configs["flat/recommended"][0].rules,

      // Các rule core đã được @typescript-eslint loại bỏ (eslint-recommended)
      "no-undef": "off",
      "no-redeclare": "off",
      "no-dupe-class-members": "off",
      "no-var": "off",
      "prefer-const": "off",
      "prefer-rest-params": "off",
      "prefer-spread": "off",
      "no-useless-constructor": "off",
      "no-empty-function": "off",

      // Tham số/tham biến bắt đầu bằng "_" là cố ý bỏ qua
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Chỉ là quy tắc HMR-DX: các file `ui/*` của shadcn preset export
      // kèm `*Variants` (buttonVariants, badgeVariants...) nên không thể tách file.
      "react-refresh/only-export-components": "off",

      // ============================================
      // Cấm module boundaries (mức cảnh báo)
      // ============================================

      // Cấm import từ pages/* trong features/**
      "no-restricted-imports": [
        "warn",
        {
          name: "@/pages",
          message: "features/* không được import từ pages/. Pages là route-level, features là business logic layer.",
        },
      ],

      // Lưu ý: ESLint flat config không có pattern match dễ dàng cho cấm chéo features
      // Workaround: dùng custom lint-staged hoặc pre-commit hook check
    },
  },
  eslintConfigPrettier,
]);
