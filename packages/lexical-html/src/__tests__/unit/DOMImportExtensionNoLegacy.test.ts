/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertGeneratedNodes} from '@lexical/clipboard';
import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {
  $generateNodesFromDOM,
  $getImportContextValue,
  type DOMImportConfig,
  DOMImportExtension,
  type DOMImportNext,
  type DOMImportOutputContinue,
  type DOMImportOutputNode,
  type DOMRenderConfig,
  DOMRenderExtension,
  ImportContextTextFormats,
  ImportContextWhiteSpaceCollapse,
  importOverride,
} from '@lexical/html';
import {
  $createListItemNode,
  $createListNode,
  CheckListExtension,
  ListExtension,
} from '@lexical/list';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $getEditor,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $selectAll,
  $setSelection,
  CaretDirection,
  configExtension,
  defineExtension,
  isBlockDomNode,
  isDOMTextNode,
  isHTMLElement,
  isInlineDomNode,
  LexicalNode,
  TextFormatType,
  TextNode,
} from 'lexical';
import {
  expectHtmlToBeEqual,
  html,
  // prettifyHtml,
} from 'lexical/src/__tests__/utils';
import invariant from 'shared/invariant';
import {assert, describe, expect, test} from 'vitest';

interface ImportTestCase {
  name: string;
  pastedHTML: string;
  expectedHTML: string;
  plainTextInsert?: string;
  importConfig?: Partial<DOMImportConfig>;
  exportConfig?: Partial<DOMRenderConfig>;
}

function importCase(
  name: string,
  pastedHTML: string,
  expectedHTML: string,
): ImportTestCase {
  return {expectedHTML, name, pastedHTML};
}

function $importListNode(
  dom: HTMLUListElement | HTMLOListElement,
): DOMImportOutputNode {
  const listNode = $createListNode().setListType(
    dom.tagName === 'OL' ? 'number' : 'bullet',
  );
  return {childNodes: dom.querySelectorAll(':scope>li'), node: listNode};
}

const listOverrides = (['ul', 'ol'] as const).map((tag) =>
  importOverride(tag, $importListNode),
);

// https://drafts.csswg.org/css-text-4/#line-break-transform
// const collapsePreserve = (s: string): string => s;
// const collapseFunctions: Record<DOMWhiteSpaceCollapse, (s: string) => string> =
//   {
//     'break-spaces': collapsePreserve,
//     collapse: (s) => s.replace(/\s+/g, ' '),
//     discard: (s) => s.replace(/\s+/g, ''),
//     preserve: collapsePreserve,
//     'preserve-breaks': (s) => s.replace(/[ \t]+/g, ' '),
//     'preserve-spaces': (s) => s.replace(/(?:\r?\n|\t)/g, ' '),
//   };

function $addTextFormatContinue(
  format: TextFormatType,
): (node: HTMLElement, $next: DOMImportNext) => null | DOMImportOutputContinue {
  return (_dom, $next) => {
    const prev = $getImportContextValue(ImportContextTextFormats);
    const rval: null | DOMImportOutputContinue =
      !prev || !prev[format]
        ? {
            childContext: [
              ImportContextTextFormats.pair({...prev, [format]: true}),
            ],
            node: $next,
          }
        : null;
    return rval;
  };
}

function findTextInLine(text: Text, direction: CaretDirection): null | Text {
  let node: Node = text;
  const siblingProp = `${direction}Sibling` as const;
  const childProp = `${direction === 'next' ? 'first' : 'last'}Child` as const;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let sibling: null | Node;
    while ((sibling = node[siblingProp]) === null) {
      const parentElement = node.parentElement;
      if (parentElement === null) {
        return null;
      }
      node = parentElement;
    }
    node = sibling;
    if (isHTMLElement(node)) {
      const display = node.style.display;
      if (!(display ? display.startsWith('inline') : isInlineDomNode(node))) {
        return null;
      }
    }
    let descendant: null | Node = node;
    while ((descendant = node[childProp]) !== null) {
      node = descendant;
    }
    if (isDOMTextNode(node)) {
      return node;
    } else if (node.nodeName === 'BR') {
      return null;
    }
  }
}

