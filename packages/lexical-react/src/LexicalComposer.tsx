import {Class, $ReadOnly} from 'utility-types';
import type {LexicalComposerContextType} from './LexicalComposerContext';
import type {EditorThemeClasses, LexicalEditor, LexicalNode} from 'lexical';
import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import {createEditor} from 'lexical';
import React, {useMemo} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';
type Props = {
  children: React.ReactNode;
  initialConfig: $ReadOnly<{
    editor__DEPRECATED?: LexicalEditor | null;
    namespace?: string;
    nodes?: ReadonlyArray<Class<LexicalNode>>;
    onError: (error: Error, editor: LexicalEditor) => void;
    readOnly?: boolean;
    theme?: EditorThemeClasses;
  }>;
};

export function LexicalComposer({
  initialConfig,
  children,
}: Props): React$MixedElement {
  const composerContext = useMemo(
    () => {
      const {
        theme,
        namespace,
        editor__DEPRECATED: initialEditor,
        nodes,
        onError,
      } = initialConfig;
      const context: LexicalComposerContextType = createLexicalComposerContext(
        null,
        theme,
      );
      let editor = initialEditor || null;

      if (editor === null) {
        const newEditor = createEditor({
          namespace,
          nodes,
          onError: (error) => onError(error, newEditor),
          readOnly: true,
          theme,
        });
        editor = newEditor;
      }

      return [editor, context];
    }, // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useLayoutEffect(() => {
    const isReadOnly = initialConfig.readOnly;
    const [editor] = composerContext;
    editor.setReadOnly(isReadOnly || false); // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <LexicalComposerContext.Provider value={composerContext}>
      {children}
    </LexicalComposerContext.Provider>
  );
}