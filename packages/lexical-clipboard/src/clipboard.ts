/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/// <reference types="trusted-types" />

import {
  getExtensionDependencyFromEditor,
  LexicalBuilder,
} from '@lexical/extension';
import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {$addNodeStyle, $sliceSelectedTextNodeContent} from '@lexical/selection';
import {objectKlassEquals} from '@lexical/utils';
import {
  $caretFromPoint,
  $comparePointCaretNext,
  $createRangeSelection,
  $createTabNode,
  $getCaretRange,
  $getChildCaret,
  $getChildCaretAtIndex,
  $getEditor,
  $getNearestNodeFromDOMNode,
  $getRoot,
  $getSelection,
  $getTextPointCaret,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $isTextPointCaret,
  $parseSerializedNode,
  $setPointFromCaret,
  $setSelection,
  $splitAtPointCaretNext,
  BaseSelection,
  COMMAND_PRIORITY_CRITICAL,
  COPY_COMMAND,
  defineExtension,
  getDOMSelection,
  isSelectionWithinEditor,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  PointCaret,
  RangeSelection,
  safeCast,
  SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
  SerializedElementNode,
  shallowMergeConfig,
} from 'lexical';
import caretFromPoint from 'shared/caretFromPoint';
import invariant from 'shared/invariant';

export interface LexicalClipboardData {
  'text/html'?: string | undefined;
  'application/x-lexical-editor'?: string | undefined;
  'text/plain': string;
  [mimeType: string]: string | undefined;
}

/**
 * Returns the *currently selected* Lexical content as an HTML string, relying on the
 * logic defined in the exportDOM methods on the LexicalNode classes. Note that
 * this will not return the HTML content of the entire editor (unless all the content is included
 * in the current selection).
 *
 * @param editor - LexicalEditor instance to get HTML content from
 * @param selection - The selection to use (default is $getSelection())
 * @returns a string of HTML content
 */
export function $getHtmlContent(
  editor: LexicalEditor,
  selection = $getSelection(),
): string {
  if (selection == null) {
    invariant(false, 'Expected valid LexicalSelection');
  }

  // If we haven't selected anything
  if (
    ($isRangeSelection(selection) && selection.isCollapsed()) ||
    selection.getNodes().length === 0
  ) {
    return '';
  }

  return $generateHtmlFromNodes(editor, selection);
}

/**
 * Returns the *currently selected* Lexical content as a JSON string, relying on the
 * logic defined in the exportJSON methods on the LexicalNode classes. Note that
 * this will not return the JSON content of the entire editor (unless all the content is included
 * in the current selection).
 *
 * @param editor  - LexicalEditor instance to get the JSON content from
 * @param selection - The selection to use (default is $getSelection())
 * @returns
 */
export function $getLexicalContent(
  editor: LexicalEditor,
  selection = $getSelection(),
): null | string {
  if (selection == null) {
    invariant(false, 'Expected valid LexicalSelection');
  }

  // If we haven't selected anything
  if (
    ($isRangeSelection(selection) && selection.isCollapsed()) ||
    selection.getNodes().length === 0
  ) {
    return null;
  }

  return JSON.stringify($generateJSONFromSelectedNodes(editor, selection));
}

/**
 * Attempts to insert content of the mime-types text/plain or text/uri-list from
 * the provided DataTransfer object into the editor at the provided selection.
 * text/uri-list is only used if text/plain is not also provided.
 *
 * @param dataTransfer an object conforming to the [DataTransfer interface] (https://html.spec.whatwg.org/multipage/dnd.html#the-datatransfer-interface)
 * @param selection the selection to use as the insertion point for the content in the DataTransfer object
 */
export function $insertDataTransferForPlainText(
  dataTransfer: DataTransfer,
  selection: BaseSelection,
): void {
  const text =
    dataTransfer.getData('text/plain') || dataTransfer.getData('text/uri-list');

  if (text != null) {
    selection.insertRawText(text);
  }
}

