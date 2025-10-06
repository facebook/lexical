/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createCodeNode, CodeNode} from '@lexical/code';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {$createLinkNode, LinkNode} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $getState,
  $insertNodes,
  $isRangeSelection,
  $setState,
} from 'lexical';
import {describe, expect, it} from 'vitest';

import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  LINK,
  registerMarkdownShortcuts,
  TextMatchTransformer,
  Transformer,
} from '../..';
import {
  CODE,
  ElementTransformer,
  HEADING,
  listMarkerState,
  MultilineElementTransformer,
  normalizeMarkdown,
  TRANSFORMERS,
} from '../../MarkdownTransformers';

const HIGHLIGHT_TEXT_MATCH_IMPORT: TextMatchTransformer = {
  ...LINK,
  importRegExp: /\$([^$]+?)\$/,
  replace: (textNode, match) => {
    textNode.toggleFormat('highlight');
  },
};

const SIMPLE_INLINE_JSX_MATCHER: TextMatchTransformer = {
  dependencies: [LinkNode],
  getEndIndex(node, match) {
    // Find the closing tag. Count the number of opening and closing tags to find the correct closing tag.
    // For simplicity, this will only count the opening and closing tags without checking for "MyTag" specifically.
    let openedSubStartMatches = 0;
    const start = (match.index ?? 0) + match[0].length;
    let endIndex = start;
    const line = node.getTextContent();

    for (let i = start; i < line.length; i++) {
      const char = line[i];
      if (char === '<') {
        const nextChar = line[i + 1];
        if (nextChar === '/') {
          if (openedSubStartMatches === 0) {
            endIndex = i + '</MyTag>'.length;
            break;
          }
          openedSubStartMatches--;
        } else {
          openedSubStartMatches++;
        }
      }
    }
    return endIndex;
  },
  importRegExp: /<(MyTag)\s*>/,
  regExp: /__ignore__/,
  replace: (textNode, match) => {
    const linkNode = $createLinkNode('simple-jsx');

    const textStart = match[0].length + (match.index ?? 0);
    const textEnd =
      (match.index ?? 0) + textNode.getTextContent().length - '</MyTag>'.length;
    const text = match.input?.slice(textStart, textEnd);

    const linkTextNode = $createTextNode(text);
    linkTextNode.setFormat(textNode.getFormat());
    linkNode.append(linkTextNode);
    textNode.replace(linkNode);
  },
  type: 'text-match',
};

// Matches html within a mdx file
const MDX_HTML_TRANSFORMER: MultilineElementTransformer = {
  dependencies: [CodeNode],
  export: (node) => {
    if (node.getTextContent().startsWith('From HTML:')) {
      return `<MyComponent>${node
        .getTextContent()
        .replace('From HTML: ', '')}</MyComponent>`;
    }
    return null; // Run next transformer
  },
  regExpEnd: /<\/(\w+)\s*>/,
  regExpStart: /<(\w+)[^>]*>/,
  replace: (rootNode, children, startMatch, endMatch, linesInBetween) => {
    if (!linesInBetween) {
      return false; // Run next transformer. We don't need to support markdown shortcuts for this test
    }
    if (startMatch[1] === 'MyComponent') {
      const codeBlockNode = $createCodeNode(startMatch[1]);
      const textNode = $createTextNode(
        'From HTML: ' + linesInBetween.join('\n'),
      );
      codeBlockNode.append(textNode);
      rootNode.append(codeBlockNode);
      return;
    }
    return false; // Run next transformer
  },
  type: 'multiline-element',
};

