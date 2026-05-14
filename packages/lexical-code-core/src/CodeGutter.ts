/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {effect, namedSignals} from '@lexical/extension';
import {
  $getNodeByKey,
  $isLineBreakNode,
  defineExtension,
  mergeRegister,
  safeCast,
} from 'lexical';

import {CodeExtension} from './CodeExtension';
import {$isCodeNode, CodeNode} from './CodeNode';

/**
 * Update the gutter for a given {@link CodeNode}.
 *
 * In classic mode (no word-wrap) the line numbers are written into the
 * `data-gutter` attribute on the code element so they can be rendered by
 * a CSS pseudo-element. In word-wrap mode, the gutter is a real DOM
 * element (`.code-gutter`) populated with one `<span>` per line; the
 * span heights are then synced to the wrapped content lines via
 * {@link syncGutterHeights}.
 *
 * The DOM contract (`.code-gutter` / `.code-content` children) is
 * established by {@link CodeNode#createDOM} when word-wrap is enabled.
 */
function updateCodeGutter(node: CodeNode, editor: LexicalEditor): void {
  const codeElement = editor.getElementByKey(node.getKey());
  if (codeElement === null) {
    return;
  }
  const children = node.getChildren();
  const childrenLength = children.length;
  // @ts-ignore: internal field
  if (childrenLength === codeElement.__cachedChildrenLength) {
    // Avoid updating the attribute if the children length hasn't changed.
    return;
  }
  // @ts-ignore:: internal field
  codeElement.__cachedChildrenLength = childrenLength;
  let count = 1;
  for (let i = 0; i < childrenLength; i++) {
    if ($isLineBreakNode(children[i])) {
      count++;
    }
  }

  if (node.getWordWrap()) {
    // Word-wrap mode: update real DOM gutter elements
    const gutterEl = codeElement.querySelector('.code-gutter');
    if (gutterEl) {
      // Sync number of gutter line elements
      while (gutterEl.children.length > count) {
        gutterEl.removeChild(gutterEl.lastChild!);
      }
      while (gutterEl.children.length < count) {
        const span = document.createElement('span');
        span.textContent = String(gutterEl.children.length + 1);
        gutterEl.appendChild(span);
      }
      // Update text content for all lines
      for (let i = 0; i < count; i++) {
        const span = gutterEl.children[i] as HTMLElement;
        const lineNum = String(i + 1);
        if (span.textContent !== lineNum) {
          span.textContent = lineNum;
        }
      }
      // Sync heights after DOM update
      syncGutterHeights(codeElement);
    }
  } else {
    // Classic mode: data-gutter attribute
    let gutter = '1';
    for (let i = 1; i < count; i++) {
      gutter += '\n' + (i + 1);
    }
    codeElement.setAttribute('data-gutter', gutter);
  }
}

/**
 * Measure the height of each logical code line in the `.code-content`
 * subtree (lines are separated by `<br>` elements that LineBreakNode
 * renders) and apply the measured height to the matching `.code-gutter`
 * span so the gutter line numbers stay vertically aligned with their
 * (possibly wrapped) content lines.
 */
function syncGutterHeights(codeElement: HTMLElement): void {
  const gutterEl = codeElement.querySelector('.code-gutter');
  const contentEl = codeElement.querySelector('.code-content');
  if (!gutterEl || !contentEl) {
    return;
  }

  const children = contentEl.childNodes;
  let lineStart = 0;

  // Measure heights of each logical line in the content
  // Lines are separated by <br> elements (LineBreakNode renders as <br>)
  const lineHeights: number[] = [];
  const range = document.createRange();

  for (let i = 0; i <= children.length; i++) {
    const child = children[i];
    const isEnd = i === children.length;
    const isBreak = child && child.nodeName === 'BR';

    if (isEnd || isBreak) {
      // Measure height of this logical line
      if (lineStart < i) {
        range.setStartBefore(children[lineStart]);
        range.setEndAfter(children[i - 1]);
        const rects = range.getClientRects();
        let height = 0;
        if (rects.length > 0) {
          const first = rects[0];
          const last = rects[rects.length - 1];
          height = last.bottom - first.top;
        }
        lineHeights.push(height);
      } else {
        // Empty line — use line-height
        lineHeights.push(0);
      }
      lineStart = i + 1;
    }
  }

  // Apply heights to gutter spans
  for (let i = 0; i < gutterEl.children.length && i < lineHeights.length; i++) {
    const span = gutterEl.children[i] as HTMLElement;
    const h = lineHeights[i];
    if (h > 0) {
      span.style.height = h + 'px';
      span.style.lineHeight = h + 'px';
    } else {
      span.style.height = '';
      span.style.lineHeight = '';
    }
  }
}

