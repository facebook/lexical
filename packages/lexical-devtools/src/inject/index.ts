/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {EditorState, NodeSelection} from 'lexical';
import {PointType} from 'packages/lexical/src/LexicalSelection';
import {
  GridSelectionJSON,
  LexicalHTMLElement,
  LexicalKey,
  PointTypeJSON,
  RangeSelectionJSON,
} from 'packages/lexical-devtools/types';

let lexical: boolean;
let editorDOMNode: LexicalHTMLElement | null, editorKey: string | null;

const serializePoint = (point: PointType) => {
  const newPoint = {} as PointTypeJSON;

  for (const [key, value] of Object.entries(point)) {
    if (key !== '_selection') {
      newPoint[key] = value;
    }
  }

  return newPoint;
};

// the existing editorState.toJSON() does not contain lexicalKeys
// therefore, we have a custom serializeEditorState helper
const serializeEditorState = (editorState: EditorState) => {
  const nodeMap = Object.fromEntries(editorState._nodeMap); // convert from Map structure to JSON-friendly object

  let selection: null | GridSelectionJSON | RangeSelectionJSON | NodeSelection =
    null;

  if (editorState._selection && 'anchor' in editorState._selection) {
    // remove _selection.anchor._selection property if present in RangeSelection or GridSelection
    // otherwise, the recursive structure makes the selection object unserializable
    selection = editorState._selection;
    selection.anchor = serializePoint(editorState._selection.anchor);
    // do the same for the focus property
    selection.focus = serializePoint(editorState._selection.focus);
  } else if (editorState._selection) {
    selection = editorState._selection;
  }

  return {nodeMap, selection};
};

const postEditorState = (editorState: EditorState) => {
  const serializedEditorState = serializeEditorState(editorState);
  const data = {editorState: serializedEditorState};
  document.dispatchEvent(new CustomEvent('editorStateUpdate', {detail: data}));
};

document.addEventListener('checkForLexical', function (e) {
  lexical = document.querySelectorAll('div[data-lexical-editor]').length > 0;
  const data = {lexical: lexical};
  document.dispatchEvent(
    new CustomEvent('lexicalPresenceUpdate', {detail: data}),
  );
});

document.addEventListener('loadEditorState', function (e) {
  // query document for Lexical editor instance.
  // TODO: add support multiple Lexical editors within the same page
  editorDOMNode = document.querySelectorAll(
    'div[data-lexical-editor]',
  )[0] as LexicalHTMLElement;
  const editor = editorDOMNode.__lexicalEditor;
  editorKey = editorDOMNode.__lexicalEditor._key; // dynamically generated upon each pageload, we need this to find DOM nodes for highlighting

  const initialEditorState = editor.getEditorState();
  postEditorState(initialEditorState);

  editor.registerUpdateListener(({editorState}) => {
    postEditorState(editorState);
  });
});

// append highlight overlay <div> to document
const highlightOverlay = document.createElement('div');
highlightOverlay.style.position = 'absolute';
highlightOverlay.style.background = 'rgba(119, 182, 255, 0.5)';
highlightOverlay.style.border = '1px dashed #77b6ff';
document.body.appendChild(highlightOverlay);

// functions to highlight/dehighlight DOM nodes onHover of DevTools nodes
document.addEventListener('highlight', (evt: CustomEvent) => {
  highlight(evt.detail.lexicalKey);
});

document.addEventListener('dehighlight', function () {
  dehighlight();
});

// depth first search to find DOM node with lexicalKey
const findDOMNode = (
  node: LexicalHTMLElement,
  targetKey: string,
): LexicalHTMLElement | null => {
  // each DOM node has its Lexical key stored at a particular key eg. DOMNode[__lexicalKey_pzely]
  const key = ('__lexicalKey_' + editorKey) as LexicalKey;

  if (targetKey === 'root') {
    return editorDOMNode;
  }

  if (node[key] && node[key] === targetKey) {
    return node;
  }

  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i] as LexicalHTMLElement;
    const childResults = findDOMNode(child, targetKey);
    if (childResults) return childResults;
  }

  return null;
};

const highlight = (targetKey: string) => {
  if (editorDOMNode) {
    const node = findDOMNode(editorDOMNode, targetKey);
    if (node) {
      const {width, height, top, left} = node.getBoundingClientRect();
      highlightOverlay.style.width = width + 'px';
      highlightOverlay.style.height = height + 'px';
      highlightOverlay.style.top = top + window.scrollY + 'px';
      highlightOverlay.style.left = left + window.scrollX + 'px';
      highlightOverlay.style.display = 'block';
    }
  }
};

const dehighlight = () => {
  highlightOverlay.style.display = 'none';
};
