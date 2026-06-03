import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
      "react/no-unknown-property": "off",
      "react/no-inline-styles": "off",
      "prettier/prettier": "off",
      "tailwindcss/no-unsafe-html": "off",
      "tailwindcss/no-arbitrary-values": "off",
      "tailwindcss/enforces-shorthand": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
