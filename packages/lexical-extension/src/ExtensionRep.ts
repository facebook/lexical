/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalBuilder} from './LexicalBuilder';
import type {
  AnyLexicalExtension,
  ExtensionInitState,
  ExtensionRegisterState,
  InitialEditorConfig,
  LexicalEditor,
  LexicalExtensionConfig,
  LexicalExtensionDependency,
  LexicalExtensionInit,
  LexicalExtensionOutput,
  RegisterCleanup,
} from 'lexical';

import {shallowMergeConfig} from 'lexical';
import invariant from 'shared/invariant';

export const ExtensionRepStateIds = {
  afterInitialization: 6,
  configured: 3,
  initialized: 4,
  permanent: 2,
  registered: 5,
  temporary: 1,
  unmarked: 0,
} as const;
interface UnmarkedState {
  id: (typeof ExtensionRepStateIds)['unmarked'];
}
interface TemporaryState extends Omit<UnmarkedState, 'id'> {
  id: (typeof ExtensionRepStateIds)['temporary'];
}
interface PermanentState extends Omit<TemporaryState, 'id'> {
  id: (typeof ExtensionRepStateIds)['permanent'];
}
interface ConfiguredState<Extension extends AnyLexicalExtension>
  extends Omit<PermanentState, 'id'> {
  id: (typeof ExtensionRepStateIds)['configured'];
  config: LexicalExtensionConfig<Extension>;
  registerState: ExtensionInitState;
}
interface InitializedState<Extension extends AnyLexicalExtension>
  extends Omit<ConfiguredState<Extension>, 'id' | 'registerState'> {
  id: (typeof ExtensionRepStateIds)['initialized'];
  initResult: LexicalExtensionInit<Extension>;
  registerState: ExtensionRegisterState<LexicalExtensionInit<Extension>>;
}
interface RegisteredState<Extension extends AnyLexicalExtension>
  extends Omit<InitializedState<Extension>, 'id'> {
  id: (typeof ExtensionRepStateIds)['registered'];
  output: LexicalExtensionOutput<Extension>;
}
interface AfterInitializationState<Extension extends AnyLexicalExtension>
  extends Omit<RegisteredState<Extension>, 'id'> {
  id: (typeof ExtensionRepStateIds)['afterInitialization'];
}

export type ExtensionRepState<Extension extends AnyLexicalExtension> =
  | UnmarkedState
  | TemporaryState
  | PermanentState
  | ConfiguredState<Extension>
  | InitializedState<Extension>
  | RegisteredState<Extension>
  | AfterInitializationState<Extension>;

export function isExactlyUnmarkedExtensionRepState<
  Extension extends AnyLexicalExtension,
>(state: ExtensionRepState<Extension>): state is UnmarkedState {
  return state.id === ExtensionRepStateIds.unmarked;
}
function isExactlyTemporaryExtensionRepState<
  Extension extends AnyLexicalExtension,
>(state: ExtensionRepState<Extension>): state is TemporaryState {
  return state.id === ExtensionRepStateIds.temporary;
}
export function isExactlyPermanentExtensionRepState<
  Extension extends AnyLexicalExtension,
