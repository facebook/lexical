/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {getExtensionDependencyFromEditor} from '@lexical/extension';
import {ReactExtension} from '@lexical/react/ReactExtension';
import {LexicalEditorWithDispose} from 'lexical';
import {useEffect} from 'react';

export interface LexicalExtensionEditorComposerProps {
  /**
   * Your root extension, typically defined with {@link defineExtension}
   */
  initialEditor: LexicalEditorWithDispose;
  /**
   * Any children will have access to useLexicalComposerContext (e.g. for React plug-ins or UX)
   */
  children?: React.ReactNode;
}

/**
 * The equivalent of LexicalComposer for an editor that was already built for
 * extensions, typically used with nested editors.
 *
 * Make sure that your initialEditor argument is stable (e.g. using module scope or useMemo) so
 * that you are not re-creating the editor on every render! The editor should be built with
 * ReactProviderExtension and ReactExtension dependencies.
 */
export function LexicalExtensionEditorComposer({
  initialEditor: editor,
  children,
}: LexicalExtensionEditorComposerProps) {
  useEffect(() => {
    // Strict mode workaround
    let didMount = false;
    queueMicrotask(() => {
      didMount = true;
    });
    return () => {
      if (didMount) {
        editor.dispose();
      }
    };
  }, [editor]);
  const {Component} = getExtensionDependencyFromEditor(
    editor,
    ReactExtension,
  ).output;
  return <Component>{children}</Component>;
}
