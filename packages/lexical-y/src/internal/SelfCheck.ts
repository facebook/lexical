/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Writer} from './Write';

import {ContentType, type Node as YNode} from '@y/y';
import {
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  $parseSerializedNode,
  createEditor,
  type EditorState,
  ElementNode,
  type LexicalNode,
  type SerializedLexicalNode,
} from 'lexical';

import {equalFormatValue} from './Cursor';
import {$pushInline, Atoms, readAtoms} from './Inline';
import {Reader} from './Read';
import {
  type Attrs,
  equalValue,
  getContainerGroupSpec,
  INLINE_PREFIX,
  isOwnedTextKey,
  MARKER,
  RUN_END,
  stableStringify,
  STATE_PREFIX,
  WRAPPER_PREFIX,
} from './Schema';
import {
  type CS,
  EMPTY_FORMATS,
  lineStart,
  startItemAfter,
  State,
} from './State';

/**
 * Development self-check of a local write: every line the write touched is
 * read back from Yjs (characters, owned formats, child nodes, marker
 * attributes) and compared with the editor's content. Returns the
 * mismatches found (empty when the write is faithful).
 */
/**
 * The shared text without stored elements a reader does not show (an
 * element that cannot be empty, emptied by peers).
 */
function $shownText(writer: Writer, atoms: Atoms): string {
  let out = '';
  for (let i = 0; i < atoms.text.length; i++) {
    const sp = atoms.specials.get(i);
    if (
      sp !== undefined &&
      sp.kind === 'oldNode' &&
      sp.item.content instanceof ContentType
    ) {
      const y = sp.item.content.type as YNode;
      const name = typeof y.name === 'string' ? y.name : '';
      const info = name.startsWith(INLINE_PREFIX)
        ? writer.state.editor._nodes.get(name.slice(INLINE_PREFIX.length))
        : undefined;
      if (
        info !== undefined &&
        info.klass.prototype instanceof ElementNode &&
        !(info.klass.prototype as ElementNode).canBeEmpty.call(
          Object.create(info.klass.prototype),
        ) &&
        !hasLiveContent(y)
      ) {
        continue;
      }
    }
    out += atoms.text[i];
  }
  return out;
}

function hasLiveContent(y: YNode): boolean {
  for (let it = y._start; it !== null; it = it.right) {
    if (!it.deleted && it.countable) {
      return true;
    }
  }
  return false;
}

export function $checkWrite(writer: Writer): string[] {
  const problems: string[] = [];
  const isKnownWrapper = (type: string) => writer.state.editor._nodes.has(type);
  for (const {unit, d} of writer.touched) {
    const end = unit.end;
    if (end === null || end.deleted) {
      problems.push(`unit ${String(unit.key)} has no live end`);
      continue;
    }
    const name = (end.content as ContentType).type.name;
    if (name !== (d.kind === 'run' ? RUN_END : MARKER)) {
      problems.push(`unit ${String(unit.key)} ends with ${String(name)}`);
      continue;
    }
    const nodes =
      d.part !== undefined
        ? d.part
        : d.kind === 'line'
          ? (() => {
              const line = $getNodeByKey(d.key!);
              return $isElementNode(line)
                ? (line as ElementNode).getChildren()
                : null;
            })()
          : d.nodes;
    if (nodes === null) {
      continue;
    }
    const want = new Atoms();
    $pushInline(want, nodes, writer.$ctx());
    const {left, zone} = lineStart(writer.state, end);
    const have = new Atoms();
    readAtoms(
      startItemAfter(writer.state.zonesOf(unit.cs.y), unit.cs.y, left, zone),
      end,
      unit.start || EMPTY_FORMATS,
      have,
      writer.state.view(unit.cs.y, zone),
    );
    if (want.text !== have.text && want.text !== $shownText(writer, have)) {
      problems.push(
        `line ${String(unit.key)}: text ${JSON.stringify(have.text)} != ${JSON.stringify(want.text)}`,
      );
      continue;
    }
    if (want.text !== have.text) {
      // Equal once stored elements the reader hides are left out.
      continue;
    }
    let ra = 0;
    let rb = 0;
    let lastKey = '';
    for (let i = 0; i < want.length; i++) {
      while (ra < want.runs.length && want.runs[ra].end <= i) {
        ra++;
      }
      while (rb < have.runs.length && have.runs[rb].end <= i) {
        rb++;
      }
      const a = ra < want.runs.length ? want.runs[ra].attrs : {};
      const b = rb < have.runs.length ? have.runs[rb].attrs : {};
      const isBreak = !want.specials.has(i) && want.text.charCodeAt(i) === 10;
      const wrappersOnly = want.specials.has(i) || isBreak;
      const key =
        ra + '/' + rb + '/' + (wrappersOnly ? 1 : 0) + (isBreak ? i : '');
      if (key === lastKey) {
        continue;
      }
      lastKey = key;
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (
          (!wrappersOnly ||
            k.startsWith(WRAPPER_PREFIX) ||
            (isBreak && k.startsWith(STATE_PREFIX))) &&
          isOwnedTextKey(k, isKnownWrapper) &&
          !equalFormatValue(a[k] ?? null, b[k] ?? null)
        ) {
          problems.push(`line ${String(unit.key)}: format ${k} at ${i}`);
          i = want.length;
          break;
        }
      }
    }
    if (d.kind === 'line') {
      const marker = writer.$marker(d);
      const attrs = (end.content as ContentType).type.getAttrs() as Record<
        string,
        unknown
      >;
      for (const k in marker) {
        if (!equalValue(attrs[k], marker[k])) {
          problems.push(`line ${String(unit.key)}: marker ${k}`);
        }
      }
    }
  }
  return problems;
}

