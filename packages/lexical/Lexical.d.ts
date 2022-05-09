/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Class, $ReadOnly} from 'utility-types';

/**
 * LexicalCommands
 */

export type LexicalCommand<P> = $ReadOnly<{}>;

export var SELECTION_CHANGE_COMMAND: LexicalCommand<void>;
export var CLICK_COMMAND: LexicalCommand<MouseEvent>;
export var DELETE_CHARACTER_COMMAND: LexicalCommand<boolean>;
export var INSERT_LINE_BREAK_COMMAND: LexicalCommand<boolean>;
export var INSERT_PARAGRAPH_COMMAND: LexicalCommand<void>;
export var INSERT_TEXT_COMMAND: LexicalCommand<InputEvent | string>;
export var PASTE_COMMAND: LexicalCommand<ClipboardEvent>;
export var REMOVE_TEXT_COMMAND: LexicalCommand<void>;
export var DELETE_WORD_COMMAND: LexicalCommand<boolean>;
export var DELETE_LINE_COMMAND: LexicalCommand<boolean>;
export var FORMAT_TEXT_COMMAND: LexicalCommand<TextFormatType>;
export var UNDO_COMMAND: LexicalCommand<void>;
export var REDO_COMMAND: LexicalCommand<void>;
export var KEY_ARROW_RIGHT_COMMAND: LexicalCommand<KeyboardEvent>;
export var KEY_ARROW_LEFT_COMMAND: LexicalCommand<KeyboardEvent>;
export var KEY_ARROW_UP_COMMAND: LexicalCommand<KeyboardEvent>;
export var KEY_ARROW_DOWN_COMMAND: LexicalCommand<KeyboardEvent>;
export var KEY_ENTER_COMMAND: LexicalCommand<KeyboardEvent | null>;
export var KEY_SPACE_COMMAND: LexicalCommand<KeyboardEvent>;
export var KEY_BACKSPACE_COMMAND: LexicalCommand<KeyboardEvent>;
export var KEY_ESCAPE_COMMAND: LexicalCommand<KeyboardEvent>;
export var KEY_DELETE_COMMAND: LexicalCommand<KeyboardEvent>;
export var KEY_TAB_COMMAND: LexicalCommand<KeyboardEvent>;
export var KEY_MODIFIER_COMMAND: LexicalCommand<KeyboardEvent>;
export var INDENT_CONTENT_COMMAND: LexicalCommand<void>;
export var OUTDENT_CONTENT_COMMAND: LexicalCommand<void>;
export var DROP_COMMAND: LexicalCommand<DragEvent>;
export var FORMAT_ELEMENT_COMMAND: LexicalCommand<ElementFormatType>;
export var DRAGSTART_COMMAND: LexicalCommand<DragEvent>;
export var DRAGEND_COMMAND: LexicalCommand<DragEvent>;
export var COPY_COMMAND: LexicalCommand<ClipboardEvent>;
export var CUT_COMMAND: LexicalCommand<ClipboardEvent>;
export var CLEAR_EDITOR_COMMAND: LexicalCommand<void>;
export var CLEAR_HISTORY_COMMAND: LexicalCommand<void>;
export var CAN_REDO_COMMAND: LexicalCommand<boolean>;
export var CAN_UNDO_COMMAND: LexicalCommand<boolean>;
export var FOCUS_COMMAND: LexicalCommand<FocusEvent>;
export var BLUR_COMMAND: LexicalCommand<FocusEvent>;
export var INSERT_TABLE_COMMAND: LexicalCommand<{
  rows: string;
  columns: string;
}>;

export declare function createCommand<T>(): LexicalCommand<T>;

/**
 * LexicalEditor
 */
