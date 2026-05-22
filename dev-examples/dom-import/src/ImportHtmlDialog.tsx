/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$generateNodesFromDOMViaExtension} from '@lexical/html';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getRoot, $insertNodes} from 'lexical';
import {useCallback, useRef, useState} from 'react';

// Vite's `?raw` query inlines the file contents as a string at build
// time, so the dialog can ship the exact clipboard payloads (with the
// full <style> block, mso-list definitions, conditional comments,
// etc.) without escaping them into TS template literals.
import VSCODE_SAFARI_FIXTURE from './fixtures/vscode-safari.html?raw';
import WORD_FIXTURE from './fixtures/word.html?raw';

const SAMPLE_HTML =
  '<p>Paste raw HTML here, or load one of the bundled fixtures below.</p>';

export function ImportHtmlButton() {
  const [editor] = useLexicalComposerContext();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [replace, setReplace] = useState(true);

  const open = useCallback(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (textareaRef.current && !textareaRef.current.value) {
      textareaRef.current.value = SAMPLE_HTML;
    }
    dlg.showModal();
  }, []);

  const close = useCallback(() => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
  }, []);

  const doImport = useCallback(() => {
    const html = textareaRef.current ? textareaRef.current.value : '';
    if (!html.trim()) {
      close();
      return;
    }
    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(html, 'text/html');
      const nodes = $generateNodesFromDOMViaExtension(dom);
      if (replace) {
        $getRoot().clear().splice(0, 0, nodes);
      } else {
        $insertNodes(nodes);
      }
    });
    close();
  }, [editor, replace, close]);

  const fill = useCallback((html: string) => {
    if (textareaRef.current) {
      textareaRef.current.value = html;
    }
  }, []);

  return (
    <>
      <button
        type="button"
        className="toolbar-item spaced"
        onClick={open}
        aria-label="Import HTML">
        Import HTML
      </button>
      <dialog ref={dialogRef} className="import-dialog">
        <form method="dialog" onSubmit={e => e.preventDefault()}>
          <h2>Import HTML</h2>
          <p>
            Paste raw HTML below — handy when the source is a code editor or a
            GitHub issue body and the clipboard doesn't carry a
            <code> text/html </code>
            slot for the paste handler to consume.
          </p>
          <textarea
            ref={textareaRef}
            rows={12}
            spellCheck={false}
            autoComplete="off"
            placeholder="<p>...</p>"
          />
          <div className="import-dialog-controls">
            <button type="button" onClick={() => fill(WORD_FIXTURE)}>
              Load Word fixture
            </button>
            <button
              type="button"
              onClick={() => fill(VSCODE_SAFARI_FIXTURE)}
              title="A code block copied out of VS Code and pasted into Safari — flat sibling monospace+pre divs/brs with no wrapping monospace ancestor.">
              Load VS Code → Safari fixture
            </button>
            <label>
              <input
                type="checkbox"
                checked={replace}
                onChange={e => setReplace(e.target.checked)}
              />
              Replace document
            </label>
            <span className="import-dialog-spacer" />
            <button type="button" onClick={close}>
              Cancel
            </button>
            <button type="button" onClick={doImport} className="primary">
              Import
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