function $createTextNodeWithCurrentFormat(text: string = ''): TextNode {
  let node = $createTextNode(text);
  const fmt = $getImportContextValue(ImportContextTextFormats);
  if (fmt) {
    for (const k in fmt) {
      const textFormat = k as keyof typeof fmt;
      if (fmt[textFormat]) {
        node = node.toggleFormat(textFormat);
      }
    }
  }
  return node;
}

function $convertTextDOMNode(domNode: Text): DOMImportOutputNode {
  const domNode_ = domNode as Text;
  const parentDom = domNode.parentElement;
  invariant(
    parentDom !== null,
    'Expected parentElement of Text not to be null',
  );
  let textContent = domNode_.textContent || '';
  // No collapse and preserve segment break for pre, pre-wrap and pre-line
  if (
    $getImportContextValue(ImportContextWhiteSpaceCollapse).startsWith('pre')
  ) {
    const parts = textContent.split(/(\r?\n|\t)/);
    const nodes: Array<LexicalNode> = [];
    const length = parts.length;
    for (let i = 0; i < length; i++) {
      const part = parts[i];
      if (part === '\n' || part === '\r\n') {
        nodes.push($createLineBreakNode());
      } else if (part === '\t') {
        nodes.push($createTabNode());
      } else if (part !== '') {
        nodes.push($createTextNodeWithCurrentFormat(part));
      }
    }
    return {node: nodes};
  }
  textContent = textContent.replace(/\r/g, '').replace(/[ \t\n]+/g, ' ');
  if (textContent === '') {
    return {node: null};
  }
  if (textContent[0] === ' ') {
    // Traverse backward while in the same line. If content contains new line or tab -> potential
    // delete, other elements can borrow from this one. Deletion depends on whether it's also the
    // last space (see next condition: textContent[textContent.length - 1] === ' '))
    let previousText: null | Text = domNode_;
    let isStartOfLine = true;
    while (
      previousText !== null &&
      (previousText = findTextInLine(previousText, 'previous')) !== null
    ) {
      const previousTextContent = previousText.textContent || '';
      if (previousTextContent.length > 0) {
        if (/[ \t\n]$/.test(previousTextContent)) {
          textContent = textContent.slice(1);
        }
        isStartOfLine = false;
        break;
      }
    }
    if (isStartOfLine) {
      textContent = textContent.slice(1);
    }
  }
  if (textContent[textContent.length - 1] === ' ') {
    // Traverse forward while in the same line, preserve if next inline will require a space
    let nextText: null | Text = domNode_;
    let isEndOfLine = true;
    while (
      nextText !== null &&
      (nextText = findTextInLine(nextText, 'next')) !== null
    ) {
      const nextTextContent = (nextText.textContent || '').replace(
        /^( |\t|\r?\n)+/,
        '',
      );
      if (nextTextContent.length > 0) {
        isEndOfLine = false;
        break;
      }
    }
    if (isEndOfLine) {
      textContent = textContent.slice(0, textContent.length - 1);
    }
  }
  if (textContent === '') {
    return {node: null};
  }
  return {node: $createTextNodeWithCurrentFormat(textContent)};
}

const TO_FORMAT = {
  code: 'code',
  em: 'italic',
  i: 'italic',
  mark: 'highlight',
  s: 'strikethrough',
  strong: 'bold',
  sub: 'subscript',
  sup: 'superscript',
  u: 'underline',
} as const;
const formatOverrides = Object.entries(TO_FORMAT).map(([tag, format]) =>
  importOverride(tag as keyof typeof TO_FORMAT, $addTextFormatContinue(format)),
);

const NO_LEGACY_CONFIG: Partial<DOMImportConfig> = {
  compileLegacyImportNode: () => () => null,
  overrides: [
    importOverride('#text', $convertTextDOMNode),
    importOverride('*', (dom) => {
      if (isBlockDomNode(dom)) {
        const node = $createParagraphNode();
        const {textAlign} = dom.style;
        switch (textAlign) {
          case 'center':
          case 'end':
          case 'justify':
          case 'left':
          case 'right':
          case 'start':
            node.setFormat(textAlign);
            break;
          default:
            break;
        }
        return {node};
      }
    }),
    ...formatOverrides,
    ...listOverrides,
    importOverride('li', (dom) => {
      return {node: $createListItemNode()};
    }),
  ],
};

