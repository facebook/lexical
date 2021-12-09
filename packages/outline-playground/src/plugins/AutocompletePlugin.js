/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, NodeKey, EditorConfig} from 'outline';

import {useOutlineComposerContext} from 'outline-react/OutlineComposerContext';

import {
  isTextNode,
  isElementNode,
  TextNode,
  log,
  $getNodeByKey,
  $getSelection,
  $getRoot,
} from 'outline';
import {useEffect, useRef, useState, useCallback, useMemo} from 'react';
import {$textContentCurry} from 'outline/root';

function useTypeahead(editor: OutlineEditor): void {
  const typeaheadNodeKey = useRef<NodeKey | null>(null);
  const [text, setText] = useState<string>(
    editor.getEditorState().read($textContentCurry),
  );
  const [selectionCollapsed, $setSelectionCollapsed] = useState<boolean>(false);
  const server = useMemo(() => new TypeaheadServer(), []);
  const suggestion = useTypeaheadSuggestion(text, server.query);

  const getTypeaheadTextNode: () => TextNode | null = useCallback(() => {
    if (typeaheadNodeKey.current === null) {
      return null;
    }
    const node = $getNodeByKey(typeaheadNodeKey.current);
    if (!isTextNode(node)) {
      return null;
    }
    return node;
  }, []);

  // Monitor entered text
  useEffect(() => {
    const removeListener = editor.addListener('textcontent', (text) => {
      setText(text);
    });
    const unregisterNodes = editor.registerNodes([TypeaheadNode]);
    return () => {
      removeListener();
      unregisterNodes();
    };
  }, [editor]);

  const renderTypeahead = useCallback(() => {
    editor.update(
      () => {
        log('useTypeahead');
        const currentTypeaheadNode = getTypeaheadTextNode();

        function maybeRemoveTypeahead() {
          if (currentTypeaheadNode !== null) {
            const selection = $getSelection();
            if (selection !== null) {
              const anchor = selection.anchor;
              const focus = selection.focus;
              if (anchor.type === 'text' && focus.type === 'text') {
                let anchorNode = anchor.getNode();
                let anchorNodeOffset = anchor.offset;
                if (anchorNode.getKey() === currentTypeaheadNode.getKey()) {
                  anchorNode = anchorNode.getPreviousSibling();
                  if (isTextNode(anchorNode)) {
                    anchorNodeOffset = anchorNode.getTextContent().length;
                  }
                }
                let focusNode = focus.getNode();
                let focusNodeOffset = focus.offset;
                if (focusNode.getKey() === currentTypeaheadNode.getKey()) {
                  focusNode = focusNode.getPreviousSibling();
                  if (isTextNode(focusNode)) {
                    focusNodeOffset = focusNode.getTextContent().length;
                  }
                }
                if (isTextNode(focusNode) && isTextNode(anchorNode)) {
                  selection.setTextNodeRange(
                    anchorNode,
                    anchorNodeOffset,
                    focusNode,
                    focusNodeOffset,
                  );
                }
              }
            }
            currentTypeaheadNode.remove();
          }
          typeaheadNodeKey.current = null;
        }

        function maybeAddOrEditTypeahead() {
          if (currentTypeaheadNode !== null) {
            // Edit
            if (currentTypeaheadNode.getTextContent(true) !== suggestion) {
              currentTypeaheadNode.setTextContent(suggestion ?? '');
            }
            return;
          }
          // Add
          const lastParagraph = $getRoot().getLastChild();
          if (isElementNode(lastParagraph)) {
            const lastTextNode = lastParagraph.getLastChild();
            if (isTextNode(lastTextNode)) {
              const newTypeaheadNode = createTypeaheadNode(suggestion ?? '');
              lastTextNode.insertAfter(newTypeaheadNode);
              typeaheadNodeKey.current = newTypeaheadNode.getKey();
            }
          }
        }

        const selection = $getSelection();
        const anchorNode = selection?.anchor.getNode();
        const anchorOffset = selection?.anchor.offset;
        const anchorLength = anchorNode?.getTextContentSize();
        const isCaretPositionAtEnd =
          anchorLength != null && anchorOffset === anchorLength;
        if (
          suggestion === null ||
          !selectionCollapsed ||
          !isCaretPositionAtEnd
        ) {
          maybeRemoveTypeahead();
        } else {
          maybeAddOrEditTypeahead();
        }
      },
      {
        tag: 'without-history',
      },
    );
  }, [editor, getTypeaheadTextNode, selectionCollapsed, suggestion]);

  // Rerender on suggestion change
  useEffect(() => {
    renderTypeahead();
  }, [renderTypeahead, suggestion]);

  // Rerender on editor updates
  useEffect(() => {
    return editor.addListener('update', ({editorState}) => {
      editorState.read(() => {
        const typeaheadNode = $getRoot()
          .getAllTextNodes(true)
          .find((textNode) => textNode instanceof TypeaheadNode);
        if (typeaheadNode instanceof TypeaheadNode) {
          typeaheadNodeKey.current = typeaheadNode.getKey();
        }
      });
    });
  }, [editor]);

  // Handle Keyboard TAB or RIGHT ARROW to complete suggestion
  useEffect(() => {
    const root = editor.getRootElement();
    if (root != null) {
      const handleEvent = (event: KeyboardEvent) => {
        if (event.key === 'Tab' || event.key === 'ArrowRight') {
          editor.update(() => {
            log('useTypeahead');
            const typeaheadTextNode = getTypeaheadTextNode();
            const prevTextNode = typeaheadTextNode?.getPreviousSibling();
            // Make sure that the Typeahead is visible and previous child writable
            // before calling it a successfully handled event.
            if (typeaheadTextNode !== null && isTextNode(prevTextNode)) {
              event.preventDefault();
              prevTextNode.setTextContent(
                prevTextNode.getTextContent() +
                  typeaheadTextNode.getTextContent(true),
              );
              prevTextNode.select();
            }
            typeaheadTextNode?.remove();
            typeaheadNodeKey.current = null;
          });
        }
      };

      root.addEventListener('keydown', handleEvent);
      return () => {
        root.removeEventListener('keydown', handleEvent);
      };
    }
  }, [editor, getTypeaheadTextNode]);

  useEffect(() => {
    const handleEvent = () => {
      const selection = window.getSelection();

      $setSelectionCollapsed(selection.isCollapsed);
    };
    document.addEventListener('selectionchange', handleEvent);
    return () => {
      document.removeEventListener('selectionchange', handleEvent);
    };
  }, []);
}

