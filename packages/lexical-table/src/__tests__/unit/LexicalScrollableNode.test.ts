/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {
  $createTableNode,
  $isScrollableNode,
  $isTableNode,
  ScrollableNode,
} from '@lexical/table';
import {$getRoot, $insertNodes} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

describe('LexicalScrollableNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('LexicalScrollableNode.constructor', async () => {
      const {editor} = testEnv;
      let htmlString;

      // tables should be automatically wrapped in scrollableNodes
      await editor.update(() => {
        const table = $createTableNode();
        const root = $getRoot();
        root.append(table);
      });
      expect(testEnv.innerHTML).toBe(
        '<div class="lexical-scrollable" style="overflow-x: auto;"><table><colgroup></colgroup><br></table></div>',
      );

      // scrollableNode.exportDOM
      const htmlConversion =
        '<div class="lexical-scrollable" style="overflow-x: auto;"><table><colgroup></colgroup><tbody></tbody></table></div>';
      await editor.update(() => {
        htmlString = $generateHtmlFromNodes(editor);
      });
      expect(htmlString).toBe(htmlConversion);

      // scrollableNodes should be automatically removed if they are empty
      await editor.update(() => {
        const root = $getRoot();
        const scrollableNode = root.getFirstChild()! as ScrollableNode;
        expect($isScrollableNode(scrollableNode)).toBe(true);
        const table = scrollableNode.getFirstChild()!;
        expect($isTableNode(table)).toBe(true);
        table.remove();
      });
      expect(testEnv.innerHTML).toBe('<p><br></p>');

      // scrollableNode.importDOM
      await editor.update(() => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(htmlConversion, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        $getRoot().select();
        $insertNodes(nodes);
      });
      expect(testEnv.innerHTML).toBe(
        '<p><br></p><div class="lexical-scrollable" style="overflow-x: auto;"><table><colgroup></colgroup><br></table></div>',
      );
    });
  });
});