const CODE_TAG_COUNTER_EXAMPLE: MultilineElementTransformer = {
  dependencies: CODE.dependencies,
  export: CODE.export,
  handleImportAfterStartMatch({lines, rootNode, startLineIndex, startMatch}) {
    const regexpEndRegex: RegExp | undefined = /[ \t]*```$/;

    const isEndOptional = false;

    let endLineIndex = startLineIndex;
    const linesLength = lines.length;

    let openedSubStartMatches = 0;

    // check every single line for the closing match. It could also be on the same line as the opening match.
    while (endLineIndex < linesLength) {
      const potentialSubStartMatch =
        lines[endLineIndex].match(/^[ \t]*```(\w+)?/);

      const endMatch = regexpEndRegex
        ? lines[endLineIndex].match(regexpEndRegex)
        : null;

      if (potentialSubStartMatch) {
        if (endMatch) {
          if ((potentialSubStartMatch.index ?? 0) < (endMatch.index ?? 0)) {
            openedSubStartMatches++;
          }
        } else {
          openedSubStartMatches++;
        }
      }

      if (endMatch) {
        openedSubStartMatches--;
      }

      if (!endMatch || openedSubStartMatches > 0) {
        if (
          !isEndOptional ||
          (isEndOptional && endLineIndex < linesLength - 1) // Optional end, but didn't reach the end of the document yet => continue searching for potential closing match
        ) {
          endLineIndex++;
          continue; // Search next line for closing match
        }
      }

      // Now, check if the closing match matched is the same as the opening match.
      // If it is, we need to continue searching for the actual closing match.
      if (
        endMatch &&
        startLineIndex === endLineIndex &&
        endMatch.index === startMatch.index
      ) {
        endLineIndex++;
        continue; // Search next line for closing match
      }

      // At this point, we have found the closing match. Next: calculate the lines in between open and closing match
      // This should not include the matches themselves, and be split up by lines
      const linesInBetween: string[] = [];

      if (endMatch && startLineIndex === endLineIndex) {
        linesInBetween.push(
          lines[startLineIndex].slice(
            startMatch[0].length,
            -endMatch[0].length,
          ),
        );
      } else {
        for (let i = startLineIndex; i <= endLineIndex; i++) {
          if (i === startLineIndex) {
            const text = lines[i].slice(startMatch[0].length);
            linesInBetween.push(text); // Also include empty text
          } else if (i === endLineIndex && endMatch) {
            const text = lines[i].slice(0, -endMatch[0].length);
            linesInBetween.push(text); // Also include empty text
          } else {
            linesInBetween.push(lines[i]);
          }
        }
      }

      if (
        CODE.replace(
          rootNode,
          null,
          startMatch,
          endMatch,
          linesInBetween,
          true,
        ) !== false
      ) {
        // Return here. This $importMultiline function is run line by line and should only process a single multiline element at a time.
        return [true, endLineIndex];
      }

      // The replace function returned false, despite finding the matching open and close tags => this transformer does not want to handle it.
      // Thus, we continue letting the remaining transformers handle the passed lines of text from the beginning
      break;
    }

    // No multiline transformer handled this line successfully
    return [false, startLineIndex];
  },
  regExpStart: CODE.regExpStart,
  replace: CODE.replace,
  type: 'multiline-element',
};

