/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Class, $ReadOnly} from 'utility-types';

/**
 * LexicalEditor
 */
type MutationListeners = Map<MutationListener, Class<LexicalNode>>;
export type NodeMutation = 'created' | 'destroyed';
export type ErrorListener = (error: Error) => void;
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
type CommandListener = (
  type: string,
  payload: CommandPayload,
  editor: LexicalEditor,
) => boolean;
export type ReadOnlyListener = (isReadOnly: boolean) => void;

type CommandPayload = any;
type Listeners = {
  decorator: Set<DecoratorListener>;
  error: Set<ErrorListener>;
  mutation: MutationListeners;
  textcontent: Set<TextContentListener>;
  root: Set<RootListener>;
  update: Set<UpdateListener>;
  command: Array<Set<CommandListener>>;
};
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
  _nodes: RegisteredNodes;
  _decorators: Record<NodeKey, unknown>;
  _pendingDecorators: null | Record<NodeKey, unknown>;
  _config: EditorConfig<{}>;
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
  addListener(type: 'update', listener: UpdateListener): () => void;
  addListener(type: 'root', listener: RootListener): () => void;
  addListener(type: 'decorator', listener: DecoratorListener): () => void;
  addListener(type: 'textcontent', listener: TextContentListener): () => void;
  addListener(
    type: 'command',
    listener: CommandListener,
    priority: CommandListenerPriority,
  ): () => void;
  addListener(type: 'readonly', listener: ReadOnlyListener): () => void;
  addListener(
    type: 'mutation',
    klass: Class<LexicalNode>,
    listener: MutationListener,
  ): () => void;
  addTransform<T extends LexicalNode>(
    klass: Class<T>,
    listener: Transform<T>,
  ): () => void;
  execCommand(type: string, payload: CommandPayload): boolean;
  hasNodes(nodes: Array<Class<LexicalNode>>): boolean;
  getDecorators<X>(): Record<NodeKey, X>;
  getRootElement(): null | HTMLElement;
  setRootElement(rootElement: null | HTMLElement): void;
  getElementByKey(key: NodeKey): null | HTMLElement;
  getEditorState(): EditorState;
  setEditorState(editorState: EditorState, options?: EditorSetOptions): void;
  parseEditorState(stringifiedEditorState: string): EditorState;
  update(updateFn: () => void, options?: EditorUpdateOptions): boolean;
  focus(callbackFn?: () => void): void;
  blur(): void;
  isReadOnly(): boolean;
  setReadOnly(isReadOnly: boolean): void;
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
};
export type EditorThemeClasses = {
  ltr?: EditorThemeClassName;
  rtl?: EditorThemeClassName;
  root?: EditorThemeClassName;
  text?: TextNodeThemeClasses;
  paragraph?: EditorThemeClassName;
  image?: EditorThemeClassName;
  //@ts-expect-error
  list?: {
    ul?: EditorThemeClassName;
    ul1?: EditorThemeClassName;
    ul2?: EditorThemeClassName;
    ul3?: EditorThemeClassName;
    ul4?: EditorThemeClassName;
    ul5?: EditorThemeClassName;
    ol?: EditorThemeClassName;
    ol1?: EditorThemeClassName;
    ol2?: EditorThemeClassName;
    ol3?: EditorThemeClassName;
    ol4?: EditorThemeClassName;
    ol5?: EditorThemeClassName;
    listitem?: EditorThemeClassName;
    nested?: {
      list?: EditorThemeClassName;
      listitem?: EditorThemeClassName;
    };
  };
  table?: EditorThemeClassName;
  tableRow?: EditorThemeClassName;
  tableCell?: EditorThemeClassName;
  tableCellHeader?: EditorThemeClassName;
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
  [key: string]: EditorThemeClassName | Record<string, EditorThemeClassName>;
};
export type EditorConfig<EditorContext> = {
  namespace: string;
  theme: EditorThemeClasses;
  context: EditorContext;
  disableEvents?: boolean;
};
export type CommandListenerEditorPriority = 0;
export type CommandListenerLowPriority = 1;
export type CommandListenerNormalPriority = 2;
export type CommandListenerHighPriority = 3;
export type CommandListenerCriticalPriority = 4;
type CommandListenerPriority =
  | CommandListenerEditorPriority
  | CommandListenerLowPriority
  | CommandListenerNormalPriority
  | CommandListenerHighPriority
  | CommandListenerCriticalPriority;