describe('DOMImportExtension (no legacy)', () => {
  test.each([
    importCase(
      'center aligned',
      html`
        <div><p style="text-align: center;">Hello world!</p></div>
      `,
      html`
        <p dir="auto" style="text-align: center;">
          <span data-lexical-text="true">Hello world!</span>
        </p>
      `,
    ),
    importCase(
      'reduced ul>li>p',
      `<ul><li><p>first</p></li><li><p>second</p></li></ul>`,
      html`
        <ul dir="auto">
          <li value="1"><span data-lexical-text="true">first</span></li>
          <li value="2"><span data-lexical-text="true">second</span></li>
        </ul>
      `,
    ),
    {
      expectedHTML: html`
        <p dir="auto"><span data-lexical-text="true">Hello!</span></p>
      `,
      name: 'plain DOM text node',
      pastedHTML: html`
        Hello!
      `,
    },
    {
      expectedHTML: html`
        <p dir="auto"><span data-lexical-text="true">Hello!</span></p>
        <p dir="auto"><br /></p>
      `,
      name: 'a paragraph element',
      pastedHTML: html`
        <p>Hello!</p>
        <p></p>
      `,
    },
    {
      expectedHTML: html`
        <p dir="auto"><span data-lexical-text="true">123</span></p>
        <p dir="auto"><span data-lexical-text="true">456</span></p>
      `,
      name: 'a single div',
      pastedHTML: html`
        123
        <div>456</div>
      `,
    },
    {
      expectedHTML: html`
        <p dir="auto"><span data-lexical-text="true">a b c d e</span></p>
        <p dir="auto"><span data-lexical-text="true">f g h</span></p>
      `,
      name: 'multiple nested spans and divs',
      pastedHTML: html`
        <div>
          a b
          <span>
            c d
            <span>e</span>
          </span>
          <div>
            f
            <span>g h</span>
          </div>
        </div>
      `,
    },
    {
      expectedHTML: html`
        <p dir="auto"><span data-lexical-text="true">123</span></p>
        <p dir="auto"><span data-lexical-text="true">456</span></p>
      `,
      name: 'nested span in a div',
      pastedHTML: html`
        <div>
          <span>
            123
            <div>456</div>
          </span>
        </div>
      `,
    },
    {
      expectedHTML: html`
        <p dir="auto"><span data-lexical-text="true">123</span></p>
        <p dir="auto"><span data-lexical-text="true">456</span></p>
      `,
      name: 'nested div in a span',
      pastedHTML: html`
        <span>
          123
          <div>456</div>
        </span>
      `,
    },
    {
      expectedHTML: html`
        <ul dir="auto">
          <li role="checkbox" tabindex="-1" value="1" aria-checked="true">
            <span data-lexical-text="true">done</span>
          </li>
          <li role="checkbox" tabindex="-1" value="2" aria-checked="false">
            <span data-lexical-text="true">todo</span>
          </li>
          <li value="3">
            <ul>
              <li role="checkbox" tabindex="-1" value="1" aria-checked="true">
                <span data-lexical-text="true">done</span>
              </li>
              <li role="checkbox" tabindex="-1" value="2" aria-checked="false">
                <span data-lexical-text="true">todo</span>
              </li>
            </ul>
          </li>
          <li role="checkbox" tabindex="-1" value="3" aria-checked="false">
            <span data-lexical-text="true">todo</span>
          </li>
        </ul>
      `,
      name: 'google doc checklist',
      // We can't use the HTML template literal formatter here because it's white-space:pre
      pastedHTML: `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1980f960-7fff-f4df-4ba3-26c6e1508542"><ul style="margin-top:0;margin-bottom:0;padding-inline-start:28px;"><li dir="ltr" role="checkbox" aria-checked="true" style="list-style-type:none;font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:line-through;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;" aria-level="1"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAABbElEQVR4Ae3bsU4CYRDEcRsxodZE8Q0BbS258l5MwESJNL6HOfrPKdhyxeBcwk5mkn9F98sGIOSuPM/zPM/zPI+xG/SEtuiAWpEOaIOWaDIWziP6RK14OzSjX44ITvTBvqRn1MRaMIHeBIE2TKBBEGhgArWkKmtJBjKQgQxkIANd/Aw0NVC+O7RHvYFynHasN1COE/UGynGiXgOIjxOtdIH4OGJAfBwxID6OGBAfRwiIjyMARMCpCjRF5+72Dzhd5R+rHfpC92NeTlWgLl5PkQg4RYBynBSJgFMGKMNJkQg4lYFeUDuFRMCpBXQOEgGnDtA/kPg4xT7m2y/tCd9zKgOdviTC5RQEIiAFjh4QASlw9IAISIEjCURAWvmf1UDKcQwUSDmOgWLdMcxA7BnIQAYykIEM5EcRvplAW0GgNRNoKQg0ZwJN0E4I5x1dI+pmgSSA84BG2QQt0LrYG/eAXtGccjme53me53me9wPjPWZWjhktAQAAAABJRU5ErkJggg==" width="18.4px" height="18.4px" alt="checked" aria-roledescription="checkbox" style="margin-right:3px;" /><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;display:inline-block;vertical-align:top;margin-top:0;" role="presentation"><span style="font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:line-through;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">done</span></p></li><li dir="ltr" role="checkbox" aria-checked="false" style="list-style-type:none;font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAA1ElEQVR4Ae3bMQ4BURSFYY2xBuwQ7BIkTGxFRj9Oo9RdkXn5TvL3L19u+2ZmZmZmZhVbpH26pFcaJ9IrndMudb/CWadHGiden1bll9MIzqd79SUd0thY20qga4NA50qgoUGgoRJo/NL/V/N+QIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIEyFeEZyXQpUGgUyXQrkGgTSVQl/qGcG5pnkq3Sn0jOMv0k3Vpm05pmNjfsGPalFyOmZmZmdkbSS9cKbtzhxMAAAAASUVORK5CYII=" width="18.4px" height="18.4px" alt="unchecked" aria-roledescription="checkbox" style="margin-right:3px;" /><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;display:inline-block;vertical-align:top;margin-top:0;" role="presentation"><span style="font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">todo</span></p></li><ul style="margin-top:0;margin-bottom:0;padding-inline-start:28px;"><li dir="ltr" role="checkbox" aria-checked="true" style="list-style-type:none;font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:line-through;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;" aria-level="2"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAABbElEQVR4Ae3bsU4CYRDEcRsxodZE8Q0BbS258l5MwESJNL6HOfrPKdhyxeBcwk5mkn9F98sGIOSuPM/zPM/zPI+xG/SEtuiAWpEOaIOWaDIWziP6RK14OzSjX44ITvTBvqRn1MRaMIHeBIE2TKBBEGhgArWkKmtJBjKQgQxkIANd/Aw0NVC+O7RHvYFynHasN1COE/UGynGiXgOIjxOtdIH4OGJAfBwxID6OGBAfRwiIjyMARMCpCjRF5+72Dzhd5R+rHfpC92NeTlWgLl5PkQg4RYBynBSJgFMGKMNJkQg4lYFeUDuFRMCpBXQOEgGnDtA/kPg4xT7m2y/tCd9zKgOdviTC5RQEIiAFjh4QASlw9IAISIEjCURAWvmf1UDKcQwUSDmOgWLdMcxA7BnIQAYykIEM5EcRvplAW0GgNRNoKQg0ZwJN0E4I5x1dI+pmgSSA84BG2QQt0LrYG/eAXtGccjme53me53me9wPjPWZWjhktAQAAAABJRU5ErkJggg==" width="18.4px" height="18.4px" alt="checked" aria-roledescription="checkbox" style="margin-right:3px;" /><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;display:inline-block;vertical-align:top;margin-top:0;" role="presentation"><span style="font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:line-through;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">done</span></p></li><li dir="ltr" role="checkbox" aria-checked="false" style="list-style-type:none;font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="2"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAA1ElEQVR4Ae3bMQ4BURSFYY2xBuwQ7BIkTGxFRj9Oo9RdkXn5TvL3L19u+2ZmZmZmZhVbpH26pFcaJ9IrndMudb/CWadHGiden1bll9MIzqd79SUd0thY20qga4NA50qgoUGgoRJo/NL/V/N+QIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIEyFeEZyXQpUGgUyXQrkGgTSVQl/qGcG5pnkq3Sn0jOMv0k3Vpm05pmNjfsGPalFyOmZmZmdkbSS9cKbtzhxMAAAAASUVORK5CYII=" width="18.4px" height="18.4px" alt="unchecked" aria-roledescription="checkbox" style="margin-right:3px;" /><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;display:inline-block;vertical-align:top;margin-top:0;" role="presentation"><span style="font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">todo</span></p></li></ul><li dir="ltr" role="checkbox" aria-checked="false" style="list-style-type:none;font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAA1ElEQVR4Ae3bMQ4BURSFYY2xBuwQ7BIkTGxFRj9Oo9RdkXn5TvL3L19u+2ZmZmZmZhVbpH26pFcaJ9IrndMudb/CWadHGiden1bll9MIzqd79SUd0thY20qga4NA50qgoUGgoRJo/NL/V/N+QIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIEyFeEZyXQpUGgUyXQrkGgTSVQl/qGcG5pnkq3Sn0jOMv0k3Vpm05pmNjfsGPalFyOmZmZmdkbSS9cKbtzhxMAAAAASUVORK5CYII=" width="18.4px" height="18.4px" alt="unchecked" aria-roledescription="checkbox" style="margin-right:3px;" /><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;display:inline-block;vertical-align:top;margin-top:0;" role="presentation"><span style="font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">todo</span></p></li></ul></b>`,
    },
    {
      expectedHTML: html`
        <p dir="auto" style="text-align: start;">
          <span data-lexical-text="true">checklist</span>
        </p>
        <ul dir="auto">
          <li
            role="checkbox"
            style="text-align: start;"
            tabindex="-1"
            value="1"
            aria-checked="true">
            <span data-lexical-text="true">done</span>
          </li>
          <li
            role="checkbox"
            style="text-align: start;"
            tabindex="-1"
            value="2"
            aria-checked="false">
            <span data-lexical-text="true">todo</span>
          </li>
        </ul>
      `,
      name: 'github checklist',
      pastedHTML: html`
        <meta charset="utf-8" />
        <p
          dir="auto"
          style='box-sizing: border-box; margin-top: 0px !important; margin-bottom: 16px; color: rgb(31, 35, 40); font-family: -apple-system, "system-ui", "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;'>
          checklist
        </p>
        <ul
          class="contains-task-list"
          style='box-sizing: border-box; padding: 0px; margin-top: 0px; margin-bottom: 0px !important; position: relative; color: rgb(31, 35, 40); font-family: -apple-system, "system-ui", "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;'>
          <li
            class="task-list-item enabled"
            style="box-sizing: border-box; list-style-type: none; padding: 2px 15px 2px 42px; margin-right: -15px; margin-left: -15px; line-height: 1.5; border: 0px;">
            <span
              class="handle"
              style="box-sizing: border-box; display: block; float: left; width: 20px; padding: 2px 0px 0px 2px; margin-left: -43px; opacity: 0;">
              <svg
                class="drag-handle"
                height="16"
                width="16"
                aria-hidden="true">
                <path
                  d="M10 13a1 1 0 100-2 1 1 0 000 2zm-4 0a1 1 0 100-2 1 1 0 000 2zm1-5a1 1 0 11-2 0 1 1 0 012 0zm3 1a1 1 0 100-2 1 1 0 000 2zm1-5a1 1 0 11-2 0 1 1 0 012 0zM6 5a1 1 0 100-2 1 1 0 000 2z"></path>
              </svg>
            </span>
            <input
              class="task-list-item-checkbox"
              id=""
              checked=""
              style="box-sizing: border-box; font: inherit; margin: 0px 0.2em 0.25em -1.4em; overflow: visible; padding: 0px; vertical-align: middle;"
              type="checkbox" />
            <span></span>
            done
          </li>
          <li
            class="task-list-item enabled"
            style="box-sizing: border-box; list-style-type: none; margin-top: 0px; padding: 2px 15px 2px 42px; margin-right: -15px; margin-left: -15px; line-height: 1.5; border: 0px;">
            <span
              class="handle"
              style="box-sizing: border-box; display: block; float: left; width: 20px; padding: 2px 0px 0px 2px; margin-left: -43px; opacity: 0;">
              <svg
                class="drag-handle"
                height="16"
                width="16"
                aria-hidden="true">
                <path
                  d="M10 13a1 1 0 100-2 1 1 0 000 2zm-4 0a1 1 0 100-2 1 1 0 000 2zm1-5a1 1 0 11-2 0 1 1 0 012 0zm3 1a1 1 0 100-2 1 1 0 000 2zm1-5a1 1 0 11-2 0 1 1 0 012 0zM6 5a1 1 0 100-2 1 1 0 000 2z"></path>
              </svg>
            </span>
            <input
              class="task-list-item-checkbox"
              id=""
              style="box-sizing: border-box; font: inherit; margin: 0px 0.2em 0.25em -1.4em; overflow: visible; padding: 0px; vertical-align: middle;"
              type="checkbox" />
            <span></span>
            todo
          </li>
        </ul>
      `,
    },
    {
      expectedHTML: html`
        <p dir="auto">
          <strong class="editor-text-bold" data-lexical-text="true">
            hello world
          </strong>
        </p>
      `,
      name: 'pasting inheritance',
      pastedHTML: html`
        <strong>hello</strong>
      `,
      plainTextInsert: ' world',
    },
  ])(
    '$name',
    ({
      expectedHTML,
      pastedHTML,
      plainTextInsert,
      importConfig = {},
      exportConfig = {},
    }: ImportTestCase) => {
      const builtEditor = buildEditorFromExtensions(
        defineExtension({
          $initialEditorState: (editor) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(pastedHTML, 'text/html');
            const nodes = getExtensionDependencyFromEditor(
              $getEditor(),
              DOMImportExtension,
            ).output.$importNodes(doc);

            // Compare legacy $generateNodesFromDOM to $generateNodes
            const legacyNodes = $generateNodesFromDOM(editor, doc);
            expect(nodes.length).toEqual(legacyNodes.length);
            function compareJSON(a: LexicalNode, b: LexicalNode) {
              expect(a.exportJSON()).toEqual(b.exportJSON());
              if ($isElementNode(a) && $isElementNode(b)) {
                const as = a.getChildren();
                const bs = b.getChildren();
                expect(as.length).toEqual(bs.length);
                for (let i = 0; i < as.length; i++) {
                  compareJSON(as[i], bs[i]);
                }
              }
            }
            for (let i = 0; i < nodes.length; i++) {
              compareJSON(nodes[i], legacyNodes[i]);
            }

            $insertGeneratedNodes(editor, nodes, $selectAll());
            if (plainTextInsert) {
              const newSelection = $getSelection();
              assert(
                $isRangeSelection(newSelection),
                'isRangeSelection(newSelection) for plainTextInsert',
              );
              newSelection.insertText(plainTextInsert);
            }
            $setSelection(null);
          },
          dependencies: [
            configExtension(DOMImportExtension, NO_LEGACY_CONFIG, importConfig),
            configExtension(DOMRenderExtension, exportConfig),
            ListExtension,
            CheckListExtension,
          ],
          name: 'root',
          theme: {
            text: {
              bold: 'editor-text-bold',
              italic: 'editor-text-italic',
              underline: 'editor-text-underline',
            },
          },
        }),
      );
      const rootElement = document.createElement('div');
      builtEditor.setRootElement(rootElement);
      // try {
      expectHtmlToBeEqual(rootElement.innerHTML, expectedHTML);
      // } catch (err) {
      //   console.log(prettifyHtml(rootElement.innerHTML));
      //   console.log(prettifyHtml(expectedHTML));
      //   throw err;
      // }
    },
  );
});
