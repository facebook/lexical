// @flow strict-local

import type {OutlineEditor, View, NodeKey, EditorThemeClasses} from 'outline';

import {TextNode} from 'outline';
import {useEffect, useRef, useState} from "react";

export default function useTypeahead(editor: null | OutlineEditor): void {
  // const len = useMemo(() => editor?.getTextContent(), [editor]);
  // const typeaheadNodeY = useRef<NodeKey | null>(null);

  // useEffect(() => {
  //   if (editor !== null) {
  //     return editor.addTextNodeTransform((node: TextNode, view: View) => {
  //       editor.addNodeType('typeahead', TypeaheadNode);
  //       const text = node.getParentOrThrow().getTextContent();
  //       if (text === 'he') {
  //         const typeaheadNode = createTypeaheadNode('llo world');
  //         node.insertAfter(typeaheadNode);
  //       }
  //       if (text === 'xhello world') {
  //         node.setTextContent('yhe');
  //         node.selectEnd();
  //       }
  //     });
  //   }
  // });

  useEffect(() => {
        if (editor !== null) {
          editor.addNodeType('typeahead', TypeaheadNode);

          return editor.addTextNodeTransform((node: TextNode, view: View) => {
               // Monitor entered text and cursor position
    editor.addTextNodeTransform((textNode: TextNode, view: View) => {
      const text = view.getRoot().getTextContent();
      const typeaheadTextNode = getTypeaheadTextNode(view);
      const typeaheadText = typeaheadTextNode?.getTextContent() ?? '';

      textNode.getParentBlockOrThrow().getTextContent();
      smartComposeHelper.setEnteredText(
        text.substring(0, text.length - typeaheadText.length),
      );
          });
        }
  }, [editor]);

  // useEffect(() => {
  //   if (editor !== null) {
  //     editor.addNodeType('typeahead', TypeaheadNode);

  //     return editor.addTextNodeTransform((node: TextNode, view: View) => {
  //       if (typeaheadNodeY.current !== null) {
  //         const oldTypeaheadNode = view.getNodeByKey(typeaheadNodeY.current);
  //         if (oldTypeaheadNode !== null) {
  //           oldTypeaheadNode.remove();
  //         }
  //       }

  //       const text = node.getParentOrThrow().getTextContent();

  //       // Autofill
  //       // if (text === 'he') {
  //       //   node.setTextContent('hello');
  //       //   node.selectAfter();
  //       //   return;
  //       // }

  //       // const isLast = node.getNextSibling() === null ||
  //       //   node.getNextSibling() instanceof TypeaheadNode;

  //       const typeaheadText = typeaheadSuggestion(text);
  //       if (typeaheadText !== null) {
  //         const typeaheadNode = createTypeaheadNode(typeaheadText);
  //         typeaheadNodeY.current = typeaheadNode.getKey();
  //         node.insertAfter(typeaheadNode);
  //       }

  //       // // const text = node.getTextContent();
  //       // const root = view.getRoot();
  //       // // $FlowFixMe
  //       // const lastBlock: ParagraphNode | null = root.getLastChild();
  //       // // lastBlock?.insertAfter
  //       // console.info(lastBlock?.getPreviousSiblings(), lastBlock?.isLeaf());
  //       // // last
  //     });
  //   }
  // }, [editor]);
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

function createTypeaheadNode(text: string): TypeaheadNode {
  return new TypeaheadNode(text).makeImmutable();
}

function useTypeaheadSuggestion(text: string, query:(text: string) => Promise<string | null>) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  useEffect(() => {
    // TODO race conditions
    (async () => {
      const suggestion = await query(text);
      setSuggestion(suggestion);
    })();
  },[query, text])

  return suggestion;
}

class TypeaheadServer {
  DATABASE = {
    'he': 'hello',
    'hel': 'lo',
    'hell': 'o',
    'happy ': 'birthday',
    'happy b': 'irthday',
  }
  LATENCY = 200;

  // TODO cancel query
  query(text: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const response = this.DATABASE[text] ?? null;
        resolve(response);
      }, this.LATENCY)
    });
  }
}