export type IntentionallyMarkedAsDirtyElement = boolean;
export function createEditor<EditorContext>(editorConfig?: {
  namespace?: string;
  editorState?: EditorState;
  theme?: EditorThemeClasses;
  context?: EditorContext;
  parentEditor?: LexicalEditor;
  nodes?: Array<Class<LexicalNode>>;
  onError?: (error: Error) => void;
  disableEvents?: boolean;
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
export declare class EditorState {
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
export type DOMChildConversion = (lexicalNode: LexicalNode) => void;
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
export type NodeKey = string;
export declare class LexicalNode {
  __type: string;
  __key: NodeKey;
  __parent: null | NodeKey;
  getType(): string;
  clone(data: any): LexicalNode;
  convertDOM(): DOMConversionMap | null;
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
  isComposing(): boolean;
  // $FlowFixMe
  getLatest<T extends LexicalNode>(): T;
  // $FlowFixMe
  getWritable<T extends LexicalNode>(): T;
  getTextContent(includeInert?: boolean, includeDirectionless?: false): string;
  getTextContentSize(
    includeInert?: boolean,
    includeDirectionless?: false,
  ): number;
  // $FlowFixMe
  createDOM<EditorContext extends Record<string, any>>(
    config: EditorConfig<EditorContext>,
    editor: LexicalEditor,
  ): HTMLElement;
  // $FlowFixMe
  updateDOM<EditorContext extends Record<string, any>>( // $FlowFixMe
    prevNode: any,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
  ): boolean;
  remove(): void;
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
export declare class GridSelection {
  gridKey: NodeKey;
  anchorCellKey: NodeKey;
  focusCellKey: NodeKey;
  dirty: boolean;
  constructor(gridKey: NodeKey, anchorCellKey: NodeKey, focusCellKey: NodeKey);
  is(selection: null | RangeSelection | NodeSelection | GridSelection): boolean;
  set(gridKey: NodeKey, anchorCellKey: NodeKey, focusCellKey: NodeKey): void;
  clone(): GridSelection;
  extract(): Array<LexicalNode>;
  insertRawText(): void;
  insertText(): void;
  getNodes(): Array<LexicalNode>;
  getTextContent(): string;
}
export function $isGridSelection(x: unknown | null | undefined): boolean;
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
export function $isNodeSelection(x: unknown | null | undefined): boolean;
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
  getCharacterOffset: () => number;
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
  getCharacterOffset(): number;
  getNode(): LexicalNode;
  set(key: NodeKey, offset: number, type: 'text' | 'element'): void;
}

export function $createRangeSelection(): RangeSelection;
export function $createNodeSelection(): NodeSelection;
export function $createGridSelection(): GridSelection;
export function $isRangeSelection(x: unknown | null | undefined): boolean;
export function $getSelection(): null | RangeSelection;
export function $getPreviousSelection(): null | RangeSelection;

/**
 * Decorator State
 */
export type DecoratorStateValue =
  | DecoratorMap
  | DecoratorEditor
  | DecoratorArray
  | null
  | boolean
  | number
  | string;
export declare class DecoratorEditor {
  id: string;
  editorState: null | EditorState | string;
  editor: null | LexicalEditor;
  constructor(id?: string, editorState?: string | EditorState);
  init(editor: LexicalEditor): void;
  set(editor: LexicalEditor): void;
  toJSON(): $ReadOnly<{
    id: string;
    type: 'editor';
    editorState: null | string;
  }>;
  isEmpty(): boolean;
}
export type DecoratorMapObserver = (
  key: string,
  value: DecoratorStateValue,
) => void;
export type DecoratorArrayObserver = (
  index: number,
  delCont: number,
  value: void | DecoratorStateValue,
) => void;
export declare class DecoratorMap {
  _editor: LexicalEditor;
  _map: Map<string, DecoratorStateValue>;
  constructor(editor: LexicalEditor, map?: Map<string, DecoratorStateValue>);
  get(key: string): void | DecoratorStateValue;
  has(key: string): boolean;
  set(key: string, value: DecoratorStateValue): void;
  observe(observer: DecoratorMapObserver): () => void;
  destroy(): void;
  toJSON(): {
    type: 'map';
    map: Array<[string, DecoratorStateValue]>;
  };
}
export function createDecoratorEditor(
  id?: string,
  editorState?: string | EditorState,
): DecoratorEditor;
export function isDecoratorEditor(obj: unknown | null | undefined): boolean;
export function createDecoratorMap(
  editor: LexicalEditor,
  map?: Map<string, DecoratorStateValue>,
): DecoratorMap;
export function isDecoratorMap(obj: unknown | null | undefined): boolean;
export declare class DecoratorArray {
  _editor: LexicalEditor;
  _observers: Set<DecoratorArrayObserver>;
  _array: Array<DecoratorStateValue>;
  constructor(editor: LexicalEditor, array?: Array<DecoratorStateValue>);
  observe(observer: DecoratorArrayObserver): () => void;
  map<V>(
    fn: (
      arg0: DecoratorStateValue,
      arg1: number,
      arg2: Array<DecoratorStateValue>,
    ) => V,
  ): Array<V>;
  reduce(
    fn: (
      arg0: DecoratorStateValue,
      arg1: DecoratorStateValue,
    ) => DecoratorStateValue,
    initial?: DecoratorStateValue,
  ): DecoratorStateValue | void;
  push(value: DecoratorStateValue): void;
  getLength(): number;
  splice(
    insertIndex: number,
    delCount: number,
    value?: DecoratorStateValue,
  ): void;
  indexOf(value: DecoratorStateValue): number;
  destroy(): void;
  toJSON(): {
    type: 'array';
    array: Array<DecoratorStateValue>;
  };
}
export function createDecoratorArray(
  editor: LexicalEditor,
  list?: Array<DecoratorStateValue>,
): DecoratorArray;
export function isDecoratorArray(x?: unknown): boolean;

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
  getType(): string;
  clone(node: any): TextNode;
  constructor(text: string, key?: NodeKey);
  getFormat(): number;
  getStyle(): string;
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
  createDOM<EditorContext extends Record<string, any>>(
    config: EditorConfig<EditorContext>,
  ): HTMLElement;
  // $FlowFixMe
  updateDOM<EditorContext extends Record<string, any>>(
    prevNode: TextNode,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
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
export function $isTextNode(node: LexicalNode | null | undefined): boolean;

/**
 * LexicalLineBreakNode
 */
export declare class LineBreakNode extends LexicalNode {
  getType(): string;
  clone(node: LineBreakNode): LineBreakNode;
  constructor(key?: NodeKey);
  getTextContent(): '\n';
  createDOM(): HTMLElement;
  updateDOM(): false;
}
export function $createLineBreakNode(): LineBreakNode;
export function $isLineBreakNode(node: LexicalNode | null | undefined): boolean;

/**
 * LexicalRootNode
 */
export declare class RootNode extends ElementNode {
  __cachedText: null | string;
  getType(): string;
  clone(): RootNode;
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
export function $isRootNode(node: LexicalNode | null | undefined): boolean;

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
  collapseAtStart(selection: RangeSelection): boolean;
  excludeFromCopy(): boolean;
  canExtractContents(): boolean;
  canReplaceWith(replacement: LexicalNode): boolean;
  canInsertAfter(node: LexicalNode): boolean;
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
export function $isElementNode(node: LexicalNode | null | undefined): boolean;

/**
 * LexicalDecoratorNode
 */
export declare class DecoratorNode<X> extends LexicalNode {
  __state: DecoratorMap;
  constructor(state?: DecoratorMap, key?: NodeKey);
  decorate(editor: LexicalEditor): X;
  isIsolated(): boolean;
}
export function $isDecoratorNode(node: LexicalNode | null | undefined): boolean;

/**
 * LexicalHorizontalRuleNode
 */
export declare class HorizontalRuleNode extends LexicalNode {
  getType(): string;
  clone(node: HorizontalRuleNode): HorizontalRuleNode;
  constructor(key?: NodeKey);
  createDOM(): HTMLElement;
  updateDOM(): false;
}
export function $createHorizontalRuleNode(): HorizontalRuleNode;
export function $isHorizontalRuleNode(
  node: LexicalNode | null | undefined,
): boolean;

/**
 * LexicalParagraphNode
 */
export declare class ParagraphNode extends ElementNode {
  getType(): string;
  clone(node: ParagraphNode): ParagraphNode;
  constructor(key?: NodeKey);
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM(prevNode: ParagraphNode, dom: HTMLElement): boolean;
  insertNewAfter(): ParagraphNode;
  collapseAtStart(): boolean;
}
export function $createParagraphNode(): ParagraphNode;
export function $isParagraphNode(node: LexicalNode | null | undefined): boolean;
export declare class GridNode extends ElementNode {}
export function $isGridNode(node: LexicalNode | null | undefined): boolean;
export declare class GridRowNode extends ElementNode {}
export function $isGridRowNode(node: LexicalNode | null | undefined): boolean;
export declare class GridCellNode extends ElementNode {
  __colSpan: number;
  constructor(colSpan: number, key?: NodeKey);
}
export function $isGridCellNode(node: LexicalNode | null | undefined): boolean;

/**
 * LexicalUtils
 */
export function $getNearestNodeFromDOMNode(
  startingDOM: Node,
): LexicalNode | null;
export function $getNodeByKey<N extends LexicalNode>(key: NodeKey): N | null;
export function $getRoot(): RootNode;
export function $isLeafNode(node: LexicalNode | null | undefined): boolean;
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
