/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {$generateNodesFromDOMViaExtension} from '@lexical/html';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $insertNodes,
  $isDecoratorNode,
  $isParagraphNode,
  defineExtension,
} from 'lexical';
import {
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, it} from 'vitest';

import {PlaygroundImportExtension} from '../../src/nodes/PlaygroundImportExtension';
import {CollapsibleExtension} from '../../src/plugins/CollapsibleExtension';
import {
  $createCollapsibleContainerNode,
  $isCollapsibleContainerNode,
  CollapsibleContainerNode,
} from '../../src/plugins/CollapsibleExtension/CollapsibleContainerNode';
import {
  $createCollapsibleContentNode,
  $isCollapsibleContentNode,
  CollapsibleContentNode,
} from '../../src/plugins/CollapsibleExtension/CollapsibleContentNode';
import {
  $createCollapsibleTitleNode,
  $isCollapsibleTitleNode,
  CollapsibleTitleNode,
} from '../../src/plugins/CollapsibleExtension/CollapsibleTitleNode';

// This deliberately omits CollapsibleExtension: those transforms (which
// unwrap a Container that isn't shaped exactly [Title, Content]) would
// hide whether the importer itself produced sane structure.
const CollapsibleImportTestExtension = defineExtension({
  $initialEditorState: null,
  dependencies: [PlaygroundImportExtension],
  name: '[test-collapsible-import]',
  nodes: [
    CollapsibleContainerNode,
    CollapsibleContentNode,
    CollapsibleTitleNode,
  ],
});

function $importHtml(html: string): void {
  const parser = new DOMParser();
  const dom = parser.parseFromString(html, 'text/html');
  $insertNodes($generateNodesFromDOMViaExtension(dom));
}

describe('CollapsibleContainerNode HTML import (issue #8407)', () => {
  describe('importDOM', () => {
    it('imports <details> with loose text body without crashing', () => {
      using editor = buildEditorFromExtensions(CollapsibleImportTestExtension);

      editor.update(
        () => {
          $getRoot().clear().select();
          $importHtml(
            '<details>\n' +
              '  <summary>Details</summary>\n' +
              '  Something small enough to escape casual notice.\n' +
              '</details>',
          );
        },
        {discrete: true},
      );

      editor.read(() => {
        const root = $getRoot();
        const container = root.getChildren().find($isCollapsibleContainerNode);
        assert(
          container != null,
          'CollapsibleContainerNode must be a child of RootNode',
        );
        const children = container.getChildren();
        expect(children.length).toBe(2);
        assert(
          $isCollapsibleTitleNode(children[0]),
          'First child must be CollapsibleTitleNode',
        );
        assert(
          $isCollapsibleContentNode(children[1]),
          'Second child must be CollapsibleContentNode',
        );
        expect(children[0].getTextContent()).toBe('Details');
        expect(children[1].getTextContent().trim()).toBe(
          'Something small enough to escape casual notice.',
        );
        // No `open` attribute on the source element should map to closed.
        expect(container.getOpen()).toBe(false);
      });
    });

    it('preserves the open attribute on import', () => {
      using editor = buildEditorFromExtensions(CollapsibleImportTestExtension);

      editor.update(
        () => {
          $getRoot().clear().select();
          $importHtml('<details open><summary>S</summary>body</details>');
        },
        {discrete: true},
      );

      editor.read(() => {
        const container = $getRoot()
          .getChildren()
          .find($isCollapsibleContainerNode)!;
        expect(container.getOpen()).toBe(true);
      });
    });

    it('handles <summary> appearing after body content', () => {
      using editor = buildEditorFromExtensions(CollapsibleImportTestExtension);

      editor.update(
        () => {
          $getRoot().clear().select();
          $importHtml(
            '<details><p>Body before</p><summary>Title</summary></details>',
          );
        },
        {discrete: true},
      );

      editor.read(() => {
        const container = $getRoot()
          .getChildren()
          .find($isCollapsibleContainerNode)!;
        const children = container.getChildren();
        expect(children.length).toBe(2);
        assert(
          $isCollapsibleTitleNode(children[0]),
          'First child must be CollapsibleTitleNode',
        );
        assert(
          $isCollapsibleContentNode(children[1]),
          'Second child must be CollapsibleContentNode',
        );
        expect(children[0].getTextContent()).toBe('Title');
        expect(children[1].getTextContent().trim()).toBe('Body before');
      });
    });

    it('imports <details> with no <summary> without crashing', () => {
      using editor = buildEditorFromExtensions(CollapsibleImportTestExtension);

      editor.update(
        () => {
          $getRoot().clear().select();
          $importHtml('<details>Just some loose text</details>');
        },
        {discrete: true},
      );

      editor.read(() => {
        const container = $getRoot()
          .getChildren()
          .find($isCollapsibleContainerNode)!;
        // The empty CollapsibleTitleNode created for missing <summary>
        // is removed by CollapsibleTitleNode's $transform, leaving the
        // body wrapped in a single CollapsibleContentNode. The crucial
        // invariant is that no raw TextNode sits directly under the
        // shadow root.
        const children = container.getChildren();
        expect(children.length).toBe(1);
        assert(
          $isCollapsibleContentNode(children[0]),
          'Sole child must be CollapsibleContentNode',
        );
        expect(children[0].getTextContent()).toBe('Just some loose text');
      });
    });

    it('imports <details> with summary and block body siblings', () => {
      using editor = buildEditorFromExtensions(CollapsibleImportTestExtension);

      editor.update(
        () => {
          $getRoot().clear().select();
          $importHtml(
            '<details><summary>Title</summary><p>Para one.</p><p>Para two.</p></details>',
          );
        },
        {discrete: true},
      );

      editor.read(() => {
        const container = $getRoot()
          .getChildren()
          .find($isCollapsibleContainerNode)!;
        const children = container.getChildren();
        expect(children.length).toBe(2);
        assert(
          $isCollapsibleTitleNode(children[0]),
          'First child must be CollapsibleTitleNode',
        );
        assert(
          $isCollapsibleContentNode(children[1]),
          'Second child must be CollapsibleContentNode',
        );
        expect(children[1].getChildren().length).toBe(2);
      });
    });

    it('imports <details> with element body (round-trip shape)', () => {
      using editor = buildEditorFromExtensions(CollapsibleImportTestExtension);

      editor.update(
        () => {
          $getRoot().clear().select();
          $importHtml(
            '<details open="true" class="Collapsible__container">' +
              '<summary class="Collapsible__title">Title</summary>' +
              '<div class="Collapsible__content" data-lexical-collapsible-content="true">' +
              '<p>Body</p>' +
              '</div>' +
              '</details>',
          );
        },
        {discrete: true},
      );

      editor.read(() => {
        const container = $getRoot()
          .getChildren()
          .find($isCollapsibleContainerNode)!;
        const children = container.getChildren();
        expect(children.length).toBe(2);
        assert(
          $isCollapsibleTitleNode(children[0]),
          'First child must be CollapsibleTitleNode',
        );
        assert(
          $isCollapsibleContentNode(children[1]),
          'Second child must be CollapsibleContentNode',
        );
      });
    });
  });
});

