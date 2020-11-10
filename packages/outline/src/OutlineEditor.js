// @flow

import type {ViewType} from './OutlineView';

import {useEffect, useState} from 'react';
import {TextNode} from './nodes/OutlineTextNode';
import {BlockNode} from './nodes/OutlineBlockNode';
import {createBodyNode} from './nodes/OutlineBodyNode';
import {createViewModel, updateViewModel, ViewModel} from './OutlineView';

function createOutlineEditor(
  editorElement,
  onChange: onChangeType,
): OutlineEditor {
  const viewModel = new ViewModel();
  const body = createBodyNode();
  viewModel.body = body;
  viewModel.nodeMap.body = body;
  const outlineEditor = new OutlineEditor(editorElement, viewModel, onChange);
  outlineEditor._keyToDOMMap.set('body', editorElement);
  if (typeof onChange === 'function') {
    onChange(viewModel);
  }
  return outlineEditor;
}

export type onChangeType = ?(viewModel: Object) => void;

export type ViewModelDiffType = {
  dirtySubTrees: Set<any>,
  nodes: Array<Object>,
  selection: Object,
  timeStamp: number,
};

export class OutlineEditor {
  _editorElement: HTMLElement;
  _viewModel: ViewModel;
  _isUpdating: boolean;
  _keyToDOMMap: Map<string, HTMLElement>;
  _onChange: onChangeType;
  _textTransforms: Set<(node: Object, view: ViewType) => void>;
  _registeredNodeTypes: Map<string, Object>;

  constructor(
    editorElement: HTMLElement,
    viewModel: Object,
    onChange: onChangeType,
  ) {
    // The editor element associated with this editor
    this._editorElement = editorElement;
    // The current view model
    this._viewModel = viewModel;
    // Handling of drafts and updates
    this._isUpdating = false;
    // Used during reconcilation
    this._keyToDOMMap = new Map();
    // onChange callback
    this._onChange = onChange;
    // Handling of transform
    this._textTransforms = new Set();
    // Mapping of types to their nodes
    this._registeredNodeTypes = new Map([
      ['block', BlockNode],
      ['text', TextNode],
      ['body', BlockNode],
    ]);
  }
  addNodeType(nodeType: string, Node: Object): () => void {
    this._registeredNodeTypes.set(nodeType, Node);
    return () => {
      this._registeredNodeTypes.delete(nodeType);
    };
  }
  addTextTransform(
    transformFn: (node: Object, view: ViewType) => void,
  ): () => void {
    this._textTransforms.add(transformFn);
    return () => {
      this._textTransforms.delete(transformFn);
    };
  }
  isUpdating(): boolean {
    return this._isUpdating;
  }
  getEditorElement(): HTMLElement {
    return this._editorElement;
  }
  getElementByKey(key: string): HTMLElement {
    const element = this._keyToDOMMap.get(key);
    if (element === undefined) {
      throw new Error('getElementByKey failed for key ' + key);
    }
    return element;
  }
  getCurrentViewModel(): Object {
    return this._viewModel;
  }
  getDiffFromViewModel(viewModel: Object): ViewModelDiffType {
    const dirtySubTrees = viewModel._dirtySubTrees;
    const dirtyNodes = viewModel._dirtyNodes;
    const nodeMap = viewModel.nodeMap;

    if (dirtyNodes === null || dirtySubTrees === null) {
      throw new Error(
        'getDiffFromViewModel: unable to get diff from view mode',
      );
    }
    return {
      dirtySubTrees: dirtySubTrees,
      nodes: Array.from(dirtyNodes).map((nodeKey) => nodeMap[nodeKey]),
      selection: {...viewModel.selection},
      timeStamp: Date.now(),
    };
  }
  createViewModel(callbackFn: (view: ViewType) => void): Object {
    return createViewModel(this._viewModel, callbackFn, this);
  }
  update(viewModel: Object, forceSync?: boolean) {
    if (this._isUpdating) {
      throw new Error('TODOL: Should never occur?');
    }
    if (viewModel === this._viewModel) {
      return;
    }
    if (forceSync) {
      updateViewModel(viewModel, this);
    } else {
      this._isUpdating = true;
      Promise.resolve().then(() => {
        this._isUpdating = false;
        updateViewModel(viewModel, this);
      });
    }
  }
}

export function useOutlineEditor(
  editorElementRef: {current: null | HTMLElement},
  onChange?: onChangeType,
): OutlineEditor | null {
  const [outlineEditor, setOutlineEditor] = useState<null | OutlineEditor>(
    null,
  );

  useEffect(() => {
    const editorElement = editorElementRef.current;

    if (editorElement !== null) {
      if (outlineEditor === null) {
        const newOutlineEditor = createOutlineEditor(editorElement, onChange);
        setOutlineEditor(newOutlineEditor);
      } else {
        outlineEditor._onChange = onChange;
      }
    } else if (outlineEditor !== null) {
      setOutlineEditor(null);
    }
  }, [editorElementRef, onChange, outlineEditor]);

  return outlineEditor;
}
