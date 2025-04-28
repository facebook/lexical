/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './StyleViewPlugin.css';

import {useCombobox} from '@ark-ui/react/combobox';
import {Portal} from '@ark-ui/react/portal';
import {Splitter, useSplitter} from '@ark-ui/react/splitter';
import {
  createTreeCollection,
  TreeCollection,
  TreeView,
  useTreeView,
  UseTreeViewReturn,
} from '@ark-ui/react/tree-view';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {type SelectionDetails} from '@zag-js/combobox';
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
  CircleXIcon,
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
  KeyboardEventHandler,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import {Combobox, createListCollection} from '~/components/ui/combobox';

import {
  $removeStyleProperty,
  $setStyleProperty,
  getStyleObjectDirect,
  StyleObject,
  styleObjectToArray,
} from '../styleState';

const SKIP_DOM_SELECTION_TAG = 'skip-dom-selection';

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
        className="style-view-node-button"
        title={`Select ${type} node`}
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
        {reactLabel}{' '}
        <span className="style-view-node-text-contents" title={text}>
          {text}
        </span>
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
    () => new Map<keyof StyleObject, [HTMLSpanElement, AbortController]>(),
  );
  const styles = getStyleObjectDirect(node);
  const focusPropertyRef = useRef('');
  const handleAddProperty = useCallback(
    (prop: keyof StyleObject) => {
      const reg = registeredNodes.get(prop);
      if (reg) {
        reg[0].focus();
      } else {
        focusPropertyRef.current = prop;
        editor.update(() => {
          $addUpdateTag(SKIP_DOM_SELECTION_TAG);
          $setStyleProperty(node, prop, '');
        });
      }
    },
    [editor, node, registeredNodes],
  );
  const nodeRef = useRef(node);
  useEffect(() => {
    nodeRef.current = node;
  }, [node]);

  const rows = useMemo(
    () =>
      styleObjectToArray(styles).map(([k, v]) => (
        <div key={k} className="style-view-entry">
          <button
            className="style-view-node-button style-view-node-button-delete"
            title={`Remove ${k} style`}
            onClick={(e) => {
              e.preventDefault();
              editor.update(() => {
                $removeStyleProperty(nodeRef.current, k);
              });
            }}>
            <CircleXIcon />
          </button>
          <span className="style-view-key">{k}: </span>
          <span
            className="style-view-value"
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
                if (focusPropertyRef.current === k) {
                  el.focus();
                  focusPropertyRef.current = '';
                }
                el.addEventListener('keydown', (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    el.blur();
                  }
                });
                el.addEventListener(
                  'blur',
                  () => {
                    editor.update(() => {
                      $addUpdateTag(SKIP_DOM_SELECTION_TAG);
                      $setStyleProperty(
                        nodeRef.current,
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
        </div>
      )),
    [editor, registeredNodes, styles],
  );
  return (
    <div>
      <span>{describeNode(node)[1]}</span>
      <div>
        <div>
          <span className="style-view-style-heading">style</span> {'{'}
        </div>
        {rows}
        <div className="style-view-actions">
          <CSSPropertyComboBox onAddProperty={handleAddProperty} />
        </div>
        <div>{'}'}</div>
      </div>
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

function getSuggestedStyleKeys(): readonly (keyof StyleObject)[] {
  const keys = new Set<keyof StyleObject>();
  if (typeof document !== 'undefined') {
    const {style} = document.body;
    for (const k in style) {
      if (typeof style[k] === 'string') {
        const kebab = k
          .replace(/[A-Z]/g, (s) => '-' + s.toLowerCase())
          .replace(/^(webkit|moz|ms|o)-/, '-$1-')
          .replace(/^css-/, '');
        keys.add(kebab as keyof StyleObject);
      }
    }
  }
  return [...keys].sort();
}

function isNotVendorProperty(item: string): boolean {
  return !item.startsWith('-');
}

function useSuggestedStylesCombobox(props: CSSPropertyComboBoxProps) {
  const initialItems = useMemo(getSuggestedStyleKeys, []);
  const [items, setItems] = useState(() =>
    initialItems.filter(isNotVendorProperty).join('\n'),
  );
  const collection = useMemo(
    () => createListCollection({items: items.split(/\n/g)}),
    [items],
  );
  const handleInputValueChange = (
    details: Combobox.InputValueChangeDetails,
  ) => {
    const search = details.inputValue.toLowerCase();
    setItems(
      initialItems
        .filter(
          search
            ? (item) => item.toLowerCase().startsWith(search)
            : isNotVendorProperty,
        )
        .join('\n'),
    );
  };
  const handleSelect = (details: SelectionDetails) => {
    props.onAddProperty(details.itemValue as keyof StyleObject);
    combobox.setInputValue('');
  };

  const combobox = useCombobox({
    allowCustomValue: true,
    collection: collection,
    inputBehavior: 'autocomplete',
    onInputValueChange: handleInputValueChange,
    onSelect: handleSelect,
    placeholder: 'Add CSS Property',
  });
  return combobox;
}

interface CSSPropertyComboBoxProps {
  onAddProperty: (property: keyof StyleObject) => void;
}

const CSSPropertyComboBox = (props: CSSPropertyComboBoxProps) => {
  const {onAddProperty} = props;
  const combobox = useSuggestedStylesCombobox(props);
  const handleKeydown = useCallback<KeyboardEventHandler<HTMLInputElement>>(
    (event) => {
      const {inputValue} = combobox;
      if (event.key === 'Enter') {
        event.preventDefault();
        if (inputValue) {
          onAddProperty(inputValue as keyof StyleObject);
          combobox.setInputValue('');
        }
      } else if (event.key === 'Tab') {
        event.preventDefault();
        if (inputValue) {
          const [autocomplete] = combobox.collection.items;
          if (autocomplete) {
            onAddProperty(autocomplete as keyof StyleObject);
            combobox.setInputValue('');
          }
        }
      }
    },
    [combobox, onAddProperty],
  );

  return (
    <>
      <Combobox.RootProvider value={combobox} lazyMount={true}>
        <Combobox.Control>
          <Combobox.Input onKeyDown={handleKeydown} />
        </Combobox.Control>
        <Portal>
          <Combobox.Positioner>
            <Combobox.Content>
              <Combobox.ItemGroup>
                {combobox.collection.items.map((item) => (
                  <Combobox.Item key={item} item={item}>
                    <Combobox.ItemText>{item}</Combobox.ItemText>
                    <Combobox.ItemIndicator>✓</Combobox.ItemIndicator>
                  </Combobox.Item>
                ))}
              </Combobox.ItemGroup>
            </Combobox.Content>
          </Combobox.Positioner>
        </Portal>
      </Combobox.RootProvider>
    </>
  );
};

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
    <nav className="style-view-text-pane" aria-label="Lexical Nodes">
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