export const CANCELED_HEADING_REPLACE_EXAMPLE: ElementTransformer = {
  dependencies: [HeadingNode],
  export: () => {
    return null;
  },
  regExp: /^(#{1,6})\s/,
  replace: () => {
    return false;
  },
  type: 'element',
};

describe('Markdown', () => {
  type Input = Array<{
    html: string;
    md: string;
    skipExport?: true;
    skipImport?: true;
    shouldPreserveNewLines?: true;
    shouldMergeAdjacentLines?: true | false;
    customTransformers?: Transformer[];
    mdAfterExport?: string;
  }>;

  const URL = 'https://lexical.dev';

  const IMPORT_AND_EXPORT: Input = [
    {
      html: '<h1><span style="white-space: pre-wrap;">Hello world</span></h1>',
      md: '# Hello world',
    },
    {
      html: '<h2><span style="white-space: pre-wrap;">Hello world</span></h2>',
      md: '## Hello world',
    },
    {
      html: '<h3><span style="white-space: pre-wrap;">Hello world</span></h3>',
      md: '### Hello world',
    },
    {
      html: '<h4><span style="white-space: pre-wrap;">Hello world</span></h4>',
      md: '#### Hello world',
    },
    {
      html: '<h5><span style="white-space: pre-wrap;">Hello world</span></h5>',
      md: '##### Hello world',
    },
    {
      html: '<h6><span style="white-space: pre-wrap;">Hello world</span></h6>',
      md: '###### Hello world',
    },
    {
      // Multiline paragraphs: https://spec.commonmark.org/dingus/?text=Hello%0Aworld%0A!
      html: '<p><span style="white-space: pre-wrap;">Helloworld!</span></p>',
      md: ['Hello', 'world', '!'].join('\n'),
      shouldMergeAdjacentLines: true,
      skipExport: true,
    },
    {
      // Multiline paragraphs
      // TO-DO: It would be nice to support also hard line breaks (<br>) as \ or double spaces
      // See https://spec.commonmark.org/0.31.2/#hard-line-breaks.
      // Example: '<p><span style="white-space: pre-wrap;">Hello\\\nworld\\\n!</span></p>',
      html: '<p><span style="white-space: pre-wrap;">Hello<br>world<br>!</span></p>',
      md: ['Hello', 'world', '!'].join('\n'),
      skipImport: true,
    },
    {
      html: '<blockquote><span style="white-space: pre-wrap;">Hello</span><br><span style="white-space: pre-wrap;">world!</span></blockquote>',
      md: '> Hello\n> world!',
    },
    // TO-DO: <br> should be preserved
    // {
    //   html: '<ul><li value="1"><span style="white-space: pre-wrap;">Hello</span></li><li value="2"><span style="white-space: pre-wrap;">world<br>!<br>!</span></li></ul>',
    //   md: '- Hello\n- world<br>!<br>!',
    //   skipImport: true,
    // },
    {
      // Multiline list items: https://spec.commonmark.org/dingus/?text=-%20Hello%0A-%20world%0A!%0A!
      html: '<ul><li value="1"><span style="white-space: pre-wrap;">Hello</span></li><li value="2"><span style="white-space: pre-wrap;">world!!</span></li></ul>',
      md: '- Hello\n- world\n!\n!',
      shouldMergeAdjacentLines: true,
      skipExport: true,
    },
    {
      html: '<ul><li value="1"><span style="white-space: pre-wrap;">Hello</span></li><li value="2"><span style="white-space: pre-wrap;">world</span></li></ul>',
      md: '- Hello\n- world',
    },
    {
      html: '<ul><li value="1"><span style="white-space: pre-wrap;">Level 1</span></li><li value="2"><ul><li value="1"><span style="white-space: pre-wrap;">Level 2</span></li><li value="2"><ul><li value="1"><span style="white-space: pre-wrap;">Level 3</span></li></ul></li></ul></li></ul><p><span style="white-space: pre-wrap;">Hello world</span></p>',
      md: '- Level 1\n    - Level 2\n        - Level 3\n\nHello world',
    },
    // List indentation with tabs, Import only: export will use "    " only for one level of indentation
    {
      html: '<ul><li value="1"><span style="white-space: pre-wrap;">Level 1</span></li><li value="2"><ul><li value="1"><span style="white-space: pre-wrap;">Level 2</span></li><li value="2"><ul><li value="1"><span style="white-space: pre-wrap;">Level 3</span></li></ul></li></ul></li></ul><p><span style="white-space: pre-wrap;">Hello world</span></p>',
      md: '- Level 1\n\t- Level 2\n  \t  - Level 3\n\nHello world',
      skipExport: true,
    },
    {
      // Import only: export will use "-" instead of "*"
      html: '<ul><li value="1"><span style="white-space: pre-wrap;">Level 1</span></li><li value="2"><ul><li value="1"><span style="white-space: pre-wrap;">Level 2</span></li><li value="2"><ul><li value="1"><span style="white-space: pre-wrap;">Level 3</span></li></ul></li></ul></li></ul><p><span style="white-space: pre-wrap;">Hello world</span></p>',
      md: '* Level 1\n    * Level 2\n        * Level 3\n\nHello world',
      skipExport: true,
    },
    {
      html: '<ol><li value="1"><span style="white-space: pre-wrap;">Hello</span></li><li value="2"><span style="white-space: pre-wrap;">world</span></li></ol>',
      md: '1. Hello\n2. world',
    },
    {
      html: '<ol start="25"><li value="25"><span style="white-space: pre-wrap;">Hello</span></li><li value="26"><span style="white-space: pre-wrap;">world</span></li></ol>',
      md: '25. Hello\n26. world',
    },
    {
      html: '<p><i><em style="white-space: pre-wrap;">Hello</em></i><span style="white-space: pre-wrap;"> world</span></p>',
      md: '*Hello* world',
    },
    {
      html: '<p><b><strong style="white-space: pre-wrap;">Hello</strong></b><span style="white-space: pre-wrap;"> world</span></p>',
      md: '**Hello** world',
    },
    {
      html: '<p><i><b><strong style="white-space: pre-wrap;">Hello</strong></b></i><span style="white-space: pre-wrap;"> world</span></p>',
      md: '***Hello*** world',
    },
    {
      html: '<p><code spellcheck="false" style="white-space: pre-wrap;"><span>Hello</span></code><span style="white-space: pre-wrap;"> world</span></p>',
      md: '`Hello` world',
    },
    {
      html: '<p><s><span style="white-space: pre-wrap;">Hello</span></s><span style="white-space: pre-wrap;"> world</span></p>',
      md: '~~Hello~~ world',
    },
    {
      html: '<p><code spellcheck="false" style="white-space: pre-wrap;"><span>hello$</span></code></p>',
      md: '`hello$`',
    },
    {
      html: '<p><code spellcheck="false" style="white-space: pre-wrap;"><span>$$hello</span></code></p>',
      md: '`$$hello`',
    },
    {
      html: '<p><a href="https://lexical.dev"><span style="white-space: pre-wrap;">Hello</span></a><span style="white-space: pre-wrap;"> world</span></p>',
      md: '[Hello](https://lexical.dev) world',
    },
    {
      html: '<p><a href="https://lexical.dev" title="Hello world"><span style="white-space: pre-wrap;">Hello</span></a><span style="white-space: pre-wrap;"> world</span></p>',
      md: '[Hello](https://lexical.dev "Hello world") world',
    },
    {
      html: '<p><a href="https://lexical.dev" title="Title with \\&quot; escaped character"><span style="white-space: pre-wrap;">Hello</span></a><span style="white-space: pre-wrap;"> world</span></p>',
      md: '[Hello](https://lexical.dev "Title with \\" escaped character") world',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">Hello </span><s><i><b><strong style="white-space: pre-wrap;">world</strong></b></i></s><span style="white-space: pre-wrap;">!</span></p>',
      md: 'Hello ***~~world~~***!',
    },
    {
      html: '<p><b><strong style="white-space: pre-wrap;">Hello </strong></b><s><b><strong style="white-space: pre-wrap;">world</strong></b></s><span style="white-space: pre-wrap;">!</span></p>',
      md: '**Hello ~~world~~**!',
      mdAfterExport: '**Hello&#32;~~world~~**!',
    },
    {
      html: '<p><s><b><strong style="white-space: pre-wrap;">Hello </strong></b></s><s><i><b><strong style="white-space: pre-wrap;">world</strong></b></i></s><s><span style="white-space: pre-wrap;">!</span></s></p>',
      md: '**~~Hello *world*~~**~~!~~',
      mdAfterExport: '**~~Hello&#32;*world*~~**~~!~~',
    },
    {
      html: '<p><i><em style="white-space: pre-wrap;">Hello </em></i><i><b><strong style="white-space: pre-wrap;">world</strong></b></i><i><em style="white-space: pre-wrap;">!</em></i></p>',
      md: '*Hello **world**!*',
      mdAfterExport: '*Hello&#32;**world**!*',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">helloworld</span></p>',
      md: 'hello\nworld',
      shouldMergeAdjacentLines: true,
      skipExport: true,
    },
    {
      html: '<p><span style="white-space: pre-wrap;">hello</span><br><span style="white-space: pre-wrap;">world</span></p>',
      md: 'hello\nworld',
      shouldMergeAdjacentLines: false,
    },
    {
      html: '<p><span style="white-space: pre-wrap;">hello</span></p><p><span style="white-space: pre-wrap;">world</span></p>',
      md: 'hello\nworld',
      shouldPreserveNewLines: true,
    },
    {
      html: '<h1><span style="white-space: pre-wrap;">Hello</span></h1><p><br></p><p><br></p><p><br></p><p><b><strong style="white-space: pre-wrap;">world</strong></b><span style="white-space: pre-wrap;">!</span></p>',
      md: '# Hello\n\n\n\n**world**!',
      shouldPreserveNewLines: true,
    },
    {
      html: '<h1><span style="white-space: pre-wrap;">Hello</span></h1><p><span style="white-space: pre-wrap;">hi</span></p><p><br></p><p><b><strong style="white-space: pre-wrap;">world</strong></b></p><p><br></p><p><span style="white-space: pre-wrap;">hi</span></p><blockquote><span style="white-space: pre-wrap;">hello</span><br><span style="white-space: pre-wrap;">hello</span></blockquote><p><br></p><h1><span style="white-space: pre-wrap;">hi</span></h1><p><br></p><p><span style="white-space: pre-wrap;">hi</span></p>',
      md: '# Hello\nhi\n\n**world**\n\nhi\n> hello\n> hello\n\n# hi\n\nhi',
      shouldPreserveNewLines: true,
    },
    {
      // Import only: export will use * instead of _ due to registered transformers order
      html: '<p><i><em style="white-space: pre-wrap;">Hello</em></i><span style="white-space: pre-wrap;"> world</span></p>',
      md: '_Hello_ world',
      skipExport: true,
    },
    {
      // Import only: export will use * instead of _ due to registered transformers order
      html: '<p><b><strong style="white-space: pre-wrap;">Hello</strong></b><span style="white-space: pre-wrap;"> world</span></p>',
      md: '__Hello__ world',
      skipExport: true,
    },
    {
      // Import only: export will use * instead of _ due to registered transformers order
      html: '<p><i><b><strong style="white-space: pre-wrap;">Hello</strong></b></i><span style="white-space: pre-wrap;"> world</span></p>',
      md: '___Hello___ world',
      skipExport: true,
    },
    {
      // Import only: export will use * instead of _ due to registered transformers order
      html: '<p><span style="white-space: pre-wrap;">Hello </span><s><i><b><strong style="white-space: pre-wrap;">world</strong></b></i></s><span style="white-space: pre-wrap;">!</span></p>',
      md: 'Hello ~~__*world*__~~!',
      skipExport: true,
    },
    {
      html: '<pre spellcheck="false"><span style="white-space: pre-wrap;">Single line Code</span></pre>',
      md: '```Single line Code```', // Ensure that "Single" is not read as the language by the code transformer. It should only be read as the language if there is a multi-line code block
      skipExport: true, // Export will fail, as the code transformer will add new lines to the code block to make it multi-line. This is expected though, as the lexical code block is a block node and cannot be inline.
    },
    {
      html: '<pre spellcheck="false" data-language="javascript"><span style="white-space: pre-wrap;">Incomplete tag</span></pre>',
      md: '```javascript Incomplete tag',
      skipExport: true,
    },
    {
      html:
        '<pre spellcheck="false" data-language="javascript"><span style="white-space: pre-wrap;">Incomplete multiline\n' +
        '\n' +
        'Tag</span></pre>',
      md: '```javascript Incomplete multiline\n\nTag',
      skipExport: true,
    },
    {
      html: '<pre spellcheck="false"><span style="white-space: pre-wrap;">Code</span></pre>',
      md: '```\nCode\n```',
    },
    {
      html: '<pre spellcheck="false" data-language="javascript"><span style="white-space: pre-wrap;">Code</span></pre>',
      md: '```javascript\nCode\n```',
    },
    {
      // Should always preserve language in md but keep data-highlight-language only for supported languages
      html: '<pre spellcheck="false" data-language="unknown"><span style="white-space: pre-wrap;">Code</span></pre>',
      md: '```unknown\nCode\n```',
    },
    {
      // Import only: prefix tabs will be removed for export
      html: '<pre spellcheck="false"><span style="white-space: pre-wrap;">Code</span></pre>',
      md: '\t```\nCode\n```',
      skipExport: true,
    },
    {
      // Import only: prefix spaces will be removed for export
      html: '<pre spellcheck="false"><span style="white-space: pre-wrap;">Code</span></pre>',
      md: '   ```\nCode\n```',
      skipExport: true,
    },
    {
      html: `<h3><span style="white-space: pre-wrap;">Code blocks</span></h3><pre spellcheck="false" data-language="javascript"><span style="white-space: pre-wrap;">1 + 1 = 2;</span></pre>`,
      md: `### Code blocks

\`\`\`javascript
1 + 1 = 2;
\`\`\``,
    },
    {
      // Import only: extra empty lines will be removed for export
      html: '<p><span style="white-space: pre-wrap;">Hello</span></p><p><span style="white-space: pre-wrap;">world</span></p>',
      md: ['Hello', '', '', '', 'world'].join('\n'),
      skipExport: true,
    },
    {
      // https://spec.commonmark.org/dingus/?text=%3E%20Hello%0Aworld%0A!
      html: '<blockquote><span style="white-space: pre-wrap;">Helloworld!</span></blockquote>',
      md: '> Hello\nworld\n!',
      shouldMergeAdjacentLines: true,
      skipExport: true,
    },
    {
      // Import only: ensures that left side of splitText is processed for text match transformers
      html: '<p><span style="white-space: pre-wrap;">Hello </span><a href="https://lexical.dev"><span style="white-space: pre-wrap;">world</span></a><span style="white-space: pre-wrap;">! Hello </span><mark style="white-space: pre-wrap;"><span>$world$</span></mark><span style="white-space: pre-wrap;">! </span><a href="https://lexical.dev"><span style="white-space: pre-wrap;">Hello</span></a><span style="white-space: pre-wrap;"> world! Hello </span><mark style="white-space: pre-wrap;"><span>$world$</span></mark><span style="white-space: pre-wrap;">!</span></p>',
      md: `Hello [world](${URL})! Hello $world$! [Hello](${URL}) world! Hello $world$!`,
      skipExport: true,
    },
    {
      // Export only: import will use $...$ to transform <span /> to <mark /> due to HIGHLIGHT_TEXT_MATCH_IMPORT
      html: "<p><span style='white-space: pre-wrap;'>$$H$&e$`l$'l$o$</span></p>",
      md: "$$H$&e$\\`l$'l$o$",
      skipImport: true,
    },
    {
      customTransformers: [MDX_HTML_TRANSFORMER],
      html: '<p><span style="white-space: pre-wrap;">Some HTML in mdx:</span></p><pre spellcheck="false" data-language="MyComponent"><span style="white-space: pre-wrap;">From HTML: Some Text</span></pre>',
      md: 'Some HTML in mdx:\n\n<MyComponent>Some Text</MyComponent>',
      shouldMergeAdjacentLines: true,
    },
    {
      customTransformers: [MDX_HTML_TRANSFORMER],
      html: '<p><span style="white-space: pre-wrap;">Some HTML in mdx:</span></p><pre spellcheck="false" data-language="MyComponent"><span style="white-space: pre-wrap;">From HTML: Line 1Some Text</span></pre>',
      md: 'Some HTML in mdx:\n\n<MyComponent>Line 1\nSome Text</MyComponent>',
      shouldMergeAdjacentLines: true,
      skipExport: true,
    },
    {
      customTransformers: [CODE_TAG_COUNTER_EXAMPLE],
      // Ensure special ``` code block supports nested code blocks
      html: '<pre spellcheck="false" data-language="ts"><span style="white-space: pre-wrap;">Code\n```ts\nSub Code\n```</span></pre>',
      md: '```ts\nCode\n```ts\nSub Code\n```\n```',
      skipExport: true,
    },
    {
      customTransformers: [SIMPLE_INLINE_JSX_MATCHER],
      html: '<p><span style="white-space: pre-wrap;">Hello </span><a href="https://simple-jsx"><span style="white-space: pre-wrap;">One &lt;MyTag&gt;Two&lt;/MyTag&gt;</span></a><span style="white-space: pre-wrap;"> there</span></p>',
      md: 'Hello <MyTag>One <MyTag>Two</MyTag></MyTag> there',
      skipExport: true,
    },
    {
      html: '<p><a href="https://lexical.dev"><span style="white-space: pre-wrap;">text</span></a></p>',
      md: '[text](https://lexical.dev)',
    },
    {
      html: '<p><code spellcheck="false" style="white-space: pre-wrap;"><span>text</span></code></p>',
      md: '`text`',
    },
    {
      html: '<p><a href="https://lexical.dev"><code spellcheck="false" style="white-space: pre-wrap;"><span>text</span></code></a></p>',
      md: '[`text`](https://lexical.dev)',
    },
    {
      html: '<p><b><strong style="white-space: pre-wrap;">Bold</strong></b><span style="white-space: pre-wrap;"> </span><a href="https://lexical.dev"><code spellcheck="false" style="white-space: pre-wrap;"><span>text</span></code></a><span style="white-space: pre-wrap;"> </span><b><strong style="white-space: pre-wrap;">Bold 2</strong></b></p>',
      md: '**Bold** [`text`](https://lexical.dev) **Bold 2**',
    },
    {
      html: '<p><b><strong style="white-space: pre-wrap;">Bold</strong></b><span style="white-space: pre-wrap;"> </span><a href="https://lexical.dev"><code spellcheck="false" style="white-space: pre-wrap;"><span>text</span></code><span style="white-space: pre-wrap;"> </span><b><strong style="white-space: pre-wrap;">Bold 2</strong></b></a><span style="white-space: pre-wrap;"> </span><b><strong style="white-space: pre-wrap;">Bold 3</strong></b></p>',
      md: '**Bold** [`text` **Bold 2**](https://lexical.dev) **Bold 3**',
    },
    {
      html: '<p><b><strong style="white-space: pre-wrap;">Bold</strong></b><span style="white-space: pre-wrap;"> </span><a href="https://lexical.dev"><code spellcheck="false" style="white-space: pre-wrap;"><span>text **Bold in code**</span></code></a><span style="white-space: pre-wrap;"> </span><b><strong style="white-space: pre-wrap;">Bold 3</strong></b></p>',
      md: '**Bold** [`text **Bold in code**`](https://lexical.dev) **Bold 3**',
    },
    {
      html: '<p><b><strong style="white-space: pre-wrap;">Bold</strong></b><span style="white-space: pre-wrap;"> </span><code spellcheck="false" style="white-space: pre-wrap;"><span>[text](https://lexical.dev)</span></code><span style="white-space: pre-wrap;"> </span><b><strong style="white-space: pre-wrap;">Bold 3</strong></b></p>',
      md: '**Bold** `[text](https://lexical.dev)` **Bold 3**',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">Text </span><b><strong style="white-space: pre-wrap;">boldstart </strong></b><a href="https://lexical.dev"><b><strong style="white-space: pre-wrap;">text</strong></b></a><b><strong style="white-space: pre-wrap;"> boldend</strong></b><span style="white-space: pre-wrap;"> text</span></p>',
      md: 'Text **boldstart [text](https://lexical.dev) boldend** text',
      mdAfterExport:
        'Text **boldstart&#32;[text](https://lexical.dev)&#32;boldend** text',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">Text </span><b><strong style="white-space: pre-wrap;">boldstart </strong></b><a href="https://lexical.dev"><b><code spellcheck="false" style="white-space: pre-wrap;"><strong>text</strong></code></b></a><b><strong style="white-space: pre-wrap;"> boldend</strong></b><span style="white-space: pre-wrap;"> text</span></p>',
      md: 'Text **boldstart [`text`](https://lexical.dev) boldend** text',
      mdAfterExport:
        'Text **boldstart&#32;[`text`](https://lexical.dev)&#32;boldend** text',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">It </span><s><i><b><strong style="white-space: pre-wrap;">works </strong></b></i></s><a href="https://lexical.io"><s><i><b><strong style="white-space: pre-wrap;">with links</strong></b></i></s></a><span style="white-space: pre-wrap;"> too</span></p>',
      md: 'It ~~___works [with links](https://lexical.io)___~~ too',
      mdAfterExport:
        'It ***~~works&#32;[with links](https://lexical.io)~~*** too',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">It </span><s><i><b><strong style="white-space: pre-wrap;">works </strong></b></i></s><a href="https://lexical.io"><s><i><b><strong style="white-space: pre-wrap;">with links</strong></b></i></s></a><s><i><b><strong style="white-space: pre-wrap;"> too</strong></b></i></s><span style="white-space: pre-wrap;">!</span></p>',
      md: 'It ~~___works [with links](https://lexical.io) too___~~!',
      mdAfterExport:
        'It ***~~works&#32;[with links](https://lexical.io)&#32;too~~***!',
    },
    {
      html: '<p><a href="https://lexical.dev"><span style="white-space: pre-wrap;">link</span></a><a href="https://lexical.dev"><span style="white-space: pre-wrap;">link2</span></a></p>',
      md: '[link](https://lexical.dev)[link2](https://lexical.dev)',
    },
    {
      // Import only: <mark>...</mark> is exported as ==...== in markdown.
      // Use HIGHLIGHT_TEXT_MATCH_IMPORT as custom transformer even though it is included later to ensure it runs before LINK.
      customTransformers: [HIGHLIGHT_TEXT_MATCH_IMPORT],
      html: '<p><span style="white-space: pre-wrap;">Multiple </span><a href="https://lexical.dev"><code spellcheck="false" style="white-space: pre-wrap;"><span>TextMatchTransformer</span></code><span style="white-space: pre-wrap;">s</span></a><s><mark style="white-space: pre-wrap;"><span>$ with formatting$</span></mark></s></p>',
      md: 'Multiple [`TextMatchTransformer`s](https://lexical.dev)~~$ with formatting$~~',
      skipExport: true,
    },
    {
      html: '<p><b><code spellcheck="false" style="white-space: pre-wrap;"><strong>Bold Code</strong></code></b></p>',
      md: '**`Bold Code`**',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">This is a backslash: \\</span></p>',
      md: 'This is a backslash: \\\\',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">This is an asterisk: *</span></p>',
      md: 'This is an asterisk: \\*',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">Backtick and asterisk: `**`</span></p>',
      md: 'Backtick and asterisk: \\`\\*\\*\\`',
    },
    {
      html: '<p><b><strong style="white-space: pre-wrap;">Backtick and asterisk: `**`</strong></b></p>',
      md: '**Backtick and asterisk: \\`\\*\\*\\`**',
    },
    {
      html: '<p><b><strong style="white-space: pre-wrap;">*test*</strong></b></p>',
      md: '**\\*test\\***',
    },
    {
      html: '<p><b><strong style="white-space: pre-wrap;">some bold text with an escaped star: *</strong></b><span style="white-space: pre-wrap;"> normal text</span></p>',
      md: '**some bold text with an escaped star: \\*** normal text',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">*This text should </span><b><strong style="white-space: pre-wrap;">not</strong></b><span style="white-space: pre-wrap;"> be italic*</span></p>',
      md: '\\*This text should **not** be italic*',
      mdAfterExport: '\\*This text should **not** be italic\\*',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">*some text*</span></p>',
      md: '\\*some text*',
      mdAfterExport: '\\*some text\\*',
    },
    {
      html: '<p><a href="https://lexical.dev"><span style="white-space: pre-wrap;">text </span><b><strong style="white-space: pre-wrap;">bold</strong></b><span style="white-space: pre-wrap;"> *normal*</span></a></p>',
      md: '[text **bold** \\*normal\\*](https://lexical.dev)',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">*Hello* world</span></p>',
      md: '\\*Hello\\* world',
    },
    {
      html: '<p><b><strong style="white-space: pre-wrap;">&nbsp;</strong></b></p>',
      md: '**&#160;**',
    },
    {
      html: '<p><a href="https://lexical.dev"><span style="white-space: pre-wrap;">[h]ello</span></a><a href="https://lexical.dev"><span style="white-space: pre-wrap;">h[e]llo</span></a></p>',
      md: '[[h]ello](https://lexical.dev)[h[e]llo](https://lexical.dev)',
    },
    {
      html: '<p><a href="https://lexical.dev"><span style="white-space: pre-wrap;">h[e[ll]]o</span></a><a href="https://lexical.dev"><span style="white-space: pre-wrap;">world</span></a></p>',
      md: '[h[e[ll]]o](https://lexical.dev)[world](https://lexical.dev)',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">[hello]](https://lexical.dev)</span><a href="https://lexical.dev"><span style="white-space: pre-wrap;">world</span></a></p>',
      md: '[hello]](https://lexical.dev)[world](https://lexical.dev)',
    },
    {
      html: '<p><span style="white-space: pre-wrap;">[h</span><a href="https://lexical.dev"><span style="white-space: pre-wrap;">ello</span></a><a href="https://lexical.dev"><span style="white-space: pre-wrap;">world</span></a></p>',
      md: '[h[ello](https://lexical.dev)[world](https://lexical.dev)',
    },
  ];

  for (const {
    html,
    md,
    skipImport,
    shouldPreserveNewLines,
    shouldMergeAdjacentLines,
    customTransformers,
  } of IMPORT_AND_EXPORT) {
    if (skipImport) {
      continue;
    }

    it(`can import "${md.replace(/\n/g, '\\n')}"`, () => {
      const editor = createHeadlessEditor({
        nodes: [
          HeadingNode,
          ListNode,
          ListItemNode,
          QuoteNode,
          CodeNode,
          LinkNode,
        ],
      });

      editor.update(
        () =>
          $convertFromMarkdownString(
            md,
            [
              ...(customTransformers || []),
              ...TRANSFORMERS,
              HIGHLIGHT_TEXT_MATCH_IMPORT,
            ],
            undefined,
            shouldPreserveNewLines,
            shouldMergeAdjacentLines,
          ),
        {
          discrete: true,
        },
      );

      expect(
        editor.getEditorState().read(() => $generateHtmlFromNodes(editor)),
      ).toBe(html);
    });
  }

  for (const {
    html,
    md,
    skipExport,
    shouldPreserveNewLines,
    customTransformers,
    mdAfterExport,
  } of IMPORT_AND_EXPORT) {
    if (skipExport) {
      continue;
    }

    it(`can export "${md.replace(/\n/g, '\\n')}"`, () => {
      const editor = createHeadlessEditor({
        nodes: [
          HeadingNode,
          ListNode,
          ListItemNode,
          QuoteNode,
          CodeNode,
          LinkNode,
        ],
      });

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
          .read(() =>
            $convertToMarkdownString(
              [...(customTransformers || []), ...TRANSFORMERS],
              undefined,
              shouldPreserveNewLines,
            ),
          ),
      ).toBe(mdAfterExport ?? md);
    });
  }

  for (const {
    md,
    skipImport,
    shouldPreserveNewLines,
    shouldMergeAdjacentLines,
    customTransformers,
  } of IMPORT_AND_EXPORT) {
    if (skipImport) {
      continue;
    }

    it(`should not select when importing "${md.replace(/\n/g, '\\n')}"`, () => {
      const editor = createHeadlessEditor({
        nodes: [
          HeadingNode,
          ListNode,
          ListItemNode,
          QuoteNode,
          CodeNode,
          LinkNode,
        ],
      });

      editor.update(
        () =>
          $convertFromMarkdownString(
            md,
            [
              ...(customTransformers || []),
              ...TRANSFORMERS,
              HIGHLIGHT_TEXT_MATCH_IMPORT,
            ],
            undefined,
            shouldPreserveNewLines,
            shouldMergeAdjacentLines,
          ),
        {
          discrete: true,
        },
      );

      expect(editor.getEditorState().read(() => $getSelection())).toBe(null);
    });
  }

  it('should not remove leading node and transform if replace returns false', () => {
    const editor = createHeadlessEditor({
      nodes: [
        HeadingNode,
        ListNode,
        ListItemNode,
        QuoteNode,
        CodeNode,
        LinkNode,
      ],
    });

    registerMarkdownShortcuts(editor, [CANCELED_HEADING_REPLACE_EXAMPLE]);

    editor.update(
      () => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        paragraph.selectEnd();
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText('#');
        }
      },
      {
        discrete: true,
      },
    );

    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(' ');
        }
      },
      {
        discrete: true,
      },
    );

    expect(editor.read(() => $generateHtmlFromNodes(editor))).toBe(
      '<p><span style="white-space: pre-wrap;"># </span></p>',
    );
  });

  it('should remove leading node and execute transform if replace does not return false', () => {
    const editor = createHeadlessEditor({
      nodes: [
        HeadingNode,
        ListNode,
        ListItemNode,
        QuoteNode,
        CodeNode,
        LinkNode,
      ],
    });

    registerMarkdownShortcuts(editor, [HEADING]);

    editor.update(
      () => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        paragraph.selectEnd();
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText('#');
        }
      },
      {
        discrete: true,
      },
    );

    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(' ');
        }
      },
      {
        discrete: true,
      },
    );

    expect(editor.read(() => $generateHtmlFromNodes(editor))).toBe(
      '<h1><br></h1>',
    );
  });

  describe('list marker', () => {
    it('should remember marker used on import', () => {
      const editor = createHeadlessEditor({
        nodes: [ListNode, ListItemNode],
      });
      editor.update(
        () =>
          $convertFromMarkdownString(
            '+ hello',
            [...TRANSFORMERS],
            undefined,
            true,
            false,
          ),
        {discrete: true},
      );
      editor.getEditorState().read(() => {
        const node = $getRoot().getFirstChild();
        expect(node).toBeInstanceOf(ListNode);
        const marker = node ? $getState(node, listMarkerState) : undefined;
        expect(marker).toBe('+');
      });
    });

    it('should remember marker used on export', () => {
      const editor = createHeadlessEditor({
        nodes: [ListNode, ListItemNode],
      });
      editor.update(
        () => {
          const listNode = $createListNode();
          $setState(listNode, listMarkerState, '+');
          const listItemNode = $createListItemNode();
          listItemNode.append($createTextNode('hello'));
          listNode.append(listItemNode);
          listNode.setListType('bullet');
          $getRoot().select();
          $insertNodes([listNode]);
        },
        {discrete: true},
      );
      editor.getEditorState().read(() => {
        const markdownString = $convertToMarkdownString(
          [...TRANSFORMERS],
          undefined,
          true,
        );
        expect(markdownString).toBe('+ hello');
      });
    });
  });
});

