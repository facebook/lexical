/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Lexical extends a mouse drag across inline decorators (#7158) by moving the
 * DOM selection itself. In a table, a drag that leaves its cell becomes the
 * table's own selection, which Lexical must leave to the table: a drag into a
 * cell over an inline decorator selects the cells, and a drag out of the
 * table below it selects the whole table.
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableSelection,
  TableExtension,
} from '@lexical/table';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  DecoratorNode,
  isDOMTextNode,
  type LexicalEditor,
} from 'lexical';
import {assert, onTestFinished, test, vi} from 'vitest';
import {commands} from 'vitest/browser';

const SIZE = 40;

class InlineImageNode extends DecoratorNode<null> {
  $config() {
    return this.config('test_table_mouse_drag_image', {extends: DecoratorNode});
  }
  createDOM(): HTMLElement {
    const span = document.createElement('span');
    const img = document.createElement('img');
    img.alt = '';
    img.style.cssText = `display:inline-block;width:${SIZE}px;height:${SIZE}px;background:#888`;
    span.appendChild(img);
    return span;
  }
  updateDOM(): false {
    return false;
  }
  isInline(): true {
    return true;
  }
  decorate(): null {
    return null;
  }
}

/**
 * A 1x2 table whose first cell holds "Cell A text" and whose second starts
 * with an inline image, above a paragraph of "below the table".
 */
function mount() {
  const root = document.createElement('div');
  root.id = 'table-mouse-drag-root';
  root.contentEditable = 'true';
  root.style.cssText = 'width:380px;padding:10px;font-size:16px';
  document.body.appendChild(root);
  const editor = buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => {
        $getRoot()
          .clear()
          .append(
            $createTableNode().append(
              $createTableRowNode().append(
                $createTableCellNode().append(
                  $createParagraphNode().append($createTextNode('Cell A text')),
                ),
                $createTableCellNode().append(
                  $createParagraphNode().append(
                    $create(InlineImageNode),
                    $createTextNode(' B'),
                  ),
                ),
              ),
            ),
            $createParagraphNode().append($createTextNode('below the table')),
          );
      },
      dependencies: [RichTextExtension, TableExtension],
      name: '[table-mouse-drag]',
      nodes: [InlineImageNode],
      theme: {tableScrollableWrapper: ''},
    }),
  );
  editor.setRootElement(root);
  onTestFinished(() => {
    editor.dispose();
    root.remove();
  });
  const rootRect = root.getBoundingClientRect();
  const boxOf = (dom: Element | Range) => {
    const rect = dom.getBoundingClientRect();
    return {
      bottom: rect.bottom - rootRect.top,
      left: rect.left - rootRect.left,
      right: rect.right - rootRect.left,
      top: rect.top - rootRect.top,
    };
  };
  const cellText = root.querySelector('td [data-lexical-text]')?.firstChild;
  assert(isDOMTextNode(cellText), 'Expected the text of the first cell');
  const textRange = document.createRange();
  textRange.selectNodeContents(cellText);
  const image = root.querySelector(
    'td img:not([data-lexical-decorator-boundary])',
  );
  assert(image !== null, 'Expected the image in the second cell');
  const below = root.querySelector(':scope > p');
  assert(below !== null, 'Expected the paragraph below the table');
  return {
    below: boxOf(below),
    cellText,
    cellTextBox: boxOf(textRange),
    editor,
    image: boxOf(image),
  };
}

/**
 * Records the DOM selection writes made from here until the test finishes,
 * each with whether the editor held a TableSelection when it was made. The
 * table removes the DOM ranges for its own selection, so these are Lexical's
 * own writes: the reconciler's, and those that carry a drag across inline
 * decorators.
 */
