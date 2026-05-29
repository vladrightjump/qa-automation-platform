import base from '../packages/config/eslint.config.base.mjs';

export default [
  ...base,
  {
    // Playwright fixtures destructured for their setup side-effect (auth
    // injection) are not always referenced in the body — this is the
    // recommended pattern, not dead code.
    files: ['e2e/**/*.spec.ts', 'fixtures/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^(_|authedPage$|adminPage$)',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
];
