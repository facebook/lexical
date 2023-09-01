/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var lexical = require('lexical');
var utils = require('@lexical/utils');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const PIXEL_VALUE_REG_EXP = /^(\d+(?:\.\d+)?)px$/;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const TableCellHeaderStates = {
  BOTH: 3,
  COLUMN: 2,
  NO_STATUS: 0,
  ROW: 1
};
/** @noInheritDoc */
class TableCellNode extends lexical.DEPRECATED_GridCellNode {
  /** @internal */

  /** @internal */

  /** @internal */

  static getType() {
    return 'tablecell';
  }
  static clone(node) {
    const cellNode = new TableCellNode(node.__headerState, node.__colSpan, node.__width, node.__key);
    cellNode.__rowSpan = node.__rowSpan;
    cellNode.__backgroundColor = node.__backgroundColor;
    return cellNode;
  }
  static importDOM() {
    return {
      td: node => ({
        conversion: convertTableCellNodeElement,
        priority: 0
      }),
      th: node => ({
        conversion: convertTableCellNodeElement,
        priority: 0
      })
    };
  }
  static importJSON(serializedNode) {
    const colSpan = serializedNode.colSpan || 1;
    const rowSpan = serializedNode.rowSpan || 1;
    const cellNode = $createTableCellNode(serializedNode.headerState, colSpan, serializedNode.width || undefined);
    cellNode.__rowSpan = rowSpan;
    cellNode.__backgroundColor = serializedNode.backgroundColor || null;
    return cellNode;
  }
  constructor(headerState = TableCellHeaderStates.NO_STATUS, colSpan = 1, width, key) {
    super(colSpan, key);
    this.__headerState = headerState;
    this.__width = width;
    this.__backgroundColor = null;
  }
  createDOM(config) {
    const element = document.createElement(this.getTag());
    if (this.__width) {
      element.style.width = `${this.__width}px`;
    }
    if (this.__colSpan > 1) {
      element.colSpan = this.__colSpan;
    }
    if (this.__rowSpan > 1) {
      element.rowSpan = this.__rowSpan;
    }
    if (this.__backgroundColor !== null) {
      element.style.backgroundColor = this.__backgroundColor;
    }
    utils.addClassNamesToElement(element, config.theme.tableCell, this.hasHeader() && config.theme.tableCellHeader);
    return element;
  }
  exportDOM(editor) {
    const {
      element
    } = super.exportDOM(editor);
    if (element) {
      const element_ = element;
      const maxWidth = 700;
      const colCount = this.getParentOrThrow().getChildrenSize();
      element_.style.border = '1px solid black';
      if (this.__colSpan > 1) {
        element_.colSpan = this.__colSpan;
      }
      if (this.__rowSpan > 1) {
        element_.rowSpan = this.__rowSpan;
      }
      element_.style.width = `${this.getWidth() || Math.max(90, maxWidth / colCount)}px`;
      element_.style.verticalAlign = 'top';
      element_.style.textAlign = 'start';
      const backgroundColor = this.getBackgroundColor();
      if (backgroundColor !== null) {
        element_.style.backgroundColor = backgroundColor;
      } else if (this.hasHeader()) {
        element_.style.backgroundColor = '#f2f3f5';
      }
    }
    return {
      element
    };
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      backgroundColor: this.getBackgroundColor(),
      headerState: this.__headerState,
      type: 'tablecell',
      width: this.getWidth()
    };
  }
  getTag() {
    return this.hasHeader() ? 'th' : 'td';
  }
  setHeaderStyles(headerState) {
    const self = this.getWritable();
    self.__headerState = headerState;
    return this.__headerState;
  }
  getHeaderStyles() {
    return this.getLatest().__headerState;
  }
  setWidth(width) {
    const self = this.getWritable();
    self.__width = width;
    return this.__width;
  }
  getWidth() {
    return this.getLatest().__width;
  }
  getBackgroundColor() {
    return this.getLatest().__backgroundColor;
  }
  setBackgroundColor(newBackgroundColor) {
    this.getWritable().__backgroundColor = newBackgroundColor;
  }
  toggleHeaderStyle(headerStateToToggle) {
    const self = this.getWritable();
    if ((self.__headerState & headerStateToToggle) === headerStateToToggle) {
      self.__headerState -= headerStateToToggle;
    } else {
      self.__headerState += headerStateToToggle;
    }
    return self;
  }
  hasHeaderState(headerState) {
    return (this.getHeaderStyles() & headerState) === headerState;
  }
  hasHeader() {
    return this.getLatest().__headerState !== TableCellHeaderStates.NO_STATUS;
  }
  updateDOM(prevNode) {
    return prevNode.__headerState !== this.__headerState || prevNode.__width !== this.__width || prevNode.__colSpan !== this.__colSpan || prevNode.__rowSpan !== this.__rowSpan || prevNode.__backgroundColor !== this.__backgroundColor;
  }
  isShadowRoot() {
    return true;
  }
  collapseAtStart() {
    return true;
  }
  canBeEmpty() {
    return false;
  }
  canIndent() {
    return false;
  }
}
function convertTableCellNodeElement(domNode) {
  const domNode_ = domNode;
  const nodeName = domNode.nodeName.toLowerCase();
  let width = undefined;
  if (PIXEL_VALUE_REG_EXP.test(domNode_.style.width)) {
    width = parseFloat(domNode_.style.width);
  }
  const tableCellNode = $createTableCellNode(nodeName === 'th' ? TableCellHeaderStates.ROW : TableCellHeaderStates.NO_STATUS, domNode_.colSpan, width);
  tableCellNode.__rowSpan = domNode_.rowSpan;
  const backgroundColor = domNode_.style.backgroundColor;
  if (backgroundColor !== '') {
    tableCellNode.__backgroundColor = backgroundColor;
  }
  return {
    forChild: (lexicalNode, parentLexicalNode) => {
      if ($isTableCellNode(parentLexicalNode) && !lexical.$isElementNode(lexicalNode)) {
        const paragraphNode = lexical.$createParagraphNode();
        if (lexical.$isLineBreakNode(lexicalNode) && lexicalNode.getTextContent() === '\n') {
          return null;
        }
        paragraphNode.append(lexicalNode);
        return paragraphNode;
      }
      return lexicalNode;
    },
    node: tableCellNode
  };
}
function $createTableCellNode(headerState, colSpan = 1, width) {
  return lexical.$applyNodeReplacement(new TableCellNode(headerState, colSpan, width));
}
function $isTableCellNode(node) {
  return node instanceof TableCellNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/** @noInheritDoc */
class TableRowNode extends lexical.DEPRECATED_GridRowNode {
  /** @internal */

  static getType() {
    return 'tablerow';
  }
  static clone(node) {
    return new TableRowNode(node.__height, node.__key);
  }
  static importDOM() {
    return {
      tr: node => ({
        conversion: convertTableRowElement,
        priority: 0
      })
    };
  }
  static importJSON(serializedNode) {
    return $createTableRowNode(serializedNode.height);
  }
  constructor(height, key) {
    super(key);
    this.__height = height;
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'tablerow',
      version: 1
    };
  }
  createDOM(config) {
    const element = document.createElement('tr');
    if (this.__height) {
      element.style.height = `${this.__height}px`;
    }
    utils.addClassNamesToElement(element, config.theme.tableRow);
    return element;
  }
  isShadowRoot() {
    return true;
  }
  setHeight(height) {
    const self = this.getWritable();
    self.__height = height;
    return this.__height;
  }
  getHeight() {
    return this.getLatest().__height;
  }
  updateDOM(prevNode) {
    return prevNode.__height !== this.__height;
  }
  canBeEmpty() {
    return false;
  }
  canIndent() {
    return false;
  }
}
function convertTableRowElement(domNode) {
  const domNode_ = domNode;
  let height = undefined;
  if (PIXEL_VALUE_REG_EXP.test(domNode_.style.height)) {
    height = parseFloat(domNode_.style.height);
  }
  return {
    node: $createTableRowNode(height)
  };
}
function $createTableRowNode(height) {
  return lexical.$applyNodeReplacement(new TableRowNode(height));
}
function $isTableRowNode(node) {
  return node instanceof TableRowNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const CAN_USE_DOM = typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.createElement !== 'undefined';

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const getDOMSelection = targetWindow => CAN_USE_DOM ? (targetWindow || window).getSelection() : null;
class TableSelection {
  constructor(editor, tableNodeKey) {
    this.isHighlightingCells = false;
    this.anchorX = -1;
    this.anchorY = -1;
    this.focusX = -1;
    this.focusY = -1;
    this.listenersToRemove = new Set();
    this.tableNodeKey = tableNodeKey;
    this.editor = editor;
    this.grid = {
      cells: [],
      columns: 0,
      rows: 0
    };
    this.gridSelection = null;
    this.anchorCellNodeKey = null;
    this.focusCellNodeKey = null;
    this.anchorCell = null;
    this.focusCell = null;
    this.hasHijackedSelectionStyles = false;
    this.trackTableGrid();
  }
  getGrid() {
    return this.grid;
  }
  removeListeners() {
    Array.from(this.listenersToRemove).forEach(removeListener => removeListener());
  }
  trackTableGrid() {
    const observer = new MutationObserver(records => {
      this.editor.update(() => {
        let gridNeedsRedraw = false;
        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          const target = record.target;
          const nodeName = target.nodeName;
          if (nodeName === 'TABLE' || nodeName === 'TR') {
            gridNeedsRedraw = true;
            break;
          }
        }
        if (!gridNeedsRedraw) {
          return;
        }
        const tableElement = this.editor.getElementByKey(this.tableNodeKey);
        if (!tableElement) {
          throw new Error('Expected to find TableElement in DOM');
        }
        this.grid = getTableGrid(tableElement);
      });
    });
    this.editor.update(() => {
      const tableElement = this.editor.getElementByKey(this.tableNodeKey);
      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }
      this.grid = getTableGrid(tableElement);
      observer.observe(tableElement, {
        childList: true,
        subtree: true
      });
    });
  }
  clearHighlight() {
    const editor = this.editor;
    this.isHighlightingCells = false;
    this.anchorX = -1;
    this.anchorY = -1;
    this.focusX = -1;
    this.focusY = -1;
    this.gridSelection = null;
    this.anchorCellNodeKey = null;
    this.focusCellNodeKey = null;
    this.anchorCell = null;
    this.focusCell = null;
    this.hasHijackedSelectionStyles = false;
    this.enableHighlightStyle();
    editor.update(() => {
      const tableNode = lexical.$getNodeByKey(this.tableNodeKey);
      if (!$isTableNode(tableNode)) {
        throw new Error('Expected TableNode.');
      }
      const tableElement = editor.getElementByKey(this.tableNodeKey);
      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }
      const grid = getTableGrid(tableElement);
      $updateDOMForSelection(editor, grid, null);
      lexical.$setSelection(null);
      editor.dispatchCommand(lexical.SELECTION_CHANGE_COMMAND, undefined);
    });
  }
  enableHighlightStyle() {
    const editor = this.editor;
    editor.update(() => {
      const tableElement = editor.getElementByKey(this.tableNodeKey);
      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }
      utils.removeClassNamesFromElement(tableElement, editor._config.theme.tableSelection);
      tableElement.classList.remove('disable-selection');
      this.hasHijackedSelectionStyles = false;
    });
  }
  disableHighlightStyle() {
    const editor = this.editor;
    editor.update(() => {
      const tableElement = editor.getElementByKey(this.tableNodeKey);
      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }
      utils.addClassNamesToElement(tableElement, editor._config.theme.tableSelection);
      this.hasHijackedSelectionStyles = true;
    });
  }
  updateTableGridSelection(selection) {
    if (selection != null && selection.gridKey === this.tableNodeKey) {
      const editor = this.editor;
      this.gridSelection = selection;
      this.isHighlightingCells = true;
      this.disableHighlightStyle();
      $updateDOMForSelection(editor, this.grid, this.gridSelection);
    } else if (selection == null) {
      this.clearHighlight();
    }
  }
  setFocusCellForSelection(cell, ignoreStart = false) {
    const editor = this.editor;
    editor.update(() => {
      const tableNode = lexical.$getNodeByKey(this.tableNodeKey);
      if (!$isTableNode(tableNode)) {
        throw new Error('Expected TableNode.');
      }
      const tableElement = editor.getElementByKey(this.tableNodeKey);
      if (!tableElement) {
        throw new Error('Expected to find TableElement in DOM');
      }
      const cellX = cell.x;
      const cellY = cell.y;
      this.focusCell = cell;
      if (this.anchorCell !== null) {
        const domSelection = getDOMSelection(editor._window);
        // Collapse the selection
        if (domSelection) {
          domSelection.setBaseAndExtent(this.anchorCell.elem, 0, this.focusCell.elem, 0);
        }
      }
      if (!this.isHighlightingCells && (this.anchorX !== cellX || this.anchorY !== cellY || ignoreStart)) {
        this.isHighlightingCells = true;
        this.disableHighlightStyle();
      } else if (cellX === this.focusX && cellY === this.focusY) {
        return;
      }
      this.focusX = cellX;
      this.focusY = cellY;
      if (this.isHighlightingCells) {
        const focusTableCellNode = lexical.$getNearestNodeFromDOMNode(cell.elem);
        if (this.gridSelection != null && this.anchorCellNodeKey != null && $isTableCellNode(focusTableCellNode)) {
          const focusNodeKey = focusTableCellNode.getKey();
          this.gridSelection = this.gridSelection.clone() || lexical.DEPRECATED_$createGridSelection();
          this.focusCellNodeKey = focusNodeKey;
          this.gridSelection.set(this.tableNodeKey, this.anchorCellNodeKey, this.focusCellNodeKey);
          lexical.$setSelection(this.gridSelection);
          editor.dispatchCommand(lexical.SELECTION_CHANGE_COMMAND, undefined);
          $updateDOMForSelection(editor, this.grid, this.gridSelection);
        }
      }
    });
  }
  setAnchorCellForSelection(cell) {
    this.isHighlightingCells = false;
    this.anchorCell = cell;
    this.anchorX = cell.x;
    this.anchorY = cell.y;
    this.editor.update(() => {
      const anchorTableCellNode = lexical.$getNearestNodeFromDOMNode(cell.elem);
      if ($isTableCellNode(anchorTableCellNode)) {
        const anchorNodeKey = anchorTableCellNode.getKey();
        this.gridSelection = lexical.DEPRECATED_$createGridSelection();
        this.anchorCellNodeKey = anchorNodeKey;
      }
    });
  }
  formatCells(type) {
    this.editor.update(() => {
      const selection = lexical.$getSelection();
      if (!lexical.DEPRECATED_$isGridSelection(selection)) {
        {
          throw Error(`Expected grid selection`);
        }
      }
      const formatSelection = lexical.$createRangeSelection();
      const anchor = formatSelection.anchor;
      const focus = formatSelection.focus;
      selection.getNodes().forEach(cellNode => {
        if ($isTableCellNode(cellNode) && cellNode.getTextContentSize() !== 0) {
          anchor.set(cellNode.getKey(), 0, 'element');
          focus.set(cellNode.getKey(), cellNode.getChildrenSize(), 'element');
          formatSelection.formatText(type);
        }
      });
      lexical.$setSelection(selection);
      this.editor.dispatchCommand(lexical.SELECTION_CHANGE_COMMAND, undefined);
    });
  }
  clearText() {
    const editor = this.editor;
    editor.update(() => {
      const tableNode = lexical.$getNodeByKey(this.tableNodeKey);
      if (!$isTableNode(tableNode)) {
        throw new Error('Expected TableNode.');
      }
      const selection = lexical.$getSelection();
      if (!lexical.DEPRECATED_$isGridSelection(selection)) {
        {
          throw Error(`Expected grid selection`);
        }
      }
      const selectedNodes = selection.getNodes().filter($isTableCellNode);
      if (selectedNodes.length === this.grid.columns * this.grid.rows) {
        tableNode.selectPrevious();
        // Delete entire table
        tableNode.remove();
        const rootNode = lexical.$getRoot();
        rootNode.selectStart();
        return;
      }
      selectedNodes.forEach(cellNode => {
        if (lexical.$isElementNode(cellNode)) {
          const paragraphNode = lexical.$createParagraphNode();
          const textNode = lexical.$createTextNode();
          paragraphNode.append(textNode);
          cellNode.append(paragraphNode);
          cellNode.getChildren().forEach(child => {
            if (child !== paragraphNode) {
              child.remove();
            }
          });
        }
      });
      $updateDOMForSelection(editor, this.grid, null);
      lexical.$setSelection(null);
      editor.dispatchCommand(lexical.SELECTION_CHANGE_COMMAND, undefined);
    });
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const LEXICAL_ELEMENT_KEY = '__lexicalTableSelection';
function applyTableHandlers(tableNode, tableElement, editor, hasTabHandler) {
  const rootElement = editor.getRootElement();
  if (rootElement === null) {
    throw new Error('No root element.');
  }
  const tableSelection = new TableSelection(editor, tableNode.getKey());
  const editorWindow = editor._window || window;
  attachTableSelectionToTableElement(tableElement, tableSelection);
  tableElement.addEventListener('mousedown', event => {
    setTimeout(() => {
      if (event.button !== 0) {
        return;
      }
      if (!editorWindow) {
        return;
      }
      const anchorCell = getCellFromTarget(event.target);
      if (anchorCell !== null) {
        stopEvent(event);
        tableSelection.setAnchorCellForSelection(anchorCell);
      }
      const onMouseUp = () => {
        editorWindow.removeEventListener('mouseup', onMouseUp);
        editorWindow.removeEventListener('mousemove', onMouseMove);
      };
      const onMouseMove = moveEvent => {
        const focusCell = getCellFromTarget(moveEvent.target);
        if (focusCell !== null && (tableSelection.anchorX !== focusCell.x || tableSelection.anchorY !== focusCell.y)) {
          moveEvent.preventDefault();
          tableSelection.setFocusCellForSelection(focusCell);
        }
      };
      editorWindow.addEventListener('mouseup', onMouseUp);
      editorWindow.addEventListener('mousemove', onMouseMove);
    }, 0);
  });

  // Clear selection when clicking outside of dom.
  const mouseDownCallback = event => {
    if (event.button !== 0) {
      return;
    }
    editor.update(() => {
      const selection = lexical.$getSelection();
      const target = event.target;
      if (lexical.DEPRECATED_$isGridSelection(selection) && selection.gridKey === tableSelection.tableNodeKey && rootElement.contains(target)) {
        tableSelection.clearHighlight();
      }
    });
  };
  editorWindow.addEventListener('mousedown', mouseDownCallback);
  tableSelection.listenersToRemove.add(() => editorWindow.removeEventListener('mousedown', mouseDownCallback));
  tableSelection.listenersToRemove.add(editor.registerCommand(lexical.KEY_ARROW_DOWN_COMMAND, event => $handleArrowKey(editor, event, 'down', tableNode, tableSelection), lexical.COMMAND_PRIORITY_HIGH));
  tableSelection.listenersToRemove.add(editor.registerCommand(lexical.KEY_ARROW_UP_COMMAND, event => $handleArrowKey(editor, event, 'up', tableNode, tableSelection), lexical.COMMAND_PRIORITY_HIGH));
  tableSelection.listenersToRemove.add(editor.registerCommand(lexical.KEY_ARROW_LEFT_COMMAND, event => $handleArrowKey(editor, event, 'backward', tableNode, tableSelection), lexical.COMMAND_PRIORITY_HIGH));
  tableSelection.listenersToRemove.add(editor.registerCommand(lexical.KEY_ARROW_RIGHT_COMMAND, event => $handleArrowKey(editor, event, 'forward', tableNode, tableSelection), lexical.COMMAND_PRIORITY_HIGH));
  tableSelection.listenersToRemove.add(editor.registerCommand(lexical.KEY_ESCAPE_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (lexical.DEPRECATED_$isGridSelection(selection)) {
      const focusCellNode = utils.$findMatchingParent(selection.focus.getNode(), $isTableCellNode);
      if ($isTableCellNode(focusCellNode)) {
        stopEvent(event);
        focusCellNode.selectEnd();
        return true;
      }
    }
    return false;
  }, lexical.COMMAND_PRIORITY_HIGH));
  const deleteTextHandler = command => () => {
    const selection = lexical.$getSelection();
    if (!$isSelectionInTable(selection, tableNode)) {
      return false;
    }
    if (lexical.DEPRECATED_$isGridSelection(selection)) {
      tableSelection.clearText();
      return true;
    } else if (lexical.$isRangeSelection(selection)) {
      const tableCellNode = utils.$findMatchingParent(selection.anchor.getNode(), n => $isTableCellNode(n));
      if (!$isTableCellNode(tableCellNode)) {
        return false;
      }
      const anchorNode = selection.anchor.getNode();
      const focusNode = selection.focus.getNode();
      const isAnchorInside = tableNode.isParentOf(anchorNode);
      const isFocusInside = tableNode.isParentOf(focusNode);
      const selectionContainsPartialTable = isAnchorInside && !isFocusInside || isFocusInside && !isAnchorInside;
      if (selectionContainsPartialTable) {
        tableSelection.clearText();
        return true;
      }
      const nearestElementNode = utils.$findMatchingParent(selection.anchor.getNode(), n => lexical.$isElementNode(n));
      const topLevelCellElementNode = nearestElementNode && utils.$findMatchingParent(nearestElementNode, n => lexical.$isElementNode(n) && $isTableCellNode(n.getParent()));
      if (!lexical.$isElementNode(topLevelCellElementNode) || !lexical.$isElementNode(nearestElementNode)) {
        return false;
      }
      if (command === lexical.DELETE_LINE_COMMAND && topLevelCellElementNode.getPreviousSibling() === null) {
        // TODO: Fix Delete Line in Table Cells.
        return true;
      }
      if (command === lexical.DELETE_CHARACTER_COMMAND || command === lexical.DELETE_WORD_COMMAND) {
        if (selection.isCollapsed() && selection.anchor.offset === 0) {
          if (nearestElementNode !== topLevelCellElementNode) {
            const children = nearestElementNode.getChildren();
            const newParagraphNode = lexical.$createParagraphNode();
            children.forEach(child => newParagraphNode.append(child));
            nearestElementNode.replace(newParagraphNode);
            nearestElementNode.getWritable().__parent = tableCellNode.getKey();
            return true;
          }
        }
      }
    }
    return false;
  };
  [lexical.DELETE_WORD_COMMAND, lexical.DELETE_LINE_COMMAND, lexical.DELETE_CHARACTER_COMMAND].forEach(command => {
    tableSelection.listenersToRemove.add(editor.registerCommand(command, deleteTextHandler(command), lexical.COMMAND_PRIORITY_CRITICAL));
  });
  const deleteCellHandler = event => {
    const selection = lexical.$getSelection();
    if (!$isSelectionInTable(selection, tableNode)) {
      return false;
    }
    if (lexical.DEPRECATED_$isGridSelection(selection)) {
      event.preventDefault();
      event.stopPropagation();
      tableSelection.clearText();
      return true;
    } else if (lexical.$isRangeSelection(selection)) {
      const tableCellNode = utils.$findMatchingParent(selection.anchor.getNode(), n => $isTableCellNode(n));
      if (!$isTableCellNode(tableCellNode)) {
        return false;
      }
    }
    return false;
  };
  tableSelection.listenersToRemove.add(editor.registerCommand(lexical.KEY_BACKSPACE_COMMAND, deleteCellHandler, lexical.COMMAND_PRIORITY_CRITICAL));
  tableSelection.listenersToRemove.add(editor.registerCommand(lexical.KEY_DELETE_COMMAND, deleteCellHandler, lexical.COMMAND_PRIORITY_CRITICAL));
  tableSelection.listenersToRemove.add(editor.registerCommand(lexical.FORMAT_TEXT_COMMAND, payload => {
    const selection = lexical.$getSelection();
    if (!$isSelectionInTable(selection, tableNode)) {
      return false;
    }
    if (lexical.DEPRECATED_$isGridSelection(selection)) {
      tableSelection.formatCells(payload);
      return true;
    } else if (lexical.$isRangeSelection(selection)) {
      const tableCellNode = utils.$findMatchingParent(selection.anchor.getNode(), n => $isTableCellNode(n));
      if (!$isTableCellNode(tableCellNode)) {
        return false;
      }
    }
    return false;
  }, lexical.COMMAND_PRIORITY_CRITICAL));
  tableSelection.listenersToRemove.add(editor.registerCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, payload => {
    const selection = lexical.$getSelection();
    if (!$isSelectionInTable(selection, tableNode)) {
      return false;
    }
    if (lexical.DEPRECATED_$isGridSelection(selection)) {
      tableSelection.clearHighlight();
      return false;
    } else if (lexical.$isRangeSelection(selection)) {
      const tableCellNode = utils.$findMatchingParent(selection.anchor.getNode(), n => $isTableCellNode(n));
      if (!$isTableCellNode(tableCellNode)) {
        return false;
      }
    }
    return false;
  }, lexical.COMMAND_PRIORITY_CRITICAL));
  if (hasTabHandler) {
    tableSelection.listenersToRemove.add(editor.registerCommand(lexical.KEY_TAB_COMMAND, event => {
      const selection = lexical.$getSelection();
      if (!lexical.$isRangeSelection(selection) || !selection.isCollapsed() || !$isSelectionInTable(selection, tableNode)) {
        return false;
      }
      const tableCellNode = $findCellNode(selection.anchor.getNode());
      if (tableCellNode === null) {
        return false;
      }
      stopEvent(event);
      const currentCords = tableNode.getCordsFromCellNode(tableCellNode, tableSelection.grid);
      selectGridNodeInDirection(tableSelection, tableNode, currentCords.x, currentCords.y, !event.shiftKey ? 'forward' : 'backward');
      return true;
    }, lexical.COMMAND_PRIORITY_CRITICAL));
  }
  tableSelection.listenersToRemove.add(editor.registerCommand(lexical.FOCUS_COMMAND, payload => {
    return tableNode.isSelected();
  }, lexical.COMMAND_PRIORITY_HIGH));
  function getCellFromCellNode(tableCellNode) {
    const currentCords = tableNode.getCordsFromCellNode(tableCellNode, tableSelection.grid);
    return tableNode.getCellFromCordsOrThrow(currentCords.x, currentCords.y, tableSelection.grid);
  }
  tableSelection.listenersToRemove.add(editor.registerCommand(lexical.SELECTION_CHANGE_COMMAND, () => {
    const selection = lexical.$getSelection();
    const prevSelection = lexical.$getPreviousSelection();
    if (lexical.$isRangeSelection(selection)) {
      const {
        anchor,
        focus
      } = selection;
      const anchorNode = anchor.getNode();
      const focusNode = focus.getNode();
      // Using explicit comparison with table node to ensure it's not a nested table
      // as in that case we'll leave selection resolving to that table
      const anchorCellNode = $findCellNode(anchorNode);
      const focusCellNode = $findCellNode(focusNode);
      const isAnchorInside = anchorCellNode && tableNode.is($findTableNode(anchorCellNode));
      const isFocusInside = focusCellNode && tableNode.is($findTableNode(focusCellNode));
      const isPartialyWithinTable = isAnchorInside !== isFocusInside;
      const isWithinTable = isAnchorInside && isFocusInside;
      const isBackward = selection.isBackward();
      if (isPartialyWithinTable) {
        const newSelection = selection.clone();
        newSelection.focus.set(tableNode.getKey(), isBackward ? 0 : tableNode.getChildrenSize(), 'element');
        lexical.$setSelection(newSelection);
        $addHighlightStyleToTable(editor, tableSelection);
      } else if (isWithinTable) {
        // Handle case when selection spans across multiple cells but still
        // has range selection, then we convert it into grid selection
        if (!anchorCellNode.is(focusCellNode)) {
          tableSelection.setAnchorCellForSelection(getCellFromCellNode(anchorCellNode));
          tableSelection.setFocusCellForSelection(getCellFromCellNode(focusCellNode), true);
        }
      }
    }
    if (selection && !selection.is(prevSelection) && (lexical.DEPRECATED_$isGridSelection(selection) || lexical.DEPRECATED_$isGridSelection(prevSelection)) && tableSelection.gridSelection && !tableSelection.gridSelection.is(prevSelection)) {
      if (lexical.DEPRECATED_$isGridSelection(selection) && selection.gridKey === tableSelection.tableNodeKey) {
        tableSelection.updateTableGridSelection(selection);
      } else if (!lexical.DEPRECATED_$isGridSelection(selection) && lexical.DEPRECATED_$isGridSelection(prevSelection) && prevSelection.gridKey === tableSelection.tableNodeKey) {
        tableSelection.updateTableGridSelection(null);
      }
      return false;
    }
    if (tableSelection.hasHijackedSelectionStyles && !tableNode.isSelected()) {
      $removeHighlightStyleToTable(editor, tableSelection);
    } else if (!tableSelection.hasHijackedSelectionStyles && tableNode.isSelected()) {
      $addHighlightStyleToTable(editor, tableSelection);
    }
    return false;
  }, lexical.COMMAND_PRIORITY_CRITICAL));
  return tableSelection;
}
function attachTableSelectionToTableElement(tableElement, tableSelection) {
  tableElement[LEXICAL_ELEMENT_KEY] = tableSelection;
}
function getTableSelectionFromTableElement(tableElement) {
  return tableElement[LEXICAL_ELEMENT_KEY];
}
function getCellFromTarget(node) {
  let currentNode = node;
  while (currentNode != null) {
    const nodeName = currentNode.nodeName;
    if (nodeName === 'TD' || nodeName === 'TH') {
      // @ts-expect-error: internal field
      const cell = currentNode._cell;
      if (cell === undefined) {
        return null;
      }
      return cell;
    }
    currentNode = currentNode.parentNode;
  }
  return null;
}
function getTableGrid(tableElement) {
  const cells = [];
  const grid = {
    cells,
    columns: 0,
    rows: 0
  };
  let currentNode = tableElement.firstChild;
  let x = 0;
  let y = 0;
  cells.length = 0;
  while (currentNode != null) {
    const nodeMame = currentNode.nodeName;
    if (nodeMame === 'TD' || nodeMame === 'TH') {
      const elem = currentNode;
      const cell = {
        elem,
        hasBackgroundColor: elem.style.backgroundColor !== '',
        highlighted: false,
        x,
        y
      };

      // @ts-expect-error: internal field
      currentNode._cell = cell;
      let row = cells[y];
      if (row === undefined) {
        row = cells[y] = [];
      }
      row[x] = cell;
    } else {
      const child = currentNode.firstChild;
      if (child != null) {
        currentNode = child;
        continue;
      }
    }
    const sibling = currentNode.nextSibling;
    if (sibling != null) {
      x++;
      currentNode = sibling;
      continue;
    }
    const parent = currentNode.parentNode;
    if (parent != null) {
      const parentSibling = parent.nextSibling;
      if (parentSibling == null) {
        break;
      }
      y++;
      x = 0;
      currentNode = parentSibling;
    }
  }
  grid.columns = x + 1;
  grid.rows = y + 1;
  return grid;
}
function $updateDOMForSelection(editor, grid, selection) {
  const selectedCellNodes = new Set(selection ? selection.getNodes() : []);
  $forEachGridCell(grid, (cell, lexicalNode) => {
    const elem = cell.elem;
    if (selectedCellNodes.has(lexicalNode)) {
      cell.highlighted = true;
      $addHighlightToDOM(editor, cell);
    } else {
      cell.highlighted = false;
      $removeHighlightFromDOM(editor, cell);
      if (!elem.getAttribute('style')) {
        elem.removeAttribute('style');
      }
    }
  });
}
function $forEachGridCell(grid, cb) {
  const {
    cells
  } = grid;
  for (let y = 0; y < cells.length; y++) {
    const row = cells[y];
    if (!row) {
      continue;
    }
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (!cell) {
        continue;
      }
      const lexicalNode = lexical.$getNearestNodeFromDOMNode(cell.elem);
      if (lexicalNode !== null) {
        cb(cell, lexicalNode, {
          x,
          y
        });
      }
    }
  }
}
function $addHighlightStyleToTable(editor, tableSelection) {
  tableSelection.disableHighlightStyle();
  $forEachGridCell(tableSelection.grid, cell => {
    cell.highlighted = true;
    $addHighlightToDOM(editor, cell);
  });
}
function $removeHighlightStyleToTable(editor, tableSelection) {
  tableSelection.enableHighlightStyle();
  $forEachGridCell(tableSelection.grid, cell => {
    const elem = cell.elem;
    cell.highlighted = false;
    $removeHighlightFromDOM(editor, cell);
    if (!elem.getAttribute('style')) {
      elem.removeAttribute('style');
    }
  });
}
const selectGridNodeInDirection = (tableSelection, tableNode, x, y, direction) => {
  const isForward = direction === 'forward';
  switch (direction) {
    case 'backward':
    case 'forward':
      if (x !== (isForward ? tableSelection.grid.columns - 1 : 0)) {
        selectTableCellNode(tableNode.getCellNodeFromCordsOrThrow(x + (isForward ? 1 : -1), y, tableSelection.grid), isForward);
      } else {
        if (y !== (isForward ? tableSelection.grid.rows - 1 : 0)) {
          selectTableCellNode(tableNode.getCellNodeFromCordsOrThrow(isForward ? 0 : tableSelection.grid.columns - 1, y + (isForward ? 1 : -1), tableSelection.grid), isForward);
        } else if (!isForward) {
          tableNode.selectPrevious();
        } else {
          tableNode.selectNext();
        }
      }
      return true;
    case 'up':
      if (y !== 0) {
        selectTableCellNode(tableNode.getCellNodeFromCordsOrThrow(x, y - 1, tableSelection.grid), false);
      } else {
        tableNode.selectPrevious();
      }
      return true;
    case 'down':
      if (y !== tableSelection.grid.rows - 1) {
        selectTableCellNode(tableNode.getCellNodeFromCordsOrThrow(x, y + 1, tableSelection.grid), true);
      } else {
        tableNode.selectNext();
      }
      return true;
    default:
      return false;
  }
};
const adjustFocusNodeInDirection = (tableSelection, tableNode, x, y, direction) => {
  const isForward = direction === 'forward';
  switch (direction) {
    case 'backward':
    case 'forward':
      if (x !== (isForward ? tableSelection.grid.columns - 1 : 0)) {
        tableSelection.setFocusCellForSelection(tableNode.getCellFromCordsOrThrow(x + (isForward ? 1 : -1), y, tableSelection.grid));
      }
      return true;
    case 'up':
      if (y !== 0) {
        tableSelection.setFocusCellForSelection(tableNode.getCellFromCordsOrThrow(x, y - 1, tableSelection.grid));
        return true;
      } else {
        return false;
      }
    case 'down':
      if (y !== tableSelection.grid.rows - 1) {
        tableSelection.setFocusCellForSelection(tableNode.getCellFromCordsOrThrow(x, y + 1, tableSelection.grid));
        return true;
      } else {
        return false;
      }
    default:
      return false;
  }
};
function $isSelectionInTable(selection, tableNode) {
  if (lexical.$isRangeSelection(selection) || lexical.DEPRECATED_$isGridSelection(selection)) {
    const isAnchorInside = tableNode.isParentOf(selection.anchor.getNode());
    const isFocusInside = tableNode.isParentOf(selection.focus.getNode());
    return isAnchorInside && isFocusInside;
  }
  return false;
}
function selectTableCellNode(tableCell, fromStart) {
  if (fromStart) {
    tableCell.selectStart();
  } else {
    tableCell.selectEnd();
  }
}
const BROWSER_BLUE_RGB = '172,206,247';
function $addHighlightToDOM(editor, cell) {
  const element = cell.elem;
  const node = lexical.$getNearestNodeFromDOMNode(element);
  if (!$isTableCellNode(node)) {
    throw Error(`Expected to find LexicalNode from Table Cell DOMNode`);
  }
  const backgroundColor = node.getBackgroundColor();
  if (backgroundColor === null) {
    element.style.setProperty('background-color', `rgb(${BROWSER_BLUE_RGB})`);
  } else {
    element.style.setProperty('background-image', `linear-gradient(to right, rgba(${BROWSER_BLUE_RGB},0.85), rgba(${BROWSER_BLUE_RGB},0.85))`);
  }
  element.style.setProperty('caret-color', 'transparent');
}
function $removeHighlightFromDOM(editor, cell) {
  const element = cell.elem;
  const node = lexical.$getNearestNodeFromDOMNode(element);
  if (!$isTableCellNode(node)) {
    throw Error(`Expected to find LexicalNode from Table Cell DOMNode`);
  }
  const backgroundColor = node.getBackgroundColor();
  if (backgroundColor === null) {
    element.style.removeProperty('background-color');
  }
  element.style.removeProperty('background-image');
  element.style.removeProperty('caret-color');
}
function $findCellNode(node) {
  const cellNode = utils.$findMatchingParent(node, $isTableCellNode);
  return $isTableCellNode(cellNode) ? cellNode : null;
}
function $findTableNode(node) {
  const tableNode = utils.$findMatchingParent(node, $isTableNode);
  return $isTableNode(tableNode) ? tableNode : null;
}
function $handleArrowKey(editor, event, direction, tableNode, tableSelection) {
  const selection = lexical.$getSelection();
  if (!$isSelectionInTable(selection, tableNode)) {
    return false;
  }
  if (lexical.$isRangeSelection(selection) && selection.isCollapsed()) {
    // Horizontal move between cels seem to work well without interruption
    // so just exit early, and handle vertical moves
    if (direction === 'backward' || direction === 'forward') {
      return false;
    }
    const {
      anchor,
      focus
    } = selection;
    const anchorCellNode = utils.$findMatchingParent(anchor.getNode(), $isTableCellNode);
    const focusCellNode = utils.$findMatchingParent(focus.getNode(), $isTableCellNode);
    if (!$isTableCellNode(anchorCellNode) || !anchorCellNode.is(focusCellNode)) {
      return false;
    }
    const anchorCellDom = editor.getElementByKey(anchorCellNode.__key);
    const anchorDOM = editor.getElementByKey(anchor.key);
    if (anchorDOM == null || anchorCellDom == null) {
      return false;
    }
    let edgeSelectionRect;
    if (anchor.type === 'element') {
      edgeSelectionRect = anchorDOM.getBoundingClientRect();
    } else {
      const domSelection = window.getSelection();
      if (domSelection === null || domSelection.rangeCount === 0) {
        return false;
      }
      const range = domSelection.getRangeAt(0);
      edgeSelectionRect = range.getBoundingClientRect();
    }
    const edgeChild = direction === 'up' ? anchorCellNode.getFirstChild() : anchorCellNode.getLastChild();
    if (edgeChild == null) {
      return false;
    }
    const edgeChildDOM = editor.getElementByKey(edgeChild.__key);
    if (edgeChildDOM == null) {
      return false;
    }
    const edgeRect = edgeChildDOM.getBoundingClientRect();
    const isExiting = direction === 'up' ? edgeRect.top > edgeSelectionRect.top - edgeSelectionRect.height : edgeSelectionRect.bottom + edgeSelectionRect.height > edgeRect.bottom;
    if (isExiting) {
      stopEvent(event);
      const cords = tableNode.getCordsFromCellNode(anchorCellNode, tableSelection.grid);
      if (event.shiftKey) {
        const cell = tableNode.getCellFromCordsOrThrow(cords.x, cords.y, tableSelection.grid);
        tableSelection.setAnchorCellForSelection(cell);
        tableSelection.setFocusCellForSelection(cell, true);
      } else {
        return selectGridNodeInDirection(tableSelection, tableNode, cords.x, cords.y, direction);
      }
      return true;
    }
  } else if (lexical.DEPRECATED_$isGridSelection(selection)) {
    const {
      anchor,
      focus
    } = selection;
    const anchorCellNode = utils.$findMatchingParent(anchor.getNode(), $isTableCellNode);
    const focusCellNode = utils.$findMatchingParent(focus.getNode(), $isTableCellNode);
    if (!$isTableCellNode(anchorCellNode) || !$isTableCellNode(focusCellNode)) {
      return false;
    }
    stopEvent(event);
    if (event.shiftKey) {
      const cords = tableNode.getCordsFromCellNode(focusCellNode, tableSelection.grid);
      return adjustFocusNodeInDirection(tableSelection, tableNode, cords.x, cords.y, direction);
    } else {
      focusCellNode.selectEnd();
    }
    return true;
  }
  return false;
}
function stopEvent(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/** @noInheritDoc */
class TableNode extends lexical.DEPRECATED_GridNode {
  /** @internal */

  static getType() {
    return 'table';
  }
  static clone(node) {
    return new TableNode(node.__key);
  }
  static importDOM() {
    return {
      table: _node => ({
        conversion: convertTableElement,
        priority: 1
      })
    };
  }
  static importJSON(_serializedNode) {
    return $createTableNode();
  }
  constructor(key) {
    super(key);
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'table',
      version: 1
    };
  }
  createDOM(config, editor) {
    const tableElement = document.createElement('table');
    utils.addClassNamesToElement(tableElement, config.theme.table);
    return tableElement;
  }
  updateDOM() {
    return false;
  }
  exportDOM(editor) {
    return {
      ...super.exportDOM(editor),
      after: tableElement => {
        if (tableElement) {
          const newElement = tableElement.cloneNode();
          const colGroup = document.createElement('colgroup');
          const tBody = document.createElement('tbody');
          if (utils.isHTMLElement(tableElement)) {
            tBody.append(...tableElement.children);
          }
          const firstRow = this.getFirstChildOrThrow();
          if (!$isTableRowNode(firstRow)) {
            throw new Error('Expected to find row node.');
          }
          const colCount = firstRow.getChildrenSize();
          for (let i = 0; i < colCount; i++) {
            const col = document.createElement('col');
            colGroup.append(col);
          }
          newElement.replaceChildren(colGroup, tBody);
          return newElement;
        }
      }
    };
  }

  // TODO 0.10 deprecate
  canExtractContents() {
    return false;
  }
  canBeEmpty() {
    return false;
  }
  isShadowRoot() {
    return true;
  }
  getCordsFromCellNode(tableCellNode, grid) {
    const {
      rows,
      cells
    } = grid;
    for (let y = 0; y < rows; y++) {
      const row = cells[y];
      if (row == null) {
        continue;
      }
      const x = row.findIndex(cell => {
        if (!cell) return;
        const {
          elem
        } = cell;
        const cellNode = lexical.$getNearestNodeFromDOMNode(elem);
        return cellNode === tableCellNode;
      });
      if (x !== -1) {
        return {
          x,
          y
        };
      }
    }
    throw new Error('Cell not found in table.');
  }
  getCellFromCords(x, y, grid) {
    const {
      cells
    } = grid;
    const row = cells[y];
    if (row == null) {
      return null;
    }
    const cell = row[x];
    if (cell == null) {
      return null;
    }
    return cell;
  }
  getCellFromCordsOrThrow(x, y, grid) {
    const cell = this.getCellFromCords(x, y, grid);
    if (!cell) {
      throw new Error('Cell not found at cords.');
    }
    return cell;
  }
  getCellNodeFromCords(x, y, grid) {
    const cell = this.getCellFromCords(x, y, grid);
    if (cell == null) {
      return null;
    }
    const node = lexical.$getNearestNodeFromDOMNode(cell.elem);
    if ($isTableCellNode(node)) {
      return node;
    }
    return null;
  }
  getCellNodeFromCordsOrThrow(x, y, grid) {
    const node = this.getCellNodeFromCords(x, y, grid);
    if (!node) {
      throw new Error('Node at cords not TableCellNode.');
    }
    return node;
  }
  canSelectBefore() {
    return true;
  }
  canIndent() {
    return false;
  }
}
function $getElementGridForTableNode(editor, tableNode) {
  const tableElement = editor.getElementByKey(tableNode.getKey());
  if (tableElement == null) {
    throw new Error('Table Element Not Found');
  }
  return getTableGrid(tableElement);
}
function convertTableElement(_domNode) {
  return {
    node: $createTableNode()
  };
}
function $createTableNode() {
  return lexical.$applyNodeReplacement(new TableNode());
}
function $isTableNode(node) {
  return node instanceof TableNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function $createTableNodeWithDimensions(rowCount, columnCount, includeHeaders = true) {
  const tableNode = $createTableNode();
  for (let iRow = 0; iRow < rowCount; iRow++) {
    const tableRowNode = $createTableRowNode();
    for (let iColumn = 0; iColumn < columnCount; iColumn++) {
      let headerState = TableCellHeaderStates.NO_STATUS;
      if (typeof includeHeaders === 'object') {
        if (iRow === 0 && includeHeaders.rows) headerState |= TableCellHeaderStates.ROW;
        if (iColumn === 0 && includeHeaders.columns) headerState |= TableCellHeaderStates.COLUMN;
      } else if (includeHeaders) {
        if (iRow === 0) headerState |= TableCellHeaderStates.ROW;
        if (iColumn === 0) headerState |= TableCellHeaderStates.COLUMN;
      }
      const tableCellNode = $createTableCellNode(headerState);
      const paragraphNode = lexical.$createParagraphNode();
      paragraphNode.append(lexical.$createTextNode());
      tableCellNode.append(paragraphNode);
      tableRowNode.append(tableCellNode);
    }
    tableNode.append(tableRowNode);
  }
  return tableNode;
}
function $getTableCellNodeFromLexicalNode(startingNode) {
  const node = utils.$findMatchingParent(startingNode, n => $isTableCellNode(n));
  if ($isTableCellNode(node)) {
    return node;
  }
  return null;
}
function $getTableRowNodeFromTableCellNodeOrThrow(startingNode) {
  const node = utils.$findMatchingParent(startingNode, n => $isTableRowNode(n));
  if ($isTableRowNode(node)) {
    return node;
  }
  throw new Error('Expected table cell to be inside of table row.');
}
function $getTableNodeFromLexicalNodeOrThrow(startingNode) {
  const node = utils.$findMatchingParent(startingNode, n => $isTableNode(n));
  if ($isTableNode(node)) {
    return node;
  }
  throw new Error('Expected table cell to be inside of table.');
}
function $getTableRowIndexFromTableCellNode(tableCellNode) {
  const tableRowNode = $getTableRowNodeFromTableCellNodeOrThrow(tableCellNode);
  const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableRowNode);
  return tableNode.getChildren().findIndex(n => n.is(tableRowNode));
}
function $getTableColumnIndexFromTableCellNode(tableCellNode) {
  const tableRowNode = $getTableRowNodeFromTableCellNodeOrThrow(tableCellNode);
  return tableRowNode.getChildren().findIndex(n => n.is(tableCellNode));
}
function $getTableCellSiblingsFromTableCellNode(tableCellNode, grid) {
  const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
  const {
    x,
    y
  } = tableNode.getCordsFromCellNode(tableCellNode, grid);
  return {
    above: tableNode.getCellNodeFromCords(x, y - 1, grid),
    below: tableNode.getCellNodeFromCords(x, y + 1, grid),
    left: tableNode.getCellNodeFromCords(x - 1, y, grid),
    right: tableNode.getCellNodeFromCords(x + 1, y, grid)
  };
}
function $removeTableRowAtIndex(tableNode, indexToDelete) {
  const tableRows = tableNode.getChildren();
  if (indexToDelete >= tableRows.length || indexToDelete < 0) {
    throw new Error('Expected table cell to be inside of table row.');
  }
  const targetRowNode = tableRows[indexToDelete];
  targetRowNode.remove();
  return tableNode;
}
function $insertTableRow(tableNode, targetIndex, shouldInsertAfter = true, rowCount, grid) {
  const tableRows = tableNode.getChildren();
  if (targetIndex >= tableRows.length || targetIndex < 0) {
    throw new Error('Table row target index out of range');
  }
  const targetRowNode = tableRows[targetIndex];
  if ($isTableRowNode(targetRowNode)) {
    for (let r = 0; r < rowCount; r++) {
      const tableRowCells = targetRowNode.getChildren();
      const tableColumnCount = tableRowCells.length;
      const newTableRowNode = $createTableRowNode();
      for (let c = 0; c < tableColumnCount; c++) {
        const tableCellFromTargetRow = tableRowCells[c];
        if (!$isTableCellNode(tableCellFromTargetRow)) {
          throw Error(`Expected table cell`);
        }
        const {
          above,
          below
        } = $getTableCellSiblingsFromTableCellNode(tableCellFromTargetRow, grid);
        let headerState = TableCellHeaderStates.NO_STATUS;
        const width = above && above.getWidth() || below && below.getWidth() || undefined;
        if (above && above.hasHeaderState(TableCellHeaderStates.COLUMN) || below && below.hasHeaderState(TableCellHeaderStates.COLUMN)) {
          headerState |= TableCellHeaderStates.COLUMN;
        }
        const tableCellNode = $createTableCellNode(headerState, 1, width);
        tableCellNode.append(lexical.$createParagraphNode());
        newTableRowNode.append(tableCellNode);
      }
      if (shouldInsertAfter) {
        targetRowNode.insertAfter(newTableRowNode);
      } else {
        targetRowNode.insertBefore(newTableRowNode);
      }
    }
  } else {
    throw new Error('Row before insertion index does not exist.');
  }
  return tableNode;
}
function $insertTableRow__EXPERIMENTAL(insertAfter = true) {
  const selection = lexical.$getSelection();
  if (!(lexical.$isRangeSelection(selection) || lexical.DEPRECATED_$isGridSelection(selection))) {
    throw Error(`Expected a RangeSelection or GridSelection`);
  }
  const focus = selection.focus.getNode();
  const [focusCell,, grid] = lexical.DEPRECATED_$getNodeTriplet(focus);
  const [gridMap, focusCellMap] = lexical.DEPRECATED_$computeGridMap(grid, focusCell, focusCell);
  const columnCount = gridMap[0].length;
  const {
    startRow: focusStartRow
  } = focusCellMap;
  if (insertAfter) {
    const focusEndRow = focusStartRow + focusCell.__rowSpan - 1;
    const focusEndRowMap = gridMap[focusEndRow];
    const newRow = $createTableRowNode();
    for (let i = 0; i < columnCount; i++) {
      const {
        cell,
        startRow
      } = focusEndRowMap[i];
      if (startRow + cell.__rowSpan - 1 <= focusEndRow) {
        newRow.append($createTableCellNode(TableCellHeaderStates.NO_STATUS));
      } else {
        cell.setRowSpan(cell.__rowSpan + 1);
      }
    }
    const focusEndRowNode = grid.getChildAtIndex(focusEndRow);
    if (!lexical.DEPRECATED_$isGridRowNode(focusEndRowNode)) {
      throw Error(`focusEndRow is not a GridRowNode`);
    }
    focusEndRowNode.insertAfter(newRow);
  } else {
    const focusStartRowMap = gridMap[focusStartRow];
    const newRow = $createTableRowNode();
    for (let i = 0; i < columnCount; i++) {
      const {
        cell,
        startRow
      } = focusStartRowMap[i];
      if (startRow === focusStartRow) {
        newRow.append($createTableCellNode(TableCellHeaderStates.NO_STATUS));
      } else {
        cell.setRowSpan(cell.__rowSpan + 1);
      }
    }
    const focusStartRowNode = grid.getChildAtIndex(focusStartRow);
    if (!lexical.DEPRECATED_$isGridRowNode(focusStartRowNode)) {
      throw Error(`focusEndRow is not a GridRowNode`);
    }
    focusStartRowNode.insertBefore(newRow);
  }
}
function $insertTableColumn(tableNode, targetIndex, shouldInsertAfter = true, columnCount, grid) {
  const tableRows = tableNode.getChildren();
  for (let r = 0; r < tableRows.length; r++) {
    const currentTableRowNode = tableRows[r];
    if ($isTableRowNode(currentTableRowNode)) {
      for (let c = 0; c < columnCount; c++) {
        const tableRowChildren = currentTableRowNode.getChildren();
        if (targetIndex >= tableRowChildren.length || targetIndex < 0) {
          throw new Error('Table column target index out of range');
        }
        const targetCell = tableRowChildren[targetIndex];
        if (!$isTableCellNode(targetCell)) {
          throw Error(`Expected table cell`);
        }
        const {
          left,
          right
        } = $getTableCellSiblingsFromTableCellNode(targetCell, grid);
        let headerState = TableCellHeaderStates.NO_STATUS;
        if (left && left.hasHeaderState(TableCellHeaderStates.ROW) || right && right.hasHeaderState(TableCellHeaderStates.ROW)) {
          headerState |= TableCellHeaderStates.ROW;
        }
        const newTableCell = $createTableCellNode(headerState);
        newTableCell.append(lexical.$createParagraphNode());
        if (shouldInsertAfter) {
          targetCell.insertAfter(newTableCell);
        } else {
          targetCell.insertBefore(newTableCell);
        }
      }
    }
  }
  return tableNode;
}
function $insertTableColumn__EXPERIMENTAL(insertAfter = true) {
  const selection = lexical.$getSelection();
  if (!(lexical.$isRangeSelection(selection) || lexical.DEPRECATED_$isGridSelection(selection))) {
    throw Error(`Expected a RangeSelection or GridSelection`);
  }
  const anchor = selection.anchor.getNode();
  const focus = selection.focus.getNode();
  const [anchorCell] = lexical.DEPRECATED_$getNodeTriplet(anchor);
  const [focusCell,, grid] = lexical.DEPRECATED_$getNodeTriplet(focus);
  const [gridMap, focusCellMap, anchorCellMap] = lexical.DEPRECATED_$computeGridMap(grid, focusCell, anchorCell);
  const rowCount = gridMap.length;
  const startColumn = insertAfter ? Math.max(focusCellMap.startColumn, anchorCellMap.startColumn) : Math.min(focusCellMap.startColumn, anchorCellMap.startColumn);
  const insertAfterColumn = insertAfter ? startColumn + focusCell.__colSpan - 1 : startColumn - 1;
  const gridFirstChild = grid.getFirstChild();
  if (!lexical.DEPRECATED_$isGridRowNode(gridFirstChild)) {
    throw Error(`Expected firstTable child to be a row`);
  }
  let firstInsertedCell = null;
  function $createTableCellNodeForInsertTableColumn() {
    const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS).append(lexical.$createParagraphNode());
    if (firstInsertedCell === null) {
      firstInsertedCell = cell;
    }
    return cell;
  }
  let loopRow = gridFirstChild;
  rowLoop: for (let i = 0; i < rowCount; i++) {
    if (i !== 0) {
      const currentRow = loopRow.getNextSibling();
      if (!lexical.DEPRECATED_$isGridRowNode(currentRow)) {
        throw Error(`Expected row nextSibling to be a row`);
      }
      loopRow = currentRow;
    }
    const rowMap = gridMap[i];
    if (insertAfterColumn < 0) {
      $insertFirst(loopRow, $createTableCellNodeForInsertTableColumn());
      continue;
    }
    const {
      cell: currentCell,
      startColumn: currentStartColumn,
      startRow: currentStartRow
    } = rowMap[insertAfterColumn];
    if (currentStartColumn + currentCell.__colSpan - 1 <= insertAfterColumn) {
      let insertAfterCell = currentCell;
      let insertAfterCellRowStart = currentStartRow;
      let prevCellIndex = insertAfterColumn;
      while (insertAfterCellRowStart !== i && insertAfterCell.__rowSpan > 1) {
        prevCellIndex -= currentCell.__colSpan;
        if (prevCellIndex >= 0) {
          const {
            cell: cell_,
            startRow: startRow_
          } = rowMap[prevCellIndex];
          insertAfterCell = cell_;
          insertAfterCellRowStart = startRow_;
        } else {
          loopRow.append($createTableCellNodeForInsertTableColumn());
          continue rowLoop;
        }
      }
      insertAfterCell.insertAfter($createTableCellNodeForInsertTableColumn());
    } else {
      currentCell.setColSpan(currentCell.__colSpan + 1);
    }
  }
  if (firstInsertedCell !== null) {
    $moveSelectionToCell(firstInsertedCell);
  }
}
function $deleteTableColumn(tableNode, targetIndex) {
  const tableRows = tableNode.getChildren();
  for (let i = 0; i < tableRows.length; i++) {
    const currentTableRowNode = tableRows[i];
    if ($isTableRowNode(currentTableRowNode)) {
      const tableRowChildren = currentTableRowNode.getChildren();
      if (targetIndex >= tableRowChildren.length || targetIndex < 0) {
        throw new Error('Table column target index out of range');
      }
      tableRowChildren[targetIndex].remove();
    }
  }
  return tableNode;
}
function $deleteTableRow__EXPERIMENTAL() {
  const selection = lexical.$getSelection();
  if (!(lexical.$isRangeSelection(selection) || lexical.DEPRECATED_$isGridSelection(selection))) {
    throw Error(`Expected a RangeSelection or GridSelection`);
  }
  const anchor = selection.anchor.getNode();
  const focus = selection.focus.getNode();
  const [anchorCell,, grid] = lexical.DEPRECATED_$getNodeTriplet(anchor);
  const [focusCell] = lexical.DEPRECATED_$getNodeTriplet(focus);
  const [gridMap, anchorCellMap, focusCellMap] = lexical.DEPRECATED_$computeGridMap(grid, anchorCell, focusCell);
  const {
    startRow: anchorStartRow
  } = anchorCellMap;
  const {
    startRow: focusStartRow
  } = focusCellMap;
  const focusEndRow = focusStartRow + focusCell.__rowSpan - 1;
  if (gridMap.length === focusEndRow - anchorStartRow + 1) {
    // Empty grid
    grid.remove();
    return;
  }
  const columnCount = gridMap[0].length;
  const nextRow = gridMap[focusEndRow + 1];
  const nextRowNode = grid.getChildAtIndex(focusEndRow + 1);
  for (let row = focusEndRow; row >= anchorStartRow; row--) {
    for (let column = columnCount - 1; column >= 0; column--) {
      const {
        cell,
        startRow: cellStartRow,
        startColumn: cellStartColumn
      } = gridMap[row][column];
      if (cellStartColumn !== column) {
        // Don't repeat work for the same Cell
        continue;
      }
      // Rows overflowing top have to be trimmed
      if (row === anchorStartRow && cellStartRow < anchorStartRow) {
        cell.setRowSpan(cell.__rowSpan - (cellStartRow - anchorStartRow));
      }
      // Rows overflowing bottom have to be trimmed and moved to the next row
      if (cellStartRow >= anchorStartRow && cellStartRow + cell.__rowSpan - 1 > focusEndRow) {
        cell.setRowSpan(cell.__rowSpan - (focusEndRow - cellStartRow + 1));
        if (!(nextRowNode !== null)) {
          throw Error(`Expected nextRowNode not to be null`);
        }
        if (column === 0) {
          $insertFirst(nextRowNode, cell);
        } else {
          const {
            cell: previousCell
          } = nextRow[column - 1];
          previousCell.insertAfter(cell);
        }
      }
    }
    const rowNode = grid.getChildAtIndex(row);
    if (!lexical.DEPRECATED_$isGridRowNode(rowNode)) {
      throw Error(`Expected GridNode childAtIndex(${String(row)}) to be RowNode`);
    }
    rowNode.remove();
  }
  if (nextRow !== undefined) {
    const {
      cell
    } = nextRow[0];
    $moveSelectionToCell(cell);
  } else {
    const previousRow = gridMap[anchorStartRow - 1];
    const {
      cell
    } = previousRow[0];
    $moveSelectionToCell(cell);
  }
}
function $deleteTableColumn__EXPERIMENTAL() {
  const selection = lexical.$getSelection();
  if (!(lexical.$isRangeSelection(selection) || lexical.DEPRECATED_$isGridSelection(selection))) {
    throw Error(`Expected a RangeSelection or GridSelection`);
  }
  const anchor = selection.anchor.getNode();
  const focus = selection.focus.getNode();
  const [anchorCell,, grid] = lexical.DEPRECATED_$getNodeTriplet(anchor);
  const [focusCell] = lexical.DEPRECATED_$getNodeTriplet(focus);
  const [gridMap, anchorCellMap, focusCellMap] = lexical.DEPRECATED_$computeGridMap(grid, anchorCell, focusCell);
  const {
    startColumn: anchorStartColumn
  } = anchorCellMap;
  const {
    startRow: focusStartRow,
    startColumn: focusStartColumn
  } = focusCellMap;
  const startColumn = Math.min(anchorStartColumn, focusStartColumn);
  const endColumn = Math.max(anchorStartColumn + anchorCell.__colSpan - 1, focusStartColumn + focusCell.__colSpan - 1);
  const selectedColumnCount = endColumn - startColumn + 1;
  const columnCount = gridMap[0].length;
  if (columnCount === endColumn - startColumn + 1) {
    // Empty grid
    grid.selectPrevious();
    grid.remove();
    return;
  }
  const rowCount = gridMap.length;
  for (let row = 0; row < rowCount; row++) {
    for (let column = startColumn; column <= endColumn; column++) {
      const {
        cell,
        startColumn: cellStartColumn
      } = gridMap[row][column];
      if (cellStartColumn < startColumn) {
        if (column === startColumn) {
          const overflowLeft = startColumn - cellStartColumn;
          // Overflowing left
          cell.setColSpan(cell.__colSpan -
          // Possible overflow right too
          Math.min(selectedColumnCount, cell.__colSpan - overflowLeft));
        }
      } else if (cellStartColumn + cell.__colSpan - 1 > endColumn) {
        if (column === endColumn) {
          // Overflowing right
          const inSelectedArea = endColumn - cellStartColumn + 1;
          cell.setColSpan(cell.__colSpan - inSelectedArea);
        }
      } else {
        cell.remove();
      }
    }
  }
  const focusRowMap = gridMap[focusStartRow];
  const nextColumn = focusRowMap[focusStartColumn + focusCell.__colSpan];
  if (nextColumn !== undefined) {
    const {
      cell
    } = nextColumn;
    $moveSelectionToCell(cell);
  } else {
    const previousRow = focusRowMap[focusStartColumn - 1];
    const {
      cell
    } = previousRow;
    $moveSelectionToCell(cell);
  }
}
function $moveSelectionToCell(cell) {
  const firstDescendant = cell.getFirstDescendant();
  if (!(firstDescendant !== null)) {
    throw Error(`Unexpected empty cell`);
  }
  firstDescendant.getParentOrThrow().selectStart();
}
function $insertFirst(parent, node) {
  const firstChild = parent.getFirstChild();
  if (firstChild !== null) {
    firstChild.insertBefore(node);
  } else {
    parent.append(node);
  }
}
function $unmergeCell() {
  const selection = lexical.$getSelection();
  if (!(lexical.$isRangeSelection(selection) || lexical.DEPRECATED_$isGridSelection(selection))) {
    throw Error(`Expected a RangeSelection or GridSelection`);
  }
  const anchor = selection.anchor.getNode();
  const [cell, row, grid] = lexical.DEPRECATED_$getNodeTriplet(anchor);
  const colSpan = cell.__colSpan;
  const rowSpan = cell.__rowSpan;
  if (colSpan > 1) {
    for (let i = 1; i < colSpan; i++) {
      cell.insertAfter($createTableCellNode(TableCellHeaderStates.NO_STATUS));
    }
    cell.setColSpan(1);
  }
  if (rowSpan > 1) {
    const [map, cellMap] = lexical.DEPRECATED_$computeGridMap(grid, cell, cell);
    const {
      startColumn,
      startRow
    } = cellMap;
    let currentRowNode;
    for (let i = 1; i < rowSpan; i++) {
      const currentRow = startRow + i;
      const currentRowMap = map[currentRow];
      currentRowNode = (currentRowNode || row).getNextSibling();
      if (!lexical.DEPRECATED_$isGridRowNode(currentRowNode)) {
        throw Error(`Expected row next sibling to be a row`);
      }
      let insertAfterCell = null;
      for (let column = 0; column < startColumn; column++) {
        const currentCellMap = currentRowMap[column];
        const currentCell = currentCellMap.cell;
        if (currentCellMap.startRow === currentRow) {
          insertAfterCell = currentCell;
        }
        if (currentCell.__colSpan > 1) {
          column += currentCell.__colSpan - 1;
        }
      }
      if (insertAfterCell === null) {
        for (let j = 0; j < colSpan; j++) {
          $insertFirst(currentRowNode, $createTableCellNode(TableCellHeaderStates.NO_STATUS));
        }
      } else {
        for (let j = 0; j < colSpan; j++) {
          insertAfterCell.insertAfter($createTableCellNode(TableCellHeaderStates.NO_STATUS));
        }
      }
    }
    cell.setRowSpan(1);
  }
}

