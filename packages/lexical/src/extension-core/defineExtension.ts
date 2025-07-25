/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  AnyLexicalExtension,
  AnyOutputArg,
  ExtensionConfigBase,
  LexicalExtension,
  LexicalExtensionConfig,
  MergeOutputs,
  NormalizedLexicalExtensionArgument,
  NormalizedPeerDependency,
  RegisterCleanup,
} from './types';

/**
 * Define a LexicalExtension from the given object literal. TypeScript will
 * infer Config and Name in most cases, but you may want to use
 * {@link safeCast} for config if there are default fields or varying types.
 *
 * @param extension - The LexicalExtension
 * @returns The unmodified extension argument (this is only an inference helper)
 *
 * @example Basic example
 * ```ts
 * export const MyExtension = defineExtension({
 *   // Extension names must be unique in an editor
 *   name: "my",
 *   nodes: [MyNode],
 * });
 * ```
 *
 * @example Extension with optional configuration
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
 * Override a partial of the configuration of an Extension, to be used
 * in the dependencies array of another extension, or as
 * an argument to {@link buildEditorFromExtensions}.
 *
 * Before building the editor, configurations will be merged using
 * extension.mergeConfig(extension, config) or {@link shallowMergeConfig} if
 * this is not directly implemented by the Extension.
 *
 * @param args - An extension followed by one or more config partials for that extension
 * @returns [extension, config, ...configs]
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
 * Provide output from the register function of an Extension
 *
 * @returns A cleanup function
 *
 * @example Provide output with no other cleanup
 * ```ts
 * // This is entirely optional and would be inferred correctly, but
 * // it can be useful for documentation!
 * export interface RegisteredAtOutput {
 *   registered_at: number;
 * }
 * export const RegisteredAtExtension = defineExtension({
 *   name: "RegisteredAt",
 *   register(editor) {
 *     return provideOutput<RegisteredAtOutput>({ registered_at: Date.now() });
 *   },
 * });
 * ```
 *
 * @example Provide output with other cleanup
 * ```ts
 * export interface UniqueCommandOutput {
 *   command: LexicalCommand<unknown>;
 * }
 * export const UniqueCommandExtension = defineExtension({
 *   name: 'UniqueCommand',
 *   register(editor) {
 *     const output: UniqueCommandOutput = {command: createCommand('UNIQUE_COMMAND')};
 *     const cleanup = registerCommand(
 *       command,
 *       (_payload) => {
 *         console.log('Unique command received!');
 *         return true;
 *       }
 *       COMMAND_PRIORITY_EDITOR
 *     );
 *     return provideOutput(output, cleanup);
 *   },
 * });
 * ```
 *
 */
export function provideOutput<Output>(
  output: Output,
  cleanup?: () => void,
): RegisterCleanup<Output> {
  return Object.assign(
    () => {
      if (cleanup) {
        cleanup();
      }
    },
    {output} as const,
  );
}

/**
 * Provide output from the register function of an Extension, merging
 * all given arguments into a single cleanup function containing the
 * merged output. See {@link provideOutput}.
 *
 * @param outputs
 * @returns A cleanup function
 */
export function mergeOutputs<Outputs extends readonly AnyOutputArg[]>(
  ...outputs: Outputs
): RegisterCleanup<MergeOutputs<Outputs>> {
  const cleanups: (() => void)[] = [];
  const output = {} as MergeOutputs<Outputs>;
  for (const maybePair of outputs) {
    if (Array.isArray(maybePair)) {
      const cleanup = maybePair[1];
      if (cleanup) {
        cleanups.push(cleanup);
      }
      Object.assign(output, maybePair[1]);
    } else {
      Object.assign(output, maybePair);
    }
  }
  return provideOutput(output, () => {
    let cleanup;
    while ((cleanup = cleanups.pop())) {
      cleanup();
    }
  });
}

/**
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
 * export const PeerExtension = defineExtension({
 *   name: 'PeerExtension',
 *   peerDependencies: [
 *     declarePeerDependency<typeof import("foo").FooExtension>("foo"),
 *     declarePeerDependency<typeof import("bar").BarExtension>("bar", {config: "bar"}),
 *   ],
 * });
 * ```
 */
export function declarePeerDependency<
  Extension extends AnyLexicalExtension = never,
>(
  name: Extension['name'],
  config?: Partial<LexicalExtensionConfig<Extension>>,
): NormalizedPeerDependency<Extension> {
  return [name, config] as NormalizedPeerDependency<Extension>;
}
