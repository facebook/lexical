// @flow strict

import type {ViewType} from './OutlineView';
import type {Node, NodeKey} from './OutlineNode';

import {useEffect, useState} from 'react';
import {
  createRoot,
  RootNode,
  TextNode,
  ParagraphNode,
  HeaderNode,
  ListNode,
  ListItemNode,
} from '.';
import {
  applyTextTransforms,
  cloneViewModel,
  enterViewModelScope,
  garbageCollectDetachedNodes,
  viewModelHasDirtySelection,
  ViewModel,
  updateViewModel,
} from './OutlineView';
import {createSelection} from './OutlineSelection';

function createOutlineEditor(editorElement): OutlineEditor {
  const root = createRoot();
  const viewModel = new ViewModel(root);
  viewModel.nodeMap['#root'] = root;
  const editor = new OutlineEditor(editorElement, viewModel);
  editor._keyToDOMMap.set('#root', editorElement);
  return editor;
}

export type onChangeType = (viewModel: ViewModel) => void;

export class OutlineEditor {
  _editorElement: HTMLElement;
  _viewModel: ViewModel;
  _pendingViewModel: null | ViewModel;
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
    this._pendingViewModel = null;
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
      ['text', TextNode],
      ['root', RootNode],
      ['paragraph', ParagraphNode],
      ['header', HeaderNode],
      ['list', ListNode],
      ['listitem', ListItemNode],
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
  getViewModel(): ViewModel {
    return this._viewModel;
  }
  setViewModel(viewModel: ViewModel): void {
    updateViewModel(viewModel, this);
  }
  update(callbackFn: (view: ViewType) => void, forceSync?: boolean): boolean {
    let _pendingViewModel = this._pendingViewModel;
    let selectionNeedsInitializing = false;

    if (_pendingViewModel === null) {
      _pendingViewModel = this._pendingViewModel = cloneViewModel(
        this._viewModel,
      );
      selectionNeedsInitializing = true;
    }
    const pendingViewModel = _pendingViewModel;
    enterViewModelScope(
      (view: ViewType) => {
        if (selectionNeedsInitializing) {
          pendingViewModel.selection = createSelection(pendingViewModel, this);
        }
        callbackFn(view);
        if (pendingViewModel.hasDirtyNodes()) {
          applyTextTransforms(pendingViewModel, this);
          garbageCollectDetachedNodes(pendingViewModel);
        }
      },
      pendingViewModel,
      false,
    );
    const shouldUpdate =
      pendingViewModel.hasDirtyNodes() ||
      viewModelHasDirtySelection(pendingViewModel, this);

    if (!shouldUpdate) {
      this._pendingViewModel = null;
      return false;
    }
    if (forceSync) {
      this._pendingViewModel = null;
      updateViewModel(pendingViewModel, this);
    } else {
      Promise.resolve().then(() => {
        this._pendingViewModel = null;
        updateViewModel(pendingViewModel, this);
      });
    }
    return true;
  }
}

export function useOutlineEditor(editorElementRef: {
  current: null | HTMLElement,
}): OutlineEditor | null {
  const [editor, setOutlineEditor] = useState<null | OutlineEditor>(null);

  useEffect(() => {
    const editorElement = editorElementRef.current;

    if (editorElement !== null) {
      if (editor === null) {
        const newEditor = createOutlineEditor(editorElement);
        setOutlineEditor(newEditor);
      }
    } else if (editor !== null) {
      setOutlineEditor(null);
    }
  }, [editorElementRef, editor]);

  return editor;
}