/**
 * Attempts to insert content of the mime-types application/x-lexical-editor, text/html,
 * text/plain, or text/uri-list (in descending order of priority) from the provided DataTransfer
 * object into the editor at the provided selection.
 *
 * @param dataTransfer an object conforming to the [DataTransfer interface] (https://html.spec.whatwg.org/multipage/dnd.html#the-datatransfer-interface)
 * @param selection the selection to use as the insertion point for the content in the DataTransfer object
 * @param editor the LexicalEditor the content is being inserted into.
 */
export function $insertDataTransferForRichText(
  dataTransfer: DataTransfer,
  selection: BaseSelection,
  editor: LexicalEditor,
): void {
  const lexicalString = dataTransfer.getData('application/x-lexical-editor');

  if (lexicalString) {
    try {
      const payload = JSON.parse(lexicalString);
      if (
        payload.namespace === editor._config.namespace &&
        Array.isArray(payload.nodes)
      ) {
        const nodes = $generateNodesFromSerializedNodes(payload.nodes);
        return $insertGeneratedNodes(editor, nodes, selection);
      }
    } catch (error) {
      console.error(error);
    }
  }

  const htmlString = dataTransfer.getData('text/html');
  const plainString = dataTransfer.getData('text/plain');

  // Skip HTML handling if it matches the plain text representation.
  // This avoids unnecessary processing for plain text strings created by
  // iOS Safari autocorrect, which incorrectly includes a `text/html` type.
  if (htmlString && plainString !== htmlString) {
    try {
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        trustHTML(htmlString) as string,
        'text/html',
      );
      const nodes = $generateNodesFromDOM(editor, dom);
      return $insertGeneratedNodes(editor, nodes, selection);
    } catch (error) {
      console.error(error);
    }
  }

  // Multi-line plain text in rich text mode pasted as separate paragraphs
  // instead of single paragraph with linebreaks.
  // Webkit-specific: Supports read 'text/uri-list' in clipboard.
  const text = plainString || dataTransfer.getData('text/uri-list');
  if (text != null) {
    if ($isRangeSelection(selection)) {
      const parts = text.split(/(\r?\n|\t)/);
      if (parts[parts.length - 1] === '') {
        parts.pop();
      }
      for (let i = 0; i < parts.length; i++) {
        const currentSelection = $getSelection();
        if ($isRangeSelection(currentSelection)) {
          const part = parts[i];
          if (part === '\n' || part === '\r\n') {
            currentSelection.insertParagraph();
          } else if (part === '\t') {
            currentSelection.insertNodes([$createTabNode()]);
          } else {
            currentSelection.insertText(part);
          }
        }
      }
    } else {
      selection.insertRawText(text);
    }
  }
}

const LEXICAL_DRAG_MIME_TYPE = 'application/x-lexical-drag';

interface LexicalDragMarker {
  editorKey: string;
  anchor: {key: NodeKey; offset: number; type: 'text' | 'element'};
  focus: {key: NodeKey; offset: number; type: 'text' | 'element'};
}

/**
 * Populate `dataTransfer` with a marker identifying the current editor and
 * non-collapsed RangeSelection as a drag source. Pair this with
 * {@link $handleRichTextDrop} or {@link $handlePlainTextDrop} on the drop side
 * to get cut-and-paste semantics for drags that end in a different editor.
 *
 * Callers typically invoke this from a DRAGSTART_COMMAND handler alongside
 * {@link setLexicalClipboardDataTransfer} (so that the dragged content itself
 * round-trips with full node fidelity).
 */
export function $writeDragSourceToDataTransfer(
  dataTransfer: DataTransfer,
  editor: LexicalEditor,
  selection: RangeSelection,
): void {
  const marker: LexicalDragMarker = {
    anchor: {
      key: selection.anchor.key,
      offset: selection.anchor.offset,
      type: selection.anchor.type,
    },
    editorKey: editor.getKey(),
    focus: {
      key: selection.focus.key,
      offset: selection.focus.offset,
      type: selection.focus.type,
    },
  };
  dataTransfer.setData(LEXICAL_DRAG_MIME_TYPE, JSON.stringify(marker));
}

function readDragMarker(dataTransfer: DataTransfer): LexicalDragMarker | null {
  const raw = dataTransfer.getData(LEXICAL_DRAG_MIME_TYPE);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as LexicalDragMarker;
  } catch {
    return null;
  }
}

