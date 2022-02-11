/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertHTML,
  assertSelection,
  selectOption,
  focusEditor,
  pasteFromClipboard,
} from '../utils';
import {moveToEditorBeginning} from '../keyboardShortcuts';

describe('CodeBlock', () => {
  initializeE2E((e2e) => {
    it('Can create code block with markdown', async () => {
      const {page, isRichText} = e2e;
      await focusEditor(page);
      await page.keyboard.type('``` alert(1);');
      if (isRichText) {
        await assertSelection(page, {
          anchorPath: [0, 4, 0],
          anchorOffset: 1,
          focusPath: [0, 4, 0],
          focusOffset: 1,
        });
        await assertHTML(
          page,
          '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp qm54mken gatxiiaj PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">alert</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenProperty hteo0ag1" data-lexical-text="true">1</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span></code>',
        );

        // Remove code block (back to a normal paragraph) and check that highlights are converted into regular text
        await moveToEditorBeginning(page);
        await page.keyboard.press('Backspace');
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">alert(1);</span></p>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">``` alert(1);</span></p>',
        );
      }
    });

    it('Can create code block with markdown and wrap existing text', async () => {
      const {page, isRichText} = e2e;
      await focusEditor(page);
      await page.keyboard.type('alert(1);');
      await moveToEditorBeginning(page);
      await page.keyboard.type('``` ');
      if (isRichText) {
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 0, 0],
          focusOffset: 0,
        });
        await assertHTML(
          page,
          '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp qm54mken gatxiiaj PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">alert</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenProperty hteo0ag1" data-lexical-text="true">1</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span></code>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">``` alert(1);</span></p>',
        );
      }
    });

    it('Does not wrap code block text when it extends beyond the width of the code block', async () => {
      const {page, isRichText} = e2e;
      // This only applies to rich text
      if (!isRichText) {
        return;
      }
      await focusEditor(page);
      await page.keyboard.type(
        `\`\`\` alert("I started painting as a hobby when I was little. I didn't know I had any talent. I believe talent is just a pursued interest. Anybody can do what I do. Just go back and put one little more happy tree in there. Everybody's different. Trees are different. Let them all be individuals.")`,
      );
      await moveToEditorBeginning(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });
      await assertHTML(
        page,
        `<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp qm54mken gatxiiaj PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">alert</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenSelector bphgtf0p" data-lexical-text="true">"I&nbsp;started painting as&nbsp;a hobby when I&nbsp;was little.&nbsp;I&nbsp;didn't know I&nbsp;had any talent.&nbsp;I&nbsp;believe talent is just a pursued interest.&nbsp;Anybody can do&nbsp;what I&nbsp;do.&nbsp;Just go back and put one little more happy tree in&nbsp;there.&nbsp;Everybody's different.&nbsp;Trees are different.&nbsp;Let them all be individuals."</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span></code>`,
      );
    });

    it('Can switch highlighting language in a toolbar', async () => {
      const {page, isRichText} = e2e;
      await focusEditor(page);
      await page.keyboard.type('``` select * from users');
      if (isRichText) {
        await assertHTML(
          page,
          '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp qm54mken gatxiiaj PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span data-lexical-text="true">select </span><span class="PlaygroundEditorTheme__tokenOperator lonyqbdx" data-lexical-text="true">*</span><span data-lexical-text="true">&nbsp;from&nbsp;users</span></code>',
        );
        await selectOption(page, '.code-language', {value: 'sql'});
        await assertHTML(
          page,
          '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp qm54mken gatxiiaj PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span class="PlaygroundEditorTheme__tokenAttr f7xs5s0g" data-lexical-text="true">select</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenOperator lonyqbdx" data-lexical-text="true">*</span><span data-lexical-text="true">&nbsp;</span><span class="PlaygroundEditorTheme__tokenAttr f7xs5s0g" data-lexical-text="true">from</span><span data-lexical-text="true">&nbsp;users</span></code>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 gjezrb0y PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">``` select * from users</span></p>',
        );
      }
    });

    it('Can maintain indent when creating new lines', async () => {
      const {page, isRichText} = e2e;
      if (!isRichText) {
        return;
      }
      await focusEditor(page);
      await page.keyboard.type('``` alert(1);');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Tab');
      await page.keyboard.type('alert(2);');
      await page.keyboard.press('Enter');
      await assertHTML(
        page,
        '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp qm54mken gatxiiaj PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">alert</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenProperty hteo0ag1" data-lexical-text="true">1</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">alert</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenProperty hteo0ag1" data-lexical-text="true">2</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span><br><br><span data-lexical-text="true">	</span></code>',
      );
    });

    it('Can move around lines with option+arrow keys', async () => {
      const abcHTML =
        '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp qm54mken gatxiiaj PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">a</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span><br><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">b</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span><br><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">c</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span></code>';
      const bcaHTML =
        '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp qm54mken gatxiiaj PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">b</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span><br><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">c</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span><br><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">a</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span></code>';
      const endOfFirstLine = {
        anchorPath: [0, 3, 0],
        anchorOffset: 1,
        focusPath: [0, 3, 0],
        focusOffset: 1,
      };
      const endOfLastLine = {
        anchorPath: [0, 13, 0],
        anchorOffset: 1,
        focusPath: [0, 13, 0],
        focusOffset: 1,
      };
      const {page, isRichText} = e2e;
      if (!isRichText) {
        return;
      }
      await focusEditor(page);
      await page.keyboard.type('``` a();\nb();\nc();');
      await assertHTML(page, abcHTML);
      await assertSelection(page, endOfLastLine);
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
      // Workaround for #1173: just insert and remove a space to fix Firefox losing the selection
      await page.keyboard.type(' ');
      await page.keyboard.press('Backspace');
      await assertSelection(page, endOfFirstLine);
      // End workaround
      // Ensure attempting to move a line up at the top of a codeblock no-ops
      await page.keyboard.down('Alt');
      await page.keyboard.press('ArrowUp');
      await assertSelection(page, endOfFirstLine);
      await assertHTML(page, abcHTML);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await assertSelection(page, endOfLastLine);
      // Can't move a line down and out of codeblock
      await assertHTML(page, bcaHTML);
      await page.keyboard.press('ArrowDown');
      await assertSelection(page, endOfLastLine);
      await assertHTML(page, bcaHTML);
    });

    /**
     * Code example for tests:
     *
     * function run() {
     *   return [null, undefined, 2, ""];
     * }
     *
     */
    const EXPECTED_HTML =
      '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp qm54mken gatxiiaj PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span class="PlaygroundEditorTheme__tokenAttr f7xs5s0g" data-lexical-text="true">function</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">run</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">{</span><br><span data-lexical-text="true">  </span><span class="PlaygroundEditorTheme__tokenAttr f7xs5s0g" data-lexical-text="true">return</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">[</span><span class="PlaygroundEditorTheme__tokenAttr f7xs5s0g" data-lexical-text="true">null</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">,</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenAttr f7xs5s0g" data-lexical-text="true">undefined</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">,</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenProperty hteo0ag1" data-lexical-text="true">2</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">,</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenSelector bphgtf0p" data-lexical-text="true">""</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">]</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span><br><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">}</span></code>';
    const CODE_PASTING_TESTS: Array<{
      name: String,
      pastedHTML: String,
      expectedHTML: string,
    }> = [
      {
        name: 'VS Code',
        pastedHTML: `<meta charset='utf-8'><div style="color: #d4d4d4;background-color: #1e1e1e;font-family: Menlo, Monaco, 'Courier New', monospace;font-weight: normal;font-size: 12px;line-height: 18px;white-space: pre;"><div><span style="color: #569cd6;">function</span><span style="color: #d4d4d4;"> </span><span style="color: #dcdcaa;">run</span><span style="color: #d4d4d4;">() {</span></div><div><span style="color: #d4d4d4;">  </span><span style="color: #c586c0;">return</span><span style="color: #d4d4d4;"> [</span><span style="color: #569cd6;">null</span><span style="color: #d4d4d4;">, </span><span style="color: #569cd6;">undefined</span><span style="color: #d4d4d4;">, </span><span style="color: #b5cea8;">2</span><span style="color: #d4d4d4;">, </span><span style="color: #ce9178;">""</span><span style="color: #d4d4d4;">];</span></div><div><span style="color: #d4d4d4;">}</span></div></div>`,
        expectedHTML: EXPECTED_HTML,
      },
      {
        name: 'Quip',
        pastedHTML: `<meta charset='utf-8'><pre>function run() {<br>  return [null, undefined, 2, ""];<br>}</pre>`,
        expectedHTML: EXPECTED_HTML,
      },
      {
        name: 'WebStorm / Idea',
        pastedHTML: `<html><head><meta http-equiv="content-type" content="text/html; charset=UTF-8"></head><body><pre style="background-color:#2b2b2b;color:#a9b7c6;font-family:'JetBrains Mono',monospace;font-size:9.8pt;"><span style="color:#cc7832;">function&#32;</span><span style="color:#ffc66d;">run</span>()&#32;{<br>&#32;&#32;<span style="color:#cc7832;">return&#32;</span>[<span style="color:#cc7832;">null,&#32;undefined,&#32;</span><span style="color:#6897bb;">2</span><span style="color:#cc7832;">,&#32;</span><span style="color:#6a8759;">""</span>]<span style="color:#cc7832;">;<br></span>}</pre></body></html>`,
        expectedHTML: EXPECTED_HTML,
      },
      {
        name: 'Postman IDE',
        pastedHTML: `<meta charset='utf-8'><div style="color: #000000;background-color: #fffffe;font-family: Menlo, Monaco, 'Courier New', monospace;font-weight: normal;font-size: 12px;line-height: 18px;white-space: pre;"><div><span style="color: #800555;font-weight: bold;">function</span><span style="color: #000000;"> run() {</span></div><div><span style="color: #000000;">  </span><span style="color: #800555;font-weight: bold;">return</span><span style="color: #000000;"> [</span><span style="color: #800555;font-weight: bold;">null</span><span style="color: #000000;">, </span><span style="color: #800555;font-weight: bold;">undefined</span><span style="color: #000000;">, </span><span style="color: #ff00aa;">2</span><span style="color: #000000;">, </span><span style="color: #2a00ff;">""</span><span style="color: #000000;">];</span></div><div><span style="color: #000000;">}</span></div></div>`,
        expectedHTML: EXPECTED_HTML,
      },
      {
        name: 'Slack message',
        pastedHTML: `<meta charset='utf-8'><pre class="c-mrkdwn__pre" data-stringify-type="pre" style="box-sizing: inherit; margin: 4px 0px; padding: 8px; --saf-0:rgba(var(--sk_foreground_low,29,28,29),0.13); font-size: 12px; line-height: 1.50001; font-variant-ligatures: none; white-space: pre-wrap; overflow-wrap: break-word; word-break: normal; tab-size: 4; font-family: Monaco, Menlo, Consolas, &quot;Courier New&quot;, monospace !important; border: 1px solid var(--saf-0); border-radius: 4px; background: rgba(var(--sk_foreground_min,29,28,29),0.04); counter-reset: list-0 0 list-1 0 list-2 0 list-3 0 list-4 0 list-5 0 list-6 0 list-7 0 list-8 0 list-9 0; color: rgb(29, 28, 29); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">function run() {\n  return [null, undefined, 2, ""];\n}</pre>`,
        expectedHTML: EXPECTED_HTML,
      },
      {
        name: 'CodeHub',
        pastedHTML: `<meta charset='utf-8'><div style="color: #000000;background-color: #fffffe;font-family: 'monaco,monospace', Menlo, Monaco, 'Courier New', monospace;font-weight: normal;font-size: 13px;line-height: 20px;white-space: pre;"><div><span style="color: #ff0000;">const</span><span style="color: #000000;"> </span><span style="color: #800000;">Lexical</span><span style="color: #000000;"> = </span><span style="color: #383838;">requireCond</span><span style="color: #000000;">(</span><span style="color: #863b00;">'gk'</span><span style="color: #000000;">, </span><span style="color: #863b00;">'runtime_is_dev'</span><span style="color: #000000;">, {</span></div><div><span style="color: #000000;">  </span><span style="color: #863b00;">true</span><span style="color: #000000;">: </span><span style="color: #863b00;">'Lexical.dev'</span><span style="color: #000000;">,</span></div><div><span style="color: #000000;">  </span><span style="color: #863b00;">false</span><span style="color: #000000;">: </span><span style="color: #863b00;">'Lexical.prod'</span><span style="color: #000000;">,</span></div><div><span style="color: #000000;">});</span></div></div>`,
        expectedHTML: `<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp qm54mken gatxiiaj PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span class="PlaygroundEditorTheme__tokenAttr f7xs5s0g" data-lexical-text="true">const</span><span data-lexical-text="true"> Lexical </span><span class="PlaygroundEditorTheme__tokenOperator lonyqbdx" data-lexical-text="true">=</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">requireCond</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenSelector bphgtf0p" data-lexical-text="true">'gk'</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">,</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenSelector bphgtf0p" data-lexical-text="true">'runtime_is_dev'</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">,</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">{</span><br><span data-lexical-text="true">  </span><span class="PlaygroundEditorTheme__tokenProperty hteo0ag1" data-lexical-text="true">true</span><span class="PlaygroundEditorTheme__tokenOperator lonyqbdx" data-lexical-text="true">:</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenSelector bphgtf0p" data-lexical-text="true">'Lexical.dev'</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">,</span><br><span data-lexical-text="true">  </span><span class="PlaygroundEditorTheme__tokenProperty hteo0ag1" data-lexical-text="true">false</span><span class="PlaygroundEditorTheme__tokenOperator lonyqbdx" data-lexical-text="true">:</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenSelector bphgtf0p" data-lexical-text="true">'Lexical.prod'</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">,</span><br><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">}</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span></code>`,
      },
      {
        name: 'GitHub / Gist',
        pastedHTML: `<meta charset='utf-8'><table class="highlight tab-size js-file-line-container js-code-nav-container js-tagsearch-file" data-tab-size="8" data-paste-markdown-skip="" data-tagsearch-lang="JavaScript" data-tagsearch-path="example.js" style="box-sizing: border-box; border-spacing: 0px; border-collapse: collapse; tab-size: 8; color: rgb(36, 41, 47); font-family: -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, Helvetica, Arial, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><tbody style="box-sizing: border-box;"><tr style="box-sizing: border-box;"><td id="file-example-js-LC1" class="blob-code blob-code-inner js-file-line" style="box-sizing: border-box; padding: 0px 10px; position: relative; line-height: 20px; vertical-align: top; overflow: visible; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; color: var(--color-fg-default); overflow-wrap: normal; white-space: pre;"><span class="pl-k" style="box-sizing: border-box; color: var(--color-prettylights-syntax-keyword);">function</span> <span class="pl-en" style="box-sizing: border-box; color: var(--color-prettylights-syntax-entity);">run</span><span class="pl-kos" style="box-sizing: border-box;">(</span><span class="pl-kos" style="box-sizing: border-box;">)</span> <span class="pl-kos" style="box-sizing: border-box;">{</span></td></tr><tr style="box-sizing: border-box; background-color: transparent;"><td id="file-example-js-L2" class="blob-num js-line-number js-code-nav-line-number" data-line-number="2" style="box-sizing: border-box; padding: 0px 10px; width: 50px; min-width: 50px; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; line-height: 20px; color: var(--color-fg-subtle); text-align: right; white-space: nowrap; vertical-align: top; cursor: pointer; user-select: none;"></td><td id="file-example-js-LC2" class="blob-code blob-code-inner js-file-line" style="box-sizing: border-box; padding: 0px 10px; position: relative; line-height: 20px; vertical-align: top; overflow: visible; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; color: var(--color-fg-default); overflow-wrap: normal; white-space: pre;">  <span class="pl-k" style="box-sizing: border-box; color: var(--color-prettylights-syntax-keyword);">return</span> <span class="pl-kos" style="box-sizing: border-box;">[</span><span class="pl-c1" style="box-sizing: border-box; color: var(--color-prettylights-syntax-constant);">null</span><span class="pl-kos" style="box-sizing: border-box;">,</span> <span class="pl-c1" style="box-sizing: border-box; color: var(--color-prettylights-syntax-constant);">undefined</span><span class="pl-kos" style="box-sizing: border-box;">,</span> <span class="pl-c1" style="box-sizing: border-box; color: var(--color-prettylights-syntax-constant);">2</span><span class="pl-kos" style="box-sizing: border-box;">,</span> <span class="pl-s" style="box-sizing: border-box; color: var(--color-prettylights-syntax-string);">""</span><span class="pl-kos" style="box-sizing: border-box;">]</span><span class="pl-kos" style="box-sizing: border-box;">;</span></td></tr><tr style="box-sizing: border-box;"><td id="file-example-js-L3" class="blob-num js-line-number js-code-nav-line-number" data-line-number="3" style="box-sizing: border-box; padding: 0px 10px; width: 50px; min-width: 50px; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; line-height: 20px; color: var(--color-fg-subtle); text-align: right; white-space: nowrap; vertical-align: top; cursor: pointer; user-select: none;"></td><td id="file-example-js-LC3" class="blob-code blob-code-inner js-file-line" style="box-sizing: border-box; padding: 0px 10px; position: relative; line-height: 20px; vertical-align: top; overflow: visible; font-family: ui-monospace, SFMono-Regular, &quot;SF Mono&quot;, Menlo, Consolas, &quot;Liberation Mono&quot;, monospace; font-size: 12px; color: var(--color-fg-default); overflow-wrap: normal; white-space: pre;"><span class="pl-kos" style="box-sizing: border-box;">}</span></td></tr></tbody></table>`,
        expectedHTML: EXPECTED_HTML,
      },
    ];

    CODE_PASTING_TESTS.forEach((testCase, i) => {
      it(`Code block html paste: ${testCase.name}`, async () => {
        const {page, isRichText} = e2e;

        if (!isRichText) {
          return;
        }

        await focusEditor(page);
        await pasteFromClipboard(page, {
          'text/html': testCase.pastedHTML,
        });
        await assertHTML(page, testCase.expectedHTML);
      });
    });
  });
});
