/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createHorizontalRuleNode, $isHorizontalRuleNode} from 'lexical';

import {initializeUnitTest} from '../../../../__tests__/utils';

describe('LexicalHorizontalRuleNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('HorizontalRuleNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const horizontalRuleNode = $createHorizontalRuleNode();
        expect(horizontalRuleNode.getType()).toEqual('horizontalrule');
      });
    });

    test('HorizontalRuleNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const horizontalRuleNode = $createHorizontalRuleNode();
        const element = horizontalRuleNode.createDOM({});
        expect(element.outerHTML).toBe('<hr contenteditable="false">');
      });
    });

    test('HorizontalRuleNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const horizontalRuleNode = $createHorizontalRuleNode();
        expect(horizontalRuleNode.updateDOM()).toBe(false);
      });
    });

    test('HorizontalRuleNode.$isHorizontalRuleNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const horizontalRuleNode = $createHorizontalRuleNode();
        expect($isHorizontalRuleNode(horizontalRuleNode)).toBe(true);
      });
    });
  });
});