describe('normalizeMarkdown - shouldMergeAdjacentLines = true', () => {
  it('should combine lines separated by a single \n unless they are in a codeblock', () => {
    const markdown = `
A1
A2

A3

\`\`\`md
B1
B2

B3
\`\`\`

C1
C2

C3

\`\`\`js
D1
D2

D3
\`\`\`

\`\`\`single line code\`\`\`

E1
E2

E3
`;
    expect(normalizeMarkdown(markdown, true)).toBe(`
A1A2

A3

\`\`\`md
B1
B2

B3
\`\`\`

C1C2

C3

\`\`\`js
D1
D2

D3
\`\`\`

\`\`\`single line code\`\`\`

E1E2

E3
`);
  });

  it('tables', () => {
    const markdown = `
| a | b |
| --- | --- |
| c | d |
`;
    expect(normalizeMarkdown(markdown, true)).toBe(markdown);
  });
});

describe('normalizeMarkdown - shouldMergeAdjacentLines = false', () => {
  it('should not combine lines separated by a single \n', () => {
    const markdown = `
A1
A2

A3

\`\`\`md
B1
B2

B3
\`\`\`

C1
C2

C3

\`\`\`js
D1
D2

D3
\`\`\`

\`\`\`single line code\`\`\`

E1
E2

E3
`;
    expect(normalizeMarkdown(markdown, false)).toBe(`
A1
A2

A3

\`\`\`md
B1
B2

B3
\`\`\`

C1
C2

C3

\`\`\`js
D1
D2

D3
\`\`\`

\`\`\`single line code\`\`\`

E1
E2

E3
`);
  });

  it('tables', () => {
    const markdown = `
| a | b |
| --- | --- |
| c | d |
`;
    expect(normalizeMarkdown(markdown, false)).toBe(markdown);
  });
});
