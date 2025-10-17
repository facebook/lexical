/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  configTypeSymbol,
  initTypeSymbol,
  LexicalExtensionInternal,
  outputTypeSymbol,
  peerDependencySymbol,
} from './internal';
import type {CreateEditorArgs, EditorState, LexicalEditor} from 'lexical';

/**
 * Any concrete {@link LexicalExtension}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any
export type AnyLexicalExtension = LexicalExtension<any, string, any, any>;
/**
 * Any {@link LexicalExtension} or {@link NormalizedLexicalExtensionArgument}
 */
export type AnyLexicalExtensionArgument =
  | AnyLexicalExtension
  | AnyNormalizedLexicalExtensionArgument;
/**
 * The default extension configuration of an empty object
 */
export type ExtensionConfigBase = Record<never, never>;
/**
 * The result of {@link declarePeerDependency}, a tuple of a peer dependency
 * name and its associated configuration.
 */
export type NormalizedPeerDependency<Extension extends AnyLexicalExtension> = [
  Extension['name'],
  Partial<LexicalExtensionConfig<Extension>> | undefined,
] & {readonly [peerDependencySymbol]?: Extension};

/**
 * A tuple of `[extension, ...configOverrides]`
 */
export type NormalizedLexicalExtensionArgument<
  Config extends ExtensionConfigBase,
  Name extends string,
  Output,
  Init,
> = [LexicalExtension<Config, Name, Output, Init>, ...Partial<Config>[]];

/**
 * Any {@link NormalizedLexicalExtensionArgument}
 */
export type AnyNormalizedLexicalExtensionArgument =
  NormalizedLexicalExtensionArgument<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any
    any,
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any
    any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any
    any
  >;

/**
 * An object that the init method can use to access the
 * configuration for extension dependencies
 */
export interface ExtensionInitState {
  /**
   * Get the result of a peerDependency by name, if it exists
   * (must be a peerDependency of this extension)
   */
  getPeer: <Dependency extends AnyLexicalExtension = never>(
    name: Dependency['name'],
  ) =>
    | undefined
    | Omit<LexicalExtensionDependency<Dependency>, 'output' | 'init'>;
  /**
   * Get the configuration of a dependency by extension
   * (must be a direct dependency of this extension)
   */
  getDependency: <Dependency extends AnyLexicalExtension>(
    dep: Dependency,
  ) => Omit<LexicalExtensionDependency<Dependency>, 'output' | 'init'>;
  /**
   * Get the names of any direct dependents of this
   * Extension, typically only used for error messages.
   */
  getDirectDependentNames: () => ReadonlySet<string>;
  /**
   * Get the names of all peer dependencies of this
   * Extension, even if they do not exist in the builder,
   * typically only used for devtools.
   */
  getPeerNameSet: () => ReadonlySet<string>;
}

export interface ExtensionBuildState<Init>
  extends Omit<ExtensionInitState, 'getPeer' | 'getDependency'> {
  /**
   * Get the result of a peerDependency by name, if it exists
   * (must be a peerDependency of this extension)
   */
  getPeer: <Dependency extends AnyLexicalExtension = never>(
    name: Dependency['name'],
  ) => undefined | LexicalExtensionDependency<Dependency>;
  /**
   * Get the configuration of a dependency by extension
   * (must be a direct dependency of this extension)
   */
  getDependency: <Dependency extends AnyLexicalExtension>(
    dep: Dependency,
  ) => LexicalExtensionDependency<Dependency>;
  /**
   * The result of the init function
   */
  getInitResult: () => Init;
}

/**
 * An object that the register method can use to detect unmount and access the
 * configuration for extension dependencies
 */
export interface ExtensionRegisterState<Init, Output>
  extends ExtensionBuildState<Init> {
  /** An AbortSignal that is aborted when this LexicalEditor registration is disposed */
  getSignal: () => AbortSignal;
  /**
   * The result of the output function
   */
  getOutput: () => Output;
}

/**
 * A {@link LexicalExtension} or {@link NormalizedLexicalExtensionArgument} (extension with config overrides)
 */
export type LexicalExtensionArgument<
  Config extends ExtensionConfigBase,
  Name extends string,
  Output,
  Init,
