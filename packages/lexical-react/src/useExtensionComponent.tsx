/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  AnyLexicalExtension,
  LexicalExtensionDependency,
  OutputComponentExtension,
} from 'lexical';

import {
  getExtensionDependencyFromEditor,
  getPeerDependencyFromEditor,
} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

/**
 * Returns the resolved {@link LexicalExtensionDependency} for `extension` from
 * the current editor (read from the composer context), giving access to its
 * config and output. The editor must include this extension.
 *
 * @returns The extension's dependency record.
 */
export function useExtensionDependency<Extension extends AnyLexicalExtension>(
  extension: Extension,
): LexicalExtensionDependency<Extension> {
  return getExtensionDependencyFromEditor(
    useLexicalComposerContext()[0],
    extension,
  );
}

/**
 * Like {@link useExtensionDependency}, but returns `undefined` instead of
 * throwing when `extension` is not present on the current editor. Useful for
 * optionally integrating with an extension that may or may not be configured.
 *
 * @returns The extension's dependency record, or `undefined` if absent.
 */
export function useOptionalExtensionDependency<
  Extension extends AnyLexicalExtension,
>(extension: Extension): undefined | LexicalExtensionDependency<Extension> {
  return usePeerExtensionDependency<typeof extension>(extension.name);
}

/**
 * Returns the {@link LexicalExtensionDependency} for a peer extension looked up
 * by `extensionName`, or `undefined` if no extension with that name is present
 * on the current editor. Use this when you only have the peer extension's name
 * (for example to avoid a hard dependency on its module).
 *
 * @returns The peer extension's dependency record, or `undefined` if absent.
 */
export function usePeerExtensionDependency<
  Extension extends AnyLexicalExtension,
>(
  extensionName: Extension['name'],
): undefined | LexicalExtensionDependency<Extension> {
  return getPeerDependencyFromEditor(
    useLexicalComposerContext()[0],
    extensionName,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- contravariant in props
  OutputComponent extends React.ComponentType<any>,
>(extension: OutputComponentExtension<OutputComponent>): OutputComponent {
  return useExtensionDependency(extension).output.Component;
}
