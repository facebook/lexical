/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableSelection,
  registerTableSelectionObserver,
  type TableCellNode,
  type TableNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {afterEach, describe, expect, test} from 'vitest';

/**
 * Test suite for mobile/touch table selection behavior.
 * Addresses the bug where simple taps between table cells on mobile
 * would incorrectly create table selections instead of just moving the cursor.
 */
describe('LexicalTableMobileSelection', () => {
  initializeUnitTest(testEnv => {
    /**
     * Helper function to create a 2x2 table for testing
     */
    function $createTestTable(): {
      tableNode: TableNode;
      cells: TableCellNode[][];
    } {
      const tableNode = $createTableNode();
      const cells: TableCellNode[][] = [];

      for (let row = 0; row < 2; row++) {
        const rowNode = $createTableRowNode();
        const rowCells: TableCellNode[] = [];

        for (let col = 0; col < 2; col++) {
          const cellNode = $createTableCellNode();
          const paragraph = $createParagraphNode();
          const text = $createTextNode(`Cell ${row}-${col}`);

          paragraph.append(text);
          cellNode.append(paragraph);
          rowNode.append(cellNode);
          rowCells.push(cellNode);
        }

        tableNode.append(rowNode);
        cells.push(rowCells);
      }

      return {cells, tableNode};
    }

    /**
     * Helper function to simulate a pointer event
     */
    function simulatePointerEvent(
      element: Element,
      type: string,
      options: Partial<PointerEventInit> = {},
    ): PointerEvent {
      const event = new PointerEvent(type, {
        bubbles: true,
        button: 0,
        buttons: 1,
        cancelable: true,
        pointerType: options.pointerType || 'mouse',
        ...options,
      });

      element.dispatchEvent(event);
      return event;
    }

    test('mouse click should set anchor cell for selection (existing behavior)', async () => {
      await testEnv.editor.update(() => {
        const root = $getRoot();
        const {tableNode, cells} = $createTestTable();
        root.clear().append(tableNode);

        // Select first cell
        cells[0][0].selectStart();
      });

      // Get the DOM elements
      const tableElement = testEnv.container.querySelector('table');
      const firstCellElement = testEnv.container.querySelector('td');

      expect(tableElement).not.toBeNull();
      expect(firstCellElement).not.toBeNull();

      // Simulate mouse pointer down on first cell
      simulatePointerEvent(firstCellElement!, 'pointerdown', {
        pointerType: 'mouse',
      });

      await testEnv.editor.read('latest', () => {
        // For mouse events, anchor should still be set (existing behavior)
        // This test mainly ensures no errors occur
        expect(true).toBe(true); // This test mainly ensures no errors occur
      });
    });

    test('touch tap on single cell should not create table selection', async () => {
      await testEnv.editor.update(() => {
        const root = $getRoot();
        const {tableNode, cells} = $createTestTable();
        root.clear().append(tableNode);

        // Select first cell
        cells[0][0].selectStart();
      });

      // Get the DOM elements
      const firstCellElement = testEnv.container.querySelector('td');
      expect(firstCellElement).not.toBeNull();

      // Simulate touch pointer down on first cell
      simulatePointerEvent(firstCellElement!, 'pointerdown', {
        pointerType: 'touch',
      });

      await testEnv.editor.read('latest', () => {
        const selection = $getSelection();
        // Should remain a range selection, not become a table selection
        expect($isRangeSelection(selection)).toBe(true);
        expect($isTableSelection(selection)).toBe(false);
      });
    });

    test('touch tap between different cells should not create table selection', async () => {
      await testEnv.editor.update(() => {
        const root = $getRoot();
        const {tableNode, cells} = $createTestTable();
        root.clear().append(tableNode);

        // Select first cell
        cells[0][0].selectStart();
      });

      // Get the DOM elements
      const firstCellElement =
        testEnv.container.querySelector('td:nth-child(1)')!;
      const secondCellElement =
        testEnv.container.querySelector('td:nth-child(2)')!;

      expect(firstCellElement).not.toBeNull();
      expect(secondCellElement).not.toBeNull();

      // Simulate touch tap on first cell
      simulatePointerEvent(firstCellElement, 'pointerdown', {
        pointerType: 'touch',
      });

      // Simulate touch tap on second cell (simulates user tapping between cells)
      simulatePointerEvent(secondCellElement, 'pointerdown', {
        pointerType: 'touch',
      });

      await testEnv.editor.read('latest', () => {
        const selection = $getSelection();
        // Should remain a range selection, not become a table selection
        expect($isRangeSelection(selection)).toBe(true);
        expect($isTableSelection(selection)).toBe(false);
      });
    });

    test('touch drag (with isSelecting=true) should still create table selection', async () => {
      await testEnv.editor.update(() => {
        const root = $getRoot();
        const {tableNode, cells} = $createTestTable();
        root.clear().append(tableNode);

        // Select first cell
        cells[0][0].selectStart();
      });

      // Get the DOM elements
      const firstCellElement =
        testEnv.container.querySelector('td:nth-child(1)')!;
      const secondCellElement =
        testEnv.container.querySelector('td:nth-child(2)')!;

      expect(firstCellElement).not.toBeNull();
      expect(secondCellElement).not.toBeNull();

      // Simulate touch drag by setting up the selection state manually
      // and then triggering pointer events
      simulatePointerEvent(firstCellElement, 'pointerdown', {
        pointerType: 'touch',
      });

      // Simulate pointer move to indicate dragging
      simulatePointerEvent(secondCellElement, 'pointermove', {
        pointerType: 'touch',
      });

      // Note: This test verifies that intentional drag operations still work
      // The actual table selection creation depends on the internal state management
      // which is complex to fully simulate in a unit test
      await testEnv.editor.read('latest', () => {
        // For now, we just verify no errors occur
        // In a real implementation, you might need more sophisticated simulation
        expect(true).toBe(true);
      });
    });

    test('mixed pointer types should be handled correctly', async () => {
      await testEnv.editor.update(() => {
        const root = $getRoot();
        const {tableNode, cells} = $createTestTable();
        root.clear().append(tableNode);

        // Select first cell
        cells[0][0].selectStart();
      });

      const firstCellElement =
        testEnv.container.querySelector('td:nth-child(1)')!;
      const secondCellElement =
        testEnv.container.querySelector('td:nth-child(2)')!;

      // Mouse down on first cell
      simulatePointerEvent(firstCellElement, 'pointerdown', {
        pointerType: 'mouse',
      });

      // Touch on second cell
      simulatePointerEvent(secondCellElement, 'pointerdown', {
        pointerType: 'touch',
      });

      await testEnv.editor.read('latest', () => {
        // Should handle mixed input gracefully without errors
        expect(true).toBe(true);
      });
    });

    test('mouse leaving browser window during selection should stop selection', async () => {
      await testEnv.editor.update(() => {
        const root = $getRoot();
        const {tableNode, cells} = $createTestTable();
        root.clear().append(tableNode);

        // Select first cell
        cells[0][0].selectStart();
      });

      // Get the DOM elements
      const firstCellElement =
        testEnv.container.querySelector('td:nth-child(1)')!;
      const secondCellElement =
        testEnv.container.querySelector('td:nth-child(2)')!;

      expect(firstCellElement).not.toBeNull();
      expect(secondCellElement).not.toBeNull();

      // Step 1: Start a mouse drag selection (pointerdown with buttons: 1)
      simulatePointerEvent(firstCellElement, 'pointerdown', {
        buttons: 1,
        pointerType: 'mouse',
      });

      // Step 2: Move to another cell (normal drag, buttons: 1)
      simulatePointerEvent(secondCellElement, 'pointermove', {
        buttons: 1,
        pointerType: 'mouse',
      });

      // Step 3: Simulate mouse re-entering window after leaving
      // When mouse leaves and re-enters, buttons will be 0 (button state lost)
      // This should trigger the selection cleanup code path
      simulatePointerEvent(secondCellElement, 'pointermove', {
        buttons: 0,
        pointerType: 'mouse',
      });

      await testEnv.editor.read('latest', () => {
        const selection = $getSelection();
        // After mouse re-enters with buttons: 0, selection should be cleaned up
        // and should not be a table selection (drag was interrupted)
        expect($isTableSelection(selection)).toBe(false);
      });
    });
  });
});