> =
  | LexicalExtension<Config, Name, Output, Init>
  | NormalizedLexicalExtensionArgument<Config, Name, Output, Init>;

export interface LexicalExtensionDependency<
  out Dependency extends AnyLexicalExtension,
> {
  init: LexicalExtensionInit<Dependency>;
  config: LexicalExtensionConfig<Dependency>;
  output: LexicalExtensionOutput<Dependency>;
}

/**
 * An Extension is a composable unit of LexicalEditor configuration
 * (nodes, theme, etc) used to create an editor, plus runtime behavior
 * that is registered after the editor is created.
 *
 * An Extension may depend on other Extensions, and provide functionality to other
 * extensions through its config.
 */
export interface LexicalExtension<
  Config extends ExtensionConfigBase,
  Name extends string,
  Output,
  Init,
> extends InitialEditorConfig,
    LexicalExtensionInternal<Config, Output, Init> {
  /** The name of the Extension, must be unique */
  readonly name: Name;
  /**
   * Extension names that must not be loaded with this Extension.
   * If this extension and any of the conflicting extensions are configured
   * in the same editor then a runtime error will be thrown instead of
   * creating the editor. This is used to prevent extensions with incompatible
   * and overlapping functionality from being registered concurrently, such as
   * PlainTextExtension and RichTextExtension.
   **/
  conflictsWith?: string[];
  /** Other Extensions that this Extension depends on, can also be used to configure them */
  dependencies?: AnyLexicalExtensionArgument[];
  /**
   * Other Extensions, by name, that this Extension can optionally depend on or
   * configure, if they are directly depended on by another Extension
   */
  peerDependencies?: NormalizedPeerDependency<AnyLexicalExtension>[];

  /**
   * The default configuration specific to this Extension. This Config may be
   * seen by this Extension, or any Extension that uses it as a dependency.
   *
   * The config may be mutated on register, this is particularly useful
   * for vending functionality to other Extensions that depend on this Extension.
   */
  config?: Config;

  /**
   * By default, Config is shallow merged `{...a, ...b}` with
   * {@link shallowMergeConfig}, if your Extension requires other strategies
   * (such as concatenating an Array) you can implement it here.
   *
   * @example
   * Merging an array
   * ```js
   * const extension = defineExtension({
   *   // ...
   *   mergeConfig(config, overrides) {
   *     const merged = shallowMergeConfig(config, overrides);
   *     if (Array.isArray(overrides.decorators)) {
   *       merged.decorators = [...config.decorators, ...overrides.decorators];
   *     }
   *     return merged;
   *   }
   * });
   * ```
   *
   * @param config - The current configuration
   * @param overrides - The partial configuration to merge
   * @returns The merged configuration
   */
  mergeConfig?: (config: Config, overrides: Partial<Config>) => Config;
  /**
   * Perform any necessary initialization before the editor is created,
   * this runs after all configuration overrides for both the editor this
   * this extension have been merged. May be used validate the editor
   * configuration.
   *
   * @param editorConfig - The in-progress editor configuration (mutable)
   * @param config - The merged configuration specific to this extension (mutable)
   * @param state - An object containing methods for accessing the merged
   *   configuration of dependencies and peerDependencies
   */
  init?: (
    editorConfig: InitialEditorConfig,
    config: Config,
    state: ExtensionInitState,
  ) => Init;
  /**
   * Perform any tasks that require a LexicalEditor instance, but before
   * registration has taken place. May provide output to be used by
   * dependencies or the application (commands, components, etc.).
   * This will only be run once, and any work performed by the output
   * function must not require cleanup.
   */
  build?: (
    editor: LexicalEditor,
    config: Config,
    state: ExtensionBuildState<Init>,
  ) => Output;
  /**
   * Add behavior to the editor (register transforms, listeners, etc.) after
   * the Editor is created, but before its initial state is set.
   * The register function may also mutate the config
   * in-place to expose data to other extensions that use it as a dependency.
   *
   * @param editor - The editor this Extension is being registered with
   * @param config - The merged configuration specific to this Extension
   * @param state - An object containing an AbortSignal that can be
   *   used, and methods for accessing the merged configuration of
   *   dependencies and peerDependencies
   * @returns A clean-up function
   */
  register?: (
    editor: LexicalEditor,
    config: Config,
    state: ExtensionRegisterState<Init, Output>,
  ) => () => void;

  /**
   * Run any code that must happen after initialization of the
   * editor state (which happens after all register calls).
   *
   * @param editor - The editor this Extension is being registered with
   * @param config - The merged configuration specific to this Extension
   * @param state - An object containing an AbortSignal that can be
   *   used, and methods for accessing the merged configuration of
   *   dependencies and peerDependencies
   * @returns A clean-up function
   */
  afterRegistration?: (
    editor: LexicalEditor,
    config: Config,
    state: ExtensionRegisterState<Init, Output>,
  ) => () => void;
}

