/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Klass, LexicalEditor} from './LexicalEditor';
import type {
  LexicalNode,
  MergeAdjacentConfig,
  NodeChildrenConfig,
} from './LexicalNode';

import invariant from '@lexical/internal/invariant';

import {
  $create,
  $createLineBreakNode,
  $getSelection,
  $getState,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  ElementNode,
  getComposedSchemaFields,
  getTransformSetFromKlass,
  iterStaticNodeConfigChain,
} from '.';
import {StateConfig} from './LexicalNodeState';
import {$copyNode, isSynthesizedIsInline} from './LexicalUtils';

/**
 * @experimental node-structure
 *
 * The structural facts a node class declares in `$config()` (`inline`,
 * `children`, `mergeAdjacent`), each from the nearest class in its config
 * chain that declares it, and the fields it declares `derived`. Keys no class
 * declares are absent; a `mergeAdjacent: false` declaration reads as absent
 * too.
 */
export interface DeclaredNodeStructure {
  readonly inline?: boolean;
  readonly children?: NodeChildrenConfig;
  readonly mergeAdjacent?: MergeAdjacentConfig;
  /**
   * The schema fields and flat NodeState keys of the class declared
   * `derived` (recomputed by Lexical, so neither stored nor compared by
   * tools).
   */
  readonly derived: ReadonlySet<string>;
  /** The class each key came from (for tools that check completeness). */
  readonly declaredBy: {
    readonly inline?: Klass<LexicalNode>;
    readonly children?: Klass<LexicalNode>;
    readonly mergeAdjacent?: Klass<LexicalNode>;
  };
}

const structureCache = new WeakMap<Klass<LexicalNode>, DeclaredNodeStructure>();

/**
 * Whether a class from `klass` up to (not including) `declaring` writes its
 * own `isInline()` (one not synthesized from a declaration) that returns the
 * opposite of `inline` for the class. An override that cannot be called on
 * the bare prototype (it reads instance fields and throws) does not count.
 */
function contradictsInheritedInline(
  klass: Klass<LexicalNode>,
  declaring: Klass<LexicalNode>,
  inline: boolean,
): boolean {
  for (
    let k: Klass<LexicalNode> | null = klass;
    k !== null && k !== declaring;
    k = Object.getPrototypeOf(k) as Klass<LexicalNode> | null
  ) {
    const proto = k.prototype as {isInline?: unknown} | undefined;
    if (
      proto !== undefined &&
      Object.prototype.hasOwnProperty.call(proto, 'isInline') &&
      !isSynthesizedIsInline(proto.isInline)
    ) {
      let value: unknown;
      try {
        value = (klass.prototype as {isInline: () => unknown}).isInline.call(
          Object.create(klass.prototype),
        );
      } catch (_e) {
        value = undefined;
      }
      return typeof value === 'boolean' && value !== inline;
    }
  }
  return false;
}

/** Why `config.by` is invalid for `klass`, or null when it is valid. */
function invalidMergeBy(
  klass: Klass<LexicalNode>,
  config: MergeAdjacentConfig,
): null | {entry: string; reason: 'unknown' | 'derived' | 'derived-state'} {
  const fields = getComposedSchemaFields(klass);
  for (const entry of config.by) {
    if (typeof entry === 'string') {
      if (!(entry in fields)) {
        return {entry, reason: 'unknown'};
      }
      if (isDerivedNodeField(klass, entry)) {
        return {entry, reason: 'derived'};
      }
    } else if (entry.derived) {
      return {entry: String(entry.key), reason: 'derived-state'};
    }
  }
  return null;
}

/** The nearest `children` declaration (never affected by sanitizing). */
function declaredChildren(
  klass: Klass<LexicalNode>,
): NodeChildrenConfig | undefined {
  for (const {ownNodeConfig} of iterStaticNodeConfigChain(klass)) {
    if (ownNodeConfig && ownNodeConfig.children !== undefined) {
      return ownNodeConfig.children;
    }
  }
  return undefined;
}

