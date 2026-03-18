# ESLint Plugin Integration Tests

This directory contains integration tests that verify `@lexical/eslint-plugin` works correctly with different ESLint versions.

## Test Coverage

The integration tests verify:

- **ESLint 8.x** with legacy `.eslintrc.json` configuration
- **ESLint 10.x** with flat `eslint.config.js` configuration
- **Config name aliases** (`recommended` vs `legacy-recommended`)

## Running the Tests

From the repository root:

```bash
node packages/lexical-eslint-plugin/__tests__/integration-test.js
```

Or from the package directory:

```bash
cd packages/lexical-eslint-plugin
node __tests__/integration-test.js
```

## How It Works

The test script uses `pnpx` to run different ESLint versions without modifying `package.json` or `pnpm-lock.yaml`. This ensures:

- No dependency conflicts
- Clean testing environment
- Multiple ESLint versions can be tested in the same run

## Test Fixtures

### ESLint 8 (Legacy Config)

Located in `fixtures/eslint8-legacy/`:
- `.eslintrc.json` - Legacy ESLint configuration
- `valid.js` - Code that should pass linting
- `invalid.js` - Code that should trigger `@lexical/rules-of-lexical` errors

### ESLint 10 (Flat Config)

Located in `fixtures/eslint10-flat/`:
- `eslint.config.js` - Flat ESLint configuration
- `valid.js` - Code that should pass linting
- `invalid.js` - Code that should trigger `@lexical/rules-of-lexical` errors

## Expected Behavior

### Valid Code Examples

These should **pass** linting:
- Functions with `$` prefix calling other `$` functions
- Code inside `editor.update()` callbacks calling `$` functions
- Class methods calling `$` functions

### Invalid Code Examples

These should **fail** linting with `@lexical/rules-of-lexical` error:
- Functions without `$` prefix calling `$` functions directly

## Test Output

The test script provides colored output:
- ✓ Green = Test passed
- ✗ Red = Test failed
- Summary at the end with total/passed/failed counts
