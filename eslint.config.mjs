// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/.prisma/**',
      '**/prisma/migrations/**',
      // shadcn-generated components are inspectable but intentionally not linted —
      // they're a third-party-shaped surface we copy verbatim.
      'apps/web/src/components/ui/**',
      '**/*.config.{js,ts,mjs,cjs}',
      '**/vite.config.ts',
      '**/vitest.config.ts',
      '**/tsup.config.ts',
      '**/coverage/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // The codebase uses targeted `as any` for known third-party type defects
      // (ioredis URL ctor, Prisma + exactOptionalPropertyTypes). Each occurrence
      // has an inline rationale; a blanket ban would force louder workarounds.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['**/*.{spec,test}.ts'],
    rules: {
      // Test mocks legitimately access private internals or omit shapes.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
)