/**
 * For a merging class that lists child classes (no `'inline'`): the first
 * listed class that does not hold inline content (possibly with a nested
 * instance of `klass`), or null.
 */
function mergingChildNotInline(
  klass: Klass<LexicalNode>,
  children: NodeChildrenConfig | undefined,
): null | Klass<LexicalNode> {
  if (!Array.isArray(children) || children.includes('inline')) {
    return null;
  }
  for (const entry of children) {
    if (entry === 'inline') {
      continue;
    }
    const item = declaredChildren(entry as Klass<LexicalNode>);
    const ok =
      item === 'inline' ||
      (Array.isArray(item) &&
        item.includes('inline') &&
        item.every(
          e => e === 'inline' || e === klass || klass.prototype instanceof e,
        ));
    if (!ok) {
      return entry as Klass<LexicalNode>;
    }
  }
  return null;
}

/**
 * @experimental node-structure
 *
 * Returns the structural declarations of a node class. See
 * {@link DeclaredNodeStructure}. Depends on the class only and is cached.
 */
export function getDeclaredNodeStructure(
  klass: Klass<LexicalNode>,
): DeclaredNodeStructure {
  let result = structureCache.get(klass);
  if (result === undefined) {
    const out: {
      inline?: boolean;
      children?: NodeChildrenConfig;
      mergeAdjacent?: MergeAdjacentConfig;
    } = {};
    const by: {
      inline?: Klass<LexicalNode>;
      children?: Klass<LexicalNode>;
      mergeAdjacent?: Klass<LexicalNode>;
    } = {};
    let mergeSeen = false;
    for (const {klass: k, ownNodeConfig} of iterStaticNodeConfigChain(klass)) {
      if (!ownNodeConfig) {
        continue;
      }
      if (by.inline === undefined && ownNodeConfig.inline !== undefined) {
        out.inline = ownNodeConfig.inline;
        by.inline = k;
      }
      if (by.children === undefined && ownNodeConfig.children !== undefined) {
        out.children = ownNodeConfig.children;
        by.children = k;
      }
      if (!mergeSeen && ownNodeConfig.mergeAdjacent !== undefined) {
        mergeSeen = true;
        if (ownNodeConfig.mergeAdjacent !== false) {
          out.mergeAdjacent = ownNodeConfig.mergeAdjacent;
          by.mergeAdjacent = k;
        }
      }
    }
    // A declaration the class only inherits never makes it invalid: a
    // subclass written before these keys existed (an app's LinkNode subclass
    // whose isInline() returns false) reads as not declaring a key it
    // contradicts, so tools fall back to what the class itself says.
    if (by.inline !== undefined && by.inline !== klass) {
      if (contradictsInheritedInline(klass, by.inline, out.inline!)) {
        delete out.inline;
        delete by.inline;
      }
    }
    if (by.mergeAdjacent !== undefined && by.mergeAdjacent !== klass) {
      if (
        invalidMergeBy(klass, out.mergeAdjacent!) !== null ||
        mergingChildNotInline(klass, out.children) !== null
      ) {
        delete out.mergeAdjacent;
        delete by.mergeAdjacent;
      }
    }
    const derived = new Set<string>();
    for (const name of Object.keys(getComposedSchemaFields(klass))) {
      if (isDerivedNodeField(klass, name)) {
        derived.add(name);
      }
    }
    for (const {ownNodeConfig} of iterStaticNodeConfigChain(klass)) {
      const states = ownNodeConfig && ownNodeConfig.stateConfigs;
      if (states) {
        for (const entry of states) {
          const config =
            entry instanceof StateConfig ? entry : entry.stateConfig;
          if (config.derived) {
            derived.add(config.key);
          }
        }
      }
    }
    result = Object.freeze({
      ...out,
      declaredBy: Object.freeze(by),
      derived,
    });
    structureCache.set(klass, result);
  }
  return result;
}

/**
 * Whether the schema field or flat NodeState `name` of `klass` is declared
 * `derived` (see {@link DeclaredNodeStructure.derived}).
 */
