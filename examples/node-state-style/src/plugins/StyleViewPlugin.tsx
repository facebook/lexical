/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './StyleViewPlugin.css';

import {Splitter, useSplitter} from '@ark-ui/react/splitter';
import {
  createTreeCollection,
  TreeCollection,
  TreeView,
  useTreeView,
  UseTreeViewReturn,
} from '@ark-ui/react/tree-view';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $addUpdateTag,
  $getCaretRange,
  $getChildCaret,
  $getNodeByKey,
  $getSelection,
  $getSiblingCaret,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  $normalizeCaret,
  $setSelectionFromCaretRange,
  type EditorState,
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from 'lexical';
import {
  ChevronRightIcon,
  CodeXmlIcon,
  CornerDownLeftIcon,
  FolderIcon,
  FolderRoot,
  TextIcon,
} from 'lucide-react';
import React, {
  createContext,
  Fragment,
  type JSX,
  use,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import {
  $setStyleProperty,
  getStyleObjectDirect,
  StyleObject,
  styleObjectToArray,
} from '../styleState';

const EditorStateContext = createContext<undefined | EditorState>(undefined);
function useEditorState() {
  const editorState = use(EditorStateContext);
  if (editorState === undefined) {
    throw new Error('Missing EditorStateContext');
  }
  return editorState;
}

const NodeTreeViewContext = createContext<
  undefined | UseTreeViewReturn<NodeKey>
>(undefined);
function useNodeTreeViewContext() {
  const ctx = use(NodeTreeViewContext);
  if (ctx === undefined) {
    throw new Error('Missing NodeTreeViewContext');
  }
  return ctx;
}

export function StyleViewPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [editorState, setEditorState] = useState(() => editor.getEditorState());
  useEffect(
    () =>
      editor.registerUpdateListener(() =>
        setEditorState(editor.getEditorState()),
      ),
    [editor],
  );
  return (
    <EditorStateContext.Provider value={editorState}>
      <LexicalTreeView />
    </EditorStateContext.Provider>
  );
}