type ErrorHandler = (error: Error) => void;
type MutationListeners = Map<MutationListener, Class<LexicalNode>>;
export type NodeMutation = 'created' | 'updated' | 'destroyed';
type UpdateListener = (arg0: {
  tags: Set<string>;
  prevEditorState: EditorState;
  editorState: EditorState;
  dirtyLeaves: Set<NodeKey>;
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
  normalizedNodes: Set<NodeKey>;
}) => void;
type DecoratorListener = (decorator: Record<NodeKey, any>) => void;
type RootListener = (
  element1: null | HTMLElement,
  element2: null | HTMLElement,
) => void;
type TextContentListener = (text: string) => void;
type MutationListener = (nodes: Map<NodeKey, NodeMutation>) => void;
export type ReadOnlyListener = (readOnly: boolean) => void;
type Listeners = {
  decorator: Set<DecoratorListener>;
  mutation: MutationListeners;
  textcontent: Set<TextContentListener>;
  root: Set<RootListener>;
  update: Set<UpdateListener>;
};
type CommandListener<P> = (payload: P, editor: LexicalEditor) => boolean;
// $FlowFixMe[unclear-type]
type Commands = Map<LexicalCommand<any>, Array<Set<CommandListener<any>>>>;
type RegisteredNodes = Map<string, RegisteredNode>;
type RegisteredNode = {
  klass: Class<LexicalNode>;
  transforms: Set<Transform<LexicalNode>>;
};
type Transform<T> = (node: T) => void;
type DOMConversionCache = Map<
  string,
  Array<(node: Node) => DOMConversion | null>
>;
export declare class LexicalEditor {
  _parentEditor: null | LexicalEditor;
  _rootElement: null | HTMLElement;
  _editorState: EditorState;
  _htmlConversions: DOMConversionCache;
  _pendingEditorState: null | EditorState;
  _compositionKey: null | NodeKey;
  _deferred: Array<() => void>;
  _updates: Array<[() => void, void | EditorUpdateOptions]>;
  _updating: boolean;
  _keyToDOMMap: Map<NodeKey, HTMLElement>;
  _listeners: Listeners;
  _commands: Commands;
  _nodes: RegisteredNodes;
  _onError: ErrorHandler;
  _decorators: Record<NodeKey, unknown>;
  _pendingDecorators: null | Record<NodeKey, unknown>;
  _config: EditorConfig;
  _dirtyType: 0 | 1 | 2;
  _cloneNotNeeded: Set<NodeKey>;
  _dirtyLeaves: Set<NodeKey>;
  _dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
  _normalizedNodes: Set<NodeKey>;
  _updateTags: Set<string>;
  _observer: null | MutationObserver;
  _key: string;
  _readOnly: boolean;
  isComposing(): boolean;
  registerUpdateListener(listener: UpdateListener): () => void;
  registerRootListener(listener: RootListener): () => void;
  registerDecoratorListener(listener: DecoratorListener): () => void;
  registerTextContentListener(listener: TextContentListener): () => void;
  registerCommand<P>(
    command: LexicalCommand<P>,
    listener: CommandListener<P>,
    priority: CommandListenerPriority,
  ): () => void;
  registerReadOnlyListener(listener: ReadOnlyListener): () => void;
  registerMutationListener(
    klass: Class<LexicalNode>,
    listener: MutationListener,
  ): () => void;
  registerNodeTransform<T extends LexicalNode>(
    klass: Class<T>,
    listener: Transform<T>,
  ): () => void;
  dispatchCommand<P>(type: LexicalCommand<P>, payload: P): boolean;
  hasNodes(nodes: Array<Class<LexicalNode>>): boolean;
  getKey(): string;
  getDecorators<X>(): Record<NodeKey, X>;
  getRootElement(): null | HTMLElement;
  setRootElement(rootElement: null | HTMLElement): void;
  getElementByKey(key: NodeKey): null | HTMLElement;
  getEditorState(): EditorState;
  setEditorState(editorState: EditorState, options?: EditorSetOptions): void;
  parseEditorState(
    maybeStringifiedEditorState: string | ParsedEditorState,
  ): EditorState;
  update(updateFn: () => void, options?: EditorUpdateOptions): boolean;
  focus(callbackFn?: () => void): void;
  blur(): void;
  isReadOnly(): boolean;
  setReadOnly(readOnly: boolean): void;
}
type EditorUpdateOptions = {
  onUpdate?: () => void;
  tag?: string;
  skipTransforms?: true;
};
type EditorSetOptions = {
  tag?: string;
};
type EditorThemeClassName = string;
type TextNodeThemeClasses = {
  base?: EditorThemeClassName;
  bold?: EditorThemeClassName;
  underline?: EditorThemeClassName;
  strikethrough?: EditorThemeClassName;
  underlineStrikethrough?: EditorThemeClassName;
  italic?: EditorThemeClassName;
  code?: EditorThemeClassName;
  subscript?: EditorThemeClassName;
  superscript?: EditorThemeClassName;
};
export type EditorThemeClasses = {
  ltr?: EditorThemeClassName;
  rtl?: EditorThemeClassName;
  text?: TextNodeThemeClasses;
  paragraph?: EditorThemeClassName;
  image?: EditorThemeClassName;
  list?: {
    ul?: EditorThemeClassName;
    ulDepth?: Array<EditorThemeClassName>;
    ol?: EditorThemeClassName;
    olDepth?: Array<EditorThemeClassName>;
    listitem?: EditorThemeClassName;
    listitemChecked?: EditorThemeClassName;
    listitemUnchecked?: EditorThemeClassName;
    nested?: {
      list?: EditorThemeClassName;
      listitem?: EditorThemeClassName;
    };
  };
  table?: EditorThemeClassName;
  tableRow?: EditorThemeClassName;
  tableCell?: EditorThemeClassName;
  tableCellHeader?: EditorThemeClassName;
  mark?: EditorThemeClassName;
  markOverlap?: EditorThemeClassName;
  link?: EditorThemeClassName;
  quote?: EditorThemeClassName;
  code?: EditorThemeClassName;
  codeHighlight?: Record<string, EditorThemeClassName>;
  hashtag?: EditorThemeClassName;
  heading?: {
    h1?: EditorThemeClassName;
    h2?: EditorThemeClassName;
    h3?: EditorThemeClassName;
    h4?: EditorThemeClassName;
    h5?: EditorThemeClassName;
  };
  // Handle other generic values
  [key: string]:
    | EditorThemeClassName
    | Record<
        string,
        | EditorThemeClassName
        | Array<EditorThemeClassName>
        | Record<string, EditorThemeClassName>
      >;
};
export type EditorConfig = {
  namespace: string;
  theme: EditorThemeClasses;
  disableEvents?: boolean;
};
export type CommandListenerPriority = 0 | 1 | 2 | 3 | 4;
export const COMMAND_PRIORITY_EDITOR = 0;
export const COMMAND_PRIORITY_LOW = 1;
export const COMMAND_PRIORITY_NORMAL = 2;
export const COMMAND_PRIORITY_HIGH = 3;
export const COMMAND_PRIORITY_CRITICAL = 4;
export type IntentionallyMarkedAsDirtyElement = boolean;
export function createEditor(editorConfig?: {
  namespace?: string;
  editorState?: EditorState;
  theme?: EditorThemeClasses;
  parentEditor?: LexicalEditor;
  nodes?: Array<Class<LexicalNode>>;
  onError: (error: Error) => void;
  disableEvents?: boolean;
  readOnly?: boolean;
}): LexicalEditor;

