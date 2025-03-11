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
  $getNodeByKey,
  $isElementNode,
  $isTextNode,
  type EditorState,
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from 'lexical';
import {
  CheckSquareIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
} from 'lucide-react';
import {
  createContext,
  Fragment,
  type JSX,
  use,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';

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
    // const icon = $isElementNode(node) ? null : $isTextNode(node) ? (
    //   <TypographyIcon />
    // ) : $isDecoratorNode(node) ? (
    //   <FileMediaIcon />
    // ) : $isLineBreakNode(node) ? (
    //   <span style={{display: 'inline-block', height: '16px', width: '16px'}}>
    //     &crarr;
    //   </span>
    // ) : null;
    let content: React.ReactNode;
    if ($isElementNode(node)) {
      content = (
        <TreeView.Branch>
          <TreeView.BranchControl>
            <TreeView.BranchText>
              <FolderIcon /> {label}
            </TreeView.BranchText>
            <TreeView.BranchIndicator>
              <ChevronRightIcon />
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
            <FileIcon />
            {label}
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

function useSelectedNode() {
  const api = useNodeTreeViewContext();
  const nodeKey = api.selectedValue.at(0) || 'root';
  return [
    nodeKey,
    useEditorState().read(() => $getNodeByKey(nodeKey)),
  ] as const;
}

function LexicalTextSelectionPane() {
  const [nodeKey, selectedNode] = useSelectedNode();
  return useMemo(() => {
    if (selectedNode === null) {
      return <span>NodeKey {nodeKey} was removed</span>;
    }
    return (
      <>
        <span>{describeNode(selectedNode)[0]}</span>
        describe it here
      </>
    );
  }, [nodeKey, selectedNode]);
}

function LexicalTreeView() {
  const collection = useEditorCollection();
  const treeView = useTreeView({collection});
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
