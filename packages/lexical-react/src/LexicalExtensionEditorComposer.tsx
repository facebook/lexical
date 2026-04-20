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

export interface LexicalExtensionEditorComposerProps {
  /**
   * Your root extension, typically defined with {@link defineExtension}.
   * The lifecycle of this editor is not owned by this component,
   * you are responsible for calling `initialEditor.dispose()` if needed.
   * Note also that any LexicalEditor can only be rendered to one root
   * element, so if you try and use it from multiple components
   * simultaneously then it will only be managed correctly by the last one
   * to render.
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
  const {Component} = getExtensionDependencyFromEditor(
    editor,
    ReactExtension,
  ).output;
  return <Component>{children}</Component>;
}