/**
 * LexicalEditorState
 */
export type ParsedEditorState = {
  _selection: null | {
    anchor: {
      key: string;
      offset: number;
      type: 'text' | 'element';
    };
    focus: {
      key: string;
      offset: number;
      type: 'text' | 'element';
    };
  };
  _nodeMap: Array<[NodeKey, ParsedNode]>;
};
type JSONEditorState = {
  _nodeMap: Array<[NodeKey, LexicalNode]>;
  _selection: null | ParsedSelection;
};
export interface EditorState {
  _nodeMap: NodeMap;
  _selection: null | RangeSelection | NodeSelection | GridSelection;
  _flushSync: boolean;
  _readOnly: boolean;
  constructor(
    nodeMap: NodeMap,
    selection?: RangeSelection | NodeSelection | GridSelection | null,
  );
  isEmpty(): boolean;
  read<V>(callbackFn: () => V): V;
  toJSON(space?: string | number): JSONEditorState;
  clone(
    selection?: RangeSelection | NodeSelection | GridSelection | null,
  ): EditorState;
}

/**
 * LexicalNode
 */
export type DOMConversion = {
  conversion: DOMConversionFn;
  priority: 0 | 1 | 2 | 3 | 4;
};
export type DOMConversionFn = (
  element: Node,
  parent?: Node,
) => DOMConversionOutput;
export type DOMChildConversion = (
  lexicalNode: LexicalNode,
  parentLexicalNode: LexicalNode | null | undefined,
) => LexicalNode | null;
export type DOMConversionMap = Record<
  NodeName,
  (node: Node) => DOMConversion | null