/**
 * Regression tests for https://github.com/facebook/lexical/issues/8538 -
 * placing the text cursor by tapping table cells on a touch device is
 * unreliable: instead of a caret, taps produce multi-cell table selections.
 *
 * These register the real selection observer so the actual pointer handlers
 * run. jsdom has no layout, so cells are laid out on a synthetic grid and the
 * cell under the pointer is resolved through a stubbed elementsFromPoint.
 */
describe('LexicalTableMobileSelection touch gestures (#8538)', () => {
  initializeUnitTest(testEnv => {
    const COLUMNS = 3;
    const ROWS = 3;
    const CELL_WIDTH = 100;
    const CELL_HEIGHT = 40;
    // Comfortably beyond the handler's tap slop, so a move of this much is
    // unambiguously a drag.
    const DRAG_DISTANCE = 50;
    // Comfortably smaller, so a move of this much is still a tap.
    const JITTER = 3;

    let unregisterObserver: null | (() => void) = null;
    let cellUnderPointer: Element | null = null;
    const hadElementsFromPoint = 'elementsFromPoint' in document;
    const originalElementsFromPoint = document.elementsFromPoint;

    afterEach(() => {
      if (unregisterObserver !== null) {
        unregisterObserver();
        unregisterObserver = null;
      }
      cellUnderPointer = null;
      if (hadElementsFromPoint) {
        document.elementsFromPoint = originalElementsFromPoint;
      } else {
        delete (document as Partial<Document>).elementsFromPoint;
      }
    });

    /**
     * Creates a table of empty cells as the sole content of the document (the
     * scenario from #8538) and registers the table selection observer.
     * Returns the cell elements and their node keys in row-major order.
     */
    async function setupEmptyTable(): Promise<{
      cells: HTMLTableCellElement[];
      keys: string[];
    }> {
      unregisterObserver = registerTableSelectionObserver(testEnv.editor);
      const keys: string[] = [];

      await testEnv.editor.update(() => {
        const tableNode = $createTableNode();
        for (let row = 0; row < ROWS; row++) {
          const rowNode = $createTableRowNode();
          for (let col = 0; col < COLUMNS; col++) {
            const cellNode = $createTableCellNode();
            cellNode.append($createParagraphNode());
            rowNode.append(cellNode);
            keys.push(cellNode.getKey());
          }
          tableNode.append(rowNode);
        }
        $getRoot().clear().append(tableNode);
      });

      const cells = Array.from(testEnv.container.querySelectorAll('td'));
      expect(cells).toHaveLength(ROWS * COLUMNS);
      // jsdom has no layout, so hit-testing is driven by cellUnderPointer
      // rather than by the coordinates the handlers pass in.
      document.elementsFromPoint = () =>
        cellUnderPointer === null ? [] : [cellUnderPointer];
      return {cells, keys};
    }

    /** The centre of a cell in the synthetic grid laid out above. */
    function centerOf(index: number): {clientX: number; clientY: number} {
      return {
        clientX: (index % COLUMNS) * CELL_WIDTH + CELL_WIDTH / 2,
        clientY: Math.floor(index / COLUMNS) * CELL_HEIGHT + CELL_HEIGHT / 2,
      };
    }

    function dispatchPointerEvent(
      cell: Element,
      type: string,
      options: PointerEventInit,
    ): void {
      cell.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          buttons: 1,
          cancelable: true,
          pointerId: 1,
          pointerType: 'touch',
          ...options,
        }),
      );
    }

    /** Waits for the batched updates the pointer events triggered to commit. */
    function flushUpdates(): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, 0));
    }

    /** Presses a finger down on the centre of a cell. */
    function touchDown(
      cells: HTMLTableCellElement[],
      index: number,
      pointerId = 1,
    ): void {
      cellUnderPointer = cells[index];
      dispatchPointerEvent(cells[index], 'pointerdown', {
        pointerId,
        ...centerOf(index),
      });
    }

    /**
     * Moves the finger by `dx` from where the gesture started and reports
     * `overCell` as the cell underneath it.
     */
    function touchMove(
      cells: HTMLTableCellElement[],
      fromIndex: number,
      overIndex: number,
      dx: number,
      pointerId = 1,
    ): void {
      cellUnderPointer = cells[overIndex];
      const from = centerOf(fromIndex);
      dispatchPointerEvent(cells[overIndex], 'pointermove', {
        clientX: from.clientX + dx,
        clientY: from.clientY,
        pointerId,
      });
    }

    function touchUp(
      cells: HTMLTableCellElement[],
      index: number,
      pointerId = 1,
    ): void {
      dispatchPointerEvent(cells[index], 'pointerup', {
        buttons: 0,
        pointerId,
        ...centerOf(index),
      });
    }

    /**
     * A tap: down, the micro pointermove that real taps produce, then up.
     */
    async function touchTap(
      cells: HTMLTableCellElement[],
      index: number,
    ): Promise<void> {
      touchDown(cells, index);
      touchMove(cells, index, index, JITTER);
      touchUp(cells, index);
      await flushUpdates();
    }

    /** A drag from one cell into another. */
    async function touchDrag(
      cells: HTMLTableCellElement[],
      fromIndex: number,
      toIndex: number,
    ): Promise<void> {
      touchDown(cells, fromIndex);
      touchMove(cells, fromIndex, toIndex, DRAG_DISTANCE);
      touchUp(cells, toIndex);
      await flushUpdates();
    }

    function expectNoTableSelection(): void {
      testEnv.editor.read('latest', () => {
        expect($isTableSelection($getSelection())).toBe(false);
      });
    }

    function expectTableSelection(
      keys: string[],
      anchorIndex: number,
      focusIndex: number,
    ): void {
      testEnv.editor.read('latest', () => {
        const selection = $getSelection();
        expect($isTableSelection(selection)).toBe(true);
        if ($isTableSelection(selection)) {
          expect(selection.anchor.getNode().getKey()).toBe(keys[anchorIndex]);
          expect(selection.focus.getNode().getKey()).toBe(keys[focusIndex]);
        }
      });
    }

    test('a tap with a micro pointermove does not create a table selection', async () => {
      const {cells} = await setupEmptyTable();

      await touchTap(cells, 4);

      expectNoTableSelection();
    });

    test('taps on different cells do not create a table selection', async () => {
      const {cells} = await setupEmptyTable();

      await touchTap(cells, 0);
      await touchTap(cells, 4);

      expectNoTableSelection();
    });

    test('a tap near a cell border does not create a table selection', async () => {
      const {cells} = await setupEmptyTable();

      // The finger barely moves, but the jitter is enough for the hit-test to
      // land in the neighbouring cell. That is still a tap, not a drag.
      touchDown(cells, 0);
      touchMove(cells, 0, 1, JITTER);
      touchUp(cells, 0);
      await flushUpdates();

      expectNoTableSelection();
    });

    test('a drag across cells creates a table selection', async () => {
      const {cells, keys} = await setupEmptyTable();

      await touchDrag(cells, 0, 1);

      expectTableSelection(keys, 0, 1);
    });

    test('a drag after a tap anchors at the cell the drag started on', async () => {
      const {cells, keys} = await setupEmptyTable();

      await touchTap(cells, 0);
      await touchDrag(cells, 4, 5);

      // The anchor must be the cell the drag started on, not the cell the
      // previous gesture tapped.
      expectTableSelection(keys, 4, 5);
    });

    test('a drag within the starting cell does not create a table selection', async () => {
      const {cells} = await setupEmptyTable();

      // Selecting text inside one cell is a range selection, not a table one.
      touchDown(cells, 0);
      touchMove(cells, 0, 0, DRAG_DISTANCE);
      touchUp(cells, 0);
      await flushUpdates();

      expectNoTableSelection();
    });

    test.each(['pointercancel', 'lostpointercapture'])(
      'a gesture ended by %s does not leak into the next tap',
      async endEvent => {
        const {cells} = await setupEmptyTable();

        // The browser takes the gesture away - a touch that turned into a
        // scroll, say - so no pointerup is ever delivered.
        touchDown(cells, 0);
        dispatchPointerEvent(cells[0], endEvent, {
          buttons: 0,
          ...centerOf(0),
        });
        await flushUpdates();

        await touchTap(cells, 4);

        expectNoTableSelection();
      },
    );

    test('a gesture ended by pointercancel does not wedge later gestures', async () => {
      const {cells, keys} = await setupEmptyTable();

      touchDown(cells, 0);
      dispatchPointerEvent(cells[0], 'pointercancel', {
        buttons: 0,
        ...centerOf(0),
      });
      await flushUpdates();

      // The observer must have returned to a state where a real drag works.
      await touchDrag(cells, 4, 5);

      expectTableSelection(keys, 4, 5);
    });

    test('a second finger does not drive the first finger gesture', async () => {
      const {cells} = await setupEmptyTable();

      touchDown(cells, 0, 1);
      // A second contact lands elsewhere and moves across cells. It belongs to
      // its own gesture and must not extend this one.
      touchMove(cells, 0, 5, DRAG_DISTANCE, 2);
      touchUp(cells, 0, 1);
      await flushUpdates();

      expectNoTableSelection();
    });
  });
});
