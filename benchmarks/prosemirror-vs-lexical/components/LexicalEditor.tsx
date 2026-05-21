import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {HistoryExtension} from '@lexical/history';
import {ListExtension} from '@lexical/list';
import {RichTextExtension} from '@lexical/rich-text';
import {LinkExtension} from '@lexical/link';
import {defineExtension} from 'lexical';

const myTheme = {
  text: {
    code: 'textCode',
  },
  quote: 'quote',
  link: 'mylink',
  code: 'codeblock',
};

// Mirrors the rich-text + history + list + link surface the upstream
// benchmark exercised via individual <Plugin /> components, but defined
// as an extension graph (the lexical/dev-examples shape). The benchmark
// itself only types text + Enter, so the toolbar plugin from the
// upstream repo is intentionally not wired up — it didn't participate
// in the hot path.
const editorExtension = defineExtension({
  name: 'prosemirror-vs-lexical-benchmark/Editor',
  namespace: 'MyEditor',
  theme: myTheme,
  dependencies: [
    RichTextExtension,
    HistoryExtension,
    ListExtension,
    LinkExtension,
  ],
});

const LexicalEditor = () => (
  <div className="editorwrapper--Lexical">
    <LexicalExtensionComposer
      extension={editorExtension}
      contentEditable={null}>
      <ContentEditable
        className="ContentEditable__root"
        aria-label="Lexical editor"
        aria-placeholder="Lexical editor"
        placeholder={<div className="placeholder">Lexical editor</div>}
      />
    </LexicalExtensionComposer>
  </div>
);

export default LexicalEditor;
