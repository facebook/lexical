/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './styles.css';

import {ClipboardDOMImportExtension} from '@lexical/clipboard';
import {buildEditorFromExtensions} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {
  $generateHtmlFromNodes,
  $generateNodesFromDOMViaExtension,
} from '@lexical/html';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $setState,
  defineExtension,
} from 'lexical';

import {reviewedState, ReviewExtension} from './ReviewExtension';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <h1>Paragraph review</h1>
  <p>Place the cursor in a paragraph, then toggle its review status.</p>
  <button id="toggle-reviewed" type="button">Toggle reviewed</button>
  <div id="editor" contenteditable="true" role="textbox"
    aria-label="Paragraph review editor" aria-multiline="true"></div>
  <div class="actions">
    <button id="export-html" type="button">Export HTML</button>
    <button id="import-html" type="button">Import HTML</button>
  </div>
  <label for="html">HTML (export, edit, then import)</label>
  <textarea id="html" spellcheck="false"></textarea>
  <details>
    <summary>Editor state JSON</summary>
    <textarea id="json" aria-label="Editor state JSON" readonly></textarea>
  </details>
`;
const html = document.querySelector<HTMLTextAreaElement>('#html')!;
const json = document.querySelector<HTMLTextAreaElement>('#json')!;
const appExtension = defineExtension({
  $initialEditorState() {
    $getRoot().append(
      $createParagraphNode().append(
        $createTextNode(
          'Review this paragraph without creating a custom node.',
        ),
      ),
      $createParagraphNode().append(
        $createTextNode(
          'Export HTML and import it again to keep the review status.',
        ),
      ),
    );
  },
  dependencies: [
    ReviewExtension,
    HistoryExtension,
    ClipboardDOMImportExtension,
  ],
  name: '@lexical/examples/node-state-review',
  namespace: 'Paragraph Review',
  register(editor) {
    return editor.registerUpdateListener(({editorState}) => {
      json.value = JSON.stringify(editorState.toJSON(true), null, 2);
    });
  },
});
const editor = buildEditorFromExtensions(appExtension);
editor.setRootElement(document.getElementById('editor'));
const events = new AbortController();
const options = {signal: events.signal};

// Keep the editor's selection when clicking the toolbar with a pointer.
const toggle = document.getElementById('toggle-reviewed')!;
toggle.addEventListener('mousedown', event => event.preventDefault(), options);
toggle.addEventListener(
  'click',
  () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const paragraph = selection.anchor.getNode().getTopLevelElement();
        if ($isParagraphNode(paragraph)) {
          $setState(paragraph, reviewedState, reviewed => !reviewed);
        }
      }
    });
  },
  options,
);

document.getElementById('export-html')!.addEventListener(
  'click',
  () => {
    html.value = editor.read('latest', () => $generateHtmlFromNodes(editor));
  },
  options,
);

document.getElementById('import-html')!.addEventListener(
  'click',
  () => {
    const dom = new DOMParser().parseFromString(html.value, 'text/html');
    editor.update(() => {
      const nodes = $generateNodesFromDOMViaExtension(dom);
      $getRoot()
        .clear()
        .append(...nodes);
    });
  },
  options,
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    events.abort();
    editor.dispose();
  });
}