/**
 * Register a {@link CodeNode} mutation listener that keeps the code
 * block gutter (line numbers + their heights in word-wrap mode) in sync
 * with the editor state.
 *
 * Previously this code was duplicated inside both
 * `@lexical/code-prism` and `@lexical/code-shiki`; consolidating it
 * here lets either highlighter — or any other consumer that depends on
 * `@lexical/code-core` — share the same DOM contract established by
 * {@link CodeNode#createDOM}.
 *
 * In headless mode this is a no-op (no DOM to update); the returned
 * cleanup function is still safe to call.
 */
export function registerCodeGutter(editor: LexicalEditor): () => void {
  // Headless editors have no DOM to mutate.
  if (editor._headless === true) {
    return () => {};
  }
  const resizeObservers = new Map<string, ResizeObserver>();

  return mergeRegister(
    editor.registerMutationListener(
      CodeNode,
      mutations => {
        editor.getEditorState().read(() => {
          for (const [key, type] of mutations) {
            if (type === 'destroyed') {
              // Clean up ResizeObserver for destroyed nodes
              const observer = resizeObservers.get(key);
              if (observer) {
                observer.disconnect();
                resizeObservers.delete(key);
              }
            } else {
              const node = $getNodeByKey(key);
              if (node !== null && $isCodeNode(node)) {
                updateCodeGutter(node, editor);

                // Set up ResizeObserver for word-wrap mode
                const codeElement = editor.getElementByKey(key);
                if (node.getWordWrap() && codeElement) {
                  if (!resizeObservers.has(key)) {
                    const contentEl =
                      codeElement.querySelector('.code-content');
                    if (contentEl) {
                      const observer = new ResizeObserver(() => {
                        syncGutterHeights(codeElement);
                      });
                      observer.observe(contentEl);
                      resizeObservers.set(key, observer);
                    }
                  }
                } else {
                  // Clean up observer if word wrap was disabled
                  const observer = resizeObservers.get(key);
                  if (observer) {
                    observer.disconnect();
                    resizeObservers.delete(key);
                  }
                }
              }
            }
          }
        });
      },
      {skipInitialization: false},
    ),
    // Cleanup all observers on unmount
    () => {
      for (const observer of resizeObservers.values()) {
        observer.disconnect();
      }
      resizeObservers.clear();
    },
  );
}

export interface CodeGutterConfig {
  /**
   * When true, the gutter mutation listener is not registered on the
   * editor. This signal can be flipped at runtime to enable or disable
   * gutter rendering without rebuilding the editor.
   */
  disabled: boolean;
}

/**
 * Manages the line-number gutter for {@link "@lexical/code-core".CodeNode}
 * blocks (both classic `data-gutter` mode and the word-wrap mode that
 * uses real DOM `.code-gutter` / `.code-content` children).
 *
 * Both {@link "@lexical/code-shiki".CodeShikiExtension} and
 * {@link "@lexical/code-prism".CodePrismExtension} declare this as a
 * dependency, mirroring how
 * {@link "@lexical/code-core".CodeIndentExtension} is consumed, so the
 * gutter is activated automatically alongside either highlighter.
 */
export const CodeGutterExtension = defineExtension({
  build: (_editor, config) => namedSignals(config),
  config: safeCast<CodeGutterConfig>({
    disabled: false,
  }),
  dependencies: [CodeExtension],
  name: '@lexical/code-gutter',
  register: (editor, _config, state) => {
    const stores = state.getOutput();
    return effect(() => {
      if (stores.disabled.value) {
        return;
      }
      return registerCodeGutter(editor);
    });
  },
});
