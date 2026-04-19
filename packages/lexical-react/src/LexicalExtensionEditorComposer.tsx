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
  /**
   * When false, this component will NOT call `initialEditor.dispose()` on
   * unmount. Use this when the editor's lifetime is managed elsewhere (for
   * example, when the editor is stored on a node and the component may be
   * remounted later to re-attach to the same editor). Defaults to true to
   * preserve the original behavior for stand-alone editors.
   */
  disposeOnUnmount?: boolean;
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
  disposeOnUnmount = true,
}: LexicalExtensionEditorComposerProps) {
  useEffect(() => {
    if (!disposeOnUnmount) {
      return undefined;
    }
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
  }, [editor, disposeOnUnmount]);
  const {Component} = getExtensionDependencyFromEditor(
    editor,
    ReactExtension,
  ).output;
  return <Component>{children}</Component>;
}
