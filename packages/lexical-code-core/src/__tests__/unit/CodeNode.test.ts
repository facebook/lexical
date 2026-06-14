/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorConfig} from 'lexical';

import {$getRoot, NODE_STATE_KEY} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {$createCodeNode, CodeNode} from '../../CodeNode';

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

      it('round-trips wordWrap through JSON without changing the wire format', () => {
        const {editor} = testEnv;

        editor.update(
          () => {
            // Default value: nothing should be emitted (no top-level
            // `wordWrap` key, and no `$` bucket entry — the migration to
            // NodeState must remain invisible to existing serialized data).
            const defaultNode = $createCodeNode('javascript');
            const defaultJSON = defaultNode.exportJSON();
            expect(defaultJSON).not.toHaveProperty('wordWrap');
            if (NODE_STATE_KEY in defaultJSON) {
              expect(defaultJSON[NODE_STATE_KEY]).not.toHaveProperty(
                'wordWrap',
              );
            }
            expect(defaultNode.getWordWrap()).toBe(false);

            // Enabled value: `wordWrap: true` is emitted at the top level
            // (matches the pre-NodeState wire format) and never under `$`.
            const wrappedNode = $createCodeNode('javascript');
            wrappedNode.setWordWrap(true);
            const wrappedJSON = wrappedNode.exportJSON();
            expect(wrappedJSON.wordWrap).toBe(true);
            if (NODE_STATE_KEY in wrappedJSON) {
              expect(wrappedJSON[NODE_STATE_KEY]).not.toHaveProperty(
                'wordWrap',
              );
            }

            // Re-import and confirm the value survives the round-trip.
            const reimported = CodeNode.importJSON(wrappedJSON);
            expect(reimported.getWordWrap()).toBe(true);

            // Toggling back to false strips the top-level key on re-export.
            const toggledOff = reimported.setWordWrap(false);
            const toggledJSON = toggledOff.exportJSON();
            expect(toggledJSON).not.toHaveProperty('wordWrap');
            expect(toggledOff.getWordWrap()).toBe(false);
          },
          {discrete: true},
        );
      });
    },
    {
      namespace: 'test',
      nodes: [],
      theme: editorConfig.theme,
    },
  );
});
