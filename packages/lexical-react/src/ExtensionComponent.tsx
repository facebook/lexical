/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {ComponentProps} from 'react';

import {useExtensionComponent} from '@lexical/react/useExtensionComponent';
import {type AnyLexicalExtension, type LexicalExtensionOutput} from 'lexical';

/**
 * The lexical:extension prop combined with the props of the given Extension's
 * output Component.
 */
export type ExtensionComponentProps<Extension extends AnyLexicalExtension> = {
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
 *   <ExtensionComponent
 *     lexical:extension={TreeViewExtension}
 *     viewClassName="tree-view-output" />
 * );
 * ```
 *
 * @example
 * Alternative without ExtensionComponent
 * ```tsx
 * const TreeViewComponent = useExtensionComponent(TreeViewExtension);
 * return (<TreeViewComponent viewClassName="tree-view-output" />);
 * ```
 */
export function ExtensionComponent<Extension extends AnyLexicalExtension>({
  'lexical:extension': extension,
  ...props
}: ExtensionComponentProps<Extension>) {
  const Component = useExtensionComponent(extension);
  return <Component {...props} />;
}
