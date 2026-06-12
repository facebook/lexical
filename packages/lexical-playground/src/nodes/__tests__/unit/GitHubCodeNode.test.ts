/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createEditor, LexicalEditor} from 'lexical';
import {beforeEach, describe, expect, test} from 'vitest';

import {
  $createGitHubCodeNode,
  $isGitHubCodeNode,
  GitHubCodeNode,
} from '../../GitHubCodeNode';

describe('GitHubCodeNode', () => {
  let editor: LexicalEditor;

  beforeEach(() => {
    editor = createEditor({
      nodes: [GitHubCodeNode],
    });
  });

  describe('Node Creation', () => {
    test('creates node with required properties', () => {
      editor.update(() => {
        const node = $createGitHubCodeNode(
          'https://github.com/facebook/lexical/blob/main/README.md',
          'facebook',
          'lexical',
          'README.md',
          'main',
        );
        expect(node.__url).toBe(
          'https://github.com/facebook/lexical/blob/main/README.md',
        );
        expect(node.__owner).toBe('facebook');
        expect(node.__repo).toBe('lexical');
        expect(node.__path).toBe('README.md');
        expect(node.__branch).toBe('main');
      });
    });

    test('creates node with line range', () => {
      editor.update(() => {
        const node = $createGitHubCodeNode(
          'https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalNode.ts#L100-L150',
          'facebook',
          'lexical',
          'packages/lexical/src/LexicalNode.ts',
          'main',
          100,
          150,
        );
        expect(node.__startLine).toBe(100);
        expect(node.__endLine).toBe(150);
      });
    });

    test('creates node with language', () => {
      editor.update(() => {
        const node = $createGitHubCodeNode(
          'https://github.com/facebook/lexical/blob/main/README.md',
          'facebook',
          'lexical',
          'README.md',
          'main',
          undefined,
          undefined,
          'markdown',
        );
        expect(node.__language).toBe('markdown');
      });
    });
  });

  describe('Type Checking', () => {
    test('$isGitHubCodeNode returns true for GitHubCodeNode', () => {
      editor.update(() => {
        const node = $createGitHubCodeNode(
          'https://github.com/facebook/lexical/blob/main/README.md',
          'facebook',
          'lexical',
          'README.md',
          'main',
        );
        expect($isGitHubCodeNode(node)).toBe(true);
      });
    });

    test('$isGitHubCodeNode returns false for null', () => {
      expect($isGitHubCodeNode(null)).toBe(false);
    });

    test('$isGitHubCodeNode returns false for undefined', () => {
      expect($isGitHubCodeNode(undefined)).toBe(false);
    });
  });

  describe('Serialization', () => {
    test('exportJSON includes all properties', () => {
      editor.update(() => {
        const node = $createGitHubCodeNode(
          'https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalNode.ts#L100-L150',
          'facebook',
          'lexical',
          'packages/lexical/src/LexicalNode.ts',
          'main',
          100,
          150,
          'typescript',
        );
        const json = node.exportJSON();
        expect(json.url).toBe(
          'https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalNode.ts#L100-L150',
        );
        expect(json.owner).toBe('facebook');
        expect(json.repo).toBe('lexical');
        expect(json.path).toBe('packages/lexical/src/LexicalNode.ts');
        expect(json.branch).toBe('main');
        expect(json.startLine).toBe(100);
        expect(json.endLine).toBe(150);
        expect(json.language).toBe('typescript');
        expect(json.type).toBe('github-code');
      });
    });

    test('importJSON creates node from serialized data', () => {
      editor.update(() => {
        const serialized = {
          branch: 'main',
          format: '' as const,
          owner: 'facebook',
          path: 'README.md',
          repo: 'lexical',
          type: 'github-code',
          url: 'https://github.com/facebook/lexical/blob/main/README.md',
          version: 1,
        };
        const node = GitHubCodeNode.importJSON(serialized);
        expect(node.__url).toBe(serialized.url);
        expect(node.__owner).toBe(serialized.owner);
        expect(node.__repo).toBe(serialized.repo);
        expect(node.__path).toBe(serialized.path);
        expect(node.__branch).toBe(serialized.branch);
      });
    });

    test('exportJSON/importJSON roundtrip preserves data', () => {
      editor.update(() => {
        const originalNode = $createGitHubCodeNode(
          'https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalNode.ts#L100-L150',
          'facebook',
          'lexical',
          'packages/lexical/src/LexicalNode.ts',
          'main',
          100,
          150,
          'typescript',
        );
        const json = originalNode.exportJSON();
        const restoredNode = GitHubCodeNode.importJSON(json);

        expect(restoredNode.__url).toBe(originalNode.__url);
        expect(restoredNode.__owner).toBe(originalNode.__owner);
        expect(restoredNode.__repo).toBe(originalNode.__repo);
        expect(restoredNode.__path).toBe(originalNode.__path);
        expect(restoredNode.__branch).toBe(originalNode.__branch);
        expect(restoredNode.__startLine).toBe(originalNode.__startLine);
        expect(restoredNode.__endLine).toBe(originalNode.__endLine);
        expect(restoredNode.__language).toBe(originalNode.__language);
      });
    });
  });

  describe('DOM Export', () => {
    test('exportDOM creates div with data attributes', () => {
      editor.update(() => {
        const node = $createGitHubCodeNode(
          'https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalNode.ts#L100-L150',
          'facebook',
          'lexical',
          'packages/lexical/src/LexicalNode.ts',
          'main',
          100,
          150,
          'typescript',
        );
        const domOutput = node.exportDOM();
        const element = domOutput.element as HTMLElement;

        expect(element.tagName).toBe('DIV');
        expect(element.getAttribute('data-lexical-github-code')).toBe(
          'https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalNode.ts#L100-L150',
        );
        expect(element.getAttribute('data-owner')).toBe('facebook');
        expect(element.getAttribute('data-repo')).toBe('lexical');
        expect(element.getAttribute('data-path')).toBe(
          'packages/lexical/src/LexicalNode.ts',
        );
        expect(element.getAttribute('data-branch')).toBe('main');
        expect(element.getAttribute('data-start-line')).toBe('100');
        expect(element.getAttribute('data-end-line')).toBe('150');
        expect(element.getAttribute('data-language')).toBe('typescript');
      });
    });

    test('exportDOM without optional fields', () => {
      editor.update(() => {
        const node = $createGitHubCodeNode(
          'https://github.com/facebook/lexical/blob/main/README.md',
          'facebook',
          'lexical',
          'README.md',
          'main',
        );
        const domOutput = node.exportDOM();
        const element = domOutput.element as HTMLElement;

        expect(element.getAttribute('data-start-line')).toBeNull();
        expect(element.getAttribute('data-end-line')).toBeNull();
        expect(element.getAttribute('data-language')).toBeNull();
      });
    });
  });

  describe('Text Content', () => {
    test('getTextContent returns URL', () => {
      editor.update(() => {
        const url = 'https://github.com/facebook/lexical/blob/main/README.md';
        const node = $createGitHubCodeNode(
          url,
          'facebook',
          'lexical',
          'README.md',
          'main',
        );
        expect(node.getTextContent()).toBe(url);
      });
    });
  });

  describe('Cloning', () => {
    test('clone creates copy with same properties', () => {
      editor.update(() => {
        const originalNode = $createGitHubCodeNode(
          'https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalNode.ts#L100-L150',
          'facebook',
          'lexical',
          'packages/lexical/src/LexicalNode.ts',
          'main',
          100,
          150,
          'typescript',
        );
        const clonedNode = GitHubCodeNode.clone(originalNode);

        expect(clonedNode.__url).toBe(originalNode.__url);
        expect(clonedNode.__owner).toBe(originalNode.__owner);
        expect(clonedNode.__repo).toBe(originalNode.__repo);
        expect(clonedNode.__path).toBe(originalNode.__path);
        expect(clonedNode.__branch).toBe(originalNode.__branch);
        expect(clonedNode.__startLine).toBe(originalNode.__startLine);
        expect(clonedNode.__endLine).toBe(originalNode.__endLine);
        expect(clonedNode.__language).toBe(originalNode.__language);
      });
    });
  });
});
