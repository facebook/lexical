/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as Tabs from '@radix-ui/react-tabs';
import ReactEditor from '@site/src/components/editors/ReactEditor';
import ToolbarEditor from '@site/src/components/editors/ToolbarEditor';
import VanillaEditor from '@site/src/components/editors/VanillaEditor';
import CodeBlock from '@theme/CodeBlock';
import {useState} from 'react';

// ===========================================================================
// Shared layout component for each example section
// ===========================================================================

function ExampleSection({title, description, tabs, children}) {
  const [activeTab, setActiveTab] = useState(tabs[0].label);

  return (
    <section className="flex flex-col gap-6 p-8">
      <div className="space-y-4 text-center">
        <h2 className="mx-auto text-3xl font-bold lg:max-w-xl lg:text-4xl">
          {title}
        </h2>
        <p className="mx-auto max-w-2xl text-sm font-light opacity-70">
          {description}
        </p>
      </div>

      <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:justify-center">
        {/* Left — tabbed code blocks */}
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List className="flex">
            {tabs.map(({label}) => (
              <Tabs.Trigger
                key={label}
                value={label}
                className={`h-8 cursor-pointer rounded-none border-none px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === label
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                    : 'bg-zinc-200 text-zinc-500 hover:text-zinc-700 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}>
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {tabs.map(({label, language, code}) => (
            <Tabs.Content key={label} value={label}>
              <div className="code-block-container-no-margin max-h-[400px] min-h-[400px] overflow-scroll rounded-b-xl lg:w-[45vw]">
                <CodeBlock language={language}>{code}</CodeBlock>
              </div>
            </Tabs.Content>
          ))}
        </Tabs.Root>

        {/* Right — live editor */}
        <div className="w-full lg:mt-8 lg:max-w-[45vw]">{children}</div>
      </div>
    </section>
  );
}

// ===========================================================================
// Section 1 — Vanilla JS
// ===========================================================================

const VANILLA_TABS = [
  {
    code: `import {registerPlainText} from '@lexical/plain-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
} from 'lexical';

const theme = {
  paragraph: 'editor-paragraph',
};

const editor = createEditor({
  namespace: 'VanillaEditor',
  onError: (error) => console.error(error),
  theme,
});

editor.setRootElement(document.getElementById('editor'));
registerPlainText(editor);

editor.update(() => {
  const root = $getRoot();
  const paragraph = $createParagraphNode();
  paragraph.append($createTextNode('This is boilerplate text...'));
  root.append(paragraph);
});`,
    label: 'index.js',
    language: 'js',
  },
  {
    code: `#editor {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  height: 400px;
  width: 100%;
  overflow-y: scroll;
  outline: none;
}

@media (max-width: 996px) {
  #editor {
    height: 200px;
  }
}

html[data-theme='dark'] #editor {
  border-color: rgba(255, 255, 255, 0.15);
}

#editor .editor-paragraph {
  margin: 0;
}`,
    label: 'styles.css',
    language: 'css',
  },
];

// ===========================================================================
// Section 2 — React Rich Text
// ===========================================================================

const REACT_TABS = [
  {
    code: `import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {isMacOs, isMobile, isTablet} from 'react-device-detect';
import './styles.css';

const theme = {
  paragraph: 'editor-paragraph',
  text: {
    bold: 'editor-textBold',
    italic: 'editor-textItalic',
    underline: 'editor-textUnderline',
  },
};

function onError(error) {
  console.error(error);
}

export default function ReactEditor() {
  const initialConfig = {
    namespace: 'PluginsEditor',
    nodes: [HeadingNode, QuoteNode],
    onError,
    theme,
  };
  const placeholderText =
    isMobile || isTablet
      ? 'Tap to edit'
      : isMacOs
        ? '⌘ + z to undo, ⌘ + shift + z to redo, ⌘ + b for bold, ⌘ + i for italic, ⌘ + u for underline'
        : 'Ctrl + z to undo, Ctrl + y to redo, Ctrl + b for bold, Ctrl + i for italic, Ctrl + u for underline';
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="plugins-editor">
        <RichTextPlugin
          ErrorBoundary={LexicalErrorBoundary}
          contentEditable={<ContentEditable className="editor-input" />}
          placeholder={
            <div className="editor-placeholder">
              {placeholderText}
            </div>
          }
        />
        <HistoryPlugin />
      </div>
    </LexicalComposer>
  );
}`,
    label: 'Editor.jsx',
    language: 'jsx',
  },
  {
    code: `.react-editor {
  position: relative;
  border: 1px solid #ddd;
  border-radius: 8px;
  height: 400px;
  width: 100%;
  overflow-y: scroll;
}

