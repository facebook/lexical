import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createTextNode, EditorConfig, LexicalEditor, TextNode} from 'lexical';
import React from 'react';

export class HighlightKeywordNode extends TextNode {
  __color: string;
  __keyword: string;

  static getType() {
    return 'highlight-keyword';
  }

  static clone(node: HighlightKeywordNode): HighlightKeywordNode {
    return new HighlightKeywordNode(node.getTextContent(), node.__color);
  }

  constructor(keyword: string, color: string) {
    super(keyword);
    this.__color = color;
    this.__keyword = keyword;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const elem = super.createDOM(config);
    elem.style.color = this.__color;
    return elem;
  }
}

export function $createHighlightKeywordNode(keyword: string, color: string) {
  const node = new HighlightKeywordNode(keyword, color);
  node.setMode('token');
  return node;
}

function useHighlightKeywordsPlugin(
  editor: LexicalEditor,
  keywords: {
    [text: string]: {
      color: string,
      match: RegExp,
    },
  } = {},
) {
  const keywordsRegex = React.useMemo(
    () => new RegExp(Object.keys(keywords).join('|')),
    [keywords],
  );

  React.useEffect(() => {
    if (!editor.hasNodes([HighlightKeywordNode])) {
      throw new Error(
        'HighlightKeywordsPlugin: HighlightKeywordNode is not registered in the editor',
      );
    }

    const unsubscribe = editor.registerNodeTransform(
      TextNode,
      (node: TextNode) => {
        const text = node.getTextContent();

        if (keywordsRegex.test(text)) {
          for (const keyword of Object.keys(keywords)) {
            const {color, match: regex} = keywords[keyword];
            const len = keyword.length;
            const match = regex?.exec(text);
            const parent = node.getParent();

            if (match && parent) {
              const wordIndex = match.index;

              const highlightedNode = $createHighlightKeywordNode(
                keyword,
                color,
              );

              node.replace(highlightedNode);

              const textContentBefore = node
                .getTextContent()
                .substring(0, wordIndex);

              const textContentAfter = node
                .getTextContent()
                .substring(wordIndex + len);

              if (textContentBefore) {
                const prevSibling = $createTextNode(textContentBefore);
                highlightedNode.insertBefore(prevSibling);
              }

              if (textContentAfter) {
                const nextSibling = $createTextNode(textContentAfter);
                highlightedNode.insertAfter(nextSibling);
              }
            }
          }
        }
      },
    );

    return () => unsubscribe();
  }, [editor, keywords, keywordsRegex]);
}

function HighlightKeywordsPlugin({
  keywords,
}: {
  keywords: {
    [text: string]: {
      color: string,
      match: RegExp,
    },
  },
}) {
  const [editor] = useLexicalComposerContext();
  useHighlightKeywordsPlugin(editor, keywords);
  return null;
}

export default HighlightKeywordsPlugin;