describe('CollapsibleExtension transforms', () => {
  const TestDecoratorExtension = defineExtension({
    name: 'TestDecorator',
    nodes: [TestDecoratorNode],
  });

  it('wraps inline content children in paragraphs', () => {
    using editor = buildEditorFromExtensions(CollapsibleExtension);

    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createCollapsibleContainerNode(true).append(
              $createCollapsibleTitleNode().append(
                $createParagraphNode().append($createTextNode('Title')),
              ),
              $createCollapsibleContentNode().append($createTextNode('Body')),
            ),
          );
      },
      {discrete: true},
    );

    editor.read(() => {
      const container = $getRoot().getFirstChildOrThrow();
      assert($isCollapsibleContainerNode(container));
      const content = container.getLastChildOrThrow();
      assert($isCollapsibleContentNode(content));
      const child = content.getFirstChildOrThrow();
      assert($isParagraphNode(child));
      expect(child.getTextContent()).toBe('Body');
    });
  });

  it('adds a paragraph to empty content loaded from serialized state', () => {
    using editor = buildEditorFromExtensions(CollapsibleExtension);

    const state = editor.parseEditorState(
      JSON.stringify({
        root: {
          children: [
            {
              children: [
                {
                  children: [
                    {
                      children: [
                        {
                          detail: 0,
                          format: 0,
                          mode: 'normal',
                          style: '',
                          text: 'Title',
                          type: 'text',
                          version: 1,
                        },
                      ],
                      direction: null,
                      format: '',
                      indent: 0,
                      textFormat: 0,
                      textStyle: '',
                      type: 'paragraph',
                      version: 1,
                    },
                  ],
                  direction: null,
                  format: '',
                  indent: 0,
                  type: 'collapsible-title',
                  version: 1,
                },
                {
                  children: [],
                  direction: null,
                  format: '',
                  indent: 0,
                  type: 'collapsible-content',
                  version: 1,
                },
              ],
              direction: null,
              format: '',
              indent: 0,
              open: true,
              type: 'collapsible-container',
              version: 1,
            },
          ],
          direction: null,
          format: '',
          indent: 0,
          type: 'root',
          version: 1,
        },
      }),
    );

    editor.setEditorState(state);
    editor.update(
      () => {
        const container = $getRoot().getFirstChildOrThrow();
        assert($isCollapsibleContainerNode(container));
        const content = container.getLastChildOrThrow();
        assert($isCollapsibleContentNode(content));
        content.markDirty();
      },
      {discrete: true},
    );

    editor.read(() => {
      const container = $getRoot().getFirstChildOrThrow();
      assert($isCollapsibleContainerNode(container));
      const content = container.getLastChildOrThrow();
      assert($isCollapsibleContentNode(content));
      expect($isParagraphNode(content.getFirstChild())).toBe(true);
    });
  });

  it('leaves block decorator content children unwrapped', () => {
    using editor = buildEditorFromExtensions(
      CollapsibleExtension,
      TestDecoratorExtension,
    );

    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createCollapsibleContainerNode(true).append(
              $createCollapsibleTitleNode().append(
                $createParagraphNode().append($createTextNode('Title')),
              ),
              $createCollapsibleContentNode().append(
                $createTextNode('Before'),
                $createTestDecoratorNode().setIsInline(false),
                $createTestDecoratorNode(),
              ),
            ),
          );
      },
      {discrete: true},
    );

    editor.read(() => {
      const container = $getRoot().getFirstChildOrThrow();
      assert($isCollapsibleContainerNode(container));
      const content = container.getLastChildOrThrow();
      assert($isCollapsibleContentNode(content));
      const children = content.getChildren();

      expect($isParagraphNode(children[0])).toBe(true);
      expect($isDecoratorNode(children[1]) && !children[1].isInline()).toBe(
        true,
      );
      expect($isParagraphNode(children[2])).toBe(true);
    });
  });
});
