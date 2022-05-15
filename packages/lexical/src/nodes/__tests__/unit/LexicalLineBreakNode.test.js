/**
 * Copyright (c) Meta Platforms, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createLineBreakNode, $isLineBreakNode} from 'lexical';

import {initializeUnitTest} from '../../../__tests__/utils';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

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

    test('LineBreakNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const lineBreakNode = $createLineBreakNode();
        const element = lineBreakNode.createDOM({});
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