/** @module @lexical/table */
const INSERT_TABLE_COMMAND = lexical.createCommand('INSERT_TABLE_COMMAND');

exports.$createTableCellNode = $createTableCellNode;
exports.$createTableNode = $createTableNode;
exports.$createTableNodeWithDimensions = $createTableNodeWithDimensions;
exports.$createTableRowNode = $createTableRowNode;
exports.$deleteTableColumn = $deleteTableColumn;
exports.$deleteTableColumn__EXPERIMENTAL = $deleteTableColumn__EXPERIMENTAL;
exports.$deleteTableRow__EXPERIMENTAL = $deleteTableRow__EXPERIMENTAL;
exports.$getElementGridForTableNode = $getElementGridForTableNode;
exports.$getTableCellNodeFromLexicalNode = $getTableCellNodeFromLexicalNode;
exports.$getTableColumnIndexFromTableCellNode = $getTableColumnIndexFromTableCellNode;
exports.$getTableNodeFromLexicalNodeOrThrow = $getTableNodeFromLexicalNodeOrThrow;
exports.$getTableRowIndexFromTableCellNode = $getTableRowIndexFromTableCellNode;
exports.$getTableRowNodeFromTableCellNodeOrThrow = $getTableRowNodeFromTableCellNodeOrThrow;
exports.$insertTableColumn = $insertTableColumn;
exports.$insertTableColumn__EXPERIMENTAL = $insertTableColumn__EXPERIMENTAL;
exports.$insertTableRow = $insertTableRow;
exports.$insertTableRow__EXPERIMENTAL = $insertTableRow__EXPERIMENTAL;
exports.$isTableCellNode = $isTableCellNode;
exports.$isTableNode = $isTableNode;
exports.$isTableRowNode = $isTableRowNode;
exports.$removeTableRowAtIndex = $removeTableRowAtIndex;
exports.$unmergeCell = $unmergeCell;
exports.INSERT_TABLE_COMMAND = INSERT_TABLE_COMMAND;
exports.TableCellHeaderStates = TableCellHeaderStates;
exports.TableCellNode = TableCellNode;
exports.TableNode = TableNode;
exports.TableRowNode = TableRowNode;
exports.TableSelection = TableSelection;
exports.applyTableHandlers = applyTableHandlers;
exports.getCellFromTarget = getCellFromTarget;
exports.getTableSelectionFromTableElement = getTableSelectionFromTableElement;
