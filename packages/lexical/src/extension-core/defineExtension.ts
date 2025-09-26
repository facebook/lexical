/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  AnyLexicalExtension,
  ExtensionConfigBase,
  LexicalExtension,
  LexicalExtensionConfig,
  NormalizedLexicalExtensionArgument,
  NormalizedPeerDependency,
} from './types';

/**
 * @experimental
 * Define a LexicalExtension from the given object literal. TypeScript will
 * infer Config and Name in most cases, but you may want to use
 * {@link safeCast} for config if there are default fields or varying types.
 *
 * @param extension - The LexicalExtension
 * @returns The unmodified extension argument (this is only an inference helper)
 *
 * @example
 * Basic example
 * ```ts
 * export const MyExtension = defineExtension({
 *   // Extension names must be unique in an editor
 *   name: "my",
 *   nodes: [MyNode],
 * });
 * ```
 *
 * @example
 * Extension with optional configuration
 * ```ts
 * export interface ConfigurableConfig {
 *   optional?: string;
 *   required: number;
 * }
 * export const ConfigurableExtension = defineExtension({
 *   name: "configurable",
 *   // The Extension's config must satisfy the full config type,
 *   // but using the Extension as a dependency never requires
 *   // configuration and any partial of the config can be specified
 *   config: safeCast<ConfigurableConfig>({ required: 1 }),
 * });
 * ```
 *
 * @__NO_SIDE_EFFECTS__
 */
export function defineExtension<
  Config extends ExtensionConfigBase,
  Name extends string,
  Output,
  Init,
>(
  extension: LexicalExtension<Config, Name, Output, Init>,
): LexicalExtension<Config, Name, Output, Init> {
  return extension;
}

/**
 * @experimental
 * Override a partial of the configuration of an Extension, to be used
 * in the dependencies array of another extension, or as
 * an argument to {@link buildEditorFromExtensions}.
 *
 * Before building the editor, configurations will be merged using
 * `extension.mergeConfig(extension, config)` or {@link shallowMergeConfig} if
 * this is not directly implemented by the Extension.
 *
 * @param args - An extension followed by one or more config partials for that extension
 * @returns `[extension, config, ...configs]`
 *
 * @example
 * ```ts
 * export const ReactDecoratorExtension = defineExtension({
 *   name: "react-decorator",
 *   dependencies: [
 *     configExtension(ReactExtension, {
 *       decorators: [<ReactDecorator />]
 *     }),
 *   ],
 * });
 * ```
 *
 * @__NO_SIDE_EFFECTS__
 */
export function configExtension<
  Config extends ExtensionConfigBase,
  Name extends string,
  Output,
  Init,
>(
  ...args: NormalizedLexicalExtensionArgument<Config, Name, Output, Init>
): NormalizedLexicalExtensionArgument<Config, Name, Output, Init> {
  return args;
}

/**
 * @experimental
 * Used to declare a peer dependency of an extension in a type-safe way,
 * requires the type parameter. The most common use case for peer dependencies
 * is to avoid a direct import dependency, so you would want to use a
 * type import or the import type (shown in below examples).
 *
 * @param name - The extension's name
 * @param config - An optional config override
 * @returns NormalizedPeerDependency
 *
 * @example
 * ```ts
 * import type {FooExtension} from "foo";
 *
 * export const PeerExtension = defineExtension({
 *   name: 'PeerExtension',
 *   peerDependencies: [
 *     declarePeerDependency<FooExtension>("foo"),
 *     declarePeerDependency<typeof import("bar").BarExtension>("bar", {config: "bar"}),
 *   ],
 * });
 * ```
 *
 * @__NO_SIDE_EFFECTS__
 */
export function declarePeerDependency<
  Extension extends AnyLexicalExtension = never,
>(
  name: Extension['name'],
  config?: Partial<LexicalExtensionConfig<Extension>>,
): NormalizedPeerDependency<Extension> {
  return [name, config] as NormalizedPeerDependency<Extension>;
}
