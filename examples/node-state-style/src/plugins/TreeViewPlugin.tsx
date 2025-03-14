/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './TreeViewPlugin.css';

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
  $getCaretRange,
  $getChildCaretOrSelf,
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
  CheckSquareIcon,
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

import {getStyleObjectDirect} from '../styleState';

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

export default function TreeViewPlugin(): JSX.Element {
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

function describeNode(node: LexicalNode): [string, React.ReactNode] {
  const key = node.getKey();
  const label = `(${key}) ${node.getType()}`;
  let reactLabel: React.ReactNode = label;
  if ($isTextNode(node)) {
    const text = node.__text;
    reactLabel = (
      <>
        {label} "
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
  return [label, reactLabel];
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
          <TreeView.ItemIndicator>
            <CheckSquareIcon />
          </TreeView.ItemIndicator>
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

function LexicalTextSelectionPaneContents({
  panelNode: node,
  panelNodeKey: nodeKey,
}: Pick<SelectedNodeState, 'panelNodeKey' | 'panelNode' | 'editorState'>) {
  if (node === null) {
    return <span>Node {nodeKey} no longer in the document</span>;
  }
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
          {Object.entries(styles).map(([k, v]) => {
            return (
              <tr key={k}>
                <td style={{textAlign: 'left'}}>{k}</td>
                <td style={{textAlign: 'left'}}>{v}</td>
              </tr>
            );
          })}
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
      ) : (
        <LexicalTextSelectionPaneContents
          panelNode={panelNode}
          panelNodeKey={panelNodeKey}
          editorState={action.editorState}
        />
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
  const collection = useEditorCollection();
  const [editor] = useLexicalComposerContext();
  const editorRef = useRef(editor);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);
  const treeView = useTreeView({
    collection,
    onSelectionChange: (details) => {
      editorRef.current.update(() => {
        if (!details.focusedValue) {
          return;
        }
        const selection = $getSelection();
        const focusNode = $getNodeByKey(details.focusedValue);
        if (
          focusNode &&
          (!selection ||
            ($isRangeSelection(selection) &&
              selection.focus.key !== focusNode.getKey()))
        ) {
          const caret = $normalizeCaret(
            $getChildCaretOrSelf($getSiblingCaret(focusNode, 'next')),
          );
          $setSelectionFromCaretRange($getCaretRange(caret, caret));
        }
      });
    },
  });
  const splitter = useSplitter({
    defaultSize: [
      {id: 'tree', size: 50},
      {id: 'node', size: 50},
    ],
  });

  return (
    <nav
      aria-label="Lexical Nodes"
      style={{borderTop: '1px solid black', fontFamily: 'monospace'}}>
      <NodeTreeViewContext.Provider value={treeView}>
        <Splitter.RootProvider value={splitter}>
          <Splitter.Panel id="tree">
            <TreeView.RootProvider value={treeView}>
              <TreeView.Label>Lexical Nodes</TreeView.Label>
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
}

function initEditorCollection(
  state: Omit<EditorCollectionState, 'collection'> &
    Partial<Pick<EditorCollectionState, 'collection'>>,
): EditorCollectionState {
  state.collection = createTreeCollection<NodeKey>({
    isNodeDisabled: () => false,
    nodeToChildren: (nodeKey) =>
      state.editorState.read(() => {
        const node = $getNodeByKey(nodeKey);
        return $isElementNode(node) ? node.getChildrenKeys() : [];
      }),
    nodeToString: (nodeKey) => nodeKey,
    nodeToValue: (nodeKey) => nodeKey,
    rootNode: 'root',
  });
  return state as EditorCollectionState;
}

function editorCollectionReducer(
  state: EditorCollectionState,
  action: Partial<EditorCollectionState>,
) {
  if (action.editor && action.editor !== state.editor) {
    return initEditorCollection({...state, ...action});
  }
  return Object.assign(state, action);
}

function useEditorCollection() {
  const [editor] = useLexicalComposerContext();
  const editorState = useEditorState();
  const [state, dispatch] = useReducer(
    editorCollectionReducer,
    {editor, editorState},
    initEditorCollection,
  );
  useEffect(() => {
    dispatch({editorState});
  }, [editorState]);
  return state.collection;
}
