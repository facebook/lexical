/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  AnyLexicalExtension,
  LexicalEditor,
  LexicalExtensionDependency,
} from 'lexical';

import invariant from 'shared/invariant';

import {LexicalBuilder} from './LexicalBuilder';

/**
 * Get the finalized config and output of an Extension that was used to build the editor.
 *
 * This is useful in the implementation of a LexicalNode or in other
 * situations where you have an editor reference but it's not easy to
 * pass the config or {@link ExtensionRegisterState} around.
 *
 * It will throw if the Editor was not built using this Extension.
 *
 * @param editor - The editor that was built using extension
 * @param extension - The concrete reference to an Extension used to build this editor
 * @returns The config and output for that Extension
 */
export function getExtensionDependencyFromEditor<
  Extension extends AnyLexicalExtension,
>(
  editor: LexicalEditor,
  extension: Extension,
): LexicalExtensionDependency<Extension> {
  const builder = LexicalBuilder.fromEditor(editor);
  const rep = builder.getExtensionRep(extension);
  invariant(
    rep !== undefined,
    'getExtensionDependencyFromEditor: Extension %s was not built when creating this editor',
    extension.name,
  );
  return rep.getExtensionDependency();
}
