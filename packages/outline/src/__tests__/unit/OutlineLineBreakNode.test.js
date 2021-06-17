/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {IS_IMMUTABLE} from '../../core/OutlineConstants';

import {createLineBreakNode, isLineBreakNode} from 'outline';
import {initializeUnitTest} from '../utils';

describe('OutlineLineBreakNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const lineBreakNode = createLineBreakNode();
        expect(lineBreakNode.getFlags()).toBe(IS_IMMUTABLE);
        expect(lineBreakNode.getType()).toEqual('linebreak');
        expect(lineBreakNode.getTextContent()).toEqual('\n');
      });
    });

    test('clone()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const lineBreakNode = createLineBreakNode();
        const lineBreakNodeClone = lineBreakNode.clone();
        expect(lineBreakNodeClone).not.toBe(lineBreakNode);
        expect(lineBreakNodeClone).toStrictEqual(lineBreakNode);
      });
    });

    test('createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const lineBreakNode = createLineBreakNode();
        const element = lineBreakNode.createDOM({});
        expect(element.outerHTML).toBe('<br>');
      });
    });

    test('updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const lineBreakNode = createLineBreakNode();
        expect(lineBreakNode.updateDOM()).toBe(false);
      });
    });

    test('isLineBreakNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const lineBreakNode = createLineBreakNode();
        expect(isLineBreakNode(lineBreakNode)).toBe(true);
      });
    });
  });
});