>;
type NodeName = string;
export type DOMConversionOutput = {
  after?: (childLexicalNodes: Array<LexicalNode>) => Array<LexicalNode>;
  forChild?: DOMChildConversion;
  node: LexicalNode | null;
};
export type DOMExportOutput = {
  after?: (generatedElement: HTMLElement | null) => HTMLElement | null;
  element: HTMLElement | null;
};
export type NodeKey = string;
export declare class LexicalNode {
  __type: string;
  __key: NodeKey;
  __parent: null | NodeKey;
  getType(): string;
  clone(data: any): LexicalNode;
  importDOM(): DOMConversionMap | null;
  constructor(key?: NodeKey);
  getType(): string;
  isAttached(): boolean;
  isSelected(): boolean;
  getKey(): NodeKey;
  getIndexWithinParent(): number;
  getParent(): ElementNode | null;
  getParentOrThrow(): ElementNode;
  getTopLevelElement(): null | ElementNode;
  getTopLevelElementOrThrow(): ElementNode;
  getParents(): Array<ElementNode>;
  getParentKeys(): Array<NodeKey>;
  getPreviousSibling(): LexicalNode | null;
  getPreviousSiblings(): Array<LexicalNode>;
  getNextSibling(): LexicalNode | null;
  getNextSiblings(): Array<LexicalNode>;
  getCommonAncestor(node: LexicalNode): ElementNode | null;
  is(object: LexicalNode | null | undefined): boolean;
  isBefore(targetNode: LexicalNode): boolean;
  isParentOf(targetNode: LexicalNode): boolean;
  getNodesBetween(targetNode: LexicalNode): Array<LexicalNode>;
  isDirty(): boolean;
  // $FlowFixMe
  getLatest<T extends LexicalNode>(): T;
  // $FlowFixMe
  getWritable<T extends LexicalNode>(): T;
  getTextContent(includeInert?: boolean, includeDirectionless?: false): string;
  getTextContentSize(
    includeInert?: boolean,
    includeDirectionless?: false,
  ): number;
  exportDOM(editor: LexicalEditor): DOMExportOutput;
  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement;
  updateDOM(prevNode: any, dom: HTMLElement, config: EditorConfig): boolean;
  remove(preserveEmptyParent?: boolean): void;
  replace<N extends LexicalNode>(replaceWith: N): N;
  insertAfter(nodeToInsert: LexicalNode): LexicalNode;
  insertBefore(nodeToInsert: LexicalNode): LexicalNode;
  selectPrevious(anchorOffset?: number, focusOffset?: number): Selection;
  selectNext(anchorOffset?: number, focusOffset?: number): Selection;
  markDirty(): void;
}
export type NodeMap = Map<NodeKey, LexicalNode>;

/**
 * LexicalParsing
 */
export type ParsedNode = {
  __key: NodeKey;
  __type: string;
  __parent: null | NodeKey;
};
export type ParsedNodeMap = Map<NodeKey, ParsedNode>;
export function $createNodeFromParse(
  parsedNode: ParsedNode,
  parsedNodeMap: ParsedNodeMap,
): LexicalNode;
type ParsedSelection = {
  anchor: {
    key: NodeKey;
    offset: number;
    type: 'text' | 'element';
  };
  focus: {
    key: NodeKey;
    offset: number;
    type: 'text' | 'element';
  };
};

/**
 * LexicalSelection
 */