class TypeaheadNode extends TextNode {
  static clone(node: TypeaheadNode) {
    return new TypeaheadNode(node.__text, node.__key);
  }

  static getType(): 'typeahead' {
    return 'typeahead';
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>) {
    const dom = super.createDOM(config);
    dom.style.cssText = 'color: #ccc;';
    return dom;
  }
}

function createTypeaheadNode(text: string): TextNode {
  return new TypeaheadNode(text).setMode('inert');
}

function useTypeaheadSuggestion(
  text: string,
  query: (text: string) => {
    promise: () => Promise<string | null>,
    cancel: () => void,
  },
) {
  const cancelRequest = useRef<() => void>(() => {});
  const requestTime = useRef<number>(0);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  useEffect(() => {
    setSuggestion(null);
    cancelRequest.current();
    (async () => {
      let time = Date.now();
      requestTime.current = time;
      try {
        const request = await query(text);
        cancelRequest.current = request.cancel;
        setSuggestion(await request.promise());
      } catch (e) {
        // Ignore for this example
      }
    })();
  }, [query, text]);

  return suggestion;
}

class TypeaheadServer {
  DATABASE = {
    he: 'llo',
    hel: 'lo',
    hell: 'o',
    He: 'llo',
    Hel: 'lo',
    Hell: 'o',
    'happy ': 'birthday',
    'happy b': 'irthday',
    'happy bi': 'rthday',
    'Happy ': 'birthday',
    'Happy b': 'irthday',
    'Happy bi': 'rthday',
    'hello ': 'world',
    'hello w': 'orld',
    'hello wo': 'rld',
    'hello wor': 'ld',
    'Hello ': 'world',
    'Hello w': 'orld',
    'Hello wo': 'rld',
    'Hello wor': 'ld',
  };
  LATENCY = 200;

  query = (
    text: string,
  ): ({promise: () => Promise<string | null>, cancel: () => void}) => {
    let isCancelled = false;

    const promise = () =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          const response = this.DATABASE[text] ?? null;
          if (!isCancelled) {
            resolve(response);
          } else {
            reject('Cancelled network request');
          }
        }, this.LATENCY);
      });

    const cancel = () => {
      isCancelled = true;
    };

    return {
      promise,
      cancel,
    };
  };
}

export default function AutocompletePlugin(): React$Node {
  const [editor] = useOutlineComposerContext();
  useTypeahead(editor);

  return null;
}