function recordDOMSelectionWrites(editor: LexicalEditor) {
  const writes: {anchorNode: Node; isTableSelected: boolean}[] = [];
  let isTableSelected = false;
  onTestFinished(
    editor.registerUpdateListener(({editorState}) => {
      isTableSelected = editorState.read(
        () => $isTableSelection($getSelection()),
        {editor},
      );
    }),
  );
  const {extend, setBaseAndExtent} = Selection.prototype;
  const setBaseAndExtentSpy = vi
    .spyOn(Selection.prototype, 'setBaseAndExtent')
    .mockImplementation(function (
      this: Selection,
      anchorNode,
      anchorOffset,
      focusNode,
      focusOffset,
    ) {
      writes.push({anchorNode, isTableSelected});
      setBaseAndExtent.call(
        this,
        anchorNode,
        anchorOffset,
        focusNode,
        focusOffset,
      );
    });
  const extendSpy = vi
    .spyOn(Selection.prototype, 'extend')
    .mockImplementation(function (this: Selection, node, offset) {
      const {anchorNode} = this;
      assert(anchorNode !== null, 'Expected a DOM selection to extend');
      writes.push({anchorNode, isTableSelected});
      extend.call(this, node, offset);
    });
  onTestFinished(() => {
    setBaseAndExtentSpy.mockRestore();
    extendSpy.mockRestore();
  });
  return writes;
}

function describeWrites(
  writes: ReturnType<typeof recordDOMSelectionWrites>,
): string {
  return writes
    .map(
      ({anchorNode, isTableSelected}) =>
        `${anchorNode.nodeName}${isTableSelected ? '(table)' : ''}`,
    )
    .join(' ');
}

test('a drag from a cell to an inline decorator in the next cell leaves the cells to the table', async () => {
  const {cellTextBox, editor, image} = mount();
  const writes = recordDOMSelectionWrites(editor);
  const textY = (cellTextBox.top + cellTextBox.bottom) / 2;
  const imageY = (image.top + image.bottom) / 2;
  await commands.mouseDrag(
    '#table-mouse-drag-root',
    [
      [cellTextBox.left + 20, textY],
      [cellTextBox.right - 5, textY],
      [image.left + SIZE / 4, imageY],
      [image.left + SIZE / 2, imageY],
      [image.left + SIZE / 4, imageY],
    ],
    {maxStep: SIZE / 2},
  );
  await vi.waitFor(() =>
    assert(
      editor.read('latest', () => $isTableSelection($getSelection())),
      'expected a table selection',
    ),
  );
  assert(
    !writes.some(({isTableSelected}) => isTableSelected),
    `expected no DOM selection writes once the table selected the cells, got ${describeWrites(writes)}`,
  );
});

test('a drag out of a table below it leaves the table selected whole', async () => {
  const {below, cellText, cellTextBox, editor} = mount();
  const writes = recordDOMSelectionWrites(editor);
  const textY = (cellTextBox.top + cellTextBox.bottom) / 2;
  const belowY = (below.top + below.bottom) / 2;
  await commands.mouseDrag(
    '#table-mouse-drag-root',
    [
      [cellTextBox.left + 20, textY],
      [cellTextBox.left + 20, belowY],
      [below.left + 60, belowY],
      [below.left + 120, belowY],
    ],
    {maxStep: SIZE / 2},
  );
  await vi.waitFor(() =>
    assert(
      editor.read('latest', () => {
        const selection = $getSelection();
        return (
          $isRangeSelection(selection) &&
          !selection.isCollapsed() &&
          selection.anchor.getNode().getType() === 'tablecell'
        );
      }),
      'expected the anchor at the start of the table',
    ),
  );
  // The table moves the anchor to its start when the drag leaves it, and the
  // drag must not move it back into the cell.
  const firstTableAnchor = writes.findIndex(
    ({anchorNode}) => anchorNode.nodeName === 'TD',
  );
  assert(
    firstTableAnchor === -1 ||
      !writes
        .slice(firstTableAnchor)
        .some(({anchorNode}) => anchorNode === cellText),
    `expected the anchor to stay at the start of the table, got ${describeWrites(writes)}`,
  );
});
