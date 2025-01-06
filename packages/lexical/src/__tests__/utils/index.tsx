/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {CodeHighlightNode, CodeNode} from '@lexical/code';
import {HashtagNode} from '@lexical/hashtag';
import {createHeadlessEditor} from '@lexical/headless';
import {AutoLinkNode, LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {MarkNode} from '@lexical/mark';
import {OverflowNode} from '@lexical/overflow';
import {
  InitialConfigType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer';
import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {TableCellNode, TableNode, TableRowNode} from '@lexical/table';
import {expect} from '@playwright/test';
import {
  $isRangeSelection,
  createEditor,
  DecoratorNode,
  EditorState,
  EditorThemeClasses,
  ElementNode,
  Klass,
  LexicalEditor,
  LexicalNode,
  RangeSelection,
  SerializedElementNode,
  SerializedLexicalNode,
  SerializedTextNode,
  TextNode,
} from 'lexical';
import path from 'path';
import * as prettier from 'prettier';
import * as React from 'react';
import {createRef} from 'react';
import {createRoot} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';

import {
  CreateEditorArgs,
  HTMLConfig,
  LexicalNodeReplacement,
} from '../../LexicalEditor';
import {resetRandomKey} from '../../LexicalUtils';

const prettierConfig = prettier.resolveConfig.sync(
  path.resolve(__dirname, '../../../../.prettierrc'),
);

type TestEnv = {
  readonly container: HTMLDivElement;
  readonly editor: LexicalEditor;
  readonly outerHTML: string;
  readonly innerHTML: string;
};

export function initializeUnitTest(
  runTests: (testEnv: TestEnv) => void,
  editorConfig: CreateEditorArgs = {namespace: 'test', theme: {}},
  plugins?: React.ReactNode,
) {
  const testEnv = {
    _container: null as HTMLDivElement | null,
    _editor: null as LexicalEditor | null,
    get container() {
      if (!this._container) {
        throw new Error('testEnv.container not initialized.');
      }
      return this._container;
    },
    set container(container) {
      this._container = container;
    },
    get editor() {
      if (!this._editor) {
        throw new Error('testEnv.editor not initialized.');
      }
      return this._editor;
    },
    set editor(editor) {
      this._editor = editor;
    },
    get innerHTML() {
      return (this.container.firstChild as HTMLElement).innerHTML;
    },
    get outerHTML() {
      return this.container.innerHTML;
    },
    reset() {
      this._container = null;
      this._editor = null;
    },
  };

  beforeEach(async () => {
    resetRandomKey();

    testEnv.container = document.createElement('div');
    document.body.appendChild(testEnv.container);
    const ref = createRef<HTMLDivElement>();

    const useLexicalEditor = (
      rootElementRef: React.RefObject<HTMLDivElement>,
    ) => {
      const lexicalEditor = React.useMemo(() => {
        const lexical = createTestEditor(editorConfig);
        return lexical;
      }, []);

      React.useEffect(() => {
        const rootElement = rootElementRef.current;
        lexicalEditor.setRootElement(rootElement);
      }, [rootElementRef, lexicalEditor]);
      return lexicalEditor;
    };

    const Editor = () => {
      testEnv.editor = useLexicalEditor(ref);
      const context = createLexicalComposerContext(
        null,
        editorConfig?.theme ?? {},
      );
      return (
        <LexicalComposerContext.Provider value={[testEnv.editor, context]}>
          <div ref={ref} contentEditable={true} />
          {plugins}
        </LexicalComposerContext.Provider>
      );
    };

    ReactTestUtils.act(() => {
      createRoot(testEnv.container).render(<Editor />);
    });
  });

  afterEach(() => {
    document.body.removeChild(testEnv.container);
    testEnv.reset();
  });

  runTests(testEnv);
}

export function initializeClipboard() {
  Object.defineProperty(window, 'DragEvent', {
    value: class DragEvent {},
  });
  Object.defineProperty(window, 'ClipboardEvent', {
    value: class ClipboardEvent {},
  });
}

export type SerializedTestElementNode = SerializedElementNode;

export class TestElementNode extends ElementNode {
  static getType(): string {
    return 'test_block';
  }

  static clone(node: TestElementNode) {
    return new TestElementNode(node.__key);
  }

  static importJSON(
    serializedNode: SerializedTestElementNode,
  ): TestInlineElementNode {
    return $createTestInlineElementNode().updateFromJSON(serializedNode);
  }

  createDOM() {
    return document.createElement('div');
  }

  updateDOM() {
    return false;
  }
}

export function $createTestElementNode(): TestElementNode {
  return new TestElementNode();
}

type SerializedTestTextNode = SerializedTextNode;

export class TestTextNode extends TextNode {
  static getType() {
    return 'test_text';
  }

  static clone(node: TestTextNode): TestTextNode {
    return new TestTextNode(node.__text, node.__key);
  }

  static importJSON(serializedNode: SerializedTestTextNode): TestTextNode {
    return new TestTextNode().updateFromJSON(serializedNode);
  }
}

export type SerializedTestInlineElementNode = SerializedElementNode;

export class TestInlineElementNode extends ElementNode {
  static getType(): string {
    return 'test_inline_block';
  }

  static clone(node: TestInlineElementNode) {
    return new TestInlineElementNode(node.__key);
  }

  static importJSON(
    serializedNode: SerializedTestInlineElementNode,
  ): TestInlineElementNode {
    return $createTestInlineElementNode().updateFromJSON(serializedNode);
  }

  createDOM() {
    return document.createElement('a');
  }

  updateDOM() {
    return false;
  }

  isInline() {
    return true;
  }
}

export function $createTestInlineElementNode(): TestInlineElementNode {
  return new TestInlineElementNode();
}

export type SerializedTestShadowRootNode = SerializedElementNode;

export class TestShadowRootNode extends ElementNode {
  static getType(): string {
    return 'test_shadow_root';
  }

  static clone(node: TestShadowRootNode) {
    return new TestElementNode(node.__key);
  }

  static importJSON(
    serializedNode: SerializedTestShadowRootNode,
  ): TestShadowRootNode {
    return $createTestShadowRootNode().updateFromJSON(serializedNode);
  }

  createDOM() {
    return document.createElement('div');
  }

  updateDOM() {
    return false;
  }

  isShadowRoot() {
    return true;
  }
}

export function $createTestShadowRootNode(): TestShadowRootNode {
  return new TestShadowRootNode();
}

export type SerializedTestSegmentedNode = SerializedTextNode;

export class TestSegmentedNode extends TextNode {
  static getType(): string {
    return 'test_segmented';
  }

  static clone(node: TestSegmentedNode): TestSegmentedNode {
    return new TestSegmentedNode(node.__text, node.__key);
  }

  static importJSON(
    serializedNode: SerializedTestSegmentedNode,
  ): TestSegmentedNode {
    return $createTestSegmentedNode().updateFromJSON(serializedNode);
  }
}

export function $createTestSegmentedNode(text: string = ''): TestSegmentedNode {
  return new TestSegmentedNode(text).setMode('segmented');
}

export type SerializedTestExcludeFromCopyElementNode = SerializedElementNode;

export class TestExcludeFromCopyElementNode extends ElementNode {
  static getType(): string {
    return 'test_exclude_from_copy_block';
  }

  static clone(node: TestExcludeFromCopyElementNode) {
    return new TestExcludeFromCopyElementNode(node.__key);
  }

  static importJSON(
    serializedNode: SerializedTestExcludeFromCopyElementNode,
  ): TestExcludeFromCopyElementNode {
    return $createTestExcludeFromCopyElementNode().updateFromJSON(
      serializedNode,
    );
  }

  createDOM() {
    return document.createElement('div');
  }

  updateDOM() {
    return false;
  }

  excludeFromCopy() {
    return true;
  }
}

export function $createTestExcludeFromCopyElementNode(): TestExcludeFromCopyElementNode {
  return new TestExcludeFromCopyElementNode();
}

export type SerializedTestDecoratorNode = SerializedLexicalNode;

export class TestDecoratorNode extends DecoratorNode<JSX.Element> {
  static getType(): string {
    return 'test_decorator';
  }

  static clone(node: TestDecoratorNode) {
    return new TestDecoratorNode(node.__key);
  }

  static importJSON(
    serializedNode: SerializedTestDecoratorNode,
  ): TestDecoratorNode {
    return $createTestDecoratorNode().updateFromJSON(serializedNode);
  }

  static importDOM() {
    return {
      'test-decorator': (domNode: HTMLElement) => {
        return {
          conversion: () => ({node: $createTestDecoratorNode()}),
        };
      },
    };
  }

  exportDOM() {
    return {
      element: document.createElement('test-decorator'),
    };
  }

  getTextContent() {
    return 'Hello world';
  }

  createDOM() {
    return document.createElement('span');
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return <Decorator text={'Hello world'} />;
  }
}

function Decorator({text}: {text: string}): JSX.Element {
  return <span>{text}</span>;
}

export function $createTestDecoratorNode(): TestDecoratorNode {
  return new TestDecoratorNode();
}

const DEFAULT_NODES: NonNullable<InitialConfigType['nodes']> = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  HashtagNode,
  CodeHighlightNode,
  AutoLinkNode,
  LinkNode,
  OverflowNode,
  TestElementNode,
  TestSegmentedNode,
  TestExcludeFromCopyElementNode,
  TestDecoratorNode,
  TestInlineElementNode,
  TestShadowRootNode,
  TestTextNode,
  MarkNode,
];

export function TestComposer({
  config = {
    nodes: [],
    theme: {},
  },
  children,
}: {
  config?: Omit<InitialConfigType, 'onError' | 'namespace'>;
  children: React.ComponentProps<typeof LexicalComposer>['children'];
}) {
  const customNodes = config.nodes;
  return (
    <LexicalComposer
      initialConfig={{
        onError: (e) => {
          throw e;
        },
        ...config,
        namespace: '',
        nodes: DEFAULT_NODES.concat(customNodes || []),
      }}>
      {children}
    </LexicalComposer>
  );
}

export function createTestEditor(
  config: {
    namespace?: string;
    editorState?: EditorState;
    theme?: EditorThemeClasses;
    parentEditor?: LexicalEditor;
    nodes?: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>;
    onError?: (error: Error) => void;
    disableEvents?: boolean;
    readOnly?: boolean;
    html?: HTMLConfig;
  } = {},
): LexicalEditor {
  const customNodes = config.nodes || [];
  const editor = createEditor({
    namespace: config.namespace,
    onError: (e) => {
      throw e;
    },
    ...config,
    nodes: DEFAULT_NODES.concat(customNodes),
  });
  return editor;
}

export function createTestHeadlessEditor(
  editorState?: EditorState,
): LexicalEditor {
  return createHeadlessEditor({
    editorState,
    onError: (error) => {
      throw error;
    },
  });
}

export function $assertRangeSelection(selection: unknown): RangeSelection {
  if (!$isRangeSelection(selection)) {
    throw new Error(`Expected RangeSelection, got ${selection}`);
  }
  return selection;
}

export function invariant(cond?: boolean, message?: string): asserts cond {
  if (cond) {
    return;
  }
  throw new Error(`Invariant: ${message}`);
}

export class ClipboardDataMock {
  getData: jest.Mock<string, [string]>;
  setData: jest.Mock<void, [string, string]>;

  constructor() {
    this.getData = jest.fn();
    this.setData = jest.fn();
  }
}

export class DataTransferMock implements DataTransfer {
  _data: Map<string, string> = new Map();
  get dropEffect(): DataTransfer['dropEffect'] {
    throw new Error('Getter not implemented.');
  }
  get effectAllowed(): DataTransfer['effectAllowed'] {
    throw new Error('Getter not implemented.');
  }
  get files(): FileList {
    throw new Error('Getter not implemented.');
  }
  get items(): DataTransferItemList {
    throw new Error('Getter not implemented.');
  }
  get types(): ReadonlyArray<string> {
    return Array.from(this._data.keys());
  }
  clearData(dataType?: string): void {
    //
  }
  getData(dataType: string): string {
    return this._data.get(dataType) || '';
  }
  setData(dataType: string, data: string): void {
    this._data.set(dataType, data);
  }
  setDragImage(image: Element, x: number, y: number): void {
    //
  }
}

export class EventMock implements Event {
  get bubbles(): boolean {
    throw new Error('Getter not implemented.');
  }
  get cancelBubble(): boolean {
    throw new Error('Gettter not implemented.');
  }
  get cancelable(): boolean {
    throw new Error('Gettter not implemented.');
  }
  get composed(): boolean {
    throw new Error('Gettter not implemented.');
  }
  get currentTarget(): EventTarget | null {
    throw new Error('Gettter not implemented.');
  }
  get defaultPrevented(): boolean {
    throw new Error('Gettter not implemented.');
  }
  get eventPhase(): number {
    throw new Error('Gettter not implemented.');
  }
  get isTrusted(): boolean {
    throw new Error('Gettter not implemented.');
  }
  get returnValue(): boolean {
    throw new Error('Gettter not implemented.');
  }
  get srcElement(): EventTarget | null {
    throw new Error('Gettter not implemented.');
  }
  get target(): EventTarget | null {
    throw new Error('Gettter not implemented.');
  }
  get timeStamp(): number {
    throw new Error('Gettter not implemented.');
  }
  get type(): string {
    throw new Error('Gettter not implemented.');
  }
  composedPath(): EventTarget[] {
    throw new Error('Method not implemented.');
  }
  initEvent(
    type: string,
    bubbles?: boolean | undefined,
    cancelable?: boolean | undefined,
  ): void {
    throw new Error('Method not implemented.');
  }
  stopImmediatePropagation(): void {
    return;
  }
  stopPropagation(): void {
    return;
  }
  NONE = 0 as const;
  CAPTURING_PHASE = 1 as const;
  AT_TARGET = 2 as const;
  BUBBLING_PHASE = 3 as const;
  preventDefault() {
    return;
  }
}

export class KeyboardEventMock extends EventMock implements KeyboardEvent {
  altKey = false;
  get charCode(): number {
    throw new Error('Getter not implemented.');
  }
  get code(): string {
    throw new Error('Getter not implemented.');
  }
  ctrlKey = false;
  get isComposing(): boolean {
    throw new Error('Getter not implemented.');
  }
  get key(): string {
    throw new Error('Getter not implemented.');
  }
  get keyCode(): number {
    throw new Error('Getter not implemented.');
  }
  get location(): number {
    throw new Error('Getter not implemented.');
  }
  metaKey = false;
  get repeat(): boolean {
    throw new Error('Getter not implemented.');
  }
  shiftKey = false;
  constructor(type: void | string) {
    super();
  }
  getModifierState(keyArg: string): boolean {
    throw new Error('Method not implemented.');
  }
  initKeyboardEvent(
    typeArg: string,
    bubblesArg?: boolean | undefined,
    cancelableArg?: boolean | undefined,
    viewArg?: Window | null | undefined,
    keyArg?: string | undefined,
    locationArg?: number | undefined,
    ctrlKey?: boolean | undefined,
    altKey?: boolean | undefined,
    shiftKey?: boolean | undefined,
    metaKey?: boolean | undefined,
  ): void {
    throw new Error('Method not implemented.');
  }
  DOM_KEY_LOCATION_STANDARD = 0 as const;
  DOM_KEY_LOCATION_LEFT = 1 as const;
  DOM_KEY_LOCATION_RIGHT = 2 as const;
  DOM_KEY_LOCATION_NUMPAD = 3 as const;
  get detail(): number {
    throw new Error('Getter not implemented.');
  }
  get view(): Window | null {
    throw new Error('Getter not implemented.');
  }
  get which(): number {
    throw new Error('Getter not implemented.');
  }
  initUIEvent(
    typeArg: string,
    bubblesArg?: boolean | undefined,
    cancelableArg?: boolean | undefined,
    viewArg?: Window | null | undefined,
    detailArg?: number | undefined,
  ): void {
    throw new Error('Method not implemented.');
  }
}

export function tabKeyboardEvent() {
  return new KeyboardEventMock('keydown');
}

export function shiftTabKeyboardEvent() {
  const keyboardEvent = new KeyboardEventMock('keydown');
  keyboardEvent.shiftKey = true;
  return keyboardEvent;
}

export function generatePermutations<T>(
  values: T[],
  maxLength = values.length,
): T[][] {
  if (maxLength > values.length) {
    throw new Error('maxLength over values.length');
  }
  const result: T[][] = [];
  const current: T[] = [];
  const seen = new Set();
  (function permutationsImpl() {
    if (current.length > maxLength) {
      return;
    }
    result.push(current.slice());
    for (let i = 0; i < values.length; i++) {
      const key = values[i];
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      current.push(key);
      permutationsImpl();
      seen.delete(key);
      current.pop();
    }
  })();
  return result;
}

// This tag function is just used to trigger prettier auto-formatting.
// (https://prettier.io/blog/2020/08/24/2.1.0.html#api)
export function html(
  partials: TemplateStringsArray,
  ...params: string[]
): string {
  let output = '';
  for (let i = 0; i < partials.length; i++) {
    output += partials[i];
    if (i < partials.length - 1) {
      output += params[i];
    }
  }
  return output;
}

export function polyfillContentEditable() {
  const div = document.createElement('div');
  div.contentEditable = 'true';
  if (/contenteditable/.test(div.outerHTML)) {
    return;
  }
  Object.defineProperty(HTMLElement.prototype, 'contentEditable', {
    get() {
      return this.getAttribute('contenteditable');
    },

    set(value) {
      this.setAttribute('contenteditable', value);
    },
  });
}

export function expectHtmlToBeEqual(actual: string, expected: string): void {
  expect(prettifyHtml(actual)).toBe(prettifyHtml(expected));
}

export function prettifyHtml(s: string): string {
  return prettier.format(s.replace(/\n/g, ''), {
    ...prettierConfig,
    parser: 'html',
  });
}
