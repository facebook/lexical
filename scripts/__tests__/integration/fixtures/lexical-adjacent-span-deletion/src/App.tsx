import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

import { RubyPlugin } from './RubyPlugin';

import './App.css';
import { RubyNode } from './RubyNode';
import { RbNode } from './RbNode';

const editorConfig = {
  namespace: 'MyEditor',
  editorState: JSON.stringify({
    root: {
      children: [
        {
          children: [
            {
              type: 'ruby',
              version: 1,
              children: [
                {
                  type: 'rb',
                  version: 1,
                  children: [
                    {
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: 'A',
                      type: 'text',
                      version: 1,
                    },
                    {
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: 'B',
                      type: 'text',
                      version: 1,
                    },
                    {
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: 'C',
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
            },
          ],
          direction: null,
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
        },
      ],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }),
  onError: (error: Error) => {
    console.error('Editor error:', error);
  },
  nodes: [RubyNode, RbNode],
};

function App() {
  return (
    <>
      <h1>Lexical test case</h1>
      <LexicalComposer initialConfig={editorConfig}>
        <div>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <RubyPlugin />
      </LexicalComposer>
      <p>
        The text box above uses custom nodes where each grapheme is split into a
        separate unmergeable text nodes.
      </p>
      <p>
        When trying to delete it will often get stuck because when we extend the
        selection as part of character deletion, it only extends to the start of
        the next span, not <i>into</i> it.
      </p>
      <p>
        Previously we worked around this by manually extending the selection
        (see <code>span-deletion.ts</code>) but that no longer works in Lexical
        0.27.0+ (see{' '}
        <a href="https://gist.github.com/birtles/30db078dab478a670d25fc4e2bec856f">
          analysis here
        </a>
        ).
      </p>
      <p>STR:</p>
      <ol>
        <li>Position the caret between A and B.</li>
        <li>
          Press <kbd>Del</kbd> to perform a single character forwards delete.
        </li>
        <li>
          Press <kbd>Del</kbd> again.
        </li>
      </ol>
      <p>
        <b>Expected results:</b> both B and C will be deleted.
      </p>
      <p>
        <b>Actual results:</b> often B will be deleted successfully (since the
        caret will land at the start of the B span), but C will not be deleted
        because the caret will fall at the end of the A span at that point.
      </p>
    </>
  );
}

export default App;
