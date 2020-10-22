import { useEffect, useRef } from "react";
import {
  nodeKeyToDOM,
  getNodeKeyFromDOM,
  reconcileViewModel,
  storeDOMWithNodeKey,
} from "./reconcilation";
import {
  createBodyNode,
  createBlockNode,
  createInlineNode,
  createTextNode,
  createViewModel,
  Selection,
  createPendingViewModel,
  getPendingViewModel,
} from "./state";

let activeEditorInstance = null;
let pluginPropagationStopped = false;

export function getEditorInstance() {
  if (activeEditorInstance === null) {
    throw new Error(
      "Editor methods must only be used within the plugin processing phase."
    );
  }
  return activeEditorInstance;
}

function updateViewModel() {
  const pendingViewModel = activeEditorInstance.pendingViewModel;
  const onChange = activeEditorInstance.onChange;
  reconcileViewModel(activeEditorInstance);
  activeEditorInstance.currentViewModel = pendingViewModel;
  activeEditorInstance.pendingViewModel = null;
  activeEditorInstance.mutationsTracker.clear();
  activeEditorInstance.dirtySubTreeTracker.clear();
  activeEditorInstance = null;
  if (typeof onChange === "function") {
    onChange(pendingViewModel);
  }
}

function scheduleUpdate() {
  const editorInstance = activeEditorInstance;
  editorInstance.hasUpdateBeenSceduled = true;
  activeEditorInstance = null;
  Promise.resolve().then(() => {
    activeEditorInstance = editorInstance;
    editorInstance.hasUpdateBeenSceduled = false;
    updateViewModel();
  });
}

export function beginWork(workFunction, isAsync, editorInstance) {
  if (activeEditorInstance === null) {
    activeEditorInstance = editorInstance;
    if (editorInstance.pendingViewModel === null) {
      editorInstance.pendingViewModel = createPendingViewModel(
        editorInstance.currentViewModel
      );
    }
  }
  workFunction();
  if (!isAsync || !activeEditorInstance.hasUpdateBeenSceduled) {
    const hasMutations = activeEditorInstance.mutationsTracker.size > 0;
    if (hasMutations) {
      processNodeVisitors();
      if (isAsync) {
        scheduleUpdate();
      } else {
        updateViewModel();
      }
    } else {
      activeEditorInstance = null;
    }
  }
}

export function processPlugins(pluginMethodName, arg) {
  const plugins = activeEditorInstance.plugins;
  const pluginStateMap = activeEditorInstance.pluginState;
  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i];
    const createInitialState = plugin.createInitialState;
    let pluginState = pluginStateMap.get(plugin) || null;

    if (pluginState === null && typeof createInitialState === "function") {
      pluginState = createInitialState();
      pluginStateMap.set(plugin, pluginState);
    }
    const pluginMethod = plugin[pluginMethodName];
    if (typeof pluginMethod === "function") {
      pluginMethod(arg, editor, pluginState);
    }
    if (pluginPropagationStopped) {
      pluginPropagationStopped = false;
      return;
    }
  }
}

export function processNodeVisitors() {
  const pendingViewModel = activeEditorInstance.pendingViewModel;
  const mutatedNodeKeys = Array.from(activeEditorInstance.mutationsTracker);
  const nodeMap = pendingViewModel.nodeMap;
  for (let s = 0; s < mutatedNodeKeys.length; s++) {
    const mutatedNodeKey = mutatedNodeKeys[s];
    const node = nodeMap[mutatedNodeKey];
    if (node != null) {
      if (node.isText()) {
        processPlugins("textNodeVisitor", node);
      }
    }
  }
}

export function getSelection() {
  const pendingViewModel = getPendingViewModel();
  let selection = pendingViewModel.selection;
  if (selection === null) {
    let nodeMap = pendingViewModel.nodeMap;
    const {
      anchorNode,
      anchorOffset,
      focusNode,
      focusOffset,
      isCollapsed,
    } = window.getSelection();
    const anchorKey =
      anchorNode !== null ? getNodeKeyFromDOM(anchorNode, nodeMap) : null;
    const focusKey =
      focusNode !== null ? getNodeKeyFromDOM(focusNode, nodeMap) : null;
    selection = pendingViewModel.selection = new Selection(
      anchorKey,
      anchorOffset,
      focusKey,
      focusOffset,
      isCollapsed
    );
  }
  return selection;
}

export const editor = {
  async(callback) {
    const editorInstance = activeEditorInstance;
    const asyncCallbacks = activeEditorInstance.asyncCallbacks;
    const func = function (...args) {
      asyncCallbacks.delete(func);
      if (editorInstance.hasUpdateBeenSceduled) {
        // TODO can this happen?
        throw new Error(
          "Editor.async should not clash with scheduled updates..."
        );
      }
      beginWork(
        () => {
          callback.apply(this, args);
        },
        false,
        editorInstance
      );
    };
    asyncCallbacks.add(func);
    return func;
  },
  createBlock: createBlockNode,
  createInline: createInlineNode,
  createText: createTextNode,
  getBody() {
    const pendingViewModel = getPendingViewModel();
    return pendingViewModel.body;
  },
  getSelection,
  stopPluginPropagation() {
    pluginPropagationStopped = true;
  },
};

export function useEditorInstanceRef(
  editorNodeRef,
  isReadOnly,
  onChange,
  plugins,
  viewModel
) {
  const editorInstanceRef = useRef(null);

  useEffect(() => {
    let editorInstance = editorInstanceRef.current;

    if (editorInstance === null) {
      editorInstance = editorInstanceRef.current = createEditorInstance(
        isReadOnly,
        onChange,
        plugins
      );
      if (typeof onChange === "function") {
        onChange(editorInstance.currentViewModel);
      }
    } else {
      editorInstance.isReadOnly = isReadOnly;
      editorInstance.onChange = onChange;
      editorInstance.plugins = plugins;
    }
  }, [isReadOnly, onChange, plugins]);

  useEffect(() => {
    const editorInstance = editorInstanceRef.current;

    if (editorInstance !== null && viewModel != null) {
      if (viewModel !== editorInstance.currentViewModel) {
        editorInstance.pendingViewModel = viewModel;
        updateViewModel();
      }
    }
  }, [viewModel]);

  useEffect(() => {
    const editorNode = editorNodeRef.current;
    if (editorNode !== null) {
      storeDOMWithNodeKey("body", editorNode);
    } else {
      nodeKeyToDOM.delete("body");
      editorInstanceRef.current = null;
    }
  }, [editorNodeRef]);

  return editorInstanceRef;
}

function createEditorInstance(
  isReadOnly = false,
  onChange = null,
  plugins = null
) {
  const viewModel = createViewModel();
  const body = createBodyNode();
  viewModel.body = body;
  viewModel.nodeMap.body = body;
  return new EditorInstance(isReadOnly, onChange, plugins, viewModel);
}

function EditorInstance(isReadOnly, onChange, plugins, viewModel) {
  // The currently committed view model
  this.currentViewModel = viewModel;
  // The next view model that is due to for reconcilation
  this.pendingViewModel = null;
  // Used during reconcilation
  this.asyncCallbacks = new Set();
  this.dirtySubTreeTracker = new Set();
  this.hasUpdateBeenSceduled = false;
  this.mutationsTracker = new Set();
  // Props mapped through
  this.onChange = onChange;
  this.isReadOnly = isReadOnly;
  // Plugins and their state
  this.plugins = plugins;
  this.pluginState = new Map();
}
