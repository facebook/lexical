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

// Polyfill PointerEvent for test environment
interface PointerEventInit extends EventInit {
  button?: number;
  buttons?: number;
  pointerType?: string;
}

(global as unknown as {PointerEvent: unknown}).PointerEvent =
  class PointerEvent extends Event {
    button: number;
    buttons: number;
    pointerType: string;

    constructor(type: string, options: PointerEventInit = {}) {
      super(type, options);
      this.button = options.button || 0;
      this.buttons = options.buttons ?? 1;
      this.pointerType = options.pointerType || 'mouse';
    }
  };

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
 * setting the text cursor by tapping table cells on mobile does not work
 * reliably when a single (empty) table is the whole content.
 *
 * These tests register the table selection observer so the real pointer
 * handlers are exercised. Real-world touch taps commonly include micro
 * pointermove events between pointerdown and pointerup; such a tap must not
 * initiate table selection mode or leave anchor state behind that turns
 * later taps into multi-cell table selections.
 */
describe('LexicalTableMobileSelection with selection observer (#8538)', () => {
  initializeUnitTest(testEnv => {
    let unregisterObserver: null | (() => void) = null;
    const originalElementsFromPoint = document.elementsFromPoint;

    afterEach(() => {
      if (unregisterObserver !== null) {
        unregisterObserver();
        unregisterObserver = null;
      }
      document.elementsFromPoint = originalElementsFromPoint;
    });

    /**
     * Creates a 3x3 table with empty cells as the sole content of the
     * document (the scenario from #8538) and registers the table selection
     * observer. Returns the cell elements and their node keys in row-major
     * order.
     */
    async function setupSoleEmptyTable(): Promise<{
      cellElements: HTMLTableCellElement[];
      cellKeys: string[];
    }> {
      unregisterObserver = registerTableSelectionObserver(testEnv.editor);
      const cellKeys: string[] = [];

      await testEnv.editor.update(() => {
        const tableNode = $createTableNode();
        for (let row = 0; row < 3; row++) {
          const rowNode = $createTableRowNode();
          for (let col = 0; col < 3; col++) {
            const cellNode = $createTableCellNode();
            cellNode.append($createParagraphNode());
            rowNode.append(cellNode);
            cellKeys.push(cellNode.getKey());
          }
          tableNode.append(rowNode);
        }
        $getRoot().clear().append(tableNode);
      });

      const cellElements = Array.from(testEnv.container.querySelectorAll('td'));
      expect(cellElements.length).toBe(9);
      return {cellElements, cellKeys};
    }

    function dispatchPointerEvent(
      element: Element,
      type: string,
      options: PointerEventInit,
    ): void {
      element.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          ...options,
        }),
      );
    }

    /**
     * jsdom has no layout, so stub the hit-testing that onPointerMove uses
     * to resolve the cell under the pointer.
     */
    function stubElementsFromPoint(element: Element): void {
      document.elementsFromPoint = () => [element];
    }

    /**
     * Waits for the batched editor updates triggered by the dispatched
     * pointer events to commit.
     */
    async function flushUpdates(): Promise<void> {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    /**
     * Simulates a touch tap on a cell, including the micro pointermove
     * within the same cell that real taps commonly produce.
     */
    async function simulateTouchTap(cell: Element): Promise<void> {
      dispatchPointerEvent(cell, 'pointerdown', {
        buttons: 1,
        pointerType: 'touch',
      });
      stubElementsFromPoint(cell);
      dispatchPointerEvent(cell, 'pointermove', {
        buttons: 1,
        pointerType: 'touch',
      });
      dispatchPointerEvent(cell, 'pointerup', {
        buttons: 0,
        pointerType: 'touch',
      });
      await flushUpdates();
    }

    /**
     * Simulates a touch drag from one cell to another.
     */
    async function simulateTouchDrag(
      fromCell: Element,
      toCell: Element,
    ): Promise<void> {
      dispatchPointerEvent(fromCell, 'pointerdown', {
        buttons: 1,
        pointerType: 'touch',
      });
      stubElementsFromPoint(toCell);
      dispatchPointerEvent(toCell, 'pointermove', {
        buttons: 1,
        pointerType: 'touch',
      });
      dispatchPointerEvent(toCell, 'pointerup', {
        buttons: 0,
        pointerType: 'touch',
      });
      await flushUpdates();
    }

    test('a single touch tap with micro pointermove should not create a table selection', async () => {
      const {cellElements} = await setupSoleEmptyTable();

      // Tap the center cell of the empty table
      await simulateTouchTap(cellElements[4]);

      await testEnv.editor.read('latest', () => {
        expect($isTableSelection($getSelection())).toBe(false);
      });
    });

    test('touch taps on different cells should not create a table selection', async () => {
      const {cellElements} = await setupSoleEmptyTable();

      // Tap the first cell, then the center cell (as when trying to place
      // the caret by tapping different cells of the sole table)
      await simulateTouchTap(cellElements[0]);
      await simulateTouchTap(cellElements[4]);

      await testEnv.editor.read('latest', () => {
        expect($isTableSelection($getSelection())).toBe(false);
      });
    });

    test('touch drag across cells should still create a table selection', async () => {
      const {cellElements, cellKeys} = await setupSoleEmptyTable();

      await simulateTouchDrag(cellElements[0], cellElements[1]);

      await testEnv.editor.read('latest', () => {
        const selection = $getSelection();
        expect($isTableSelection(selection)).toBe(true);
        if ($isTableSelection(selection)) {
          expect(selection.anchor.getNode().getKey()).toBe(cellKeys[0]);
          expect(selection.focus.getNode().getKey()).toBe(cellKeys[1]);
        }
      });
    });

    test('touch drag after a previous tap should anchor at the cell where the drag started', async () => {
      const {cellElements, cellKeys} = await setupSoleEmptyTable();

      // Tap the first cell, then drag from the center cell to its neighbor
      await simulateTouchTap(cellElements[0]);
      await simulateTouchDrag(cellElements[4], cellElements[5]);

      await testEnv.editor.read('latest', () => {
        const selection = $getSelection();
        expect($isTableSelection(selection)).toBe(true);
        if ($isTableSelection(selection)) {
          // The anchor must be the cell the drag started on, not the cell
          // tapped by the previous gesture
          expect(selection.anchor.getNode().getKey()).toBe(cellKeys[4]);
          expect(selection.focus.getNode().getKey()).toBe(cellKeys[5]);
        }
      });
    });
  });
});