function findEditorByKey(key: string, doc: Document): LexicalEditor | null {
  const elements = doc.querySelectorAll('[data-lexical-editor="true"]');
  for (const el of Array.from(elements)) {
    const editor = (el as unknown as {__lexicalEditor?: LexicalEditor})
      .__lexicalEditor;
    if (editor && editor.getKey() === key) {
      return editor;
    }
  }
  return null;
}

function $resolveDropPointCaret(event: DragEvent): null | PointCaret<'next'> {
  const hit = caretFromPoint(event.clientX, event.clientY);
  if (hit === null) {
    return null;
  }
  const node = $getNearestNodeFromDOMNode(hit.node);
  if (node === null) {
    return null;
  }
  if ($isTextNode(node)) {
    return $getTextPointCaret(node, 'next', hit.offset);
  }
  if ($isElementNode(node)) {
    return $getChildCaretAtIndex(node, hit.offset, 'next');
  }
  const parent = node.getParent();
  if (parent === null) {
    return null;
  }
  return $getChildCaretAtIndex(parent, node.getIndexWithinParent() + 1, 'next');
}

function $isDropCaretInsideSelection(
  dropCaret: PointCaret<'next'>,
  selection: RangeSelection,
): boolean {
  const anchorCaret = $caretFromPoint(selection.anchor, 'next');
  const focusCaret = $caretFromPoint(selection.focus, 'next');
  const isBackward = selection.isBackward();
  const startCaret = isBackward ? focusCaret : anchorCaret;
  const endCaret = isBackward ? anchorCaret : focusCaret;
  return (
    $comparePointCaretNext(startCaret, dropCaret) < 0 &&
    $comparePointCaretNext(dropCaret, endCaret) < 0
  );
}

function $doDrop(
  event: DragEvent,
  editor: LexicalEditor,
  $insertDataTransfer: (
    dataTransfer: DataTransfer,
    selection: BaseSelection,
    targetEditor: LexicalEditor,
  ) => void,
): boolean {
  const dataTransfer = event.dataTransfer;
  if (dataTransfer === null) {
    return false;
  }

  const dropCaret = $resolveDropPointCaret(event);
  if (dropCaret === null) {
    return false;
  }

  const marker = readDragMarker(dataTransfer);
  const isSameEditorDrag =
    marker !== null && marker.editorKey === editor.getKey();
  const currentSelection = $getSelection();

  // For a same-editor drag, reject drops strictly inside the dragged range
  // (dropping into your own selection should be a no-op).
  if (
    isSameEditorDrag &&
    $isRangeSelection(currentSelection) &&
    !currentSelection.isCollapsed() &&
    $isDropCaretInsideSelection(dropCaret, currentSelection)
  ) {
    event.preventDefault();
    return true;
  }

  // Split at the drop caret so we have a stable NodeCaret boundary that
  // survives text-content mutations in its siblings.
  const stableDropCaret = $splitAtPointCaretNext(dropCaret);
  if (stableDropCaret === null) {
    return false;
  }

  // Remove the source content.
  //  - Same-editor drag: the current selection is the dragged range; remove
  //    it now so the insert below lands in the cleaned-up tree.
  //  - Cross-editor drag: the source lives in a different editor; schedule a
  //    separate update there after we finish inserting here.
  if (
    isSameEditorDrag &&
    $isRangeSelection(currentSelection) &&
    !currentSelection.isCollapsed()
  ) {
    currentSelection.removeText();
  }

  // If the drop caret's origin was swept away by the source removal (which can
  // happen when the drop lands exactly at a source boundary inside a text node
  // whose content was entirely selected), abort — the user saw "no-op" either
  // way, and we shouldn't try to insert into a detached node.
  if (!stableDropCaret.origin.isAttached()) {
    event.preventDefault();
    return true;
  }

  // Point selection at the stable drop caret and insert the DataTransfer
  // payload there.
  const dropSelection = $createRangeSelection();
  $setPointFromCaret(dropSelection.anchor, stableDropCaret);
  $setPointFromCaret(dropSelection.focus, stableDropCaret);
  $setSelection(dropSelection);
  const postSelection = $getSelection();
  if (postSelection !== null) {
    $insertDataTransfer(dataTransfer, postSelection, editor);
  }

  // Cross-editor removal happens last on a separate update so the destination
  // insert has fully committed.
  if (marker !== null && !isSameEditorDrag) {
    const rootElement = editor.getRootElement();
    const doc = rootElement ? rootElement.ownerDocument : null;
    const sourceEditor = doc ? findEditorByKey(marker.editorKey, doc) : null;
    if (sourceEditor !== null) {
      sourceEditor.update(() => {
        const restored = $createRangeSelection();
        restored.anchor.set(
          marker.anchor.key,
          marker.anchor.offset,
          marker.anchor.type,
        );
        restored.focus.set(
          marker.focus.key,
          marker.focus.offset,
          marker.focus.type,
        );
        $setSelection(restored);
        const pending = $getSelection();
        if ($isRangeSelection(pending) && !pending.isCollapsed()) {
          pending.removeText();
        }
      });
    }
  }

  event.preventDefault();
  return true;
}