function isDerivedNodeField(klass: Klass<LexicalNode>, name: string): boolean {
  const schema = getComposedSchemaFields(klass)[name];
  if (schema !== undefined && schema.derived === true) {
    return true;
  }
  for (const {ownNodeConfig} of iterStaticNodeConfigChain(klass)) {
    const states = ownNodeConfig && ownNodeConfig.stateConfigs;
    if (states) {
      for (const entry of states) {
        const config = entry instanceof StateConfig ? entry : entry.stateConfig;
        if (config.key === name) {
          return config.derived;
        }
      }
    }
  }
  return false;
}

/**
 * Whether a class is `OverflowNode` (`@lexical/overflow`) or a subclass. The
 * character limit wraps it around the overflowing part of a paragraph's
 * text: it is inline content although its `isInline()` is false (it keeps a
 * block's caret and deletion behaviour, see #6535), so a paragraph keeps it
 * rather than being split around it.
 */
function isOverflowClass(klass: Klass<LexicalNode>): boolean {
  let result = overflowCache.get(klass);
  if (result === undefined) {
    result = false;
    for (const {ownNodeConfig, ownNodeType} of iterStaticNodeConfigChain(
      klass,
    )) {
      if (ownNodeConfig !== undefined && ownNodeType === 'overflow') {
        result = true;
        break;
      }
    }
    overflowCache.set(klass, result);
  }
  return result;
}

const overflowCache = new WeakMap<Klass<LexicalNode>, boolean>();

const isInlineChild = (node: LexicalNode): boolean => {
  if ($isTextNode(node) || $isLineBreakNode(node)) {
    return true;
  }
  if (isOverflowClass(node.constructor as Klass<LexicalNode>)) {
    return true;
  }
  try {
    return node.isInline();
  } catch (_e) {
    // A class outside the Text/Element/Decorator contract: left alone.
    return true;
  }
};

function allows(children: NodeChildrenConfig, child: LexicalNode): boolean {
  if (children === 'inline') {
    return isInlineChild(child);
  }
  if (children === 'block') {
    return !isInlineChild(child);
  }
  if (isInlineChild(child)) {
    return children.includes('inline');
  }
  for (const entry of children) {
    if (entry !== 'inline' && child instanceof entry) {
      return true;
    }
  }
  return false;
}

function effectiveChildren(node: ElementNode): NodeChildrenConfig | undefined {
  if (node.isShadowRoot()) {
    // A shadow root holds blocks whatever its class declares (an opted-in
    // shadow root quote); Lexical's own shadow root normalization applies.
    return undefined;
  }
  return getDeclaredNodeStructure(node.constructor as Klass<LexicalNode>)
    .children;
}

/** The class a disallowed child is wrapped in, or null to lift it out. */
function wrapperOf(
  children: NodeChildrenConfig,
  child: LexicalNode,
): Klass<ElementNode> | 'paragraph' | null {
  if (children === 'block') {
    return 'paragraph';
  }
  if (children === 'inline' || children.includes('inline')) {
    return null;
  }
  const first = children[0];
  return first === undefined ? null : (first as Klass<ElementNode>);
}

/** Move `node` out of `parent`, splitting `parent` around it. */
function $liftOut(parent: ElementNode, node: LexicalNode): void {
  if (node.getPreviousSibling() === null) {
    parent.insertBefore(node);
    return;
  }
  if (node.getNextSibling() === null) {
    parent.insertAfter(node);
    return;
  }
  const rest: LexicalNode[] = [];
  for (let s = node.getNextSibling(); s !== null; s = s.getNextSibling()) {
    rest.push(s);
  }
  const tail = $copyNode(parent);
  tail.append(...rest);
  // Only the parent's own insertion methods: the lifted node's may be
  // overridden (ListItemNode.insertAfter expects a list parent).
  parent.insertAfter(tail);
  parent.insertAfter(node);
}

/**
 * Whether `node` is a plain paragraph whose content `holderChildren` allows:
 * a line of inline content with no type of its own, which inside a block
 * that holds inline content becomes lines of that block.
 */