@media (max-width: 996px) {
  .react-editor {
    height: 200px;
  }
}

html[data-theme='dark'] .react-editor {
  border-color: rgba(255, 255, 255, 0.15);
}

.react-editor .editor-input {
  height: 100%;
  padding: 16px;
  outline: none;
}

.react-editor .editor-placeholder {
  position: absolute;
  top: 16px;
  left: 16px;
  pointer-events: none;
  user-select: none;
  color: #999;
}

.react-editor .editor-paragraph {
  margin: 0;
}

.react-editor .editor-textBold {
  font-weight: bold;
}

.react-editor .editor-textItalic {
  font-style: italic;
}

.react-editor .editor-textUnderline {
  text-decoration: underline;
}`,
    label: 'styles.css',
    language: 'css',
  },
];

// ===========================================================================
// Section 3 — Custom Toolbar Plugin
// ===========================================================================

const TOOLBAR_PLUGIN_TABS = [
  {
    code: `import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {$findMatchingParent, mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {useCallback, useEffect, useState} from 'react';

function applyBlockType(editor, type) {
  const factories = {
    h1: () => $createHeadingNode('h1'),
    h2: () => $createHeadingNode('h2'),
    h3: () => $createHeadingNode('h3'),
    paragraph: () => $createParagraphNode(),
    quote: () => $createQuoteNode(),
  };
  editor.update(() => {
    $setBlocksType($getSelection(), factories[type]);
  });
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor.getNode();
      const element =
        $findMatchingParent(anchor, (e) => {
          const parent = e.getParent();
          return parent !== null && $isRootOrShadowRoot(parent);
        }) || anchor.getTopLevelElementOrThrow();

      setBlockType(
        $isHeadingNode(element) ? element.getTag() : element.getType(),
      );
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({editorState}) => {
        editorState.read(() => $updateToolbar(), {editor});
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, $updateToolbar]);

  return (
    <div className="toolbar">
      <select
        value={blockType}
        onChange={(e) => applyBlockType(editor, e.target.value)}>
        <option value="paragraph">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="quote">Quote</option>
      </select>

      <div className="divider" />

      <button
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        title="Undo">
        ↩
      </button>
      <button
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        title="Redo">
        ↪
      </button>

      <div className="divider" />

      <button
        className={isBold ? 'active' : ''}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        title="Bold">
        B
      </button>
      <button
        className={isItalic ? 'active' : ''}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        title="Italic"
        style={{fontStyle: 'italic'}}>
        I
      </button>
      <button
        className={isUnderline ? 'active' : ''}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        title="Underline"
        style={{textDecoration: 'underline'}}>
        U
      </button>
    </div>
  );
}`,
    label: 'ToolbarPlugin.jsx',
    language: 'jsx',
  },
  {
    code: `import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {ToolbarPlugin} from './ToolbarPlugin';
import './styles.css';

function onError(error) {
  console.error(error);
}

const theme = {
  paragraph: 'editor-paragraph',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
  },
  quote: 'editor-quote',
  text: {
    bold: 'editor-textBold',
    italic: 'editor-textItalic',
    underline: 'editor-textUnderline',
  },
};

export default function ToolbarEditor() {
  const initialConfig = {
    namespace: 'ToolbarEditor',
    nodes: [HeadingNode, QuoteNode],
    onError,
    theme,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="toolbar-editor">
        <ToolbarPlugin />
        <div className="editor-inner">
          <RichTextPlugin
            ErrorBoundary={LexicalErrorBoundary}
            contentEditable={
              <ContentEditable
                className="editor-input"
                aria-placeholder="Enter some text..."
              />
            }
            placeholder={
              <div className="editor-placeholder">Enter some text...</div>
            }
          />
          <HistoryPlugin />
        </div>
      </div>
    </LexicalComposer>
  );
}`,
    label: 'Editor.jsx',
    language: 'jsx',
  },
  {
    code: `.toolbar-editor {
  position: relative;
  border: 1px solid #ddd;
  border-radius: 8px;
  height: 400px;
  width: 100%;
  overflow-y: scroll;
}

