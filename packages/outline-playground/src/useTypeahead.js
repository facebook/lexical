// @flow strict-local

import type {OutlineEditor, View, NodeKey, EditorThemeClasses} from 'outline';

import {TextNode, BlockNode} from 'outline';
import {useEffect, useRef, useState, useCallback, useMemo} from 'react';

export default function useTypeahead(editor: null | OutlineEditor): void {
  const typeaheadNodeKey = useRef<NodeKey | null>(null);
  const [text, setText] = useState<string>('');
  const server = useMemo(() => new TypeaheadServer(), []);
  const suggestion = useTypeaheadSuggestion(text, server.query);

  const getTypeaheadTextNode: (view: View) => TextNode | null = useCallback(
    (view: View) => {
      if (typeaheadNodeKey.current === null) {
        return null;
      }
      const node = view.getNodeByKey(typeaheadNodeKey.current);
      if (!(node instanceof TextNode)) {
        return null;
      }
      return node;
    },
    [],
  );

  // Monitor entered text
  useEffect(() => {
    if (editor !== null) {
      return editor.addTextNodeTransform((node: TextNode, view: View) => {
        const text = view.getRoot().getTextContent() ?? '';
        setText(text);
      });
    }
  }, [editor]);

  // Monitor suggestions and trigger editor updates
  useEffect(() => {
    if (editor !== null) {
      editor.update((view: View) => {
        const typeaheadTextNode = getTypeaheadTextNode(view);
        typeaheadTextNode?.remove();
        typeaheadNodeKey.current = null;

        if (suggestion !== null) {
          const lastParagraph = view.getRoot().getLastChild();
          if (lastParagraph instanceof BlockNode) {
            const lastTextNode = lastParagraph.getLastChild();
            if (lastTextNode instanceof TextNode) {
              const newTypeaheadNode = createTypeaheadNode(suggestion);
              lastTextNode.insertAfter(newTypeaheadNode);
              typeaheadNodeKey.current = newTypeaheadNode.getKey();
            }
          }
        }
      });
    }
  }, [editor, getTypeaheadTextNode, suggestion]);

  // Handle Keyboard TAB to complete suggestion
  useEffect(() => {
    const element = editor?.getEditorElement();
    if (editor !== null && element != null) {
      const handleEvent = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          editor.update((view: View) => {
            const typeaheadTextNode = getTypeaheadTextNode(view);
            const prevTextNode = typeaheadTextNode?.getPreviousSibling();
            // Make sure that the Typeahead is visible and previous child writable
            // before calling it a succesfully handled event.
            if (
              typeaheadTextNode !== null &&
              prevTextNode instanceof TextNode
            ) {
              event.preventDefault();
              prevTextNode.setTextContent(
                prevTextNode.getTextContent() +
                  typeaheadTextNode.getTextContent(true),
              );
              prevTextNode.selectEnd();
            }
            typeaheadTextNode?.remove();
            typeaheadNodeKey.current = null;
          });
        }
      };

      element.addEventListener('keydown', handleEvent);
      return () => {
        element.removeEventListener('keydown', handleEvent);
      };
    }
  }, [editor, getTypeaheadTextNode]);
}

class TypeaheadNode extends TextNode {
  constructor(text: string, key?: NodeKey) {
    super(text, key);
    this.__type = 'typeahead';
  }

  clone() {
    const clone = new TypeaheadNode(this.__text, this.__key);
    clone.__parent = this.__parent;
    clone.__flags = this.__flags;
    return clone;
  }

  createDOM(editorThemeClasses: EditorThemeClasses) {
    const dom = super.createDOM(editorThemeClasses);
    dom.style.cssText = 'color: #ccc;';
    return dom;
  }
}

function createTypeaheadNode(text: string): TextNode {
  return new TypeaheadNode(text).makeInert();
}

function useTypeaheadSuggestion(
  text: string,
  query: (
    text: string,
  ) => {promise: () => Promise<string | null>, cancel: () => void},
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
      const request = await query(text);
      cancelRequest.current = request.cancel;
      setSuggestion(await request.promise());
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