interface BaseSelection {
  clone(): BaseSelection;
  dirty: boolean;
  extract(): Array<LexicalNode>;
  getNodes(): Array<LexicalNode>;
  getTextContent(): string;
  insertRawText(text: string): void;
  is(selection: null | RangeSelection | NodeSelection | GridSelection): boolean;
}
export type GridSelectionShape = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};
export declare class GridSelection {
  gridKey: NodeKey;
  anchor: PointType;
  focus: PointType;
  dirty: boolean;
  constructor(gridKey: NodeKey, anchor: PointType, focus: PointType);
  is(selection: null | RangeSelection | NodeSelection | GridSelection): boolean;
  set(gridKey: NodeKey, anchorCellKey: NodeKey, focusCellKey: NodeKey): void;
  clone(): GridSelection;
  getCharacterOffsets(): [number, number];
  extract(): Array<LexicalNode>;
  isCollapsed(): boolean;
  isBackward(): boolean;
  insertRawText(): void;
  insertText(): void;
  getShape(): GridSelectionShape;
  getNodes(): Array<LexicalNode>;
  getTextContent(): string;
}
export function $isGridSelection(
  x: unknown | null | undefined,
): x is GridSelection;
export declare class NodeSelection {
  _nodes: Set<NodeKey>;
  dirty: boolean;
  constructor(objects: Set<NodeKey>);
  is(selection: null | RangeSelection | NodeSelection | GridSelection): boolean;
  add(key: NodeKey): void;
  delete(key: NodeKey): void;
  clear(): void;
  has(key: NodeKey): boolean;
  clone(): NodeSelection;
  extract(): Array<LexicalNode>;
  insertRawText(): void;
  insertText(): void;
  getNodes(): Array<LexicalNode>;
  getTextContent(): string;
}
export function $isNodeSelection(
  x: unknown | null | undefined,
): x is NodeSelection;
export declare class RangeSelection {
  anchor: PointType;
  focus: PointType;
  dirty: boolean;
  format: number;
  constructor(anchor: PointType, focus: PointType, format: number);
  is(selection: null | RangeSelection | GridSelection | NodeSelection): boolean;
  isBackward(): boolean;
  isCollapsed(): boolean;
  getNodes(): Array<LexicalNode>;
  setTextNodeRange(
    anchorNode: TextNode,
    anchorOffset: number,
    focusNode: TextNode,
    focusOffset: number,
  ): void;
  getTextContent(): string;
  // $FlowFixMe DOM API
  applyDOMRange(range: StaticRange): void;
  clone(): RangeSelection;
  toggleFormat(format: TextFormatType): void;
  hasFormat(type: TextFormatType): boolean;
  insertText(text: string): void;
  insertRawText(text: string): void;
  removeText(): void;
  formatText(formatType: TextFormatType): void;
  insertNodes(nodes: Array<LexicalNode>, selectStart?: boolean): boolean;
  insertParagraph(): void;
  insertLineBreak(selectStart?: boolean): void;
  getCharacterOffsets(): [number, number];
  extract(): Array<LexicalNode>;
  modify(
    alter: 'move' | 'extend',
    isBackward: boolean,
    granularity: 'character' | 'word' | 'lineboundary',
  ): void;
  deleteCharacter(isBackward: boolean): void;
  deleteLine(isBackward: boolean): void;
  deleteWord(isBackward: boolean): void;
}
export type TextPoint = TextPointType;
type TextPointType = {
  key: NodeKey;
  offset: number;
  type: 'text';
  is: (arg0: PointType) => boolean;
  isBefore: (arg0: PointType) => boolean;
  getNode: () => TextNode;
  set: (key: NodeKey, offset: number, type: 'text' | 'element') => void;
  getCharacterOffset: () => number;
  isAtNodeEnd: () => boolean;
};
export type ElementPoint = ElementPointType;
type ElementPointType = {
  key: NodeKey;
  offset: number;
  type: 'element';
  is: (arg0: PointType) => boolean;
  isBefore: (arg0: PointType) => boolean;
  getNode: () => ElementNode;
  set: (key: NodeKey, offset: number, type: 'text' | 'element') => void;
  isAtNodeEnd: () => boolean;
};
export type Point = PointType;
type PointType = TextPointType | ElementPointType;

declare class _Point {
  key: NodeKey;
  offset: number;
  type: 'text' | 'element';
  constructor(key: NodeKey, offset: number, type: 'text' | 'element');
  is(point: PointType): boolean;
  isBefore(b: PointType): boolean;
  getNode(): LexicalNode;
  set(key: NodeKey, offset: number, type: 'text' | 'element'): void;
}

export function $createRangeSelection(): RangeSelection;
export function $createNodeSelection(): NodeSelection;
export function $createGridSelection(): GridSelection;
export function $isRangeSelection(
  x: unknown | null | undefined,
): x is RangeSelection;
export function $getSelection():
  | null
  | RangeSelection
  | NodeSelection
  | GridSelection;
export function $getPreviousSelection():
  | null
  | RangeSelection
  | NodeSelection
  | GridSelection;

/**
 * LexicalTextNode
 */
