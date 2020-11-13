// @flow strict-local

import type {ViewType} from './OutlineView';
import type {Node, NodeKey} from './OutlineNode';
import type {Selection} from './OutlineSelection';

import {useEffect, useState} from 'react';
import {
  createRoot,
  BlockNode,
  RootNode,
  HeaderNode,
  TextNode,
  ParagraphNode,
} from '.';
import {createViewModel, updateViewModel, ViewModel} from './OutlineView';
import {invariant} from './OutlineUtils';

function createOutlineEditor(editorElement): OutlineEditor {
  const root = createRoot();
  const viewModel = new ViewModel(root);
  viewModel.nodeMap.root = root;
  const outlineEditor = new OutlineEditor(editorElement, viewModel);
  outlineEditor._keyToDOMMap.set('root', editorElement);
  return outlineEditor;
}

export type onChangeType = (viewModel: ViewModel) => void;

export type ViewModelDiffType = {
  nodes: Array<Node>,
  selection: null | Selection,
  timeStamp: number,
};

export class OutlineEditor {
  _editorElement: HTMLElement;
  _viewModel: ViewModel;
  _isUpdating: boolean;
  _isComposing: boolean;
  _keyToDOMMap: Map<NodeKey, HTMLElement>;
  _updateListeners: Set<onChangeType>;
  _textTransforms: Set<(node: TextNode, view: ViewType) => void>;
  _registeredNodeTypes: Map<string, Class<Node>>;

  constructor(editorElement: HTMLElement, viewModel: ViewModel) {
    // The editor element associated with this editor
    this._editorElement = editorElement;
    // The current view model
    this._viewModel = viewModel;
    // Handling of drafts and updates
    this._isUpdating = false;
    // Used to help co-ordinate events through plugins
    this._isComposing = false;
    // Used during reconcilation
    this._keyToDOMMap = new Map();
    // onChange listeners
    this._updateListeners = new Set();
    // Handling of transform
    this._textTransforms = new Set();
    // Mapping of types to their nodes
    this._registeredNodeTypes = new Map([
      ['block', BlockNode],
      ['text', TextNode],
      ['root', RootNode],
      ['paragraph', ParagraphNode],
      ['header', HeaderNode],
    ]);
  }
  isComposing(): boolean {
    return this._isComposing;
  }
  setComposing(isComposing: boolean): void {
    this._isComposing = isComposing;
  }
  addNodeType(nodeType: string, klass: Class<Node>): () => void {
    this._registeredNodeTypes.set(nodeType, klass);
    return () => {
      this._registeredNodeTypes.delete(nodeType);
    };
  }
  addUpdateListener(onChange: onChangeType): () => void {
    this._updateListeners.add(onChange);
    return () => {
      this._updateListeners.delete(onChange);
    };
  }
  addTextTransform(
    transformFn: (node: TextNode, view: ViewType) => void,
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
  getElementByKey(key: NodeKey): HTMLElement {
    const element = this._keyToDOMMap.get(key);
    if (element === undefined) {
      throw new Error('getElementByKey failed for key ' + key);
    }
    return element;
  }
  getCurrentViewModel(): ViewModel {
    return this._viewModel;
  }
  getDiffFromViewModel(viewModel: ViewModel): ViewModelDiffType {
    const dirtyNodes = viewModel._dirtyNodes;
    const nodeMap = viewModel.nodeMap;

    invariant(
      dirtyNodes !== null,
      'getDiffFromViewModel: dirtyNodes not found',
    );
    return {
      nodes: Array.from(dirtyNodes).map((nodeKey: NodeKey) => nodeMap[nodeKey]),
      selection: viewModel.selection,
      timeStamp: Date.now(),
    };
  }
  createViewModel(callbackFn: (view: ViewType) => void): ViewModel {
    return createViewModel(this._viewModel, callbackFn, this);
  }
  update(viewModel: ViewModel, forceSync?: boolean) {
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

export function useOutlineEditor(editorElementRef: {
  current: null | HTMLElement,
}): OutlineEditor | null {
  const [outlineEditor, setOutlineEditor] = useState<null | OutlineEditor>(
    null,
  );

  useEffect(() => {
    const editorElement = editorElementRef.current;

    if (editorElement !== null) {
      if (outlineEditor === null) {
        const newOutlineEditor = createOutlineEditor(editorElement);
        setOutlineEditor(newOutlineEditor);
      }
    } else if (outlineEditor !== null) {
      setOutlineEditor(null);
    }
  }, [editorElementRef, outlineEditor]);

  return outlineEditor;
}