/**
 * A node's JSON with its children, as exportJSON gives it. Adjacent text
 * nodes that differ only in their text are compared as one (Lexical keeps
 * them apart while one of them is being composed).
 */
function $deepJSON(node: LexicalNode): Attrs {
  const json = node.exportJSON() as unknown as Attrs;
  if ($isElementNode(node)) {
    const children: Attrs[] = [];
    for (const child of node.getChildren()) {
      const c = $deepJSON(child);
      const prev = children[children.length - 1];
      if (
        prev !== undefined &&
        typeof prev.text === 'string' &&
        typeof c.text === 'string' &&
        stableStringify({...prev, text: ''}) ===
          stableStringify({...c, text: ''})
      ) {
        children[children.length - 1] = {...prev, text: prev.text + c.text};
      } else {
        children.push(c);
      }
    }
    json.children = children;
  }
  return json;
}

/** Remove fields every client derives itself (list numbering). */
function stripDerived(json: unknown, derived: ReadonlySet<string>): unknown {
  if (Array.isArray(json)) {
    return json.map(j => stripDerived(j, derived));
  }
  if (json !== null && typeof json === 'object') {
    const out: Attrs = {};
    for (const k of Object.keys(json as Attrs).sort()) {
      if (!derived.has(k)) {
        out[k] = stripDerived((json as Attrs)[k], derived);
      }
    }
    return out;
  }
  return json;
}

function firstDifference(a: unknown, b: unknown, path: string): string | null {
  if (stableStringify(a) === stableStringify(b)) {
    return null;
  }
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    for (let i = 0; i < a.length; i++) {
      const d = firstDifference(a[i], b[i], `${path}[${i}]`);
      if (d !== null) {
        return d;
      }
    }
  }
  if (
    a !== null &&
    b !== null &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of [...keys].sort()) {
      const d = firstDifference(
        (a as Attrs)[k],
        (b as Attrs)[k],
        `${path}.${k}`,
      );
      if (d !== null) {
        return d;
      }
    }
  }
  const short = (v: unknown) => {
    const s = stableStringify(v) ?? 'undefined';
    return s.length > 120 ? s.slice(0, 120) + '…' : s;
  };
  return `${path}: editor ${short(a)} != shared ${short(b)}`;
}

/**
 * Development self-check of a whole container: a fresh reader (a new editor
 * with the same nodes) reads the container's shared content, and the result
 * must equal the editor's container (node types, fields, NodeState, list
 * structure, link fields, text and formats; derived fields aside). Catches
 * writer and reader mapping bugs alike.
 */
export function checkContainer(
  state: State,
  cs: CS,
  editorState: EditorState,
): string[] {
  if (state.hidden !== null || state.unknownTypes.size > 0) {
    return [];
  }
  const live = editorState.read(() => {
    const node = $getNodeByKey(cs.key);
    return $isElementNode(node) && node.isAttached() ? $deepJSON(node) : null;
  });
  if (live === null) {
    return [];
  }
  const derived = new Set<string>();
  for (const {klass} of state.editor._nodes.values()) {
    const spec = getContainerGroupSpec(klass);
    if (spec !== null) {
      spec.derived.forEach(f => derived.add(f));
    }
  }
  const fresh = createEditor({
    namespace: '@lexical/y self-check',
    nodes: [...state.editor._nodes.values()].map(info => info.klass),
    onError: e => {
      throw e;
    },
  });
  let read: Attrs | null = null;
  let problem: string | null = null;
  try {
    fresh.update(
      () => {
        const freshState = new State(fresh, state.doc, state.root);
        const reader = new Reader(freshState);
        let el: ElementNode;
        if (cs.y === state.root) {
          el = $getRoot();
        } else {
          el = $parseSerializedNode({
            ...live,
            children: [],
          } as unknown as SerializedLexicalNode) as ElementNode;
          $getRoot().append(el);
        }
        reader.$readFull(freshState.newCS(cs.y, el.getKey(), cs.kind), el);
        read = $deepJSON(el);
      },
      {discrete: true},
    );
  } catch (e) {
    problem = `container ${String(cs.key)} could not be read: ${String(e)}`;
  }
  if (problem !== null) {
    return [problem];
  }
  if (read === null) {
    return [];
  }
  const d = firstDifference(
    stripDerived((live as Attrs).children, derived),
    stripDerived((read as Attrs).children, derived),
    `container ${String(cs.key)}`,
  );
  return d === null ? [] : [d];
}
