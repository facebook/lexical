/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {TextNode} from 'outline';
import {ParagraphNode} from 'outline/ParagraphNode';
import {getNodeByKey} from '../../core/OutlineProcess';

import {initializeUnitTest} from '../utils';

describe('OutlineNode tests', () => {
  initializeUnitTest((testEnv) => {
    let paragraphNode;
    let textNode;

    beforeEach(async () => {
      const {editor} = testEnv;
      await editor.update((view) => {
        const rootNode = view.getRoot();
        paragraphNode = new ParagraphNode();
        textNode = new TextNode('foo');
        paragraphNode.append(textNode);
        rootNode.append(paragraphNode);
      });
    });

    test('getNodeByKey', async () => {
      const {editor} = testEnv;
      await editor.getViewModel().read(() => {
        expect(getNodeByKey('0')).toBe(paragraphNode);
        expect(getNodeByKey('1')).toBe(textNode);
        expect(getNodeByKey('2')).toBe(null);
      });
      expect(() => getNodeByKey()).toThrow();
    });
  });
});