function isJoinableParagraph(
  holderChildren: NodeChildrenConfig,
  node: LexicalNode,
): node is ElementNode {
  return (
    $isParagraphNode(node) &&
    !node.isShadowRoot() &&
    node.getChildren().every(c => allows(holderChildren, c))
  );
}

/**
 * Unwrap every plain paragraph that `holder` (a block that holds inline
 * content) holds into the holder itself, one `LineBreakNode` between each
 * paragraph and the content next to it, as Lexical's importers build one
 * inline-holding block from several paragraphs (markdown quotes and list
 * items, `<li><p>a</p><p>b</p></li>`). Content on either side of another
 * block (a heading, a table, a block decorator) is not joined across it:
 * that block is lifted out afterwards. An empty paragraph keeps its line.
 */
function $joinParagraphs(
  holder: ElementNode,
  holderChildren: NodeChildrenConfig,
): void {
  const selection = $getSelection();
  let prevKind: 'none' | 'inline' | 'paragraph' | 'block' = 'none';
  let child = holder.getFirstChild();
  while (child !== null) {
    const next = child.getNextSibling();
    if (isJoinableParagraph(holderChildren, child)) {
      if (prevKind === 'inline' || prevKind === 'paragraph') {
        child.insertBefore($createLineBreakNode());
      }
      if (next !== null && allows(holderChildren, next)) {
        child.insertAfter($createLineBreakNode());
      }
      const at = child.getIndexWithinParent();
      const content = child.getChildren();
      if ($isRangeSelection(selection)) {
        // A caret on the paragraph itself (an empty one) stays on its line.
        for (const point of [selection.anchor, selection.focus]) {
          if (point.type === 'element' && point.key === child.getKey()) {
            point.set(holder.getKey(), at + point.offset, 'element');
          }
        }
      }
      for (const c of content) {
        child.insertBefore(c);
      }
      child.remove();
      prevKind = 'paragraph';
    } else {
      prevKind = allows(holderChildren, child) ? 'inline' : 'block';
    }
    child = next;
  }
}

/**
 * Lift a block out of a node that holds inline content, keeping what the
 * holder meant:
 * - out of an inline element (a link), the block's inline content is wrapped
 *   in a copy of that element first (as LinkNode's own transform does), so a
 *   heading inside a link becomes a heading holding the link;
 * - plain paragraphs inside a block (a quote or a list item holding
 *   paragraphs) are unwrapped into it, joined by line breaks (see
 *   $joinParagraphs), so one quote stays one quote;
 * - any other block (a heading, a code block, a nested quote, a table, a
 *   block decorator) is split around, so its type is kept; one that was the
 *   holder's only child takes the holder's place rather than leaving it
 *   empty.
 *
 * Returns true when `holder` was not split (its paragraphs were joined).
 */
function $liftBlock(holder: ElementNode, block: LexicalNode): boolean {
  const holderChildren = effectiveChildren(holder);
  const content = $isElementNode(block) ? block.getChildren() : [];
  const contentFits =
    $isElementNode(block) &&
    holderChildren !== undefined &&
    content.every(c => allows(holderChildren, c));
  if (holder.isInline()) {
    if (contentFits && content.length > 0) {
      const inner = $copyNode(holder);
      inner.append(...content);
      (block as ElementNode).append(inner);
    }
    $liftOut(holder, block);
    return false;
  }
  if (
    holderChildren !== undefined &&
    isJoinableParagraph(holderChildren, block)
  ) {
    $joinParagraphs(holder, holderChildren);
    return true;
  }
  if (holder.getChildrenSize() === 1 && !$isRootOrShadowRoot(holder)) {
    // Through the holder's own insertAfter, as for a split (a list item
    // splits its list there and the items after it keep their numbers),
    // then the emptied holder goes.
    holder.insertAfter(block);
    holder.remove();
    return false;
  }
  $liftOut(holder, block);
  return false;
}

