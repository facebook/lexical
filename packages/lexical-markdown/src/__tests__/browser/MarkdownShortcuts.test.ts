/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {registerMarkdownShortcuts} from '@lexical/markdown';
import {
  $createParagraphNode,
  $getRoot,
  defineExtension,
  IS_APPLE,
} from 'lexical';
import {assert, describe, expect, onTestFinished, test} from 'vitest';
import {userEvent} from 'vitest/browser';

import {MarkdownTestExtension} from '../utils';

const extension = defineExtension({
  dependencies: [MarkdownTestExtension, HistoryExtension],
  name: 'MarkdownShortcutsBrowserTest',
  register: editor => registerMarkdownShortcuts(editor),
});

function setup(doc: Document = document) {
  const root = doc.createElement('div');
  root.contentEditable = 'true';
  root.style.whiteSpace = 'pre-wrap';
  doc.body.append(root);
  const editor = buildEditorFromExtensions(extension);
  editor.setRootElement(root);
  onTestFinished(() => {
    editor.dispose();
    root.remove();
    doc.defaultView?.getSelection()?.removeAllRanges();
  });
  editor.update(
    () => {
      $getRoot().clear().append($createParagraphNode());
      $getRoot().selectEnd();
    },
    {discrete: true},
  );
  doc.defaultView?.focus();
  root.focus();
  return root;
}

const cases = [
  {
    html: '<h3 dir="auto"><br data-lexical-managed-linebreak="true" /></h3>',
    text: '### ',
  },
  {
    html: '<h4 dir="auto"><br data-lexical-managed-linebreak="true" /></h4>',
    text: '#### ',
  },
  {
    html: '<h5 dir="auto"><br data-lexical-managed-linebreak="true" /></h5>',
    text: '##### ',
  },
  {
    html: '<h6 dir="auto"><br data-lexical-managed-linebreak="true" /></h6>',
    text: '###### ',
  },
  {
    html: '<blockquote dir="auto"><br data-lexical-managed-linebreak="true" /></blockquote>',
    text: '> ',
  },
  {
    html: `
        <h1 dir="auto"><br data-lexical-managed-linebreak="true" /></h1>
      `,
    text: '# ',
  },
  {
    html: `
        <h2 dir="auto"><br data-lexical-managed-linebreak="true" /></h2>
      `,
    text: '## ',
  },
  {
    html: `
        <ol dir="auto">
          <li value="1"><br data-lexical-managed-linebreak="true" /></li>
        </ol>
      `,
    text: '1. ',
  },
  {
    html: `
        <ol start="25" dir="auto">
          <li value="25"><br data-lexical-managed-linebreak="true" /></li>
        </ol>
      `,
    text: '25. ',
  },
  {
    html: `
        <ol dir="auto">
          <li value="1">
            <ol>
              <li value="1"><br data-lexical-managed-linebreak="true" /></li>
            </ol>
          </li>
        </ol>
      `,
    text: '    1. ',
  },
  {
    html: `
        <ul dir="auto">
          <li value="1"><br data-lexical-managed-linebreak="true" /></li>
        </ul>
      `,
    text: '- ',
  },
  {
    html: `
        <ul dir="auto">
          <li value="1">
            <ul>
              <li value="1"><br data-lexical-managed-linebreak="true" /></li>
            </ul>
          </li>
        </ul>
      `,
    text: '    - ',
  },
  {
    html: `
        <ul dir="auto">
          <li value="1"><br data-lexical-managed-linebreak="true" /></li>
        </ul>
      `,
    text: '* ',
  },
  {
    html: `
        <ul dir="auto">
          <li value="1">
            <ul>
              <li value="1"><br data-lexical-managed-linebreak="true" /></li>
            </ul>
          </li>
        </ul>
      `,
    text: '    * ',
  },
  {
    html: `
        <ul dir="auto">
          <li value="1">
            <ul>
              <li value="1"><br data-lexical-managed-linebreak="true" /></li>
            </ul>
          </li>
        </ul>
      `,
    text: '      * ',
  },
  {
    html: `
        <ul dir="auto">
          <li value="1">
            <ul>
              <li value="1">
                <ul>
                  <li value="1">
                    <br data-lexical-managed-linebreak="true" />
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      `,
    text: '        * ',
  },
];

// Match the e2e HTML assertions' whitespace-insensitive formatting while
// retaining node types, nesting, list numbers and managed line breaks.
function normalizeHTML(html: string) {
  const template = document.createElement('template');
  template.innerHTML = html.replace(/>\s+</g, '><').trim();
  return template.innerHTML;
}

describe('native Markdown block shortcuts', () => {
  test.each(cases)('types, undoes and redoes $text', async ({text, html}) => {
    const root = setup();
    const expected = normalizeHTML(html);
    await userEvent.keyboard(text);
    await expect.poll(() => root.innerHTML).toBe(expected);
    await userEvent.keyboard('{ControlOrMeta>}z{/ControlOrMeta}');
    await expect
      .poll(() => root.innerHTML)
      .toBe(
        '<p dir="auto"><span data-lexical-text="true">' +
          text.replaceAll('>', '&gt;') +
          '</span></p>',
      );
    await userEvent.keyboard(
      IS_APPLE ? '{Meta>}{Shift>}z{/Shift}{/Meta}' : '{Control>}y{/Control}',
    );
    await expect.poll(() => root.innerHTML).toBe(expected);
  });
});

// Issue #9336: an iframe created after the page loaded has a later
// performance.timeOrigin, so its events' timeStamps are on a different clock
// than the parent's performance.now(). A capture-phase input listener above
// the root (React registers one on a portal's container) gives the mutation
// observer a microtask checkpoint before Lexical handles the input, so it
// must still recognize the native text entry and leave it to Lexical.
describe('native Markdown text format shortcuts', () => {
  const textCases = [
    {
      html: '<p dir="auto"><em data-lexical-text="true">hi</em></p>',
      text: '*hi*',
    },
    {
      html: '<p dir="auto"><strong data-lexical-text="true">bold</strong></p>',
      text: '**bold**',
    },
    {
      html: '<p dir="auto"><code spellcheck="false" data-lexical-text="true"><span>code</span></code></p>',
      text: '`code`',
    },
  ];

  async function createIframeDocument() {
    // Let the parent's clock run ahead of the iframe's timeOrigin
    await new Promise(resolve => setTimeout(resolve, 500));
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    onTestFinished(() => iframe.remove());
    const doc = iframe.contentDocument;
    assert(doc !== null, 'iframe has no document');
    doc.body.addEventListener('input', () => {}, true);
    return doc;
  }

  test.each(textCases)(
    'types $text in the main window',
    async ({text, html}) => {
      const root = setup();
      await userEvent.keyboard(text);
      await expect.poll(() => root.innerHTML).toBe(normalizeHTML(html));
    },
  );

  test.each(textCases)('types $text in an iframe', async ({text, html}) => {
    const root = setup(await createIframeDocument());
    await userEvent.keyboard(text);
    await expect.poll(() => root.innerHTML).toBe(normalizeHTML(html));
  });
});