/**
 * Drop handler for rich-text editors. Inserts the DataTransfer payload via
 * {@link $insertDataTransferForRichText} at the drop caret and, when the drag
 * originated from a Lexical editor (marked via
 * {@link $writeDragSourceToDataTransfer} on DRAGSTART), removes the source
 * range — producing cut-and-paste semantics whether the drop is in the same
 * editor or a different one on the same page.
 */
export function $handleRichTextDrop(
  event: DragEvent,
  editor: LexicalEditor,
): boolean {
  return $doDrop(event, editor, $insertDataTransferForRichText);
}

/**
 * Drop handler for plain-text editors. Same semantics as
 * {@link $handleRichTextDrop} but inserts via
 * {@link $insertDataTransferForPlainText}.
 */
export function $handlePlainTextDrop(
  event: DragEvent,
  editor: LexicalEditor,
): boolean {
  return $doDrop(event, editor, (dataTransfer, selection) =>
    $insertDataTransferForPlainText(dataTransfer, selection),
  );
}

function trustHTML(html: string): string | TrustedHTML {
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    const policy = window.trustedTypes.createPolicy('lexical', {
      createHTML: (input) => input,
    });
    return policy.createHTML(html);
  }
  return html;
}

/**
 * Inserts Lexical nodes into the editor using different strategies depending on
 * some simple selection-based heuristics. If you're looking for a generic way to
 * to insert nodes into the editor at a specific selection point, you probably want
 * {@link lexical.$insertNodes}
 *
 * @param editor LexicalEditor instance to insert the nodes into.
 * @param nodes The nodes to insert.
 * @param selection The selection to insert the nodes into.
 */
export function $insertGeneratedNodes(
  editor: LexicalEditor,
  nodes: Array<LexicalNode>,
  selection: BaseSelection,
): void {
  if (
    !editor.dispatchCommand(SELECTION_INSERT_CLIPBOARD_NODES_COMMAND, {
      nodes,
      selection,
    })
  ) {
    selection.insertNodes(nodes);
    $updateSelectionOnInsert(selection);
  }
  return;
}

function $updateSelectionOnInsert(selection: BaseSelection): void {
  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    const anchor = selection.anchor;
    let nodeToInspect: LexicalNode | null = null;

    const anchorCaret = $caretFromPoint(anchor, 'previous');
    if (anchorCaret) {
      if ($isTextPointCaret(anchorCaret)) {
        nodeToInspect = anchorCaret.origin;
      } else {
        const range = $getCaretRange(
          anchorCaret,
          $getChildCaret($getRoot(), 'next').getFlipped(),
        );
        for (const caret of range) {
          if ($isTextNode(caret.origin)) {
            nodeToInspect = caret.origin;
            break;
          } else if ($isElementNode(caret.origin) && !caret.origin.isInline()) {
            break;
          }
        }
      }
    }

    if (nodeToInspect && $isTextNode(nodeToInspect)) {
      const newFormat = nodeToInspect.getFormat();
      const newStyle = nodeToInspect.getStyle();

      if (selection.format !== newFormat || selection.style !== newStyle) {
        selection.format = newFormat;
        selection.style = newStyle;
        selection.dirty = true;
      }
    }
  }
}

