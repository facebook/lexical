/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Characterization tests for the managed-linebreak img hack.
 *
 * On WebKit and desktop Chromium (since #7158), when a block's last child is
 * an *inline* DecoratorNode the managed line break is rendered as an in-flow
 * `<img>` followed by the usual `<br>` (see
 * `ElementDOMSlot.insertManagedLineBreak`'s `withEdgeImg`), giving the
 * browser an editable inline box between the `contenteditable=false`
 * decorator and the break. In Chromium that box is what lets a mouse drag
 * start to the right of a line's last inline decorator, which
 * Issue7158MouseDrag.test.ts covers. The Safari caret behavior it fixes is
 * not reproduced by headless Linux WebKit, so these tests pin the
 * *mechanism* — the DOM contract of `setManagedLineBreak('decorator')` on each
 * real engine — such that removing or breaking the hack in WebKit fails
 * loudly instead of silently.
 *
 * Running in browser mode means the real environment detection is live: the
 * webkit and chromium instances assert the img+br shape and firefox asserts
 * the plain-br shape, all from the same file.
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $create,
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  DecoratorNode,
} from 'lexical';
import {assert, describe, expect, onTestFinished, test} from 'vitest';
import {server} from 'vitest/browser';

import {$assertNodeType} from '../utils/assertNodeType';

// From the browser the test runs in rather than from the editor's own
// detection, so that a detection that stops matching an engine fails here.
const EXPECTS_IMG_HACK = server.browser !== 'firefox';
const DECORATOR_LINEBREAK = EXPECTS_IMG_HACK ? ['img', 'br'] : ['br'];

class TestInlineDecoratorNode extends DecoratorNode<null> {
  $config() {
    return this.config('test_inline_decorator', {extends: DecoratorNode});
  }
  createDOM(): HTMLElement {
    return document.createElement('span');
  }
  updateDOM(): false {
    return false;
  }
  isInline(): boolean {
    return true;
  }
  decorate(): null {
    return null;
  }
}

const ext = defineExtension({
  dependencies: [RichTextExtension],
  name: '[webkit-linebreak-img]',
  nodes: [TestInlineDecoratorNode],
});

function mountEditor() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const contentEditable = document.createElement('div');
  contentEditable.contentEditable = 'true';
  container.appendChild(contentEditable);

  const editor = buildEditorFromExtensions(ext);
  editor.setRootElement(contentEditable);

  onTestFinished(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
  });

  return {contentEditable, editor};
}

/** The managed-linebreak scaffold of the editor's blocks, as tag names. */
function linebreakScaffold(contentEditable: HTMLElement): string[] {
  return Array.from(
    contentEditable.querySelectorAll(
      'p [data-lexical-managed-linebreak="true"]',
    ),
    node => node.nodeName.toLowerCase(),
  );
}