export type TextFormatType =
  | 'bold'
  | 'underline'
  | 'strikethrough'
  | 'italic'
  | 'code'
  | 'subscript'
  | 'superscript';
type TextModeType = 'normal' | 'token' | 'segmented' | 'inert';

export declare class TextNode extends LexicalNode {
  __text: string;
  __format: number;
  __style: string;
  __mode: 0 | 1 | 2 | 3;
  __detail: number;
  static getType(): string;
  static clone(node: any): TextNode;
  constructor(text: string, key?: NodeKey);
  getFormat(): number;
  getStyle(): string;
  isComposing(): boolean;
  isToken(): boolean;
  isSegmented(): boolean;
  isInert(): boolean;
  isDirectionless(): boolean;
  isUnmergeable(): boolean;
  hasFormat(type: TextFormatType): boolean;
  isSimpleText(): boolean;
  getTextContent(includeInert?: boolean, includeDirectionless?: false): string;
  getFormatFlags(type: TextFormatType, alignWithFormat: null | number): number;
  // $FlowFixMe
  createDOM(config: EditorConfig): HTMLElement;
  // $FlowFixMe
  updateDOM(
    prevNode: TextNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean;
  selectionTransform(
    prevSelection: null | RangeSelection | NodeSelection | GridSelection,
    nextSelection: RangeSelection,
  ): void;
  setFormat(format: number): TextNode;
  setStyle(style: string): TextNode;
  toggleFormat(type: TextFormatType): TextNode;
  toggleDirectionless(): TextNode;
  toggleUnmergeable(): TextNode;
  setMode(type: TextModeType): TextNode;
  setTextContent(text: string): TextNode;
  select(_anchorOffset?: number, _focusOffset?: number): RangeSelection;
  spliceText(
    offset: number,
    delCount: number,
    newText: string,
    moveSelection?: boolean,
  ): TextNode;
  canInsertTextBefore(): boolean;
  canInsertTextAfter(): boolean;
  splitText(...splitOffsets: Array<number>): Array<TextNode>;
  mergeWithSibling(target: TextNode): TextNode;
}
export function $createTextNode(text?: string): TextNode;
export function $isTextNode(
  node: TextNode | LexicalNode | null | undefined,
): node is TextNode;

/**
 * LexicalLineBreakNode
 */
export declare class LineBreakNode extends LexicalNode {
  static getType(): string;
  static clone(node: LineBreakNode): LineBreakNode;
  constructor(key?: NodeKey);
  getTextContent(): '\n';
  createDOM(): HTMLElement;
  updateDOM(): false;
}
export function $createLineBreakNode(): LineBreakNode;
export function $isLineBreakNode(
  node: LexicalNode | null | undefined,
): node is LineBreakNode;

/**
 * LexicalRootNode
 */
export declare class RootNode extends ElementNode {
  __cachedText: null | string;
  static getType(): string;
  static clone(): RootNode;
  constructor();
  getTextContent(includeInert?: boolean, includeDirectionless?: false): string;
  select(): RangeSelection;
  remove(): void;
  replace<N extends LexicalNode>(node: N): N;
  insertBefore(): LexicalNode;
  insertAfter(node: LexicalNode): LexicalNode;
  updateDOM(prevNode: RootNode, dom: HTMLElement): false;
  append(...nodesToAppend: Array<LexicalNode>): ElementNode;
  canBeEmpty(): false;
}
export function $isRootNode(
  node: LexicalNode | null | undefined,
): node is RootNode;

/**
 * LexicalElementNode
 */
export type ElementFormatType = 'left' | 'center' | 'right' | 'justify';
export declare class ElementNode extends LexicalNode {
  __children: Array<NodeKey>;
  __format: number;
  __indent: number;
  __dir: 'ltr' | 'rtl' | null;
  constructor(key?: NodeKey);
  getFormat(): number;
  getIndent(): number;
  getChildren(): Array<LexicalNode>;
  getChildrenKeys(): Array<NodeKey>;
  getChildrenSize(): number;
  isEmpty(): boolean;
  isDirty(): boolean;
  getAllTextNodes(includeInert?: boolean): Array<TextNode>;
  getFirstDescendant(): null | LexicalNode;
  getLastDescendant(): null | LexicalNode;
  getDescendantByIndex(index: number): LexicalNode;
  getFirstChild<T extends LexicalNode>(): null | T;
  getFirstChildOrThrow<T extends LexicalNode>(): T;
  getLastChild(): null | LexicalNode;
  getChildAtIndex(index: number): null | LexicalNode;
  getTextContent(includeInert?: boolean, includeDirectionless?: false): string;
  getDirection(): 'ltr' | 'rtl' | null;
  hasFormat(type: ElementFormatType): boolean;
  select(_anchorOffset?: number, _focusOffset?: number): RangeSelection;
  selectStart(): RangeSelection;
  selectEnd(): RangeSelection;
  clear(): ElementNode;
  append(...nodesToAppend: Array<LexicalNode>): ElementNode;
  setDirection(direction: 'ltr' | 'rtl' | null): ElementNode;
  setFormat(type: ElementFormatType): ElementNode;
  setIndent(indentLevel: number): ElementNode;
  insertNewAfter(selection: RangeSelection): null | LexicalNode;
  canInsertTab(): boolean;
  canIndent(): boolean;
  collapseAtStart(selection: RangeSelection): boolean;
  excludeFromCopy(destination: 'clone' | 'html'): boolean;
  canExtractContents(): boolean;
  canReplaceWith(replacement: LexicalNode): boolean;
  canInsertAfter(node: LexicalNode): boolean;
  extractWithChild(
    child: LexicalNode,
    selection: RangeSelection | NodeSelection | GridSelection,
    destination: 'clone' | 'html',
  ): boolean;
  canBeEmpty(): boolean;
  canInsertTextBefore(): boolean;
  canInsertTextAfter(): boolean;
  isInline(): boolean;
  canSelectionRemove(): boolean;
  splice(
    start: number,
    deleteCount: number,
    nodesToInsert: Array<LexicalNode>,
  ): ElementNode;
}
export function $isElementNode(
  node: LexicalNode | null | undefined,
): node is ElementNode;

/**
 * LexicalDecoratorNode
 */
export declare class DecoratorNode<X> extends LexicalNode {
  constructor(key?: NodeKey);
  decorate(editor: LexicalEditor): X;
  isIsolated(): boolean;
  isTopLevel(): boolean;
}
export function $isDecoratorNode(
  node: LexicalNode | null | undefined,
): node is DecoratorNode<unknown>;

/**
 * LexicalParagraphNode
 */
export declare class ParagraphNode extends ElementNode {
  getType(): string;
  clone(node: ParagraphNode): ParagraphNode;
  constructor(key?: NodeKey);
  createDOM(config: EditorConfig): HTMLElement;
  updateDOM(prevNode: ParagraphNode, dom: HTMLElement): boolean;
  insertNewAfter(): ParagraphNode;
  collapseAtStart(): boolean;
}
export function $createParagraphNode(): ParagraphNode;
export function $isParagraphNode(
  node: LexicalNode | null | undefined,
): node is ParagraphNode;
export declare class GridNode extends ElementNode {}
export function $isGridNode(
  node: LexicalNode | null | undefined,
): node is GridNode;
export declare class GridRowNode extends ElementNode {}
export function $isGridRowNode(
  node: LexicalNode | null | undefined,
): node is GridRowNode;
export declare class GridCellNode extends ElementNode {
  __colSpan: number;
  constructor(colSpan: number, key?: NodeKey);
}
export function $isGridCellNode(
  node: LexicalNode | null | undefined,
): node is GridCellNode;

/**
 * LexicalUtils
 */
export function $getNearestNodeFromDOMNode(
  startingDOM: Node,
): LexicalNode | null;
export function $getNodeByKey<N extends LexicalNode>(key: NodeKey): N | null;
export function $getRoot(): RootNode;
export function $isLeafNode(
  node: LexicalNode | null | undefined,
): node is TextNode | LineBreakNode | DecoratorNode<unknown>;
export function $setCompositionKey(compositionKey: null | NodeKey): void;
export function $setSelection(
  selection: null | RangeSelection | NodeSelection | GridSelection,
): void;
export function $nodesOfType<T extends LexicalNode>(klass: Class<T>): Array<T>;
export function $getDecoratorNode(
  focus: Point,
  isBackward: boolean,
): null | LexicalNode;

/**
 * LexicalVersion
 */
export declare var VERSION: string;