@media (max-width: 996px) {
  .toolbar-editor {
    height: 200px;
  }
}

html[data-theme='dark'] .toolbar-editor {
  border-color: rgba(255, 255, 255, 0.15);
}

/* Toolbar */
.toolbar-editor .toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid #e5e5e5;
  background: #fafafa;
  flex-wrap: wrap;
}

html[data-theme='dark'] .toolbar-editor .toolbar {
  border-bottom-color: rgba(255, 255, 255, 0.1);
  background: #2a2a2c;
}

.toolbar-editor .toolbar select {
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  color: inherit;
}

.toolbar-editor .toolbar select:hover {
  background-color: #e5e5e5;
}

html[data-theme='dark'] .toolbar-editor .toolbar select:hover {
  background-color: #3a3a3c;
}

.toolbar-editor .toolbar .divider {
  width: 1px;
  align-self: stretch;
  margin: 0 4px;
  background: #e5e5e5;
}

html[data-theme='dark'] .toolbar-editor .toolbar .divider {
  background: rgba(255, 255, 255, 0.15);
}

.toolbar-editor .toolbar button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: inherit;
  transition: background-color 0.15s;
}

.toolbar-editor .toolbar button:hover:not(:disabled) {
  background-color: #e5e5e5;
}

html[data-theme='dark'] .toolbar-editor .toolbar button:hover:not(:disabled) {
  background-color: #3a3a3c;
}

.toolbar-editor .toolbar button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.toolbar-editor .toolbar button.active {
  background-color: #dbeafe;
}

html[data-theme='dark'] .toolbar-editor .toolbar button.active {
  background-color: rgba(59, 130, 246, 0.25);
}

/* Content area */
.toolbar-editor .editor-inner {
  position: relative;
  height: 100%;
}

.toolbar-editor .editor-input {
  height: 100%;
  padding: 16px;
  outline: none;
}

.toolbar-editor .editor-placeholder {
  position: absolute;
  top: 16px;
  left: 16px;
  pointer-events: none;
  user-select: none;
  color: #999;
}

/* Content styles */
.toolbar-editor .editor-paragraph { margin: 0; }
.toolbar-editor .editor-heading-h1 { font-size: 1.875rem; font-weight: bold; margin-bottom: 0.5rem; }
.toolbar-editor .editor-heading-h2 { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; }
.toolbar-editor .editor-heading-h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.25rem; }
.toolbar-editor .editor-quote { border-left: 4px solid #ccc; padding-left: 16px; font-style: italic; color: #666; margin: 0.5rem 0; }
html[data-theme='dark'] .toolbar-editor .editor-quote { border-left-color: #555; color: #aaa; }
.toolbar-editor .editor-textBold { font-weight: bold; }
.toolbar-editor .editor-textItalic { font-style: italic; }
.toolbar-editor .editor-textUnderline { text-decoration: underline; }`,
    label: 'styles.css',
    language: 'css',
  },
];

// ===========================================================================
// Main component — all 4 sections
// ===========================================================================

const SECTIONS = [
  {
    description:
      "Lexical can be used with Vanilla JavaScript. You don't need libraries or frameworks. Just create an editor, attach it to a DOM element, and start editing.",
    editor: <VanillaEditor />,
    tabs: VANILLA_TABS,
    title: (
      <>
        Lexical is <span className="text-gradient">framework agnostic</span>
      </>
    ),
  },
  {
    description:
      'Lexical provides React components and Plugins that make it easy to build editors. We are using the RichText and History plugins in this example.',
    editor: <ReactEditor />,
    tabs: REACT_TABS,
    title: (
      <>
        Are you a <span className="text-gradient">React</span> fan?
      </>
    ),
  },
  {
    description:
      "Create custom functionality by listening to and dispatching commands. Here's a toolbar plugin that adds formatting controls.",
    editor: <ToolbarEditor />,
    tabs: TOOLBAR_PLUGIN_TABS,
    title: (
      <>
        Build your <span className="text-gradient">own</span> plugin
      </>
    ),
  },
];

export default function HomepageExamples() {
  return (
    <div className="space-y-16 sm:space-y-36">
      {SECTIONS.map((section, index) => (
        <ExampleSection
          key={index}
          title={section.title}
          description={section.description}
          tabs={section.tabs}>
          {section.editor}
        </ExampleSection>
      ))}
    </div>
  );
}
