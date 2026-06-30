/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import invariant from '@lexical/internal/invariant';

/**
 * A registry mapping keys to a per-key activation, reference counted so the
 * activation is created on the first registration for a key and torn down
 * only when the last outstanding registration for that key is released. This
 * lets the same key be driven by more than one caller (or survive a
 * re-entrant / double registration) without double-wiring or premature
 * teardown.
 *
 * Keys are compared by identity (Map semantics), so any object works — a DOM
 * element, a `Document`, a `Window`, or an opaque handle. This is the
 * read/write surface handed to callers; owners hold the wider
 * {@link ManagedRefCountedRegistry}.
 */
export interface RefCountedRegistry<Key, Options = void> {
  /**
   * Register `key` (reference counted) and return an idempotent disposer. The
   * first registration for a key runs the activation; the disposer it returns
   * runs once the last registration for that key is released.
   *
   * `options` configure the activation and are therefore only read on the
   * activating (first) registration for a key. While a key is live, further
   * registrations share that one activation and their `options` are ignored —
   * ref counting models repeat registrations as the *same* logical thing, so
   * registering one key with conflicting options is a caller error, not a
   * merge. Release the key fully before re-registering it with new options.
   */
  register: (key: Key, options?: Options) => () => void;
}

/**
 * A {@link RefCountedRegistry} plus owner-only controls. Narrow to
 * `RefCountedRegistry` when handing the registry to callers so they only see
 * `register`.
 */
export interface ManagedRefCountedRegistry<
  Key,
  Options = void,
> extends RefCountedRegistry<Key, Options> {
  /**
   * Bind (or replace) the activation. Useful when the activation is not
   * available at construction — e.g. an extension that creates the registry
   * in its `init` phase but only learns the editor in `build`. Registering a
   * key before an activation is set throws. Replacing the activation does not
   * re-run already-active keys.
   */
  setActivate: (
    activate: (key: Key, options: Options | undefined) => () => void,
  ) => void;
  /** Dispose every live registration and clear the registry. */
  dispose: () => void;
}

/**
 * Creates a {@link ManagedRefCountedRegistry}. Pass `activate` when it is
 * known up front (the common imperative case); omit it and call
 * {@link ManagedRefCountedRegistry.setActivate} later when it is not.
 *
 * @param activate - Wires `key` and returns its teardown. Called on the first
 *   registration of each key.
 */
export function createRefCountedRegistry<Key, Options = void>(
  activate?: (key: Key, options: Options | undefined) => () => void,
): ManagedRefCountedRegistry<Key, Options> {
  interface Entry {
    // The live registrations for the key. Each registration's disposer is its
    // own token; the activation is torn down once the set empties.
    holders: Set<() => void>;
    dispose: () => void;
  }
  let activateFn:
    | ((key: Key, options: Options | undefined) => () => void)
    | null = activate || null;
  const entries = new Map<Key, Entry>();
  return {
    dispose() {
      for (const entry of entries.values()) {
        entry.dispose();
      }
      entries.clear();
      activateFn = null;
    },
    register(key, options) {
      invariant(
        activateFn !== null,
        'createRefCountedRegistry: a key was registered before an activation was set',
      );
      let entry = entries.get(key);
      if (entry === undefined) {
        entry = {dispose: activateFn(key, options), holders: new Set()};
        entries.set(key, entry);
      }
      // The disposer is its own holder token. It re-resolves the entry by key
      // so it never pins a disposed entry (and its activation cleanup) alive,
      // and so any stale release — a double call, or one after teardown or
      // re-registration — is a no-op: the live entry (if any) does not contain
      // this token, so `Set.delete` returns false. The activation is disposed
      // once the last holder releases.
      const release = () => {
        const current = entries.get(key);
        if (current === undefined || !current.holders.delete(release)) {
          return;
        }
        if (current.holders.size === 0) {
          entries.delete(key);
          current.dispose();
        }
      };
      entry.holders.add(release);
      return release;
    },
    setActivate(fn) {
      activateFn = fn;
    },
  };
}