>(state: ExtensionRepState<Extension>): state is PermanentState {
  return state.id === ExtensionRepStateIds.permanent;
}
function isInitializedExtensionRepState<Extension extends AnyLexicalExtension>(
  state: ExtensionRepState<Extension>,
): state is
  | InitializedState<Extension>
  | RegisteredState<Extension>
  | AfterInitializationState<Extension> {
  return state.id >= ExtensionRepStateIds.initialized;
}
function isConfiguredExtensionRepState<Extension extends AnyLexicalExtension>(
  state: ExtensionRepState<Extension>,
): state is
  | ConfiguredState<Extension>
  | InitializedState<Extension>
  | RegisteredState<Extension>
  | AfterInitializationState<Extension> {
  return state.id >= ExtensionRepStateIds.configured;
}
function isRegisteredExtensionRepState<Extension extends AnyLexicalExtension>(
  state: ExtensionRepState<Extension>,
): state is RegisteredState<Extension> | AfterInitializationState<Extension> {
  return state.id >= ExtensionRepStateIds.registered;
}
function isAfterInitializationState<Extension extends AnyLexicalExtension>(
  state: ExtensionRepState<Extension>,
): state is AfterInitializationState<Extension> {
  return state.id >= ExtensionRepStateIds.afterInitialization;
}
export function applyTemporaryMark<Extension extends AnyLexicalExtension>(
  state: ExtensionRepState<Extension>,
): TemporaryState {
  invariant(
    isExactlyUnmarkedExtensionRepState(state),
    'LexicalBuilder: Can not apply a temporary mark from state id %s (expected %s unmarked)',
    String(state.id),
    String(ExtensionRepStateIds.unmarked),
  );
  return Object.assign(state, {id: ExtensionRepStateIds.temporary});
}
export function applyPermanentMark<Extension extends AnyLexicalExtension>(
  state: ExtensionRepState<Extension>,
): PermanentState {
  invariant(
    isExactlyTemporaryExtensionRepState(state),
    'LexicalBuilder: Can not apply a permanent mark from state id %s (expected %s temporary)',
    String(state.id),
    String(ExtensionRepStateIds.temporary),
  );
  return Object.assign(state, {id: ExtensionRepStateIds.permanent});
}
export function applyConfiguredState<Extension extends AnyLexicalExtension>(
  state: PermanentState,
  config: LexicalExtensionConfig<Extension>,
  registerState: ExtensionInitState,
): ConfiguredState<Extension> {
  return Object.assign(state, {
    config,
    id: ExtensionRepStateIds.configured,
    registerState,
  });
}
export function applyInitializedState<Extension extends AnyLexicalExtension>(
  state: ConfiguredState<Extension>,
  initResult: LexicalExtensionInit<Extension>,
  registerState: ExtensionRegisterState<Extension>,
): InitializedState<Extension> {
  return Object.assign(state, {
    id: ExtensionRepStateIds.initialized,
    initResult,
    registerState,
  });
}
export function applyRegisteredState<Extension extends AnyLexicalExtension>(
  state: InitializedState<Extension>,
  cleanup?: RegisterCleanup<LexicalExtensionOutput<Extension>> | undefined,
) {
  return Object.assign(state, {
    id: ExtensionRepStateIds.registered,
    output: cleanup ? cleanup.output : undefined,
  });
}
export function applyAfterInitializationState<
  Extension extends AnyLexicalExtension,
>(state: RegisteredState<Extension>): AfterInitializationState<Extension> {
  return Object.assign(state, {id: ExtensionRepStateIds.afterInitialization});
}

const emptySet: ReadonlySet<string> = new Set();

/**
 * @internal
 */
export class ExtensionRep<Extension extends AnyLexicalExtension> {
  builder: LexicalBuilder;
  configs: Set<Partial<LexicalExtensionConfig<Extension>>>;
  _dependency?: LexicalExtensionDependency<Extension>;
  _peerNameSet?: Set<string>;
  extension: Extension;
  state: ExtensionRepState<Extension>;
  constructor(builder: LexicalBuilder, extension: Extension) {
    this.builder = builder;
    this.extension = extension;
    this.configs = new Set();
    this.state = {id: ExtensionRepStateIds.unmarked};
  }