/**
 * Extract the Config type from an Extension
 */
export type LexicalExtensionConfig<Extension extends AnyLexicalExtension> =
  NonNullable<Extension[configTypeSymbol]>;

/**
 * Extract the Name type from an Extension
 */
export type LexicalExtensionName<Extension extends AnyLexicalExtension> =
  Extension['name'];

/**
 * Extract the Output type from an Extension
 */
export type LexicalExtensionOutput<Extension extends AnyLexicalExtension> =
  NonNullable<Extension[outputTypeSymbol]>;

/**
 * Extract the Init type from an Extension
 */
export type LexicalExtensionInit<Extension extends AnyLexicalExtension> =
  NonNullable<Extension[initTypeSymbol]>;

/**
 * An Extension that has an OutputComponent of the given type (e.g. React.ComponentType)
 */
export type OutputComponentExtension<ComponentType> = LexicalExtension<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any config
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any name
  any,
  {Component: ComponentType},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any init
  any
>;

/**
 * A handle to the editor with an attached dispose function
 */
export interface LexicalEditorWithDispose extends LexicalEditor, Disposable {
  /**
   * Dispose the editor and perform all clean-up
   * (also available as Symbol.dispose via Disposable)
   */
  dispose: () => void;
}

/**
 * All of the possible ways to initialize $initialEditorState:
 * - `null` an empty state, the default
 * - `string` an EditorState serialized to JSON
 * - `EditorState` an EditorState that has been deserialized already (not just parsed JSON)
 * - `((editor: LexicalEditor) => void)` A function that is called with the editor for you to mutate it
 */
export type InitialEditorStateType =
  | null
  | string
  | EditorState
  | ((editor: LexicalEditor) => void);

export interface InitialEditorConfig {
  /**
   * @internal Disable root element events (for internal Meta use)
   */
  disableEvents?: CreateEditorArgs['disableEvents'];
  /**
   * Used when this editor is nested inside of another editor
   */
  parentEditor?: CreateEditorArgs['parentEditor'];
  /**
   * The namespace of this Editor. If two editors share the same
   * namespace, JSON will be the clipboard interchange format.
   * Otherwise HTML will be used.
   */
  namespace?: CreateEditorArgs['namespace'];
  /**
   * The nodes that this Extension adds to the Editor configuration, will be
   * merged with other Extensions.
   *
   * Can be a function to defer the access of the nodes to editor construction
   * which may be useful in cases when the node and extension are defined in
   * different modules and have depenendencies on each other, depending on the
   * bundler configuration.
   */
  nodes?: CreateEditorArgs['nodes'] | (() => CreateEditorArgs['nodes']);
  /**
   * EditorThemeClasses that will be deep merged with other Extensions
   */
  theme?: CreateEditorArgs['theme'];
  /**
   * Overrides for HTML serialization (exportDOM) and
   * deserialization (importDOM) that does not require subclassing and node
   * replacement
   */
  html?: CreateEditorArgs['html'];
  /**
   * Whether the initial state of the editor is editable or not
   */
  editable?: CreateEditorArgs['editable'];
  /**
   * The editor will catch errors that happen during updates and
   * reconciliation and call this. It defaults to
   * `(error) => { throw error }`.
   *
   * @param error - The Error object
   * @param editor - The editor that this error came from
   */
  onError?: (error: Error, editor: LexicalEditor) => void;
  /**
   * The initial EditorState as a JSON string, an EditorState, or a function
   * to update the editor (once).
   */
  $initialEditorState?: InitialEditorStateType;
}
