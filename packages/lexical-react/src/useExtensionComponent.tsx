/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {ComponentProps} from 'react';

import {getExtensionDependencyFromEditor} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  type AnyLexicalExtension,
  type LexicalExtensionDependency,
  type LexicalExtensionOutput,
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

/**
 * The lexical:extension prop combined with the props of the given Extension's
 * output Component.
 */
export type UseExtensionComponentProps<Extension extends AnyLexicalExtension> =
  {
    /** The Extension */ 'lexical:extension': Extension;
  } & ([LexicalExtensionOutput<Extension>] extends [
    {
      Component: infer OutputComponentType extends React.ComponentType;
    },
  ]
    ? /** The Props from the Extension output Component */ Omit<
        ComponentProps<OutputComponentType>,
        'lexical:extension'
      >
    : never);

/**
 * A convenient way to get an Extension's output Component with {@link useExtensionComponent}
 * and construct it in one step.
 *
 * @example
 * Usage
 * ```tsx
 * return (
 *   <UseExtensionComponent
 *     lexical:extension={TreeViewExtension}
 *     viewClassName="tree-view-output" />
 * );
 * ```
 *
 * @example
 * Alternative without UseExtensionComponent
 * ```tsx
 * const TreeViewComponent = useExtensionComponent(TreeViewExtension);
 * return (<TreeViewComponent viewClassName="tree-view-output" />);
 * ```
 */
export function UseExtensionComponent<Extension extends AnyLexicalExtension>({
  'lexical:extension': extension,
  ...props
}: UseExtensionComponentProps<Extension>) {
  const Component = useExtensionComponent(extension);
  return <Component {...props} />;
}
