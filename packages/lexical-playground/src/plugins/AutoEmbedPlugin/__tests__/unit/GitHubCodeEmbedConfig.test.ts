/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {describe, expect, test} from 'vitest';

import {GitHubCodeEmbedConfig, type GitHubCodeMatchResult} from '../../index';

async function parseGitHubCodeUrl(
  url: string,
): Promise<GitHubCodeMatchResult | null> {
  return (await GitHubCodeEmbedConfig.parseUrl(
    url,
  )) as GitHubCodeMatchResult | null;
}

describe('GitHubCodeEmbedConfig URL Parsing', () => {
  describe('Blob URLs', () => {
    test('parses blob URL without line range', async () => {
      const url = 'https://github.com/facebook/lexical/blob/main/README.md';
      const result = await parseGitHubCodeUrl(url);

      expect(result).not.toBeNull();
      expect(result?.url).toBe(url);
      expect(result?.owner).toBe('facebook');
      expect(result?.repo).toBe('lexical');
      expect(result?.path).toBe('README.md');
      expect(result?.branch).toBe('main');
      expect(result?.startLine).toBeUndefined();
      expect(result?.endLine).toBeUndefined();
    });

    test('parses blob URL with single line', async () => {
      const url =
        'https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalNode.ts#L100';
      const result = await parseGitHubCodeUrl(url);

      expect(result).not.toBeNull();
      expect(result?.url).toBe(url);
      expect(result?.owner).toBe('facebook');
      expect(result?.repo).toBe('lexical');
      expect(result?.path).toBe('packages/lexical/src/LexicalNode.ts');
      expect(result?.branch).toBe('main');
      expect(result?.startLine).toBe(100);
      expect(result?.endLine).toBeUndefined();
    });

    test('parses blob URL with line range', async () => {
      const url =
        'https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalNode.ts#L100-L150';
      const result = await parseGitHubCodeUrl(url);

      expect(result).not.toBeNull();
      expect(result?.url).toBe(url);
      expect(result?.owner).toBe('facebook');
      expect(result?.repo).toBe('lexical');
      expect(result?.path).toBe('packages/lexical/src/LexicalNode.ts');
      expect(result?.branch).toBe('main');
      expect(result?.startLine).toBe(100);
      expect(result?.endLine).toBe(150);
    });

    test('parses blob URL with nested path', async () => {
      const url =
        'https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/GitHubCodeNode.tsx#L1-L50';
      const result = await parseGitHubCodeUrl(url);

      expect(result).not.toBeNull();
      expect(result?.owner).toBe('facebook');
      expect(result?.repo).toBe('lexical');
      expect(result?.path).toBe(
        'packages/lexical-playground/src/nodes/GitHubCodeNode.tsx',
      );
      expect(result?.branch).toBe('main');
      expect(result?.startLine).toBe(1);
      expect(result?.endLine).toBe(50);
    });
  });

  describe('Blame URLs', () => {
    test('parses blame URL without line', async () => {
      const url = 'https://github.com/facebook/lexical/blame/main/README.md';
      const result = await parseGitHubCodeUrl(url);

      expect(result).not.toBeNull();
      expect(result?.url).toBe(url);
      expect(result?.owner).toBe('facebook');
      expect(result?.repo).toBe('lexical');
      expect(result?.path).toBe('README.md');
      expect(result?.branch).toBe('main');
      expect(result?.startLine).toBeUndefined();
    });

    test('parses blame URL with line', async () => {
      const url =
        'https://github.com/facebook/lexical/blame/main/packages/lexical/src/LexicalNode.ts#L100';
      const result = await parseGitHubCodeUrl(url);

      expect(result).not.toBeNull();
      expect(result?.url).toBe(url);
      expect(result?.owner).toBe('facebook');
      expect(result?.repo).toBe('lexical');
      expect(result?.path).toBe('packages/lexical/src/LexicalNode.ts');
      expect(result?.branch).toBe('main');
      expect(result?.startLine).toBe(100);
    });
  });

  describe('Gist URLs', () => {
    test('parses gist URL without file', async () => {
      const url = 'https://gist.github.com/user/abc123def456';
      const result = await parseGitHubCodeUrl(url);

      expect(result).not.toBeNull();
      expect(result?.url).toBe(url);
      expect(result?.owner).toBe('user');
      expect(result?.repo).toBe('abc123def456');
      expect(result?.path).toBe('');
      expect(result?.branch).toBe('main');
    });

    test('parses gist URL with file', async () => {
      const url = 'https://gist.github.com/user/abc123def456#file-example-ts';
      const result = await parseGitHubCodeUrl(url);

      expect(result).not.toBeNull();
      expect(result?.url).toBe(url);
      expect(result?.owner).toBe('user');
      expect(result?.repo).toBe('abc123def456');
      expect(result?.path).toBe('example-ts');
      expect(result?.branch).toBe('main');
    });
  });

  describe('Raw URLs', () => {
    test('parses raw URL', async () => {
      const url =
        'https://raw.githubusercontent.com/facebook/lexical/main/README.md';
      const result = await parseGitHubCodeUrl(url);

      expect(result).not.toBeNull();
      expect(result?.url).toBe(url);
      expect(result?.owner).toBe('facebook');
      expect(result?.repo).toBe('lexical');
      expect(result?.path).toBe('README.md');
      expect(result?.branch).toBe('main');
    });

    test('parses raw URL with nested path', async () => {
      const url =
        'https://raw.githubusercontent.com/facebook/lexical/main/packages/lexical/src/LexicalNode.ts';
      const result = await parseGitHubCodeUrl(url);

      expect(result).not.toBeNull();
      expect(result?.owner).toBe('facebook');
      expect(result?.repo).toBe('lexical');
      expect(result?.path).toBe('packages/lexical/src/LexicalNode.ts');
      expect(result?.branch).toBe('main');
    });
  });

  describe('Invalid URLs', () => {
    test('returns null for non-GitHub URL', async () => {
      const url = 'https://example.com/some/path';
      const result = await parseGitHubCodeUrl(url);
      expect(result).toBeNull();
    });

    test('returns null for GitHub URL without blob/blame/raw', async () => {
      const url = 'https://github.com/facebook/lexical';
      const result = await parseGitHubCodeUrl(url);
      expect(result).toBeNull();
    });

    test('returns null for malformed GitHub URL', async () => {
      const url = 'https://github.com/invalid';
      const result = await parseGitHubCodeUrl(url);
      expect(result).toBeNull();
    });
  });
});
