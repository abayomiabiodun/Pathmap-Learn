import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  { files: ['tests/**/*.tsx'], rules: { '@next/next/no-html-link-for-pages': 'off' } },
  globalIgnores([
    '.next/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
  ]),
]);