function $wrap(
  wrapper: Klass<ElementNode> | 'paragraph',
  run: LexicalNode[],
): void {
  const first = run[0];
  const w: ElementNode =
    wrapper === 'paragraph'
      ? first.createParentElementNode()
      : ($create(wrapper) as ElementNode);
  first.insertBefore(w);
  const wChildren = getDeclaredNodeStructure(
    w.constructor as Klass<LexicalNode>,
  ).children;
  for (const child of run) {
    if (
      wChildren !== undefined &&
      !allows(wChildren, child) &&
      $isElementNode(child) &&
      child.getChildren().every(c => allows(wChildren, c))
    ) {
      // A block the wrapper cannot hold whose content it can (a paragraph
      // in a list): its content moves into the wrapper, as ListNode.splice
      // has always done.
      w.append(...child.getChildren());
      child.remove();
    } else {
      w.append(child);
    }
  }
}

/**
 * Enforce the declared `children` of `node` (see
 * {@link StaticNodeConfigValue.children}). Only moves content (never deletes
 * text or nodes with content) and is a pure function of the document. Run by
 * the opt-in `NodeStructureExtension`; a no-op for classes that declare
 * nothing.
 */
function $normalizeNodeChildren(node: ElementNode): void {
  const children = effectiveChildren(node);
  if (children === undefined) {
    return;
  }
  let child = node.getFirstChild();
  while (child !== null) {
    if (allows(children, child)) {
      child = child.getNextSibling();
      continue;
    }
    const wrapper = wrapperOf(children, child);
    if (wrapper === null) {
      if (isInlineChild(child)) {
        // Disallowed inline content with nowhere to go: left as is (never
        // dropped). Only reachable through a misdeclared class.
        child = child.getNextSibling();
        continue;
      }
      if ($liftBlock(node, child)) {
        // Its plain paragraphs were joined into it: look again from the
        // start for the blocks it still holds.
        child = node.getFirstChild();
        continue;
      }
      // `node` may have been split: the rest of its children are in the
      // copy after the lifted node, which is now dirty and is normalized
      // in turn.
      return;
    }
    if (wrapper !== 'paragraph') {
      const wChildren = getDeclaredNodeStructure(
        wrapper as Klass<LexicalNode>,
      ).children;
      const placeable =
        wChildren === undefined ||
        allows(wChildren, child) ||
        ($isElementNode(child) &&
          child.getChildren().every(c => allows(wChildren, c)));
      if (!placeable) {
        // Neither the wrapper nor its content model can hold it (a table in
        // a list): lift it out of this node instead.
        $liftOut(node, child);
        return;
      }
    }
    const run: LexicalNode[] = [child];
    let next = child.getNextSibling();
    while (
      next !== null &&
      !allows(children, next) &&
      isInlineChild(next) === isInlineChild(child) &&
      isInlineChild(child)
    ) {
      run.push(next);
      next = next.getNextSibling();
    }
    $wrap(wrapper, run);
    child = next;
  }
}

function valuesOf(node: LexicalNode, config: MergeAdjacentConfig): unknown[] {
  let json: Record<string, unknown> | undefined;
  return config.by.map(entry => {
    if (typeof entry === 'string') {
      if (json === undefined) {
        json = node.exportJSON() as unknown as Record<string, unknown>;
      }
      return json[entry];
    }
    return $getState(node, entry);
  });
}

