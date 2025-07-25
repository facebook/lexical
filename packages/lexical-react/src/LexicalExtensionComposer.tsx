/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {ReactConfig, ReactExtension} from '@lexical/react/ReactExtension';
import {ReactProviderExtension} from '@lexical/react/ReactProviderExtension';
import {
  type AnyLexicalExtensionArgument,
  configExtension,
  scheduleMicroTask,
} from 'lexical';
import {useEffect, useMemo} from 'react';

export interface LexicalExtensionComposerProps {
  /**
   * Your root extension, typically defined with {@link defineExtension}
   */
  extension: AnyLexicalExtensionArgument;
  /**
   * Any children will have access to useLexicalComposerContext (e.g. for React plug-ins or UX)
   */
  children: React.ReactNode;
  /**
   * Override the default ContentEditable that is rendered as the first child of the
   * composer. If this is null, then it is your responsibility to render a ContentEditable
   * elsewhere in the tree. This is equivalent to
   * `configExtension(ReactExtension, {contentEditable})` in your extension dependencies.
   */
  contentEditable?: ReactConfig['contentEditable'];
}

/**
 * The equivalent of LexicalComposer for an extension. Make sure that your extension
 * argument is stable (e.g. using module scope or useMemo) so
 * that you are not re-creating the editor on every render!
 *
 * @example Module scoped extension
 * ```tsx
 * const extension = defineExtension({
 *   name: "[root]",
 *   dependencies: [RichTextExtension, HistoryExtension, EmojiExtension]
 * });
 * function MyEditor({ children }) {
 *   return (<LexicalExtensionComposer extension={extension}>{children}</LexicalExtensionComposer>);
 * }
 * ```
 *
 * @example useMemo extension
 * ```tsx
 * function MyEditor({ emojiBaseUrl, children }) {
 *   const extension = useMemo(() => {
 *     return defineExtension({
 *       name: "[root]",
 *       dependencies: [
 *         RichTextExtension,
 *         HistoryExtension,
 *         configExtension(EmojiExtension, { emojiBaseUrl }),
 *       ],
 *     });
 *   }, [emojiBaseUrl]);
 *   return (<LexicalExtensionComposer extension={extension}>{children}</LexicalExtensionComposer>);
 * }
 * ```
 *
 * @example Incorrect usage with unstable extension
 * ```tsx
 * function MyBrokenEditor({ emojiBaseUrl }) {
 *   // This argument is not stable, the editor is re-created every render and
 *   // all state is lost!
 *   const extension = defineExtension({
 *     name: "[root]",
 *     dependencies: [RichTextExtension, HistoryExtension, EmojiExtension]
 *   });
 *   return (<LexicalExtensionComposer extension={extension}>{children}</LexicalExtensionComposer>);
 * }
 * ```
 */
export function LexicalExtensionComposer({
  extension,
  children,
  contentEditable,
}: LexicalExtensionComposerProps) {
  const editor = useMemo(
    () =>
      buildEditorFromExtensions(
        ReactProviderExtension,
        configExtension(
          ReactExtension,
          contentEditable === undefined ? {} : {contentEditable},
        ),
        extension,
      ),
    [extension, contentEditable],
  );
  useEffect(() => {
    // This is an awful trick to detect StrictMode so we don't dispose the
    // editor that we just created
    let didMount = false;
    scheduleMicroTask(() => {
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
