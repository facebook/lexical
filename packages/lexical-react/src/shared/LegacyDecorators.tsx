/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {LexicalBuilder} from '@lexical/extension';
import {ReactProviderExtension} from '@lexical/react/ReactProviderExtension';
import {type LexicalEditor} from 'lexical';

import {type ErrorBoundaryType, useDecorators} from './useDecorators';

export {type ErrorBoundaryType};

function isUsingReactExtension(editor: LexicalEditor): boolean {
  const builder = LexicalBuilder.maybeFromEditor(editor);
  if (!builder) {
    return false;
  }
  return builder
    ? builder.getExtensionRep(ReactProviderExtension) !== undefined
    : false;
}

function Decorators({
  editor,
  ErrorBoundary,
}: {
  editor: LexicalEditor;
  ErrorBoundary: ErrorBoundaryType;
}) {
  return useDecorators(editor, ErrorBoundary);
}

export function LegacyDecorators({
  editor,
  ErrorBoundary,
}: {
  editor: LexicalEditor;
  ErrorBoundary: ErrorBoundaryType;
}): JSX.Element | null {
  return isUsingReactExtension(editor) ? null : (
    <Decorators editor={editor} ErrorBoundary={ErrorBoundary} />
  );
}
