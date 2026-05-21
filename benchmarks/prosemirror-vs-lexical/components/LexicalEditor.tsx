import {CodeHighlightNode, CodeNode} from '@lexical/code';
import {AutoLinkNode, LinkNode} from '@lexical/link';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {HorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {HorizontalRulePlugin} from '@lexical/react/LexicalHorizontalRulePlugin';
import {LineBreakNode, ParagraphNode} from 'lexical';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {MarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';
import ToolbarPlugin from './ToolbarPlugin';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {ListItemNode, ListNode} from '@lexical/list';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {LinkPlugin} from '@lexical/react/LexicalLinkPlugin';

const myTheme = {
  text: {
    code: 'textCode',
  },
  quote: 'quote',
  link: 'mylink',
  code: 'codeblock',
};

function onError(error: Error) {
  console.error(error);
}

const initialConfig = {
  namespace: 'MyEditor',
  theme: myTheme,
  onError,
  nodes: [
    HeadingNode,
    LinkNode,
    HorizontalRuleNode,
    CodeNode,
    QuoteNode,
    CodeHighlightNode,
    ParagraphNode,
    AutoLinkNode,
    LineBreakNode,
    ListNode,
    ListItemNode,
  ],
};

const LexicalEditor = () => {
  return (
    <div className={'editorwrapper--Lexical'}>
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <MarkdownShortcutPlugin />
        <HorizontalRulePlugin />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />

        <RichTextPlugin
          contentEditable={
            <ContentEditable className={'ContentEditable__root'} />
          }
          placeholder={<div className={'placeholder'}>Lexical editor</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </LexicalComposer>
    </div>
  );
};

export default LexicalEditor;
