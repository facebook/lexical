/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createLinkNode, LinkNode} from '@lexical/link';
import {$createListItemNode, $createListNode} from '@lexical/list';
// import {$createHorizontalRuleNode} from '@lexical/react';
import {$createTableNodeWithDimensions} from '@lexical/table';
import {$dfs} from '@lexical/utils';
import {
  $createGridSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $setSelection,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

import {
  $cloneSelectedContent,
  $convertSelectedContentToHtml,
  $generateNodes,
  $generateNodesFromDOM,
} from '../../clipboard';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

function setAnchorPoint(point) {
  let selection = $getSelection();
  if (selection === null) {
    const dummyTextNode = $createTextNode();
    dummyTextNode.select();
    selection = $getSelection();
  }
  const anchor = selection.anchor;
  anchor.type = point.type;
  anchor.offset = point.offset;
  anchor.key = point.key;
}

function setFocusPoint(point) {
  let selection = $getSelection();
  if (selection === null) {
    const dummyTextNode = $createTextNode();
    dummyTextNode.select();
    selection = $getSelection();
  }
  const focus = selection.focus;
  focus.type = point.type;
  focus.offset = point.offset;
  focus.key = point.key;
}

function expectMatchingOutput(editor, cloneState, htmlString) {
  const parser = new DOMParser();
  const dom = parser.parseFromString(htmlString, 'text/html');

  const htmlToLexicalTreeRoot = $createParagraphNode();
  htmlToLexicalTreeRoot.append(...$generateNodesFromDOM(dom, editor));

  const lexicalToLexicalTreeRoot = $createParagraphNode();
  lexicalToLexicalTreeRoot.append(...$generateNodes(cloneState));

  const htmlToLexicalTreeNodes = $dfs(htmlToLexicalTreeRoot);
  const lexicalToLexicalNodes = $dfs(lexicalToLexicalTreeRoot);

  expect(htmlToLexicalTreeNodes.length).toBe(lexicalToLexicalNodes.length);

  for (let i = 0; i < htmlToLexicalTreeNodes.length; i++) {
    const htmlToLexicalNode = htmlToLexicalTreeNodes[i];
    const lexicalToLexicalDFSNode = htmlToLexicalTreeNodes[i];

    expect(htmlToLexicalNode.depth).toBe(lexicalToLexicalDFSNode.depth);

    Object.keys(htmlToLexicalNode.node).forEach((property) => {
      if (property !== '__key') {
        expect(htmlToLexicalNode.node[property]).toBe(
          lexicalToLexicalDFSNode.node[property],
        );
      }
    });
  }
}

const fillEditorWithComplexData = () => {
  const root = $getRoot();

  const paragraph = $createParagraphNode();
  const nodesToInsert = [];

  root.append(paragraph);

  setAnchorPoint({
    key: paragraph.getKey(),
    offset: 0,
    type: 'element',
  });
  setFocusPoint({
    key: paragraph.getKey(),
    offset: 0,
    type: 'element',
  });

  const link = $createLinkNode('https://');
  link.append($createTextNode('ello worl'));

  nodesToInsert.push(
    $createTextNode('h').toggleFormat('bold'),
    link,
    $createTextNode('d').toggleFormat('italic'),
  );

  const table = $createTableNodeWithDimensions(3, 3);
  nodesToInsert.push(table);

  const tableCell1TextNode = table.getFirstDescendant();
  tableCell1TextNode.setTextContent('table cell text!');

  const list = $createListNode('ul');

  for (let i = 0; i < 4; i++) {
    const listItemNode = $createListItemNode();
    listItemNode.append(
      $createTextNode(`${i + 1}: Lorem ipsum dolor sit amet`),
    );
    list.append(listItemNode);
  }

  nodesToInsert.push(list);

  const selection = $getSelection();
  selection.insertNodes(nodesToInsert);

  return {list, paragraph, root, table};
};

describe('Clipboard tests', () => {
  initializeUnitTest((testEnv) => {
    test('Clone entire document', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const {root, paragraph, list, table} = fillEditorWithComplexData();
        const firstRootTextChild = root.getFirstDescendant();
        const lastRootTextChild = root.getLastDescendant();

        setAnchorPoint({
          key: firstRootTextChild.getKey(),
          offset: 0,
          type: 'text',
        });

        setFocusPoint({
          key: lastRootTextChild.getKey(),
          offset: lastRootTextChild.getTextContentSize() - 1,
          type: 'text',
        });

        const selection = $getSelection();
        const state = $cloneSelectedContent(editor, selection);
        const rangeSet = new Set(state.range);
        const nodeMap = new Map(state.nodeMap);
        const selectedNodes = selection.getNodes();

        selectedNodes.forEach((n) => {
          expect(nodeMap.has(n.getKey())).toBe(true);
        });

        expect(rangeSet.size).toBe(3);
        expect(rangeSet.has(paragraph.getKey()));
        expect(rangeSet.has(list.getKey()));
        expect(rangeSet.has(table.getKey()));
        expect(nodeMap.size).toBe(selectedNodes.length);

        const htmlString = $convertSelectedContentToHtml(editor, selection);

        expect(htmlString).toBe(
          '<p><strong>h</strong><a href="https://"><span>ello worl</span></a><em>d</em></p><table><colgroup><col><col><col></colgroup><tbody><tr><th style="border: 1px solid black; width: 233.33333333333334px; vertical-align: top; text-align: start; background-color: rgb(242, 243, 245);"><p><span>table cell text!</span></p></th><th style="border: 1px solid black; width: 233.33333333333334px; vertical-align: top; text-align: start; background-color: rgb(242, 243, 245);"><p><br><span></span></p></th><th style="border: 1px solid black; width: 233.33333333333334px; vertical-align: top; text-align: start; background-color: rgb(242, 243, 245);"><p><br><span></span></p></th></tr><tr><th style="border: 1px solid black; width: 233.33333333333334px; vertical-align: top; text-align: start; background-color: rgb(242, 243, 245);"><p><br><span></span></p></th><td style="border: 1px solid black; width: 233.33333333333334px; vertical-align: top; text-align: start;"><p><br><span></span></p></td><td style="border: 1px solid black; width: 233.33333333333334px; vertical-align: top; text-align: start;"><p><br><span></span></p></td></tr><tr><th style="border: 1px solid black; width: 233.33333333333334px; vertical-align: top; text-align: start; background-color: rgb(242, 243, 245);"><p><br><span></span></p></th><td style="border: 1px solid black; width: 233.33333333333334px; vertical-align: top; text-align: start;"><p><br><span></span></p></td><td style="border: 1px solid black; width: 233.33333333333334px; vertical-align: top; text-align: start;"><p><br><span></span></p></td></tr></tbody></table><ul><li value="1"><span>1: Lorem ipsum dolor sit amet</span></li><li value="2"><span>2: Lorem ipsum dolor sit amet</span></li><li value="3"><span>3: Lorem ipsum dolor sit amet</span></li><li value="4"><span>4: Lorem ipsum dolor sit ame</span></li></ul>',
        );
      });
    });

    test('$cloneSelectedContent: partial test selection including link', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const {paragraph} = fillEditorWithComplexData();

        const [textNode1, linkNode] = paragraph.getChildren();

        setAnchorPoint({
          key: textNode1.getKey(),
          offset: 0,
          type: 'text',
        });

        const linkTextNode = linkNode.getFirstChild();
        setFocusPoint({
          key: linkTextNode.getKey(),
          offset: linkTextNode.getTextContentSize() - 2,
          type: 'text',
        });

        const selection = $getSelection();
        const selectedNodes = selection.getNodes();

        expect(selectedNodes.length).toBe(3);
        expect(linkNode).toBeInstanceOf(LinkNode);

        const state = $cloneSelectedContent(editor, selection);
        const rangeSet = new Set(state.range);
        const nodeMap = new Map(state.nodeMap);

        expect(nodeMap.size).toBe(3);
        expect(rangeSet.size).toBe(2);

        selectedNodes.forEach((n) => {
          expect(nodeMap.has(n.getKey())).toBe(true);
        });

        // Check if text is split on the cloned node.
        expect(nodeMap.get(linkTextNode.getKey()).__text).toBe('ello wo');

        const htmlString = $convertSelectedContentToHtml(editor, selection);

        expect(htmlString).toBe(
          '<strong>h</strong><a href="https://"><span>ello wo</span></a>',
        );

        expectMatchingOutput(editor, state, htmlString);
      });
    });

    test('$cloneSelectedContent: partial test selection within list item', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const {list} = fillEditorWithComplexData();

        const [listItem1] = list.getChildren();

        const listItem1TextNode = listItem1.getFirstChild();
        setAnchorPoint({
          key: listItem1TextNode.getKey(),
          offset: 1,
          type: 'text',
        });

        setFocusPoint({
          key: listItem1TextNode.getKey(),
          offset: listItem1TextNode.getTextContentSize() - 5,
          type: 'text',
        });

        const selection = $getSelection();
        const selectedNodes = selection.getNodes();

        expect(selectedNodes.length).toBe(1);

        const state = $cloneSelectedContent(editor, selection);
        const rangeSet = new Set(state.range);
        const nodeMap = new Map(state.nodeMap);

        expect(nodeMap.size).toBe(1);
        expect(rangeSet.size).toBe(1);

        // Check that only the text is selected and not the entire list item.
        expect(nodeMap.has(listItem1.getKey())).toBe(false);
        expect(rangeSet.has(listItem1.getKey())).toBe(false);
        expect(nodeMap.has(listItem1TextNode.getKey())).toBe(true);
        expect(rangeSet.has(listItem1TextNode.getKey())).toBe(true);

        selectedNodes.forEach((n) => {
          expect(nodeMap.has(n.getKey())).toBe(true);
        });

        // Check if text is split on the cloned node.
        expect(nodeMap.get(listItem1TextNode.getKey()).__text).toBe(
          ': Lorem ipsum dolor sit',
        );

        const htmlString = $convertSelectedContentToHtml(editor, selection);

        expect(htmlString).toBe('<span>: Lorem ipsum dolor sit</span>');

        expectMatchingOutput(editor, state, htmlString);
      });
    });

    test('$cloneSelectedContent: two partial list items', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const {list} = fillEditorWithComplexData();

        const [listItem1, listItem2] = list.getChildren();

        const listItem1TextNode = listItem1.getFirstDescendant();
        setAnchorPoint({
          key: listItem1TextNode.getKey(),
          offset: 1,
          type: 'text',
        });

        const listItem2TextNode = listItem2.getFirstDescendant();
        setFocusPoint({
          key: listItem2TextNode.getKey(),
          offset: listItem2TextNode.getTextContentSize() - 5,
          type: 'text',
        });

        const selection = $getSelection();
        const selectedNodes = selection.getNodes();

        expect(selectedNodes.length).toBe(4);

        const state = $cloneSelectedContent(editor, selection);
        const rangeSet = new Set(state.range);
        const nodeMap = new Map(state.nodeMap);

        expect(nodeMap.size).toBe(5);
        expect(rangeSet.size).toBe(1);

        // We want to make sure that the list node is the top level and is included.
        expect(rangeSet.has(list.getKey())).toBe(true);
        expect(nodeMap.has(list.getKey())).toBe(true);

        selectedNodes.forEach((n) => {
          expect(nodeMap.has(n.getKey())).toBe(true);
        });

        // Check if text is split on the cloned node.
        expect(nodeMap.get(listItem1TextNode.getKey()).__text).toBe(
          ': Lorem ipsum dolor sit amet',
        );

        expect(nodeMap.get(listItem2TextNode.getKey()).__text).toBe(
          '2: Lorem ipsum dolor sit',
        );

        const htmlString = $convertSelectedContentToHtml(editor, selection);

        expect(htmlString).toBe(
          '<ul><li value="1"><span>: Lorem ipsum dolor sit amet</span></li><li value="2"><span>2: Lorem ipsum dolor sit</span></li></ul>',
        );

        expectMatchingOutput(editor, state, htmlString);
      });
    });

    test('$cloneSelectedContent: grid selection', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const {table} = fillEditorWithComplexData();

        const [tableRow1, tableRow2] = table.getChildren();

        const tableCell1x1 = tableRow1.getFirstChild();
        const tableCell2x2 = tableRow2.getChildren()[1];

        const selection = $createGridSelection();

        selection.set(
          table.getKey(),
          tableCell1x1.getKey(),
          tableCell2x2.getKey(),
        );

        $setSelection(selection);

        const selectedNodes = selection.getNodes();

        // (Text, Paragraph, Cell) x4, Row x2, 1x Grid
        expect(selectedNodes.length).toBe(15);

        const state = $cloneSelectedContent(editor, selection);
        const rangeSet = new Set(state.range);
        const nodeMap = new Map(state.nodeMap);

        expect(nodeMap.size).toBe(15);
        expect(rangeSet.size).toBe(1);

        // Check that only the text is selected and not the entire list item.
        expect(rangeSet.has(table.getKey())).toBe(true);

        selectedNodes.forEach((n) => {
          expect(nodeMap.has(n.getKey())).toBe(true);
        });

        const htmlString = $convertSelectedContentToHtml(editor, selection);

        expect(htmlString).toBe(
          '<table><colgroup><col><col><col></colgroup><tbody><tr><th style="border: 1px solid black; width: 233.33333333333334px; vertical-align: top; text-align: start; background-color: rgb(242, 243, 245);"><p><span>table cell text!</span></p></th><th style="border: 1px solid black; width: 233.33333333333334px; vertical-align: top; text-align: start; background-color: rgb(242, 243, 245);"><p><br><span></span></p></th></tr><tr><th style="border: 1px solid black; width: 233.33333333333334px; vertical-align: top; text-align: start; background-color: rgb(242, 243, 245);"><p><br><span></span></p></th><td style="border: 1px solid black; width: 233.33333333333334px; vertical-align: top; text-align: start;"><p><br><span></span></p></td></tr></tbody></table>',
        );

        expectMatchingOutput(editor, state, htmlString);
      });
    });
  });
});