function equalValue(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Whether `a` and its next sibling `b` are the same thing under the
 * `mergeAdjacent` of `a`'s class: same class, that class declares it itself
 * (a subclass that inherits it merges by its own code, so an override of a
 * merge method such as `shouldMergeAdjacentLink` stays the authority), and
 * every named value equal.
 */
function $canMergeAdjacent(a: LexicalNode, b: LexicalNode): boolean {
  if (a.constructor !== b.constructor) {
    return false;
  }
  const klass = a.constructor as Klass<LexicalNode>;
  const declared = getDeclaredNodeStructure(klass);
  const config = declared.mergeAdjacent;
  if (config === undefined || declared.declaredBy.mergeAdjacent !== klass) {
    return false;
  }
  return $declaredValuesEqual(a, b, config);
}

const ownTransformCache = new WeakMap<Klass<LexicalNode>, boolean>();

/**
 * Whether the class of `node` merges in a transform of its own: one its
 * `$config()` (or a static `transform()`) declares, as `ListNode`'s merges
 * adjacent lists. The generic merge then leaves the merge to it. A
 * transform an extension registers is not counted: `LinkNode`'s generic
 * merge compares what its `shouldMergeAdjacentLink` compares, and other
 * extensions register transforms on every class (block ids).
 */
function hasOwnTransform(klass: Klass<LexicalNode>): boolean {
  let result = ownTransformCache.get(klass);
  if (result === undefined) {
    // ElementNode's own (shadow root) transform is every element's.
    const base = getTransformSetFromKlass(ElementNode);
    result = false;
    for (const transform of getTransformSetFromKlass(klass)) {
      if (!base.has(transform)) {
        result = true;
        break;
      }
    }
    ownTransformCache.set(klass, result);
  }
  return result;
}

/**
 * Whether the values `config.by` names are equal on `a` and `b` (strict or
 * JSON equality for schema fields, the state's `isEqual` for NodeState).
 */
function $declaredValuesEqual(
  a: LexicalNode,
  b: LexicalNode,
  config: MergeAdjacentConfig,
): boolean {
  const va = valuesOf(a, config);
  const vb = valuesOf(b, config);
  return config.by.every((entry, i) =>
    typeof entry === 'string'
      ? equalValue(va[i], vb[i])
      : entry.isEqual(va[i], vb[i]),
  );
}

/**
 * Merge `node` with equal adjacent siblings of its class (see
 * {@link StaticNodeConfigValue.mergeAdjacent}): the later node's children
 * are appended to the earlier one and the later node is removed. Run by the
 * opt-in `NodeStructureExtension`, except for a class that merges in a
 * transform of its own.
 */
function $normalizeMergeAdjacent(node: ElementNode): void {
  if (hasOwnTransform(node.constructor as Klass<LexicalNode>)) {
    return;
  }
  let target: ElementNode = node;
  const prev = node.getPreviousSibling();
  if ($isElementNode(prev) && $canMergeAdjacent(prev, node)) {
    $mergeInto(prev, node);
    target = prev;
  }
  for (;;) {
    const next = target.getNextSibling();
    if (!$isElementNode(next) || !$canMergeAdjacent(target, next)) {
      return;
    }
    $mergeInto(target, next);
  }
}

/** Append `b`'s children to `a` and remove `b`, keeping a caret between. */
function $mergeInto(a: ElementNode, b: ElementNode): void {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    const parent = b.getParent();
    const at = b.getIndexWithinParent();
    for (const point of [selection.anchor, selection.focus]) {
      // A point on the parent at the boundary between the two (or on `b`)
      // stays at the boundary: the end of `a`'s own children.
      if (
        point.type === 'element' &&
        ((parent !== null &&
          point.key === parent.getKey() &&
          point.offset === at) ||
          (point.key === b.getKey() && point.offset === 0))
      ) {
        point.set(a.getKey(), a.getChildrenSize(), 'element');
      }
    }
  }
  a.append(...b.getChildren());
  b.remove();
}

