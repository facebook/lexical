/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  isDOMCapturingSelection,
  isDOMUnmanaged,
  setDOMUnmanaged,
} from 'lexical';
import {
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test} from 'vitest';

function createEditor(): LexicalEditorWithDispose {
  const editor = buildEditorFromExtensions({
    $initialEditorState: () => {
      $getRoot()
        .clear()
        .append($createParagraphNode().append($createTextNode('hello')));
    },
    dependencies: [RichTextExtension],
    name: 'test',
    nodes: [TestDecoratorNode],
  });
  editor.setRootElement(document.createElement('div'));
  return editor;
}

describe('setDOMUnmanaged options (Issue #8584)', () => {
  test('default options: marks unmanaged, leaves captureSelection off', () => {
    using editor = createEditor();
    const dom = document.createElement('div');
    setDOMUnmanaged(dom);
    expect(isDOMUnmanaged(dom)).toBe(true);
    editor.read(() => {
      assert(!isDOMCapturingSelection(dom, editor));
    });
  });

  test('captureSelection: true marks both unmanaged and capturing', () => {
    using editor = createEditor();
    const dom = document.createElement('div');
    setDOMUnmanaged(dom, {captureSelection: true});
    expect(isDOMUnmanaged(dom)).toBe(true);
    editor.read(() => {
      assert(isDOMCapturingSelection(dom, editor));
    });
  });

  test('captureSelection: false equivalent to default', () => {
    using editor = createEditor();
    const dom = document.createElement('div');
    setDOMUnmanaged(dom, {captureSelection: false});
    expect(isDOMUnmanaged(dom)).toBe(true);
    editor.read(() => {
      assert(!isDOMCapturingSelection(dom, editor));
    });
  });

  test('captureSelection: false clears an existing flag', () => {
    using editor = createEditor();
    const dom = document.createElement('div');
    setDOMUnmanaged(dom, {captureSelection: true});
    setDOMUnmanaged(dom, {captureSelection: false});
    editor.read(() => {
      assert(!isDOMCapturingSelection(dom, editor));
    });
  });

  test('descendant cannot opt out when ancestor is captured (walk)', () => {
    using editor = createEditor();
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    setDOMUnmanaged(parent, {captureSelection: true});
    setDOMUnmanaged(child, {captureSelection: false});
    editor.read(() => {
      assert(isDOMCapturingSelection(child, editor));
    });
  });

  test('unmarked DOM is neither unmanaged nor capturing', () => {
    using editor = createEditor();
    const dom = document.createElement('div');
    expect(isDOMUnmanaged(dom)).toBe(false);
    editor.read(() => {
      assert(!isDOMCapturingSelection(dom, editor));
    });
  });
});

describe('isDOMCapturingSelection (Issue #8584)', () => {
  test('captureSelection-marked DOM returns true', () => {
    using editor = createEditor();
    const widget = document.createElement('div');
    setDOMUnmanaged(widget, {captureSelection: true});
    editor.read(() => {
      assert(isDOMCapturingSelection(widget, editor));
    });
  });

  test('descendant of captureSelection-marked DOM returns true', () => {
    using editor = createEditor();
    const widget = document.createElement('div');
    const child = document.createElement('span');
    widget.appendChild(child);
    setDOMUnmanaged(widget, {captureSelection: true});
    editor.read(() => {
      assert(isDOMCapturingSelection(child, editor));
    });
  });

  test('unmanaged-only DOM (no captureSelection) is not captured', () => {
    using editor = createEditor();
    const widget = document.createElement('div');
    setDOMUnmanaged(widget);
    editor.read(() => {
      assert(!isDOMCapturingSelection(widget, editor));
    });
  });

  test('DecoratorNode subtree still returns true (BC preserved)', () => {
    using editor = createEditor();
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTestDecoratorNode()));
      },
      {discrete: true},
    );
    editor.read(() => {
      const rootElement = editor.getRootElement();
      const decoratorDom = rootElement!.querySelector(
        '[data-lexical-decorator]',
      );
      expect(decoratorDom).not.toBeNull();
      assert(isDOMCapturingSelection(decoratorDom!, editor));
    });
  });

  test('plain DOM outside the editor returns false', () => {
    using editor = createEditor();
    const dom = document.createElement('div');
    editor.read(() => {
      assert(!isDOMCapturingSelection(dom, editor));
    });
  });

  test('editor root element returns false', () => {
    using editor = createEditor();
    const rootElement = editor.getRootElement();
    editor.read(() => {
      assert(!isDOMCapturingSelection(rootElement!, editor));
    });
  });

  test('walk aborts at a Lexical-node DOM — ancestor capture above editor does not leak in', () => {
    using editor = createEditor();
    // outerWrapper is non-Lexical scaffolding that wraps the editor; mark it
    // as captureSelection. The walk from a text DOM inside the editor must
    // NOT see this marker because there is a Lexical-node DOM (the
    // paragraph or text element) on the path that aborts it.
    const outerWrapper = document.createElement('div');
    setDOMUnmanaged(outerWrapper, {captureSelection: true});
    const rootElement = editor.getRootElement()!;
    outerWrapper.appendChild(rootElement);
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTextNode('hello')));
      },
      {discrete: true},
    );
    editor.read(() => {
      const textSpan = rootElement.querySelector('[data-lexical-text]');
      expect(textSpan).not.toBeNull();
      assert(!isDOMCapturingSelection(textSpan!, editor));
    });
  });
});
