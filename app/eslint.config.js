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

/**
 * Các feature trong `src/features/`.
 *
 * Feature được phép import:
 * - `features/shared/` — kiểu dữ liệu & logic dùng chung (điểm neo duy nhất).
 * - `features/auth/types` — nơi khai báo `ApiResponse` mà nhiều service dùng.
 * - chính nó — import nội bộ.
 *
 * Ngoại lệ đã biết:
 * - `features/notifications/hooks/invalidate.ts` — hub đồng bộ query key đa feature.
 */
const FEATURE_MODULES = [
  "admin",
  "applications",
  "auth",
  "employer",
  "files",
  "jobs",
  "notifications",
  "profile",
  "reviews",
  "saved-jobs",
  "shared",
  "work-history",
];

/** Nguồn import luôn được phép, bất kể feature đích là gì. */
const ALWAYS_ALLOWED_SOURCES = ["shared"];

/**
 * Mỗi feature bị chặn import từ feature khác — trừ những nguồn trong `ALWAYS_ALLOWED_SOURCES`.
 *
 * ESLint flat config không có "negation pattern" cho `no-restricted-imports`,
 * nên ta sinh một config block cho từng feature, chặn theo danh sách nguồn cụ thể.
 *
 * Lưu ý: block này đặt SAU block chặn `@/pages/*`, nên phải gộp luôn pattern
 * của `pages/` vào đây — nếu không, rule cuối cùng thắng sẽ làm mất hiệu lực
 * của rule chặn `pages/`.
 */
const crossFeatureRules = FEATURE_MODULES.flatMap((target) => {
  const blockedSources = FEATURE_MODULES.filter(
    (source) => source !== target && !ALWAYS_ALLOWED_SOURCES.includes(source),
  );
  if (blockedSources.length === 0) return [];

  return [
    {
      files: [`src/features/${target}/**/*.{ts,tsx}`],
      rules: {
        "no-restricted-imports": [
          "warn",
          {
            patterns: [
              {
                group: ["@/pages", "@/pages/*"],
                message:
                  "features/* không được import từ pages/. Pages là route-level, features là business logic layer.",
              },
              {
                group: blockedSources.map((source) => `@/features/${source}`),
                message:
                  `\`features/${target}\` không được import trực tiếp từ feature khác. ` +
                  "Hãy đưa phần dùng chung vào `features/shared/` — xem AGENTS.md > Ranh giới import.",
              },
            ],
          },
        ],
      },
    },
  ];
});

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
    },
  },

  // ============================================
  // `console` trong code shipped sẽ lọt lên production.
  // Chỉ áp dụng cho `src/` — script verify trong `scripts/` cần `console.log`
  // để in kết quả ra terminal.
  // Ngoại lệ: `console.error`/`console.warn` vẫn cần cho logging khẩn cấp.
  // ============================================
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // ============================================
  // Cấm import chéo giữa các feature (trừ `shared`)
  // + cấm import từ `pages/` bên trong features/
  // ============================================
  ...crossFeatureRules,

  // ============================================
  // `lib/` phải pure: không import từ features/ hay pages/
  // ============================================
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/features", "@/features/*", "@/pages", "@/pages/*"],
              message:
                "lib/ phải thuần khiết (pure): không được import từ features/ hoặc pages/.",
            },
          ],
        },
      ],
    },
  },

  eslintConfigPrettier,
]);
