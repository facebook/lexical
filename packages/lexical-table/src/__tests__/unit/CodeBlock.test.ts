/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertDataTransferForRichText} from '@lexical/clipboard';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import {
  DataTransferMock,
  initializeUnitTest,
  invariant,
} from 'lexical/src/__tests__/utils';

describe('CodeBlock tests', () => {
  initializeUnitTest(
    (testEnv) => {
      beforeEach(async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          root.append(paragraph);
          paragraph.select();
        });
      });

      /**
       * Code example for tests:
       *
       * function run() {
       *   return [null, undefined, 2, ""];
       * }
       *
       */
      const EXPECTED_HTML = `<code spellcheck="false" dir="ltr"><span data-lexical-text="true">function run() {</span><br><span data-lexical-text="true">  return [null, undefined, 2, ""];</span><br><span data-lexical-text="true">}</span></code>`;

      const CODE_PASTING_TESTS = [
        {
          expectedHTML: EXPECTED_HTML,
          name: 'VS Code',
          pastedHTML: `<meta charset='utf-8'><div style="color: #d4d4d4;background-color: #1e1e1e;font-family: Menlo, Monaco, 'Courier New', monospace;font-weight: normal;font-size: 12px;line-height: 18px;white-space: pre;"><div><span style="color: #569cd6;">function</span><span style="color: #d4d4d4;"> </span><span style="color: #dcdcaa;">run</span><span style="color: #d4d4d4;">() {</span></div><div><span style="color: #d4d4d4;">  </span><span style="color: #c586c0;">return</span><span style="color: #d4d4d4;"> [</span><span style="color: #569cd6;">null</span><span style="color: #d4d4d4;">, </span><span style="color: #569cd6;">undefined</span><span style="color: #d4d4d4;">, </span><span style="color: #b5cea8;">2</span><span style="color: #d4d4d4;">, </span><span style="color: #ce9178;">""</span><span style="color: #d4d4d4;">];</span></div><div><span style="color: #d4d4d4;">}</span></div></div>`,
        },
        {
          expectedHTML: EXPECTED_HTML,
          name: 'Quip',
          pastedHTML: `<meta charset='utf-8'><pre>function run() {<br>  return [null, undefined, 2, ""];<br>}</pre>`,
        },
        {
          expectedHTML: EXPECTED_HTML,
          name: 'WebStorm / Idea',
          pastedHTML: `<html><head><meta http-equiv="content-type" content="text/html; charset=UTF-8"></head><body><pre style="background-color:#2b2b2b;color:#a9b7c6;font-family:'JetBrains Mono',monospace;font-size:9.8pt;"><span style="color:#cc7832;">function&#32;</span><span style="color:#ffc66d;">run</span>()&#32;{<br>&#32;&#32;<span style="color:#cc7832;">return&#32;</span>[<span style="color:#cc7832;">null,&#32;undefined,&#32;</span><span style="color:#6897bb;">2</span><span style="color:#cc7832;">,&#32;</span><span style="color:#6a8759;">""</span>]<span style="color:#cc7832;">;<br></span>}</pre></body></html>`,
        },
        {
          expectedHTML: `<code spellcheck="false" dir="ltr"><strong class="editor-text-bold" data-lexical-text="true">function</strong><span data-lexical-text="true"> run() {</span><br><span data-lexical-text="true">  </span><strong class="editor-text-bold" data-lexical-text="true">return</strong><span data-lexical-text="true"> [</span><strong class="editor-text-bold" data-lexical-text="true">null</strong><span data-lexical-text="true">, </span><strong class="editor-text-bold" data-lexical-text="true">undefined</strong><span data-lexical-text="true">, 2, ""];</span><br><span data-lexical-text="true">}</span></code>`,
          name: 'Postman IDE',
          pastedHTML: `<meta charset='utf-8'><div style="color: #000000;background-color: #fffffe;font-family: Menlo, Monaco, 'Courier New', monospace;font-weight: normal;font-size: 12px;line-height: 18px;white-space: pre;"><div><span style="color: #800555;font-weight: bold;">function</span><span style="color: #000000;"> run() {</span></div><div><span style="color: #000000;">  </span><span style="color: #800555;font-weight: bold;">return</span><span style="color: #000000;"> [</span><span style="color: #800555;font-weight: bold;">null</span><span style="color: #000000;">, </span><span style="color: #800555;font-weight: bold;">undefined</span><span style="color: #000000;">, </span><span style="color: #ff00aa;">2</span><span style="color: #000000;">, </span><span style="color: #2a00ff;">""</span><span style="color: #000000;">];</span></div><div><span style="color: #000000;">}</span></div></div>`,
        },
        {
          expectedHTML: EXPECTED_HTML,
          name: 'Slack message',
          pastedHTML: `<meta charset='utf-8'><pre class="c-mrkdwn__pre" data-stringify-type="pre" style="box-sizing: inherit; margin: 4px 0px; padding: 8px; --saf-0:rgba(var(--sk_foreground_low,29,28,29),0.13); font-size: 12px; line-height: 1.50001; font-variant-ligatures: none; white-space: pre-wrap; word-break: break-word; word-break: normal; tab-size: 4; font-family: Monaco, Menlo, Consolas, &quot;Courier New&quot;, monospace !important; border: 1px solid var(--saf-0); border-radius: 4px; background: rgba(var(--sk_foreground_min,29,28,29),0.04); counter-reset: list-0 0 list-1 0 list-2 0 list-3 0 list-4 0 list-5 0 list-6 0 list-7 0 list-8 0 list-9 0; color: rgb(29, 28, 29); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">function run() {\n  return [null, undefined, 2, ""];\n}</pre>`,
        },
        {
          expectedHTML: `<code spellcheck="false" dir="ltr"><span data-lexical-text="true">const Lexical = requireCond('gk', 'runtime_is_dev', {</span><br><span data-lexical-text="true">  true: 'Lexical.dev',</span><br><span data-lexical-text="true">  false: 'Lexical.prod',</span><br><span data-lexical-text="true">});</span></code>`,
          name: 'CodeHub',
          pastedHTML: `<meta charset='utf-8'><div style="color: #000000;background-color: #fffffe;font-family: 'monaco,monospace', Menlo, Monaco, 'Courier New', monospace;font-weight: normal;font-size: 13px;line-height: 20px;white-space: pre;"><div><span style="color: #ff0000;">const</span><span style="color: #000000;"> </span><span style="color: #800000;">Lexical</span><span style="color: #000000;"> = </span><span style="color: #383838;">requireCond</span><span style="color: #000000;">(</span><span style="color: #863b00;">'gk'</span><span style="color: #000000;">, </span><span style="color: #863b00;">'runtime_is_dev'</span><span style="color: #000000;">, {</span></div><div><span style="color: #000000;">  </span><span style="color: #863b00;">true</span><span style="color: #000000;">: </span><span style="color: #863b00;">'Lexical.dev'</span><span style="color: #000000;">,</span></div><div><span style="color: #000000;">  </span><span style="color: #863b00;">false</span><span style="color: #000000;">: </span><span style="color: #863b00;">'Lexical.prod'</span><span style="color: #000000;">,</span></div><div><span style="color: #000000;">});</span></div></div>`,
        },
        {
          expectedHTML: EXPECTED_HTML,
          name: 'GitHub / Gist',
          pastedHTML: `<meta charset='utf-8'><table class="highlight tab-size js-file-line-container js-code-nav-container js-tagsearch-file" data-tab-size="8" data-paste-markdown-skip="" data-tagsearch-lang="JavaScript" data-tagsearch-path="example.js" style="box-sizing: border-box; border-spacing: 0px; border-collapse: collapse; tab-size: 8; color: rgb(36, 41, 47); font-family: -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, Helvetica, Arial, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><tbody style="box-sizing: border-box;"><tr style="box-sizing: border-box;"><td id="file-example-js-LC1" class="blob-code blob-code-inner js-file-line" style="box-sizing: border-box; padding: 0px 10px; position: relative; line-height: 20px; vertical-align: top; overflow: visible; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; color: var(--color-fg-default); overflow-wrap: normal; white-space: pre;"><span class="pl-k" style="box-sizing: border-box; color: var(--color-prettylights-syntax-keyword);">function</span> <span class="pl-en" style="box-sizing: border-box; color: var(--color-prettylights-syntax-entity);">run</span><span class="pl-kos" style="box-sizing: border-box;">(</span><span class="pl-kos" style="box-sizing: border-box;">)</span> <span class="pl-kos" style="box-sizing: border-box;">{</span></td></tr><tr style="box-sizing: border-box; background-color: transparent;"><td id="file-example-js-L2" class="blob-num js-line-number js-code-nav-line-number" data-line-number="2" style="box-sizing: border-box; padding: 0px 10px; width: 50px; min-width: 50px; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; line-height: 20px; color: var(--color-fg-subtle); text-align: right; white-space: nowrap; vertical-align: top; cursor: pointer; user-select: none;"></td><td id="file-example-js-LC2" class="blob-code blob-code-inner js-file-line" style="box-sizing: border-box; padding: 0px 10px; position: relative; line-height: 20px; vertical-align: top; overflow: visible; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; color: var(--color-fg-default); overflow-wrap: normal; white-space: pre;">  <span class="pl-k" style="box-sizing: border-box; color: var(--color-prettylights-syntax-keyword);">return</span> <span class="pl-kos" style="box-sizing: border-box;">[</span><span class="pl-c1" style="box-sizing: border-box; color: var(--color-prettylights-syntax-constant);">null</span><span class="pl-kos" style="box-sizing: border-box;">,</span> <span class="pl-c1" style="box-sizing: border-box; color: var(--color-prettylights-syntax-constant);">undefined</span><span class="pl-kos" style="box-sizing: border-box;">,</span> <span class="pl-c1" style="box-sizing: border-box; color: var(--color-prettylights-syntax-constant);">2</span><span class="pl-kos" style="box-sizing: border-box;">,</span> <span class="pl-s" style="box-sizing: border-box; color: var(--color-prettylights-syntax-string);">""</span><span class="pl-kos" style="box-sizing: border-box;">]</span><span class="pl-kos" style="box-sizing: border-box;">;</span></td></tr><tr style="box-sizing: border-box;"><td id="file-example-js-L3" class="blob-num js-line-number js-code-nav-line-number" data-line-number="3" style="box-sizing: border-box; padding: 0px 10px; width: 50px; min-width: 50px; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; line-height: 20px; color: var(--color-fg-subtle); text-align: right; white-space: nowrap; vertical-align: top; cursor: pointer; user-select: none;"></td><td id="file-example-js-LC3" class="blob-code blob-code-inner js-file-line" style="box-sizing: border-box; padding: 0px 10px; position: relative; line-height: 20px; vertical-align: top; overflow: visible; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; color: var(--color-fg-default); overflow-wrap: normal; white-space: pre;"><span class="pl-kos" style="box-sizing: border-box;">}</span></td></tr></tbody></table>`,
        },
        {
          expectedHTML: `<p><code spellcheck="false" data-lexical-text="true"><span>12</span></code></p>`,
          name: 'Single line <code>',
          pastedHTML: `<meta charset='utf-8'><code>12</code>`,
        },
        {
          expectedHTML: `<code spellcheck="false"><span data-lexical-text="true">1</span><br><span data-lexical-text="true">2</span></code>`,
          name: 'Multiline <code>',
          // TODO This is not correct. This resembles how Lexical exports code right now but
          // semantically it should be wrapped in a pre
          pastedHTML: `<meta charset='utf-8'><code>1<br>2</code>`,
        },
        {
          expectedHTML: `<p dir="ltr"><strong class="editor-text-bold editor-text-italic editor-text-underline" data-lexical-text="true">Hello </strong><sub data-lexical-text="true"><strong class="editor-text-bold editor-text-italic">World </strong></sub><sup data-lexical-text="true"><strong class="editor-text-bold editor-text-italic editor-text-underline">Lexical</strong></sup></p>`,
          name: 'Multiple text formats',
          pastedHTML: `<strong style="font-weight: 700; font-style: italic; text-decoration: underline; color: rgb(0, 0, 0); font-size: 15px; text-align: left; text-indent: 0px; background-color: rgb(255, 255, 255);">Hello </strong><sub style="color: rgb(0, 0, 0); font-style: normal; font-weight: 400; text-align: left; text-indent: 0px; background-color: rgb(255, 255, 255);"><strong style="font-weight: 700; font-style: italic; text-decoration: line-through; font-size: 0.8em; vertical-align: sub !important;">World </strong></sub><sup style="color: rgb(0, 0, 0); font-style: normal; font-weight: 400; text-align: left; text-indent: 0px; background-color: rgb(255, 255, 255);"><strong style="font-weight: 700; font-style: italic; text-decoration: underline line-through; font-size: 0.8em; vertical-align: super;">Lexical</strong></sup>`,
        },
        {
          expectedHTML: `<h1 dir="ltr"><span data-lexical-text="true">My document</span></h1>`,
          name: 'Title from Google Docs',
          pastedHTML: `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-whatever"><span style="font-size:26pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">My document</span></b>`,
        },
        {
          expectedHTML: `<h1 dir="ltr"><span data-lexical-text="true">My document</span></h1>`,
          name: 'Title from Google Docs Wrapped in Paragraph',
          pastedHTML: `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-wjatever"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:3pt;"><span style="font-size:26pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">My document</span></p></b>`,
        },
        {
          expectedHTML: `<p dir="ltr"><sub data-lexical-text="true"><span>subscript</span></sub><span data-lexical-text="true"> and </span><sup data-lexical-text="true"><span>superscript</span></sup></p>`,
          name: 'Subscript and Superscript',
          pastedHTML: `<b style="font-weight:normal;" id="docs-internal-guid-374b5f9d-7fff-9120-bcb0-1f5c1b6d59fa"><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="font-size:0.6em;vertical-align:sub;">subscript</span></span><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> and </span><span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span style="font-size:0.6em;vertical-align:super;">superscript</span></span></b>`,
        },
      ];

      CODE_PASTING_TESTS.forEach((testCase, i) => {
        test(`Code block html paste: ${testCase.name}`, async () => {
          const {editor} = testEnv;

          const dataTransfer = new DataTransferMock();
          dataTransfer.setData('text/html', testCase.pastedHTML);
          await editor.update(() => {
            const selection = $getSelection();
            invariant(
              $isRangeSelection(selection),
              'isRangeSelection(selection)',
            );
            $insertDataTransferForRichText(dataTransfer, selection, editor);
          });
          expect(testEnv.innerHTML).toBe(testCase.expectedHTML);
        });
      });
    },
    {
      namespace: 'test',
      theme: {
        text: {
          bold: 'editor-text-bold',
          italic: 'editor-text-italic',
          underline: 'editor-text-underline',
        },
      },
    },
  );
});