function NodeLabel({node}: {node: LexicalNode}) {
  const [editor] = useLexicalComposerContext();
  const key = node.getKey();
  const type = node.getType();
  const reactLabel = (
    <>
      <button
        title={`Select ${type} node`}
        style={{cursor: 'pointer'}}
        onClick={(event) => {
          event.preventDefault();
          editor.update(() => {
            const caretRange = $isElementNode(node)
              ? $getCaretRange(
                  $getChildCaret(node, 'previous').getFlipped(),
                  $getChildCaret(node, 'next'),
                )
              : $getCaretRange(
                  $normalizeCaret(
                    $getSiblingCaret(node, 'previous').getFlipped(),
                  ),
                  $normalizeCaret($getSiblingCaret(node, 'next')),
                );
            $setSelectionFromCaretRange(caretRange);
          });
        }}>
        ({key})
      </button>{' '}
      {type}
    </>
  );
  if ($isTextNode(node)) {
    const text = node.__text;
    return (
      <>
        {reactLabel} "
        <span
          title={text}
          style={{
            maxWidth: '75ch',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
          {text}
        </span>
        "
      </>
    );
  }
  return reactLabel;
}

function describeNode(node: LexicalNode): [string, React.ReactNode] {
  return [`(${node.getKey()}) ${node.getType()}`, <NodeLabel node={node} />];
}

function LexicalNodeTreeViewItem(props: TreeView.NodeProviderProps<NodeKey>) {
  const id = props.node;
  const editorState = useEditorState();
  const node =
    typeof id === 'string'
      ? editorState.read(() => $getNodeByKey(id, editorState))
      : null;
  const indexPathString = JSON.stringify(props.indexPath);
  return useMemo(() => {
    if (!node) {
      return null;
    }
    const indexPath = JSON.parse(indexPathString);
    const [_ariaLabel, label] = describeNode(node);
    const nextNode = node.__next && (
      <LexicalNodeTreeViewItem
        node={node.__next}
        key={node.__next}
        indexPath={[...indexPath.slice(0, -1), (indexPath.at(-1) || 0) + 1]}
      />
    );
    const icon = $isRootNode(node) ? (
      <FolderRoot />
    ) : $isElementNode(node) ? (
      <FolderIcon />
    ) : $isTextNode(node) ? (
      <TextIcon />
    ) : $isDecoratorNode(node) ? (
      <CodeXmlIcon />
    ) : $isLineBreakNode(node) ? (
      <CornerDownLeftIcon />
    ) : null;
    let content: React.ReactNode;
    if ($isElementNode(node)) {
      content = (
        <TreeView.Branch>
          <TreeView.BranchControl>
            <TreeView.BranchText>
              {icon} {label}
            </TreeView.BranchText>
            <TreeView.BranchIndicator>
              {node.__first ? <ChevronRightIcon /> : null}
            </TreeView.BranchIndicator>
          </TreeView.BranchControl>
          <TreeView.BranchContent>
            <TreeView.BranchIndentGuide />
            {node.__first ? (
              <LexicalNodeTreeViewItem
                node={node.__first}
                key={node.__first}
                indexPath={[...indexPath, 0]}
              />
            ) : null}
          </TreeView.BranchContent>
        </TreeView.Branch>
      );
    } else {
      content = (
        <TreeView.Item>
          <TreeView.ItemText>
            {icon} {label}
          </TreeView.ItemText>
        </TreeView.Item>
      );
    }
    return (
      <Fragment>
        <TreeView.NodeProvider key={id} node={id} indexPath={indexPath}>
          {content}
        </TreeView.NodeProvider>
        {nextNode}
      </Fragment>
    );
  }, [id, node, indexPathString]);
}

function getSelectedNodeKey(
  api: UseTreeViewReturn<NodeKey>,
): undefined | NodeKey {
  return api.selectedValue.at(0);
}

interface SelectedNodeStateAction {
  panelNodeKey: undefined | NodeKey;
  editorState: EditorState;
}
interface SelectedNodeState extends SelectedNodeStateAction {
  panelNodeKey: NodeKey;
  selectionNodeKey: NodeKey | null;
  panelNode: LexicalNode | null;
  cached: React.ReactNode;
}
interface InitialSelectedNodeState extends SelectedNodeStateAction {
  selectionNodeKey?: undefined;
  panelNode?: undefined;
  cached?: undefined;
}

function LexicalTextSelectionPaneContents({node}: {node: LexicalNode}) {
  const [editor] = useLexicalComposerContext();
  const [registeredNodes] = useState(
    () => new Map<keyof StyleObject, [HTMLDivElement, AbortController]>(),
  );
  const styles = getStyleObjectDirect(node);
  return (
    <div>
      <span>{describeNode(node)[1]}</span>
      <table>
        <thead>
          <tr>
            <th style={{textAlign: 'left'}}>style</th>
            <th style={{textAlign: 'left'}}>value</th>
          </tr>
        </thead>
        <tbody>
          {styleObjectToArray(styles).map(([k, v]) => (
            <tr key={k}>
              <td style={{textAlign: 'left'}}>{k}</td>
              <td style={{textAlign: 'left'}}>
                <div
                  style={{padding: '4px'}}
                  contentEditable="plaintext-only"
                  ref={(el) => {
                    const ref = registeredNodes.get(k);
                    if (el === null) {
                      if (ref) {
                        ref[1].abort();
                      }
                      registeredNodes.delete(k);
                      return;
                    }
                    if (document.activeElement !== el) {
                      el.textContent = v || '';
                    }
                    if (!ref) {
                      const abortController = new AbortController();
                      el.addEventListener(
                        'input',
                        () => {
                          editor.update(() => {
                            $addUpdateTag('skip-dom-selection');
                            $setStyleProperty(
                              node,
                              k,
                              el.textContent || undefined,
                            );
                          });
                        },
                        {signal: abortController.signal},
                      );
                      registeredNodes.set(k, [el, abortController]);
                    }
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function initTextSelectionPaneReducer(action: SelectedNodeStateAction) {
  return textSelectionPaneReducer(action, action);
}

function textSelectionPaneReducer(
  state: InitialSelectedNodeState | SelectedNodeState,
  action: SelectedNodeStateAction,
): SelectedNodeState {
  return action.editorState.read(() => {
    const selection = $getSelection();
    const selectionNodeKey = $isRangeSelection(selection)
      ? selection.focus.key
      : null;
    const {
      // selectionNodeKey: prevSelectionNodeKey = null,
      panelNode: prevPanelNode = null,
      cached: prevCached = null,
    } = state;
    let panelNodeKey = selectionNodeKey || action.panelNodeKey;
    if (selectionNodeKey) {
      panelNodeKey = selectionNodeKey;
    } else if (!panelNodeKey) {
      panelNodeKey = 'root';
    }
    const panelNode = $getNodeByKey(panelNodeKey);
    if (panelNode === prevPanelNode && state.cached) {
      return state;
    }
    const cached =
      panelNode === prevPanelNode && prevCached ? (
        prevCached
      ) : panelNode === null ? (
        <span>Node {panelNodeKey} no longer in the document</span>
      ) : (
        <LexicalTextSelectionPaneContents key={panelNodeKey} node={panelNode} />
      );
    return {...action, cached, panelNode, panelNodeKey, selectionNodeKey};
  });
}

function LexicalTextSelectionPane() {
  const editorState = useEditorState();
  const api = useNodeTreeViewContext();
  const panelNodeKey = getSelectedNodeKey(api);
  const [state, dispatch] = useReducer(
    textSelectionPaneReducer,
    {editorState, panelNodeKey},
    initTextSelectionPaneReducer,
  );
  useEffect(() => {
    dispatch({editorState, panelNodeKey});
  }, [panelNodeKey, editorState]);
  return state.cached || null;
}

function LexicalTreeView() {
  const collectionState = useEditorCollectionState();
  const {collection, focusNodeKey} = collectionState;
  const [editor] = useLexicalComposerContext();
  const editorRef = useRef(editor);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);
  const treeView = useTreeView({
    collection,
    defaultExpandedValue: ['root'],
  });
  useEffect(() => {
    if (
      focusNodeKey !== null &&
      !treeView.expandedValue.includes(focusNodeKey)
    ) {
      treeView.expand([focusNodeKey]);
    }
  }, [treeView, focusNodeKey]);
  const splitter = useSplitter({
    defaultSize: [50, 50],
    panels: [{id: 'tree'}, {id: 'node'}],
  });

  return (
    <nav
      aria-label="Lexical Nodes"
      style={{
        fontFamily: 'monospace',
      }}>
      <NodeTreeViewContext.Provider value={treeView}>
        <Splitter.RootProvider value={splitter}>
          <Splitter.Panel id="tree">
            <TreeView.RootProvider value={treeView}>
              <TreeView.Tree>
                <LexicalNodeTreeViewItem node="root" indexPath={[]} />
              </TreeView.Tree>
            </TreeView.RootProvider>
          </Splitter.Panel>
          <Splitter.ResizeTrigger id="tree:node" />
          <Splitter.Panel id="node">
            <LexicalTextSelectionPane />
          </Splitter.Panel>
        </Splitter.RootProvider>
      </NodeTreeViewContext.Provider>
    </nav>
  );
}

interface EditorCollectionState {
  editor: LexicalEditor;
  editorState: EditorState;
  collection: TreeCollection<NodeKey>;
  focusNodeKey: null | NodeKey;
}

function nextFocusNodeKey(state: EditorCollectionState): null | NodeKey {
  return state.editorState.read(() => {
    const selection = $getSelection();
    return selection && $isRangeSelection(selection)
      ? selection.focus.getNode().getKey()
      : null;
  });
}

function initEditorCollection(
  state: Omit<EditorCollectionState, 'collection' | 'focusNodeKey'> &
    Partial<Pick<EditorCollectionState, 'collection' | 'focusNodeKey'>>,
): EditorCollectionState {
  return Object.assign(state, {
    collection: createTreeCollection<NodeKey>({
      isNodeDisabled: () => false,
      nodeToChildren: (nodeKey) =>
        state.editorState.read(() => {
          const node = $getNodeByKey(nodeKey);
          return $isElementNode(node) ? node.getChildrenKeys() : [];
        }),
      nodeToString: (nodeKey) => nodeKey,
      nodeToValue: (nodeKey) => nodeKey,
      rootNode: 'root',
    }),
    focusNodeKey: null,
  });
}

function editorCollectionReducer(
  state: EditorCollectionState,
  action: Partial<EditorCollectionState>,
) {
  let nextState = {...state, ...action};
  if (action.editor && action.editor !== state.editor) {
    nextState = initEditorCollection(nextState);
  }
  nextState.focusNodeKey = nextFocusNodeKey(nextState);
  return nextState;
}

function useEditorCollectionState() {
  const [editor] = useLexicalComposerContext();
  const editorState = useEditorState();
  const [state, dispatch] = useReducer(
    editorCollectionReducer,
    {editor, editorState},
    initEditorCollection,
  );
  useEffect(() => {
    dispatch({editor, editorState});
  }, [editor, editorState]);
  return state;
}
