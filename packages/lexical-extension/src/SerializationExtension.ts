/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $isLexicalNode,
  $withSerializationContext,
  defineExtension,
  type EditorState,
  type Klass,
  type LexicalNode,
  safeCast,
  SerializationContextCompact,
  SerializationContextOverride,
  type SerializedEditorState,
  type SerializedLexicalNode,
} from 'lexical';

/**
 * A node class (which also matches its subclasses, and is the cheaper option)
 * or a type guard such as `$isTextNode`.
 *
 * @experimental
 */
export type NodeMatch<T extends LexicalNode> =
  | Klass<T>
  | ((node: LexicalNode) => node is T);

/**
 * Overrides the JSON a node exports, for the nodes matched by `nodes`.
 *
 * The override is middleware: call `$next()` for the JSON the default
 * implementation (or a lower-priority override) produces and enhance it,
 * return your own to replace it, or return `null` to omit the node — and with
 * it its subtree — from the export.
 *
 * Do not update the editor state from an override; serialization is a
 * read-only operation.
 *
 * @experimental
 */
export interface SerializationOverride<T extends LexicalNode> {
  /**
   * `'*'` for every node, or an array of `NodeClass | $isNodeGuard`. Classes
   * are matched with `instanceof`, so they also match subclasses.
   */
  readonly nodes: '*' | readonly NodeMatch<T>[];
  readonly $exportJSON: (
    node: T,
    $next: () => SerializedLexicalNode,
  ) => SerializedLexicalNode | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnySerializationOverride = SerializationOverride<any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * A convenience function for type inference when constructing JSON overrides
 * for use with {@link SerializationExtension}.
 *
 * @experimental
 * @__NO_SIDE_EFFECTS__
 */
export function jsonOverride(
  nodes: '*',
  config: Omit<SerializationOverride<LexicalNode>, 'nodes'>,
): SerializationOverride<LexicalNode>;
export function jsonOverride<T extends LexicalNode>(
  nodes: readonly NodeMatch<T>[],
  config: Omit<SerializationOverride<T>, 'nodes'>,
): SerializationOverride<T>;
export function jsonOverride(
  nodes: AnySerializationOverride['nodes'],
  config: Omit<AnySerializationOverride, 'nodes'>,
): AnySerializationOverride {
  return {...config, nodes};
}

export interface SerializationConfig {
  /**
   * Export the compact form of the document by default: a property whose value
   * equals its `json` schema default is omitted, as is the deprecated
   * `version`. Parsing restores both, so the compact and legacy forms describe
   * the same document. Defaults to false (the legacy form).
   */
  compact: boolean;
  /**
   * Overrides built with {@link jsonOverride}, highest priority first: the
   * first matching override runs outermost, and its `$next()` calls the next
   * matching one, bottoming out at the node's own `exportJSON()`.
   */
  overrides: readonly AnySerializationOverride[];
}

/** Options for a single {@link SerializationExtensionOutput.exportJSON} call. */
export interface ExportJSONOptions {
  /** Override the extension's configured `compact` for this export. */
  readonly compact?: boolean;
}

export interface SerializationExtensionOutput {
  /**
   * Serialize an editor state (the editor's current one by default) with this
   * extension's overrides and compaction applied.
   */
  exportJSON: (
    editorState?: EditorState,
    options?: ExportJSONOptions,
  ) => SerializedEditorState;
}

function matches(
  node: LexicalNode,
  nodes: AnySerializationOverride['nodes'],
): boolean {
  if (nodes === '*') {
    return true;
  }
  for (const match of nodes) {
    // Every function has a `prototype`, so a node class is told from a type
    // guard by whether that prototype is a LexicalNode. A class matches the
    // node and its subclasses; a guard is simply called.
    if (
      $isLexicalNode((match as Klass<LexicalNode>).prototype)
        ? node instanceof (match as Klass<LexicalNode>)
        : (match as (n: LexicalNode) => boolean)(node)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Compile the configured overrides into the single middleware the core
 * serialization context consults, resolving which of them apply to each node
 * and chaining their `$next` down to `node.exportJSON()`.
 */
function compileOverrides(overrides: readonly AnySerializationOverride[]) {
  if (overrides.length === 0) {
    return null;
  }
  return (
    node: LexicalNode,
    $default: () => SerializedLexicalNode,
  ): SerializedLexicalNode | null => {
    const applicable = overrides.filter(override =>
      matches(node, override.nodes),
    );
    // Build the chain from the bottom up so the first override listed ends up
    // outermost, with $next reaching the next one and finally $default.
    let $next: () => SerializedLexicalNode | null = $default;
    for (let i = applicable.length - 1; i >= 0; i--) {
      const {$exportJSON} = applicable[i];
      const $inner = $next;
      $next = () => {
        // A lower-priority override that omitted the node leaves the higher
        // one nothing to enhance, so the omission wins.
        const result = $inner();
        return result === null ? null : $exportJSON(node, () => result);
      };
    }
    return $next();
  };
}

/**
 * EXPERIMENTAL
 *
 * Controls how the editor's state is serialized to JSON: whether to write the
 * compact or the legacy form, and how individual nodes are exported (including
 * omitting or replacing them) through {@link jsonOverride} declarations.
 *
 * @example
 * ```ts
 * configExtension(SerializationExtension, {
 *   compact: true,
 *   overrides: [
 *     // never serialize comment threads
 *     jsonOverride([CommentNode], {$exportJSON: () => null}),
 *   ],
 * })
 * ```
 */
export const SerializationExtension = /* @__PURE__ */ defineExtension({
  build(editor, config): SerializationExtensionOutput {
    const override = compileOverrides(config.overrides);
    return {
      exportJSON(editorState = editor.getEditorState(), options = {}) {
        const compact =
          options.compact === undefined ? config.compact : options.compact;
        return $withSerializationContext([
          [SerializationContextCompact, compact],
          [SerializationContextOverride, override],
        ])(() => editorState.toJSON());
      },
    };
  },
  config: /* @__PURE__ */ safeCast<SerializationConfig>({compact: false, overrides: []}),
  name: '@lexical/extension/Serialization',
});
