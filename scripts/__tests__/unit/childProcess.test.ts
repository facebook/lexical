/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {describe, expect, it} from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {exec, spawn} = require('../../shared/childProcess');

describe('childProcess', () => {
  describe('exec', () => {
    it('resolves with {stdout, stderr} on success', async () => {
      const result = await exec('echo hello');
      expect(result.stdout.trim()).toBe('hello');
      expect(result).toHaveProperty('stderr');
    });

    it('rejects with error having .code, .stdout, .stderr on failure', async () => {
      await expect(exec('exit 1')).rejects.toMatchObject({
        code: 1,
        stderr: expect.any(String),
        stdout: expect.any(String),
      });
    });

    it('forwards options like {env}', async () => {
      const result = await exec('echo $TEST_VAR', {
        env: {...process.env, TEST_VAR: 'from_env'},
      });
      expect(result.stdout.trim()).toBe('from_env');
    });

    it('ignores the child-process-promise-specific capture option gracefully', async () => {
      const result = await exec('echo ok', {capture: ['stdout', 'stderr']});
      expect(result.stdout.trim()).toBe('ok');
    });
  });

  describe('spawn', () => {
    it('resolves on exit code 0', async () => {
      await expect(
        spawn('node', ['-e', 'process.exit(0)'], {stdio: 'ignore'}),
      ).resolves.toBeUndefined();
    });

    it('rejects with error having .code on non-zero exit', async () => {
      await expect(
        spawn('node', ['-e', 'process.exit(42)'], {stdio: 'ignore'}),
      ).rejects.toMatchObject({code: 42});
    });

    it('forwards stdio, cwd, env options', async () => {
      await expect(
        spawn('node', ['-e', 'process.exit(0)'], {
          cwd: process.cwd(),
          env: process.env,
          stdio: 'ignore',
        }),
      ).resolves.toBeUndefined();
    });

    it('rejects on command not found', async () => {
      await expect(
        spawn('nonexistent-command-abc123', [], {stdio: 'ignore'}),
      ).rejects.toThrow();
    });
  });
});
