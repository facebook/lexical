/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, NodeKey} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$rootTextContentCurry} from '@lexical/text';
import {
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  TextNode,
} from 'lexical';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {$createTypeaheadNode, TypeaheadNode} from '../nodes/TypeaheadNode';

function useTypeahead(editor: LexicalEditor): void {
  const typeaheadNodeKey = useRef<NodeKey | null>(null);
  const [text, setText] = useState<string>(
    editor.getEditorState().read($rootTextContentCurry),
  );
  const [selectionCollapsed, $setSelectionCollapsed] = useState<boolean>(false);
  const server = useMemo(() => new TypeaheadServer(), []);
  const suggestion = useTypeaheadSuggestion(text, server.query);

  const getTypeaheadTextNode: () => TextNode | null = useCallback(() => {
    if (typeaheadNodeKey.current === null) {
      return null;
    }
    const node = $getNodeByKey(typeaheadNodeKey.current);
    if (!$isTextNode(node)) {
      return null;
    }
    return node;
  }, []);

  // Monitor entered text
  useEffect(() => {
    if (!editor.hasNodes([TypeaheadNode])) {
      throw new Error(
        'AutocompletePlugin: TypeaheadNode not registered on editor',
      );
    }
    return editor.registerTextContentListener((_text) => {
      setText(_text);
    });
  }, [editor]);

  const renderTypeahead = useCallback(() => {
    editor.update(
      () => {
        const currentTypeaheadNode = getTypeaheadTextNode();

        function maybeRemoveTypeahead() {
          if (currentTypeaheadNode !== null) {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const anchor = selection.anchor;
              const focus = selection.focus;
              if (anchor.type === 'text' && focus.type === 'text') {
                let anchorNode = anchor.getNode();
                let anchorNodeOffset = anchor.offset;
                if (anchorNode.getKey() === currentTypeaheadNode.getKey()) {
                  anchorNode = anchorNode.getPreviousSibling() as TextNode;
                  if ($isTextNode(anchorNode)) {
                    anchorNodeOffset = anchorNode.getTextContent().length;
                  }
                }
                let focusNode = focus.getNode();
                let focusNodeOffset = focus.offset;
                if (focusNode.getKey() === currentTypeaheadNode.getKey()) {
                  focusNode = focusNode.getPreviousSibling() as TextNode;
                  if ($isTextNode(focusNode)) {
                    focusNodeOffset = focusNode.getTextContent().length;
                  }
                }
                if ($isTextNode(focusNode) && $isTextNode(anchorNode)) {
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
          if ($isElementNode(lastParagraph)) {
            const lastTextNode = lastParagraph.getLastChild();
            if ($isTextNode(lastTextNode)) {
              const newTypeaheadNode = $createTypeaheadNode(suggestion ?? '');
              lastTextNode.insertAfter(newTypeaheadNode);
              typeaheadNodeKey.current = newTypeaheadNode.getKey();
            }
          }
        }

        const selection = $getSelection();
        let isCaretPositionAtEnd = false;

        if ($isRangeSelection(selection)) {
          const anchorNode = selection?.anchor.getNode();
          const anchorOffset = selection?.anchor.offset;
          const anchorLength = anchorNode?.getTextContentSize();
          isCaretPositionAtEnd =
            anchorLength != null && anchorOffset === anchorLength;
        }

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
        tag: 'history-merge',
      },
    );
  }, [editor, getTypeaheadTextNode, selectionCollapsed, suggestion]);

  // Rerender on suggestion change
  useEffect(() => {
    renderTypeahead();
  }, [renderTypeahead, suggestion]);

  // Rerender on editor updates
  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
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
            const typeaheadTextNode = getTypeaheadTextNode();
            const prevTextNode = typeaheadTextNode?.getPreviousSibling();
            // Make sure that the Typeahead is visible and previous child writable
            // before calling it a successfully handled event.
            if (typeaheadTextNode !== null && $isTextNode(prevTextNode)) {
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

function useTypeaheadSuggestion(
  text: string,
  // eslint-disable-next-line no-shadow
  query: (text: string) => {
    cancel: () => void;
    promise: () => Promise<string | null>;
  },
) {
  const cancelRequest = useRef<() => void>(() => null);
  const requestTime = useRef<number>(0);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  useEffect(() => {
    setSuggestion(null);
    cancelRequest.current();
    (async () => {
      const time = Date.now();
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
    'Happy ': 'birthday',
    'Happy b': 'irthday',
    'Happy bi': 'rthday',
    He: 'llo',
    Hel: 'lo',
    Hell: 'o',
    'Hello ': 'world',
    'Hello w': 'orld',
    'Hello wo': 'rld',
    'Hello wor': 'ld',
    'happy ': 'birthday',
    'happy b': 'irthday',
    'happy bi': 'rthday',
    he: 'llo',
    hel: 'lo',
    hell: 'o',
    'hello ': 'world',
    'hello w': 'orld',
    'hello wo': 'rld',
    'hello wor': 'ld',
  };
  LATENCY = 200;

  query = (
    text: string,
  ): {cancel: () => void; promise: () => Promise<string | null>} => {
    let isCancelled = false;

    const promise = (): Promise<string | null> =>
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
      cancel,
      promise,
    };
  };
}

export default function AutocompletePlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  useTypeahead(editor);

  return null;
}