/** Whether `node` holds a child its declared `children` does not allow. */
function $needsNodeChildrenNormalization(node: ElementNode): boolean {
  const children = effectiveChildren(node);
  if (children !== undefined) {
    for (let c = node.getFirstChild(); c !== null; c = c.getNextSibling()) {
      if (!allows(children, c)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @internal For `@lexical/y`; not public API.
 *
 * Whether the normalization would change anything for `node`: a child its
 * declared `children` does not allow, or (unless `mergeAdjacent` is false)
 * an adjacent sibling it is declared to merge with. Reads only.
 */
export function $needsNodeStructureNormalization(
  node: ElementNode,
  mergeAdjacent = true,
): boolean {
  if ($needsNodeChildrenNormalization(node)) {
    return true;
  }
  if (!mergeAdjacent) {
    return false;
  }
  const prev = node.getPreviousSibling();
  const next = node.getNextSibling();
  return (
    ($isElementNode(prev) && $canMergeAdjacent(prev, node)) ||
    ($isElementNode(next) && $canMergeAdjacent(node, next))
  );
}

/**
 * @internal For `NodeStructureExtension` and `@lexical/y`; not public API.
 *
 * The normalization the opt-in `NodeStructureExtension` runs, as a
 * transform, on every dirty element of a class that declares `children` or
 * `mergeAdjacent`: the declared `children`, then (unless `mergeAdjacent` is
 * false) the declared merge.
 */
export function $normalizeNodeStructure(
  node: LexicalNode,
  mergeAdjacent = true,
): void {
  if (!$isElementNode(node) || !node.isAttached()) {
    return;
  }
  $normalizeNodeChildren(node);
  if (mergeAdjacent && node.isAttached()) {
    $normalizeMergeAdjacent(node);
  }
}

/**
 * @internal For Lexical's importers; not public API.
 *
 * Whether `editor` enforces the structure `klass` declares: the opt-in
 * `NodeStructureExtension` (or `registerNodeStructure`) registered
 * {@link $normalizeNodeStructure} as a transform of the class. Importers
 * use it to build directly what the normalization keeps, where the shape
 * they build otherwise would leave something behind once it runs.
 */
export function isNodeStructureEnforced(
  editor: LexicalEditor,
  klass: Klass<LexicalNode>,
): boolean {
  const registered = editor._nodes.get(klass.getType());
  return (
    registered !== undefined &&
    registered.transforms.has($normalizeNodeStructure)
  );
}

/**
 * @experimental node-structure
 *
 * Development check of a class's structural declarations, run when an
 * editor is created: `mergeAdjacent.by` must name known, non-derived values;
 * a declared `inline` must agree with an overridden `isInline()`; a class
 * that lists child classes and merges must list classes that hold inline
 * content (possibly with a nested instance of the class itself).
 *
 * Only keys the class declares in its own `$config()` are checked. A
 * declaration it merely inherits never throws: where the class contradicts
 * it, {@link getDeclaredNodeStructure} reads that key as undeclared.
 */
export function validateNodeStructure(klass: Klass<LexicalNode>): void {
  const declared = getDeclaredNodeStructure(klass);
  const name = klass.name || 'node class';
  if (
    declared.mergeAdjacent !== undefined &&
    declared.declaredBy.mergeAdjacent === klass
  ) {
    const invalid = invalidMergeBy(klass, declared.mergeAdjacent);
    if (invalid !== null) {
      invariant(
        invalid.reason !== 'unknown',
        '%s: mergeAdjacent.by names %s, which is not a schema field of the class',
        name,
        invalid.entry,
      );
      invariant(
        invalid.reason !== 'derived',
        '%s: mergeAdjacent.by names %s, which is derived',
        name,
        invalid.entry,
      );
      invariant(
        false,
        '%s: mergeAdjacent.by names the derived NodeState %s',
        name,
        invalid.entry,
      );
    }
    const item = mergingChildNotInline(klass, declared.children);
    invariant(
      item === null,
      '%s: a merging class that lists child classes must list classes that hold inline content (%s does not)',
      name,
      item === null ? '' : item.name,
    );
  }
  if (declared.inline !== undefined && declared.declaredBy.inline === klass) {
    const proto = klass.prototype as {isInline?: unknown};
    if (
      Object.prototype.hasOwnProperty.call(proto, 'isInline') &&
      typeof proto.isInline === 'function' &&
      !isSynthesizedIsInline(proto.isInline)
    ) {
      let value: unknown;
      try {
        value = proto.isInline.call(Object.create(klass.prototype));
      } catch (_e) {
        value = undefined;
      }
      invariant(
        value === undefined || value === declared.inline,
        '%s: $config inline is %s but isInline() returns %s',
        name,
        String(declared.inline),
        String(value),
      );
    }
  }
}
