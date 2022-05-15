import {$ReadOnly} from 'utility-types';
import type {ElementTransformer, Transformer} from '@lexical/markdown';
import type {LexicalNode} from 'lexical';
import {registerMarkdownShortcuts, TRANSFORMERS} from '@lexical/markdown';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
} from './LexicalHorizontalRuleNode';
const HR: ElementTransformer = {
  export: (node: LexicalNode) => {
    return $isHorizontalRuleNode(node) ? '***' : null;
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _1, _2, isImport) => {
    const line = $createHorizontalRuleNode();

    // TODO: Get rid of isImport flag
    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }

    line.selectNext();
  },
  type: 'element',
};
const DEFAULT_TRANSFORMERS = [HR, ...TRANSFORMERS];

export function MarkdownShortcutPlugin({
  transformers = DEFAULT_TRANSFORMERS,
}: $ReadOnly<{
  transformers?: Array<Transformer>;
}>): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerMarkdownShortcuts(editor, transformers);
  }, [editor, transformers]);
  return null;
}