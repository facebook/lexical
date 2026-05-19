/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  ChildSchema,
  DOMImportContext,
  ImportChildrenOpts,
  ImportNodeOpts,
  ImportSession,
  ImportStateConfig,
} from './types';

import {isDOMDocumentNode, type LexicalEditor, type LexicalNode} from 'lexical';

import {
  type CompiledDispatch,
  type CompiledRule,
  getDispatchIndices,
} from './compileImportRules';
import {
  $getImportContextValue,
  $withImportContext,
  ImportSessionImpl,
} from './ImportContext';
import {applySchema, RootSchema} from './schemas';

const NO_CAPTURES: Record<string, RegExpMatchArray> = Object.freeze(
  {} as Record<string, RegExpMatchArray>,
);

interface Runtime {
  readonly dispatch: CompiledDispatch;
  readonly editor: LexicalEditor;
  readonly session: ImportSession;
}

function makeContext(
  runtime: Runtime,
  captures: Readonly<Record<string, RegExpMatchArray>>,
): DOMImportContext<Record<string, RegExpMatchArray>> {
  const ctx: DOMImportContext<Record<string, RegExpMatchArray>> = {
    $importChildren: (parent, opts) =>
      $importChildrenInternal(runtime, parent, opts),
    $importOne: (node, opts) => $importOneInternal(runtime, node, opts),
    captures,
    editor: runtime.editor,
    get<V>(cfg: ImportStateConfig<V>): V {
      return $getImportContextValue(cfg, runtime.editor);
    },
    session: runtime.session,
  };
  return ctx;
}

function $importChildrenInternal(
  runtime: Runtime,
  parent: ParentNode,
  opts: ImportChildrenOpts | undefined,
): LexicalNode[] {
  const run = () => $importChildrenRun(runtime, parent, opts);
  return opts && opts.context
    ? $withImportContext(opts.context, runtime.editor)(run)
    : run();
}

function $importChildrenRun(
  runtime: Runtime,
  parent: ParentNode,
  opts: ImportChildrenOpts | undefined,
): LexicalNode[] {
  const onChild = opts && opts.$onChild;
  const collected: LexicalNode[] = [];
  for (const child of Array.from(parent.childNodes)) {
    const produced = $importOneInternal(runtime, child, undefined);
    for (const lex of produced) {
      const result = onChild ? onChild(lex) : lex;
      if (result != null) {
        collected.push(result);
      }
    }
  }
  const afterApplied = opts && opts.$after ? opts.$after(collected) : collected;
  const schema: ChildSchema | undefined = opts && opts.schema;
  if (!schema) {
    return afterApplied;
  }
  return applySchema(schema, afterApplied, null, parent);
}

function $importOneInternal(
  runtime: Runtime,
  node: Node,
  opts: ImportNodeOpts | undefined,
): LexicalNode[] {
  const run = () => $dispatch(runtime, node);
  const out =
    opts && opts.context
      ? $withImportContext(opts.context, runtime.editor)(run)
      : run();
  // Surface to callers as a mutable array per the DOMImportContext contract.
  return out as LexicalNode[];
}

function $dispatch(runtime: Runtime, node: Node): readonly LexicalNode[] {
  const indices = getDispatchIndices(runtime.dispatch, node);
  if (indices.length === 0) {
    return $hoistChildrenOf(runtime, node);
  }
  let cursor = 0;
  const $next = (): readonly LexicalNode[] => {
    while (cursor < indices.length) {
      const idx = indices[cursor++];
      const rule: CompiledRule = runtime.dispatch.rules[idx];
      const captures: Record<string, RegExpMatchArray> = {};
      if (rule.predicate(node, captures)) {
        const ctx = makeContext(
          runtime,
          Object.keys(captures).length === 0 ? NO_CAPTURES : captures,
        );
        try {
          return rule.$import(ctx, node, $next);
        } catch (e) {
          if (__DEV__) {
            console.error(
              `[lexical] DOM import rule "${rule.name}" threw on node`,
              node,
              e,
            );
          }
          throw e;
        }
      }
    }
    return $hoistChildrenOf(runtime, node);
  };
  return $next();
}

/**
 * Fallback when no rule matched and `$next()` was called past the end of the
 * chain: hoist the element's children to take its place, recursively. Pure
 * elements with no rule become invisible, matching the legacy
 * `$createNodesFromDOM` hoisting behavior.
 */
function $hoistChildrenOf(runtime: Runtime, node: Node): LexicalNode[] {
  if (!('childNodes' in node)) {
    return [];
  }
  const parent = node as ParentNode;
  if (parent.childNodes.length === 0) {
    return [];
  }
  const collected: LexicalNode[] = [];
  for (const child of Array.from(parent.childNodes)) {
    const produced = $importOneInternal(runtime, child, undefined);
    for (const lex of produced) {
      collected.push(lex);
    }
  }
  return collected;
}

/**
 * Top-level walker for a compiled dispatcher. Iterates the DOM children of
 * `dom` (using the document body if a {@link Document} is passed) and
 * applies `RootSchema` to the produced lexical nodes so runs of inlines are
 * wrapped in paragraphs — same shape as the legacy `$generateNodesFromDOM`.
 *
 * @internal
 */
export function $runImport(
  dispatch: CompiledDispatch,
  editor: LexicalEditor,
  dom: Document | ParentNode,
): LexicalNode[] {
  const runtime: Runtime = {dispatch, editor, session: new ImportSessionImpl()};
  const rootParent: ParentNode = isDOMDocumentNode(dom) ? dom.body : dom;
  return $importChildrenRun(runtime, rootParent, {schema: RootSchema});
}