export interface BaseSerializedNode {
  children?: Array<BaseSerializedNode>;
  type: string;
  version: number;
}

function exportNodeToJSON<T extends LexicalNode>(node: T): BaseSerializedNode {
  const serializedNode = node.exportJSON();
  const nodeClass = node.constructor;

  if (serializedNode.type !== nodeClass.getType()) {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .exportJSON().',
      nodeClass.name,
    );
  }

  if ($isElementNode(node)) {
    const serializedChildren = (serializedNode as SerializedElementNode)
      .children;
    if (!Array.isArray(serializedChildren)) {
      invariant(
        false,
        'LexicalNode: Node %s is an element but .exportJSON() does not have a children array.',
        nodeClass.name,
      );
    }
  }

  return serializedNode;
}

function $appendNodesToJSON(
  editor: LexicalEditor,
  selection: BaseSelection | null,
  currentNode: LexicalNode,
  targetArray: Array<BaseSerializedNode> = [],
): boolean {
  let shouldInclude =
    selection !== null ? currentNode.isSelected(selection) : true;
  const shouldExclude =
    $isElementNode(currentNode) && currentNode.excludeFromCopy('html');
  let target = currentNode;

  if (selection !== null && $isTextNode(target)) {
    target = $sliceSelectedTextNodeContent(selection, target, 'clone');
  }
  const children = $isElementNode(target) ? target.getChildren() : [];

  const serializedNode = exportNodeToJSON(target);
  if ($isTextNode(target) && target.getTextContentSize() === 0) {
    // If an uncollapsed selection ends or starts at the end of a line of specialized,
    // TextNodes, such as code tokens, we will get a 'blank' TextNode here, i.e., one
    // with text of length 0. We don't want this, it makes a confusing mess. Reset!
    shouldInclude = false;
  }

  for (let i = 0; i < children.length; i++) {
    const childNode = children[i];
    const shouldIncludeChild = $appendNodesToJSON(
      editor,
      selection,
      childNode,
      serializedNode.children,
    );

    if (
      !shouldInclude &&
      $isElementNode(currentNode) &&
      shouldIncludeChild &&
      currentNode.extractWithChild(childNode, selection, 'clone')
    ) {
      shouldInclude = true;
    }
  }

  if (shouldInclude && !shouldExclude) {
    targetArray.push(serializedNode);
  } else if (Array.isArray(serializedNode.children)) {
    for (let i = 0; i < serializedNode.children.length; i++) {
      const serializedChildNode = serializedNode.children[i];
      targetArray.push(serializedChildNode);
    }
  }

  return shouldInclude;
}

// TODO why $ function with Editor instance?
/**
 * Gets the Lexical JSON of the nodes inside the provided Selection.
 *
 * @param editor LexicalEditor to get the JSON content from.
 * @param selection Selection to get the JSON content from.
 * @returns an object with the editor namespace and a list of serializable nodes as JavaScript objects.
 */
export function $generateJSONFromSelectedNodes<
  SerializedNode extends BaseSerializedNode,
>(
  editor: LexicalEditor,
  selection: BaseSelection | null,
): {
  namespace: string;
  nodes: Array<SerializedNode>;
} {
  const nodes: Array<SerializedNode> = [];
  const root = $getRoot();
  const topLevelChildren = root.getChildren();
  for (let i = 0; i < topLevelChildren.length; i++) {
    const topLevelNode = topLevelChildren[i];
    $appendNodesToJSON(editor, selection, topLevelNode, nodes);
  }
  return {
    namespace: editor._config.namespace,
    nodes,
  };
}

/**
 * This method takes an array of objects conforming to the BaseSerializedNode interface and returns
 * an Array containing instances of the corresponding LexicalNode classes registered on the editor.
 * Normally, you'd get an Array of BaseSerialized nodes from {@link $generateJSONFromSelectedNodes}
 *
 * @param serializedNodes an Array of objects conforming to the BaseSerializedNode interface.
 * @returns an Array of Lexical Node objects.
 */