  afterInitialization(editor: LexicalEditor): undefined | (() => void) {
    const state = this.state;
    invariant(
      state.id === ExtensionRepStateIds.registered,
      'ExtensionRep: afterInitialization called in state id %s (expected %s registered)',
      String(state.id),
      String(ExtensionRepStateIds.registered),
    );
    let rval: undefined | (() => void);
    if (this.extension.afterInitialization) {
      rval = this.extension.afterInitialization(
        editor,
        state.config,
        state.registerState,
      );
    }
    this.state = applyAfterInitializationState(state);
    return rval;
  }
  register(editor: LexicalEditor): undefined | (() => void) {
    const state = this.state;
    invariant(
      state.id === ExtensionRepStateIds.initialized,
      'ExtensionRep: register called in state id %s (expected %s initialized)',
      String(state.id),
      String(ExtensionRepStateIds.initialized),
    );
    let cleanup: undefined | RegisterCleanup<LexicalExtensionOutput<Extension>>;
    if (this.extension.register) {
      cleanup = this.extension.register(
        editor,
        state.config,
        state.registerState,
      ) as RegisterCleanup<LexicalExtensionOutput<Extension>>;
    }
    this.state = applyRegisteredState(state, cleanup);
    return cleanup;
  }
  init(editorConfig: InitialEditorConfig, signal: AbortSignal) {
    const initialState = this.state;
    invariant(
      isExactlyPermanentExtensionRepState(initialState),
      'ExtensionRep: Can not configure from state id %s',
      String(initialState.id),
    );
    const initState: ExtensionInitState = {
      getDependency: this.getInitDependency.bind(this),
      getDirectDependentNames: this.getDirectDependentNames.bind(this),
      getPeer: this.getInitPeer.bind(this),
      getPeerNameSet: this.getPeerNameSet.bind(this),
      signal,
    };
    const registerState: ExtensionRegisterState<Extension> = {
      ...initState,
      getDependency: this.getDependency.bind(this),
      getInitResult: this.getInitResult.bind(this),
      getPeer: this.getPeer.bind(this),
    };
    const state = applyConfiguredState(
      initialState,
      this.mergeConfigs(),
      initState,
    );
    this.state = state;
    let initResult: LexicalExtensionInit<Extension> | undefined;
    if (this.extension.init) {
      initResult = this.extension.init(
        editorConfig,
        state.config,
        initState,
      ) as LexicalExtensionInit<Extension>;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- false positive
    this.state = applyInitializedState(state, initResult!, registerState);
  }
  getInitResult(): LexicalExtensionInit<Extension> {
    invariant(
      this.extension.init !== undefined,
      'ExtensionRep: getInitResult() called for Extension %s that does not define init',
      this.extension.name,
    );
    const state = this.state;
    invariant(
      isInitializedExtensionRepState(state),
      'ExtensionRep: getInitResult() called for ExtensionRep in state id %s < %s (initialized)',
      String(state.id),
      String(ExtensionRepStateIds.initialized),
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- any
    return state.initResult;
  }

  getInitPeer<PeerExtension extends AnyLexicalExtension = never>(
    name: PeerExtension['name'],
  ): undefined | Omit<LexicalExtensionDependency<PeerExtension>, 'output'> {
    const rep = this.builder.extensionNameMap.get(name);
    return rep ? rep.getExtensionInitDependency() : undefined;
  }

  getExtensionInitDependency(): Omit<
    LexicalExtensionDependency<Extension>,
    'output'
  > {
    const state = this.state;
    invariant(
      isConfiguredExtensionRepState(state),
      'ExtensionRep: getExtensionInitDependency called in state id %s (expected >= %s configured)',
      String(state.id),
      String(ExtensionRepStateIds.configured),
    );
    return {config: state.config};
  }

  getPeer<PeerExtension extends AnyLexicalExtension = never>(
    name: PeerExtension['name'],
  ): undefined | LexicalExtensionDependency<PeerExtension> {
    const rep = this.builder.extensionNameMap.get(name);
    return rep
      ? (rep.getExtensionDependency() as LexicalExtensionDependency<PeerExtension>)
      : undefined;
  }

  getInitDependency<Dependency extends AnyLexicalExtension>(
    dep: Dependency,
  ): Omit<LexicalExtensionDependency<Dependency>, 'output'> {
    const rep = this.builder.getExtensionRep(dep);
    invariant(
      rep !== undefined,
      'LexicalExtensionBuilder: Extension %s missing dependency extension %s to be in registry',
      this.extension.name,
      dep.name,
    );
    return rep.getExtensionInitDependency();
  }

  getDependency<Dependency extends AnyLexicalExtension>(
    dep: Dependency,
  ): LexicalExtensionDependency<Dependency> {
    const rep = this.builder.getExtensionRep(dep);
    invariant(
      rep !== undefined,
      'LexicalExtensionBuilder: Extension %s missing dependency extension %s to be in registry',
      this.extension.name,
      dep.name,
    );
    return rep.getExtensionDependency();
  }

  getState(): AfterInitializationState<Extension> {
    const state = this.state;
    invariant(
      isAfterInitializationState(state),
      'ExtensionRep getState called in state id %s (expected %s afterInitialization)',
      String(state.id),
      String(ExtensionRepStateIds.afterInitialization),
    );
    return state;
  }

  getDirectDependentNames(): ReadonlySet<string> {
    return this.builder.incomingEdges.get(this.extension.name) || emptySet;
  }

  getPeerNameSet(): ReadonlySet<string> {
    let s = this._peerNameSet;
    if (!s) {
      s = new Set(
        (this.extension.peerDependencies || []).map(([name]) => name),
      );
      this._peerNameSet = s;
    }
    return s;
  }

  getExtensionDependency(): LexicalExtensionDependency<Extension> {
    if (!this._dependency) {
      const state = this.state;
      invariant(
        isRegisteredExtensionRepState(state),
        'Extension %s used as a dependency before registration',
        this.extension.name,
      );
      this._dependency = {
        config: state.config,
        output: state.output,
      };
    }
    return this._dependency;
  }
  mergeConfigs(): LexicalExtensionConfig<Extension> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- LexicalExtensionConfig<Extension> is any
    let config: LexicalExtensionConfig<Extension> = this.extension.config || {};
    const mergeConfig = this.extension.mergeConfig
      ? this.extension.mergeConfig.bind(this.extension)
      : shallowMergeConfig;
    for (const cfg of this.configs) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- LexicalExtensionConfig<Extension> is any
      config = mergeConfig(config, cfg);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- any
    return config;
  }
}
