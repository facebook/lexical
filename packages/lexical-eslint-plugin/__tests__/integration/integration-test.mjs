#!/usr/bin/env node
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Integration test to verify @lexical/eslint-plugin works with:
 * - ESLint 8 (legacy .eslintrc config)
 * - ESLint 10 (flat eslint.config.js)
 *
 * This test uses pnpx to run different ESLint versions without
 * modifying package.json or pnpm-lock.yaml
 */
/* eslint-disable no-console */

import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const ESLINT8_DIR = path.join(FIXTURES_DIR, 'eslint8-legacy');
const ESLINT8_DEPRECATED_DIR = path.join(
  FIXTURES_DIR,
  'eslint8-legacy-deprecated',
);
const ESLINT10_DIR = path.join(FIXTURES_DIR, 'eslint10-flat');

// ANSI color codes
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function logTest(name, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    log(`  ✓ ${name}`, GREEN);
  } else {
    failedTests++;
    log(`  ✗ ${name}`, RED);
    if (details) {
      log(`    ${details}`, YELLOW);
    }
  }
}

function runESLint(version, configDir, configFile, file, shouldFail = false) {
  const testName = `ESLint ${version} - ${path.basename(file)} (${shouldFail ? 'should fail' : 'should pass'})`;

  // Copy the file into the config directory to ensure consistent behavior
  // and avoid parent config file discovery issues
  const fileName = path.basename(file);
  const copiedFile = path.join(configDir, fileName);
  try {
    fs.copyFileSync(file, copiedFile);
  } catch (error) {
    logTest(testName, false, `Failed to copy test file: ${error.message}`);
    return false;
  }

  try {
    // Use -c with relative path (relative to cwd) to explicitly specify config
    // Use --no-eslintrc to prevent parent config lookup (ESLint 8 only)
    // For ESLint 8, set ESLINT_USE_FLAT_CONFIG=false to avoid flat config detection
    const envPrefix = version === '8' ? 'ESLINT_USE_FLAT_CONFIG=false ' : '';
    const noEslintrc = version === '8' ? '--no-eslintrc ' : '';
    const cmd = `${envPrefix}pnpm dlx eslint@${version} ${noEslintrc}--no-ignore -c "${configFile}" "${fileName}"`;
    const _output = execSync(cmd, {
      cwd: configDir,
      encoding: 'utf8',
      shell: '/bin/bash',
      stdio: 'pipe',
    });

    // Clean up copied file
    if (fs.existsSync(copiedFile)) {
      fs.unlinkSync(copiedFile);
    }

    // If we expected it to fail but it passed
    if (shouldFail) {
      logTest(
        testName,
        false,
        'Expected ESLint to report errors but it passed',
      );
      return false;
    }

    logTest(testName, true);
    return true;
  } catch (error) {
    // Clean up copied file
    if (fs.existsSync(copiedFile)) {
      fs.unlinkSync(copiedFile);
    }

    const output = error.stdout + error.stderr;

    // If we expected it to fail and it did
    if (shouldFail) {
      // Verify it failed for the right reason (rules-of-lexical)
      if (
        output.includes('@lexical/rules-of-lexical') ||
        output.includes('rules-of-lexical')
      ) {
        logTest(testName, true);
        return true;
      } else {
        logTest(testName, false, 'Failed but not due to rules-of-lexical rule');
        return false;
      }
    }

    // If we expected it to pass but it failed
    logTest(testName, false, error.message.split('\n')[0]);
    return false;
  }
}

function testESLint8(dirName) {
  log(`\n${BOLD}${BLUE}Testing ESLint 8 (${path.basename(dirName)})${RESET}`);
  log(`Directory: ${dirName}`);

  // Check if config exists
  const configPath = path.join(dirName, '.eslintrc.json');
  if (!fs.existsSync(configPath)) {
    log(`  ✗ Config file not found: ${configPath}`, RED);
    return false;
  }

  runESLint(
    '8',
    dirName,
    '.eslintrc.json',
    path.join(FIXTURES_DIR, 'valid.js'),
    false,
  );
  runESLint(
    '8',
    dirName,
    '.eslintrc.json',
    path.join(FIXTURES_DIR, 'invalid.js'),
    true,
  );
}

function testESLint10Flat() {
  log(`\n${BOLD}${BLUE}Testing ESLint 10 (Flat Config)${RESET}`);
  log(`Directory: ${ESLINT10_DIR}`);

  // Check if config exists
  const configPath = path.join(ESLINT10_DIR, 'eslint.config.js');
  if (!fs.existsSync(configPath)) {
    log(`  ✗ Config file not found: ${configPath}`, RED);
    return false;
  }

  runESLint(
    '10',
    ESLINT10_DIR,
    'eslint.config.js',
    path.join(FIXTURES_DIR, 'valid.js'),
    false,
  );
  runESLint(
    '10',
    ESLINT10_DIR,
    'eslint.config.js',
    path.join(FIXTURES_DIR, 'invalid.js'),
    true,
  );
}

function setupFixtures() {
  log(`\n${BOLD}${BLUE}Setting up test fixtures...${RESET}`);

  [ESLINT8_DIR, ESLINT8_DEPRECATED_DIR, ESLINT10_DIR].forEach((cwd) => {
    try {
      log(`  Installing dependencies for ${path.basename(cwd)} fixture...`);
      execSync('pnpm install --no-lockfile', {
        cwd,
        stdio: 'pipe',
      });
      log(`  ✓ ${path.basename(cwd)} fixture ready`, GREEN);
    } catch (error) {
      log(
        `  ✗ Failed to setup ${path.basename(cwd)} fixture: ${error.message}`,
        RED,
      );
      throw error;
    }
  });
}

function main() {
  log(`${BOLD}${'='.repeat(70)}${RESET}`);
  log(`${BOLD}ESLint Plugin Integration Tests${RESET}`);
  log(`${BOLD}${'='.repeat(70)}${RESET}`);
  log(`\nTesting @lexical/eslint-plugin compatibility with:`);
  log(`  - ESLint 8.x (legacy deprecated .eslintrc config)`);
  log(`  - ESLint 8.x (legacy prefixed .eslintrc config)`);
  log(`  - ESLint 10.x (flat eslint.config.js)`);

  try {
    setupFixtures();
    testESLint8(ESLINT8_DIR);
    testESLint8(ESLINT8_DEPRECATED_DIR);
    testESLint10Flat();

    log(`\n${BOLD}${'='.repeat(70)}${RESET}`);
    log(`${BOLD}Test Summary${RESET}`);
    log(`${BOLD}${'='.repeat(70)}${RESET}`);
    log(`Total tests: ${totalTests}`);
    log(`Passed: ${passedTests}`, GREEN);

    if (failedTests > 0) {
      log(`Failed: ${failedTests}`, RED);
      log(`\n${RED}${BOLD}✗ Some tests failed${RESET}`);
      process.exit(1);
    } else {
      log(`\n${GREEN}${BOLD}✓ All tests passed!${RESET}`);
      process.exit(0);
    }
  } catch (error) {
    log(`\n${RED}${BOLD}Fatal error: ${error.message}${RESET}`, RED);
    process.exit(1);
  }
}

main();