export function $generateNodesFromSerializedNodes(
  serializedNodes: Array<BaseSerializedNode>,
): Array<LexicalNode> {
  const nodes = [];
  for (let i = 0; i < serializedNodes.length; i++) {
    const serializedNode = serializedNodes[i];
    const node = $parseSerializedNode(serializedNode);
    if ($isTextNode(node)) {
      $addNodeStyle(node);
    }
    nodes.push(node);
  }
  return nodes;
}

const EVENT_LATENCY = 50;
let clipboardEventTimeout: null | number = null;

// TODO custom selection
// TODO potentially have a node customizable version for plain text
/**
 * Copies the content of the current selection to the clipboard in
 * text/plain, text/html, and application/x-lexical-editor (Lexical JSON)
 * formats.
 *
 * @param editor the LexicalEditor instance to copy content from
 * @param event the native browser ClipboardEvent to add the content to.
 * @returns
 */
export async function copyToClipboard(
  editor: LexicalEditor,
  event: null | ClipboardEvent,
  data?: LexicalClipboardData,
): Promise<boolean> {
  if (clipboardEventTimeout !== null) {
    // Prevent weird race conditions that can happen when this function is run multiple times
    // synchronously. In the future, we can do better, we can cancel/override the previously running job.
    return false;
  }
  if (event !== null) {
    return new Promise((resolve, reject) => {
      editor.update(() => {
        resolve($copyToClipboardEvent(editor, event, data));
      });
    });
  }

  const rootElement = editor.getRootElement();
  const editorWindow = editor._window || window;
  const windowDocument = editorWindow.document;
  const domSelection = getDOMSelection(editorWindow);
  if (rootElement === null || domSelection === null) {
    return false;
  }
  const element = windowDocument.createElement('span');
  element.style.cssText = 'position: fixed; top: -1000px;';
  element.append(windowDocument.createTextNode('#'));
  rootElement.append(element);
  const range = new Range();
  range.setStart(element, 0);
  range.setEnd(element, 1);
  domSelection.removeAllRanges();
  domSelection.addRange(range);
  return new Promise((resolve, reject) => {
    const removeListener = editor.registerCommand(
      COPY_COMMAND,
      (secondEvent) => {
        if (objectKlassEquals(secondEvent, ClipboardEvent)) {
          removeListener();
          if (clipboardEventTimeout !== null) {
            editorWindow.clearTimeout(clipboardEventTimeout);
            clipboardEventTimeout = null;
          }
          resolve($copyToClipboardEvent(editor, secondEvent, data));
        }
        // Block the entire copy flow while we wait for the next ClipboardEvent
        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
    // If the above hack execCommand hack works, this timeout code should never fire. Otherwise,
    // the listener will be quickly freed so that the user can reuse it again
    clipboardEventTimeout = editorWindow.setTimeout(() => {
      removeListener();
      clipboardEventTimeout = null;
      resolve(false);
    }, EVENT_LATENCY);
    windowDocument.execCommand('copy');
    element.remove();
  });
}

// TODO shouldn't pass editor (pass namespace directly)
function $copyToClipboardEvent(
  editor: LexicalEditor,
  event: ClipboardEvent,
  data?: LexicalClipboardData,
): boolean {
  if (data === undefined) {
    const domSelection = getDOMSelection(editor._window);
    const selection = $getSelection();

    if (!selection || selection.isCollapsed()) {
      return false;
    }

    if (!domSelection) {
      return false;
    }
    const anchorDOM = domSelection.anchorNode;
    const focusDOM = domSelection.focusNode;
    if (
      anchorDOM !== null &&
      focusDOM !== null &&
      !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
    ) {
      return false;
    }

    data = $getClipboardDataFromSelection(selection);
  }
  event.preventDefault();
  const clipboardData = event.clipboardData;
  if (clipboardData === null) {
    return false;
  }
  setLexicalClipboardDataTransfer(clipboardData, data);
  return true;
}

const clipboardDataFunctions = [
  ['text/html', $getHtmlContent],
  ['application/x-lexical-editor', $getLexicalContent],
] as const;

/**
 * Serialize the content of the current selection to strings in
 * text/plain, text/html, and application/x-lexical-editor (Lexical JSON)
 * formats (as available).
 *
 * @param selection the selection to serialize (defaults to $getSelection())
 * @returns LexicalClipboardData
 */
export function $getClipboardDataFromSelection(
  selection: BaseSelection | null = $getSelection(),
): LexicalClipboardData {
  return $getClipboardDataWithConfigFromSelection(
    $getExportConfig(),
    selection,
  );
}

/**
 * Call setData on the given clipboardData for each MIME type present
 * in the given data (from {@link $getClipboardDataFromSelection})
 *
 * @param clipboardData the event.clipboardData to populate from data
 * @param data The lexical data
 */
export function setLexicalClipboardDataTransfer(
  clipboardData: DataTransfer,
  data: LexicalClipboardData,
) {
  for (const [k] of clipboardDataFunctions) {
    if (data[k] === undefined) {
      clipboardData.setData(k, '');
    }
  }
  for (const k in data) {
    const v = data[k as keyof LexicalClipboardData];
    if (v !== undefined) {
      clipboardData.setData(k, v);
    }
  }
}

export type ExportMimeTypeFunction = (
  selection: null | BaseSelection,
  next: () => null | string,
) => null | string;

export interface GetClipboardDataConfig {
  $exportMimeType: ExportMimeTypeConfig;
}

export type ExportMimeTypeConfig = Record<
  keyof LexicalClipboardData | (string & {}),
  ExportMimeTypeFunction[]
>;

function $getExportConfig() {
  const editor = $getEditor();
  const builder = LexicalBuilder.maybeFromEditor(editor);
  if (builder && builder.hasExtensionByName(GetClipboardDataExtension.name)) {
    return getExtensionDependencyFromEditor(editor, GetClipboardDataExtension)
      .output;
  }
  return DEFAULT_EXPORT_MIME_TYPE;
}

const DEFAULT_EXPORT_MIME_TYPE: ExportMimeTypeConfig = {
  'application/x-lexical-editor': [
    (sel, next) => (sel ? $getLexicalContent($getEditor(), sel) : next()),
  ],
  'text/html': [
    (sel, next) => (sel ? $getHtmlContent($getEditor(), sel) : next()),
  ],
  'text/plain': [(sel, next) => (sel ? sel.getTextContent() : next())],
};

function $getClipboardDataWithConfigFromSelection(
  $exportMimeType: ExportMimeTypeConfig,
  selection: null | BaseSelection,
): LexicalClipboardData {
  const clipboardData: LexicalClipboardData = {'text/plain': ''};
  for (const [k, fns] of Object.entries($exportMimeType)) {
    const v = callExportMimeTypeFunctionStack(fns, selection);
    if (v !== null) {
      clipboardData[k] = v;
    }
  }
  return clipboardData;
}

function callExportMimeTypeFunctionStack(
  fns: ExportMimeTypeFunction[],
  selection: null | BaseSelection,
) {
  const callAt = (i: number): string | null =>
    fns[i] ? fns[i](selection, callAt.bind(null, i - 1)) : null;
  return callAt(fns.length - 1);
}

export function $exportMimeTypeFromSelection(
  mimeType: keyof ExportMimeTypeConfig,
  selection: null | BaseSelection = $getSelection(),
): string | null {
  return callExportMimeTypeFunctionStack(
    $getExportConfig()[mimeType] || [],
    selection,
  );
}

export const GetClipboardDataExtension = defineExtension({
  build(editor, config, state) {
    return config.$exportMimeType;
  },
  config: safeCast<GetClipboardDataConfig>({
    $exportMimeType: DEFAULT_EXPORT_MIME_TYPE,
  }),
  mergeConfig(config, partial) {
    const merged = shallowMergeConfig(config, partial);
    if (partial.$exportMimeType) {
      const $exportMimeType = {...config.$exportMimeType};
      for (const [k, v] of Object.entries(partial.$exportMimeType)) {
        $exportMimeType[k] = [...$exportMimeType[k], ...v];
      }
      merged.$exportMimeType = $exportMimeType;
    }
    return merged;
  },
  name: '@lexical/clipboard/GetClipboardData',
});
