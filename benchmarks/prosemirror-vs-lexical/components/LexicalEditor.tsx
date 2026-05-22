import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {getExtensionDependencyFromEditor} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {ListExtension} from '@lexical/list';
import {RichTextExtension} from '@lexical/rich-text';
import {LinkExtension} from '@lexical/link';
import {configExtension, defineExtension} from 'lexical';
import {useEffect} from 'react';

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
    // Match ProseMirror's history defaults so the benchmark is comparing
    // apples to apples: prosemirror-history defaults to depth: 100 and
    // newGroupDelay: 500ms, so a continuous typing burst collapses into one
    // history event and at most 100 entries are retained.
    configExtension(HistoryExtension, {delay: 500, maxDepth: 100}),
    ListExtension,
    LinkExtension,
  ],
});

// Tiny inner component that grabs the editor handle and stashes it on
// window for the heap-probe spec. No-op in normal runs — the reference
// is the same one the React tree already holds, so it does not extend
// any object's lifetime.
function ExposeForProbe() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const w = window as unknown as {
      __lexicalEditor?: unknown;
      __lexicalHistorySnapshot?: () => unknown;
    };
    w.__lexicalEditor = editor;
    w.__lexicalHistorySnapshot = () => {
      try {
        const dep = getExtensionDependencyFromEditor(editor, HistoryExtension);
        const hs = dep.output.historyState.peek();
        return {
          ok: true,
          undoLen: hs.undoStack.length,
          redoLen: hs.redoStack.length,
          maxDepth: dep.output.maxDepth.peek(),
          delay: dep.output.delay.peek(),
        };
      } catch (err) {
        return {ok: false, error: String(err)};
      }
    };
    return () => {
      delete w.__lexicalEditor;
      delete w.__lexicalHistorySnapshot;
    };
  }, [editor]);
  return null;
}

const LexicalEditor = () => (
  <div className="editorwrapper--Lexical">
    <LexicalExtensionComposer
      extension={editorExtension}
      contentEditable={null}>
      <ExposeForProbe />
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
