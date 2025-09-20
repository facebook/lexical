/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {getExtensionDependencyFromEditor} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  type AnyLexicalExtension,
  type LexicalExtensionDependency,
  type OutputComponentExtension,
} from 'lexical';

export function useExtensionDependency<Extension extends AnyLexicalExtension>(
  extension: Extension,
): LexicalExtensionDependency<Extension> {
  return getExtensionDependencyFromEditor(
    useLexicalComposerContext()[0],
    extension,
  );
}

/**
 * Use a Component from the given Extension that uses the ReactExtension convention
 * of exposing a Component property in its output.
 *
 * @param extension - An extension with a Component property in the output
 * @returns `getExtensionConfigFromEditor(useLexicalComposerContext()[0], extension).Component`
 */
export function useExtensionComponent<
  Props extends Record<never, never>,
  OutputComponent extends React.ComponentType<Props>,
  Extension extends OutputComponentExtension<OutputComponent>,
>(extension: Extension): OutputComponent {
  return useExtensionDependency(extension).output.Component;
}
