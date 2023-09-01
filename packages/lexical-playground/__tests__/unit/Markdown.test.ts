/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {CodeHighlightNode, CodeNode} from '@lexical/code';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString, ElementTransformer,
  LINK,
  TextMatchTransformer,
  TRANSFORMERS,
} from '@lexical/markdown';
import {parseMarkdownString} from '@lexical/markdown/src/MarkdownImport';
import {transformersByType} from '@lexical/markdown/src/utils';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $insertNodes,
  ElementNode,
  LexicalNode
} from 'lexical';
import {exportNodeToJSON} from 'lexical/src/LexicalEditorState';

import {
  $createCollapsibleContainerNode, $isCollapsibleContainerNode,
  CollapsibleContainerNode
} from '../../src/plugins/CollapsiblePlugin/CollapsibleContainerNode';
import {
  $createCollapsibleContentNode, $isCollapsibleContentNode,
  CollapsibleContentNode
} from '../../src/plugins/CollapsiblePlugin/CollapsibleContentNode';
import {
  $createCollapsibleTitleNode, $isCollapsibleTitleNode,
  CollapsibleTitleNode
} from '../../src/plugins/CollapsiblePlugin/CollapsibleTitleNode';

const DETAILS: ElementTransformer = {
  closeRegExp: /^(\#{1,6})$/,
  dependencies: [CollapsibleContainerNode, CollapsibleContentNode, CollapsibleTitleNode],
  export: (node: LexicalNode, exportChildren: (elementNode: ElementNode) => string) => {
    if (!$isCollapsibleContainerNode(node)) {
      return null
    }

    const titleNodes = node.getChildren().filter(n => $isCollapsibleTitleNode(n))

    // #
    const markSymbol = '#'

    if (titleNodes.length !== 1) {
      return markSymbol + `${node.getOpen() ? '>>' : '>'} \n` + markSymbol
    }
    const title = titleNodes[0].getTextContent()

    const contentNodes = node.getChildren().filter(n => $isCollapsibleContentNode(n))
    if (contentNodes.length !== 1) {
      return markSymbol + `${node.getOpen() ? '>>' : '>'} ${title}\n` + markSymbol
    }
    // @ts-ignore
    return markSymbol + `${node.getOpen() ? '>>' : '>'} ${title}\n${exportChildren(contentNodes[0])}\n` + markSymbol
  },
  getChildrenFromLines(lines: string[]) {
    const children = []
    let p = $createParagraphNode()
    children.push(p)
    for (const line of lines) {
      if (line !== '') {
        if (p.getChildrenSize() >= 1) {
          p.append($createLineBreakNode())
        }
        p.append($createTextNode(line))
      } else {
        p = $createParagraphNode()
        children.push(p)
      }
    }
    return children
  },
  getNumberOfLines: (lines: string[], startLineIndex: number) => {
    const REG_EXP = /^(\#{1,6})\s?(\>{0,2})(.*)/
    const questionMatch = lines[startLineIndex].match(REG_EXP)
    if (!questionMatch) {
      return 1
    }
    // 如果当前的level=2即##
    const level = questionMatch[1].length // get current detail level
    let endLineIndex = startLineIndex
    const linesLength = lines.length
    while (++endLineIndex < linesLength) {
      /**
       * #> Details
       * #
       * when is line 2, just like above
       */
      if (lines[endLineIndex] === questionMatch[1]) {
        return endLineIndex - startLineIndex
      }
      /**
       * #> Details1
       * #> Details2
       * when is line 2, just like above
       */
      const closeMatch = lines[endLineIndex].match(REG_EXP)
      if (closeMatch) {
        const level2 = closeMatch[1].length // get current detail level
        // 如果当前的level=1即#，那么是一个新的块
        // 或者如果是level=2即##，那么也是一个新的块
        if (level2 <= level) {
          return endLineIndex - startLineIndex
        }
      }
    }
    return endLineIndex - startLineIndex
  },
  regExp: /^(\#{1,6})\s?(\>{1,2})\s(.*?)$/,
  replace: (parentNode: ElementNode, children: Array<LexicalNode>, match: Array<string>, isImport: boolean) => {
    const [, hash, greaterThan, summary] = match
    const node = $createCollapsibleContainerNode(greaterThan.length === 2)
    const titleNode = $createCollapsibleTitleNode()
    titleNode.append($createTextNode(summary))
    node.append(titleNode)
    const contentNode = $createCollapsibleContentNode()
    contentNode.append(...children)
    node.append(contentNode)
    parentNode.replace(node)
    titleNode.select()
  },
  type: 'element',
}

function createEditor() {
  return createHeadlessEditor({
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      LinkNode,
      CodeNode,
      CodeHighlightNode,
      CollapsibleContainerNode,
      CollapsibleTitleNode,
      CollapsibleContentNode
    ],
  })
}

const HIGHLIGHT_TEXT_MATCH_IMPORT: TextMatchTransformer = {
  ...LINK,
  importRegExp: /\$([^$]+?)\$/,
  replace: (textNode) => {
    textNode.setFormat('highlight');
  },
};


const T = [
  DETAILS,
  ...TRANSFORMERS,
  HIGHLIGHT_TEXT_MATCH_IMPORT,
]

describe('Markdown Collapsed', () => {
  type Input = Array<{
    html: string;
    md: string;
    skipExport?: true;
    skipImport?: true;
    exportMd?: string;
  }>;

  const URL = 'https://lexical.dev';

  const IMPORT_AND_EXPORT: Input = [
    {
      html: '<details open="true"><summary><span>Hello world</span></summary><div data-lexical-collapsible-content="true"><p><span>111</span><br><span>222</span></p><blockquote><span>3333</span></blockquote></div></details>',
      md: '#>> Hello world\n111\n222\n> 3333\n#'
    },
    {
      html: '<details open="true"><summary><span>Hello world</span></summary><div data-lexical-collapsible-content="true"><p><span>111</span><br><span>222</span></p><details open="true"><summary><span>333</span></summary><div data-lexical-collapsible-content="true"></div></details></div></details>',
      md: '#>> Hello world\n111\n222\n##>> 333\n##\n#',
      exportMd: '#>> Hello world\n111\n222\n#>> 333\n\n#\n#',
    },
    {
      html: '<details open="true"><summary><span>Hello world</span></summary><div data-lexical-collapsible-content="true"><h3><span>111</span></h3><details open="true"><summary><span>222</span></summary><div data-lexical-collapsible-content="true"></div></details></div></details>',
      md: '#>> Hello world\n### 111\n##>> 222\n##\n#',
      exportMd: '#>> Hello world\n### 111\n#>> 222\n\n#\n#',
    },
  ];


  for (const {html, md, skipImport} of IMPORT_AND_EXPORT) {
    if (skipImport) {
      continue;
    }

    it(`can import "${md.replace(/\n/g, 'n')}"`, () => {
      const editor = createEditor();

      editor.update(
        () =>
          $convertFromMarkdownString(md, T),
        {
          discrete: true,
        },
      );

      const j = editor.getEditorState().read(() => JSON.stringify(exportNodeToJSON($getRoot(), ['type', 'text', 'children']), null, 2))
      console.log("j", j);

      expect(
        editor.getEditorState().read(() => $generateHtmlFromNodes(editor)),
      ).toBe(html);
    });
  }

  for (const {html, md, exportMd, skipExport} of IMPORT_AND_EXPORT) {
    if (skipExport) {
      continue;
    }

    it(`can export "${md.replace(/\n/g, 'n')}"`, () => {
      const editor = createEditor();

      editor.update(
        () => {
          const parser = new DOMParser();
          const dom = parser.parseFromString(html, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().select();
          $insertNodes(nodes);
        },
        {
          discrete: true,
        },
      );

      expect(
        editor
          .getEditorState()
          .read(() => $convertToMarkdownString(T)),
      ).toBe(exportMd ?? md);
    });
  }

});


describe('parseMarkdownString', () => {
  type TestCase = {
    lines: string[]
    json: string
  }

  const cases: TestCase[] = [
    {
      json: `{
  "children": [
    {
      "children": [
        {
          "text": "111",
          "type": "text"
        },
        {
          "type": "linebreak"
        },
        {
          "text": "222",
          "type": "text"
        }
      ],
      "type": "paragraph"
    },
    {
      "children": [
        {
          "text": "333",
          "type": "text"
        }
      ],
      "type": "quote"
    }
  ],
  "type": "root"
}`,
      lines: ['111', '222', '> 333']
    },
    {
      json: `{
  "children": [
    {
      "children": [
        {
          "children": [
            {
              "text": "Hello world",
              "type": "text"
            }
          ],
          "type": "collapsible-title"
        },
        {
          "children": [
            {
              "children": [
                {
                  "text": "111",
                  "type": "text"
                },
                {
                  "type": "linebreak"
                },
                {
                  "text": "222",
                  "type": "text"
                }
              ],
              "type": "paragraph"
            },
            {
              "children": [
                {
                  "text": "333",
                  "type": "text"
                }
              ],
              "type": "quote"
            }
          ],
          "type": "collapsible-content"
        }
      ],
      "type": "collapsible-container"
    }
  ],
  "type": "root"
}`,
      lines: ['# > Hello world', '111', '222', '> 333', '#']
    }
  ]

  for (const {lines, json} of cases) {
    it(`can import "${lines.join(' ')}"`, () => {
      const editor = createEditor()

      editor.update(
        () => {
          const root = $getRoot()
          const byType = transformersByType(T);
          parseMarkdownString(root, lines, byType)
        },
        {
          discrete: true,
        },
      );

      const j = editor.getEditorState().read(() => JSON.stringify(exportNodeToJSON($getRoot(), ['type', 'text', 'children']), null, 2))
      console.log("j", j);
      expect(j).toBe(json)
    })
  }
})
