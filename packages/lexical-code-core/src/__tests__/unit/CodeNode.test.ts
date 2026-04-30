/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorConfig} from 'lexical';

import {$getRoot} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {$createCodeNode} from '../../CodeNode';

const editorConfig = {
  namespace: '',
  theme: {
    code: 'editor-code',
  },
} as EditorConfig;

describe('CodeNode', () => {
  initializeUnitTest(
    testEnv => {
      it('applies and replaces styles through DOM style properties', async () => {
        const {editor} = testEnv;

        let dom!: HTMLElement;
        let prevNode!: ReturnType<typeof $createCodeNode>;

        await editor.update(() => {
          const codeNode = $createCodeNode('javascript');
          codeNode.setStyle('color: red; margin: 0 !important;');
          prevNode = codeNode;
          dom = codeNode.createDOM(editorConfig);
        });

        expect(dom!.style.color).toBe('red');
        expect(dom!.style.getPropertyPriority('margin')).toBe('important');

        await editor.update(() => {
          const codeNode = $createCodeNode('javascript');
          codeNode.setStyle('padding: 1px; --custom: value;');

          expect(codeNode.updateDOM(prevNode, dom, editorConfig)).toBe(false);
        });

        expect(dom.style.color).toBe('');
        expect(dom.style.margin).toBe('');
        expect(dom.style.padding).toBe('1px');
        expect(dom.style.getPropertyValue('--custom')).toBe('value');
      });

      it('exports styles through DOM style properties', async () => {
        const {editor} = testEnv;

        let exportedElement: HTMLElement | null = null;

        await editor.update(() => {
          const codeNode = $createCodeNode('javascript');
          codeNode.setStyle('padding: 1px; color: blue;');
          $getRoot().append(codeNode);

          const {element} = codeNode.exportDOM(editor);
          exportedElement = element as HTMLElement;
        });

        expect(exportedElement).not.toBeNull();
        expect(exportedElement!.style.padding).toBe('1px');
        expect(exportedElement!.style.color).toBe('blue');
      });
    },
    {
      namespace: 'test',
      nodes: [],
      theme: editorConfig.theme,
    },
  );
});
