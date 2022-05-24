/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createLineBreakNode, $isLineBreakNode} from 'lexical';

import {initializeUnitTest} from '../../../__tests__/utils';

describe('LexicalLineBreakNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('LineBreakNode.constructor', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const lineBreakNode = $createLineBreakNode();

        expect(lineBreakNode.getType()).toEqual('linebreak');
        expect(lineBreakNode.getTextContent()).toEqual('\n');
      });
    });

    test('LineBreakNode.exportJSON() should return and object conforming to the expected schema', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const node = $createLineBreakNode();

        // If you broke this test, you changed the public interface of a
        // serialized Lexical Core Node. Please ensure the correct adapter
        // logic is in place in the corresponding importJSON  method
        // to accomodate these changes.
        expect(node.exportJSON()).toStrictEqual({
          type: 'linebreak',
          version: 1,
        });
      });
    });

    test('LineBreakNode.createDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const lineBreakNode = $createLineBreakNode();
        const element = lineBreakNode.createDOM();

        expect(element.outerHTML).toBe('<br>');
      });
    });

    test('LineBreakNode.updateDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const lineBreakNode = $createLineBreakNode();

        expect(lineBreakNode.updateDOM()).toBe(false);
      });
    });

    test('LineBreakNode.$isLineBreakNode()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const lineBreakNode = $createLineBreakNode();

        expect($isLineBreakNode(lineBreakNode)).toBe(true);
      });
    });
  });
});