describe('managed-linebreak img hack (inline decorator last child)', () => {
  test('a block ending with an inline decorator gets the engine-appropriate scaffold', () => {
    const {contentEditable, editor} = mountEditor();
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('text'),
              new TestInlineDecoratorNode(),
            ),
          );
      },
      {discrete: true},
    );

    // WebKit and desktop Chromium: an in-flow img gives the browser an
    // editable inline box between the contenteditable=false decorator and the
    // break, and must precede the br (the e2e selection utils rely on that
    // order). Everywhere else: plain br.
    expect(linebreakScaffold(contentEditable)).toEqual(DECORATOR_LINEBREAK);
    const img = contentEditable.querySelector(
      'p img[data-lexical-managed-linebreak="true"]',
    ) as HTMLImageElement | null;
    if (EXPECTS_IMG_HACK) {
      // In-flow on purpose — unlike the absolute-positioned #8922 boundary
      // anchor, this one participates in the line box.
      expect(img).not.toBeNull();
      expect(img!.style.getPropertyValue('display')).toBe('inline');
      expect(img!.style.getPropertyValue('position')).toBe('');
    } else {
      expect(img).toBeNull();
    }
  });

  test('a block ending with a line break gets a plain br on every engine', () => {
    const {contentEditable, editor} = mountEditor();
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('text'),
              $createLineBreakNode(),
            ),
          );
      },
      {discrete: true},
    );

    // 'line-break' and 'empty' shapes never get the img — the hack is scoped
    // to the 'decorator' last-child kind. (The LineBreakNode's own <br> is a
    // keyed node, not managed scaffolding, so only the terminating <br>
    // carries the attribute.)
    expect(linebreakScaffold(contentEditable)).toEqual(['br']);
  });

  test('an empty block gets a plain br on every engine', () => {
    const {contentEditable, editor} = mountEditor();
    editor.update(
      () => {
        $getRoot().clear().append($createParagraphNode());
      },
      {discrete: true},
    );

    expect(linebreakScaffold(contentEditable)).toEqual(['br']);
  });

  test('the scaffold is dropped when the decorator stops being the last child', () => {
    const {contentEditable, editor} = mountEditor();
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('text'),
              new TestInlineDecoratorNode(),
            ),
          );
      },
      {discrete: true},
    );
    expect(linebreakScaffold(contentEditable)).toEqual(DECORATOR_LINEBREAK);

    editor.update(
      () => {
        $assertNodeType($getRoot().getFirstChildOrThrow(), $isParagraphNode)
          .getLastChildOrThrow()
          .insertAfter($createTextNode('after'));
      },
      {discrete: true},
    );

    // Text now terminates the block: no managed line break at all.
    expect(linebreakScaffold(contentEditable)).toEqual([]);
  });

  test('the scaffold swaps to plain br when the decorator is replaced by a line break', () => {
    const {contentEditable, editor} = mountEditor();
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('text'),
              new TestInlineDecoratorNode(),
            ),
          );
      },
      {discrete: true},
    );
    expect(linebreakScaffold(contentEditable)).toEqual(DECORATOR_LINEBREAK);

    editor.update(
      () => {
        $assertNodeType($getRoot().getFirstChildOrThrow(), $isParagraphNode)
          .getLastChildOrThrow()
          .replace($createLineBreakNode());
      },
      {discrete: true},
    );

    expect(linebreakScaffold(contentEditable)).toEqual(['br']);
  });
});

/** The paragraph's DOM children, with the reconciler's scaffolding named. */
function paragraphShape(contentEditable: HTMLElement): string[] {
  const paragraph = contentEditable.querySelector('p');
  assert(paragraph !== null);
  return Array.from(paragraph.childNodes, node => {
    assert(node instanceof Element);
    if (node.hasAttribute('data-lexical-decorator-boundary')) {
      return 'anchor';
    }
    if (node.hasAttribute('data-lexical-managed-linebreak')) {
      return `managed-${node.nodeName.toLowerCase()}`;
    }
    return node.hasAttribute('data-lexical-decorator') ? 'decorator' : 'text';
  });
}

describe('scaffolding removed from outside the reconciler is restored', () => {
  const EXPECTED_SHAPE = [
    ...(EXPECTS_IMG_HACK ? ['anchor'] : []),
    'decorator',
    'text',
    'decorator',
    ...DECORATOR_LINEBREAK.map(tag => `managed-${tag}`),
  ];

  function mountDecoratorLine() {
    const mounted = mountEditor();
    mounted.editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $create(TestInlineDecoratorNode),
              $createTextNode('text'),
              $create(TestInlineDecoratorNode),
            ),
          );
      },
      {discrete: true},
    );
    expect(paragraphShape(mounted.contentEditable)).toEqual(EXPECTED_SHAPE);
    return mounted;
  }

  test.each([
    ...(EXPECTS_IMG_HACK
      ? [
          ['the leading boundary anchor', '[data-lexical-decorator-boundary]'],
          ['the managed line break img', 'img[data-lexical-managed-linebreak]'],
        ]
      : []),
    ['the managed line break br', 'br[data-lexical-managed-linebreak]'],
  ])('%s', async (_name, selector) => {
    const {contentEditable} = mountDecoratorLine();
    const removed = contentEditable.querySelector(`p > ${selector}`);
    assert(removed !== null, `expected ${selector} in the scaffold`);
    removed.remove();
    // The MutationObserver delivers its records, and the editor restores the
    // scaffolding, after this task.
    await expect
      .poll(() => paragraphShape(contentEditable))
      .toEqual(EXPECTED_SHAPE);
  });
});
