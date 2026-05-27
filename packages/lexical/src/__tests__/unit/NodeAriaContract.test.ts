/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  createEditor,
  ParagraphNode,
  type SerializedTextNode,
  TextNode,
} from 'lexical';
import {afterEach, describe, expect, test} from 'vitest';

class AriaTextNode extends TextNode {
  static getType(): string {
    return 'aria-test-text';
  }
  static clone(node: AriaTextNode): AriaTextNode {
    return new AriaTextNode(node.__text, node.__key);
  }
  static importJSON(serialized: SerializedTextNode): AriaTextNode {
    return new AriaTextNode(serialized.text);
  }
  getRole(): string {
    return 'note';
  }
  getAriaLabel(): string {
    return `Custom: ${this.__text}`;
  }
}

function $createAriaTextNode(text: string): AriaTextNode {
  return new AriaTextNode(text);
}

describe('LexicalNode ARIA contract', () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (container !== null) {
      document.body.removeChild(container);
      container = null;
    }
  });

  function mountEditor() {
    container = document.createElement('div');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    const editor = createEditor({
      namespace: '',
      nodes: [ParagraphNode, TextNode, AriaTextNode],
      onError: e => {
        throw e;
      },
    });
    editor.setRootElement(container);
    return editor;
  }

  test('default node has neither role nor aria-label set by the reconciler', () => {
    const editor = mountEditor();
    editor.update(
      () => {
        const root = $getRoot().clear();
        const para = $createParagraphNode().append(
          $createTextNode('plain text'),
        );
        root.append(para);
      },
      {discrete: true},
    );
    const paragraphDOM = container!.querySelector('p')!;
    expect(paragraphDOM.hasAttribute('role')).toBe(false);
    expect(paragraphDOM.hasAttribute('aria-label')).toBe(false);
    const textSpan = container!.querySelector('span')!;
    expect(textSpan.hasAttribute('role')).toBe(false);
    expect(textSpan.hasAttribute('aria-label')).toBe(false);
  });

  test('subclass-supplied role and aria-label are applied at createDOM', () => {
    const editor = mountEditor();
    editor.update(
      () => {
        const root = $getRoot().clear();
        const para = $createParagraphNode().append(
          $createAriaTextNode('hello'),
        );
        root.append(para);
      },
      {discrete: true},
    );
    const span = container!.querySelector('span[data-lexical-text="true"]')!;
    expect(span.getAttribute('role')).toBe('note');
    expect(span.getAttribute('aria-label')).toBe('Custom: hello');
  });

  test('aria-label tracks node text on subsequent updates', () => {
    const editor = mountEditor();
    editor.update(
      () => {
        const root = $getRoot().clear();
        const para = $createParagraphNode().append(
          $createAriaTextNode('hello'),
        );
        root.append(para);
      },
      {discrete: true},
    );
    const span = container!.querySelector(
      'span[data-lexical-text="true"]',
    )! as HTMLElement;
    expect(span.getAttribute('aria-label')).toBe('Custom: hello');

    editor.update(
      () => {
        const para = $getRoot().getFirstChildOrThrow();
        if ($isElementNode(para)) {
          const text = para.getFirstChild();
          if (text !== null) {
            (text as AriaTextNode).setTextContent('world');
          }
        }
      },
      {discrete: true},
    );
    const spanAfter = container!.querySelector(
      'span[data-lexical-text="true"]',
    )! as HTMLElement;
    expect(spanAfter.getAttribute('aria-label')).toBe('Custom: world');
  });

  test('external attribute mutation is restored on the next reconcile', () => {
    const editor = mountEditor();
    editor.update(
      () => {
        const root = $getRoot().clear();
        const para = $createParagraphNode().append(
          $createAriaTextNode('hello'),
        );
        root.append(para);
      },
      {discrete: true},
    );
    const span = container!.querySelector(
      'span[data-lexical-text="true"]',
    )! as HTMLElement;
    expect(span.getAttribute('role')).toBe('note');

    // An external party (browser extension, host code, etc.) clears our
    // attribute outside the reconciler.
    span.removeAttribute('role');
    expect(span.getAttribute('role')).toBeNull();

    // Any next-cycle dirty mark on the node re-runs syncAriaContract via
    // updateDOM and restores the attribute.
    editor.update(
      () => {
        const para = $getRoot().getFirstChildOrThrow();
        if ($isElementNode(para)) {
          const text = para.getFirstChild();
          if (text !== null) {
            (text as AriaTextNode).setTextContent('hello-2');
          }
        }
      },
      {discrete: true},
    );
    const spanAfter = container!.querySelector(
      'span[data-lexical-text="true"]',
    )! as HTMLElement;
    expect(spanAfter.getAttribute('role')).toBe('note');
  });
});
