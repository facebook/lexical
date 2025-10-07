/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/*
 * Implementation notes, in no particular order.
 *
 * Sibling text nodes are synced to a single XmlText type. All non-text nodes are synced one-to-one
 * with an XmlElement.
 *
 * To be space-efficient, only property values that differ from their defaults are synced. Default
 * values are determined by creating an instance of the node with no constructor arguments and
 * enumerating over its properties.
 *
 * For a given text node, we make use of XmlText.applyDelta() to sync properties and state to
 * specific ranges of text. Refer to TextAttributes below for the structure of the attributes.
 *
 * For non-text nodes, we use the XmlElement's attributes (YMap under the hood) to sync properties
 * and state. The former are stored using their names as keys, and the latter are stored with a
 * prefix. (NB: '$' couldn't be used as the prefix because it breaks XmlElement.toDOM().)
 */

import {
  $getSelection,
  $getWritableNodeState,
  $isRangeSelection,
  $isTextNode,
  ElementNode,
  LexicalNode,
  NodeKey,
  RootNode,
  TextNode,
} from 'lexical';
import invariant from 'shared/invariant';
import simpleDiffWithCursor from 'shared/simpleDiffWithCursor';
import {
  ContentFormat,
  ContentString,
  Doc as YDoc,
  ID,
  isDeleted,
  Item,
  Snapshot,
  Text as YText,
  typeListToArraySnapshot,
  XmlElement,
  XmlHook,
  XmlText,
} from 'yjs';

import {BindingV2} from './Bindings';
import {$syncPropertiesFromYjs, getDefaultNodeProperties} from './Utils';

type ComputeYChange = (
  event: 'removed' | 'added',
  id: ID,
) => Record<string, unknown>;

type TextAttributes = {
  t?: string; // type if not TextNode
  p?: Record<string, unknown>; // properties
  [key: `s_${string}`]: unknown; // state
  i?: number; // used to prevent Yjs from merging text nodes itself
  ychange?: Record<string, unknown>;
};

// https://docs.yjs.dev/api/shared-types/y.xmlelement
// "Define a top-level type; Note that the nodeName is always "undefined""
const isRootElement = (el: XmlElement): boolean => el.nodeName === 'UNDEFINED';

export const $createOrUpdateNodeFromYElement = (
  el: XmlElement,
  binding: BindingV2,
  keysChanged: Set<string> | null,
  childListChanged: boolean,
  snapshot?: Snapshot,
  prevSnapshot?: Snapshot,
  computeYChange?: ComputeYChange,
): LexicalNode | null => {
  let node = binding.mapping.get(el);
  if (node && keysChanged && keysChanged.size === 0 && !childListChanged) {
    return node;
  }

  const type = isRootElement(el) ? RootNode.getType() : el.nodeName;
  const registeredNodes = binding.editor._nodes;
  const nodeInfo = registeredNodes.get(type);
  if (nodeInfo === undefined) {
    throw new Error(
      `$createOrUpdateNodeFromYElement: Node ${type} is not registered`,
    );
  }

  if (!node) {
    node = new nodeInfo.klass();
    keysChanged = null;
    childListChanged = true;
  }

  if (childListChanged && node instanceof ElementNode) {
    const children: LexicalNode[] = [];
    const $createChildren = (childType: XmlElement | XmlText | XmlHook) => {
      if (childType instanceof XmlElement) {
        const n = $createOrUpdateNodeFromYElement(
          childType,
          binding,
          new Set(),
          false,
          snapshot,
          prevSnapshot,
          computeYChange,
        );
        if (n !== null) {
          children.push(n);
        }
      } else if (childType instanceof XmlText) {
        const ns = $createOrUpdateTextNodesFromYText(
          childType,
          binding,
          snapshot,
          prevSnapshot,
          computeYChange,
        );
        if (ns !== null) {
          ns.forEach((textchild) => {
            if (textchild !== null) {
              children.push(textchild);
            }
          });
        }
      } else {
        invariant(false, 'XmlHook is not supported');
      }
    };

    if (snapshot === undefined || prevSnapshot === undefined) {
      el.toArray().forEach($createChildren);
    } else {
      typeListToArraySnapshot(
        el,
        new Snapshot(prevSnapshot.ds, snapshot.sv),
      ).forEach($createChildren);
    }

    $spliceChildren(node, children);
  }

  // TODO(collab-v2): typing for XmlElement generic
  const attrs = el.getAttributes(snapshot) as Record<string, unknown>;
  if (!isRootElement(el) && snapshot !== undefined) {
    if (!isItemVisible(el._item!, snapshot)) {
      attrs[stateKeyToAttrKey('ychange')] = computeYChange
        ? computeYChange('removed', el._item!.id)
        : {type: 'removed'};
    } else if (!isItemVisible(el._item!, prevSnapshot)) {
      attrs[stateKeyToAttrKey('ychange')] = computeYChange
        ? computeYChange('added', el._item!.id)
        : {type: 'added'};
    }
  }
  const properties: Record<string, unknown> = {
    ...getDefaultNodeProperties(node, binding),
  };
  const state: Record<string, unknown> = {};
  for (const k in attrs) {
    if (k.startsWith(STATE_KEY_PREFIX)) {
      state[attrKeyToStateKey(k)] = attrs[k];
    } else {
      properties[k] = attrs[k];
    }
  }

  $syncPropertiesFromYjs(binding, properties, node, keysChanged);
  if (!keysChanged) {
    $getWritableNodeState(node).updateFromJSON(state);
  } else {
    const stateKeysChanged = Object.keys(state).filter((k) =>
      keysChanged.has(stateKeyToAttrKey(k)),
    );
    if (stateKeysChanged.length > 0) {
      const writableState = $getWritableNodeState(node);
      for (const k of stateKeysChanged) {
        writableState.updateFromUnknown(k, state[k]);
      }
    }
  }

  const latestNode = node.getLatest();
  binding.mapping.set(el, latestNode);
  return latestNode;
};

const $spliceChildren = (node: ElementNode, nextChildren: LexicalNode[]) => {
  const prevChildren = node.getChildren();
  const prevChildrenKeySet = new Set(
    prevChildren.map((child) => child.getKey()),
  );
  const nextChildrenKeySet = new Set(
    nextChildren.map((child) => child.getKey()),
  );

  const prevEndIndex = prevChildren.length - 1;
  const nextEndIndex = nextChildren.length - 1;
  let prevIndex = 0;
  let nextIndex = 0;

  while (prevIndex <= prevEndIndex && nextIndex <= nextEndIndex) {
    const prevKey = prevChildren[prevIndex].getKey();
    const nextKey = nextChildren[nextIndex].getKey();

    if (prevKey === nextKey) {
      prevIndex++;
      nextIndex++;
      continue;
    }

    const nextHasPrevKey = nextChildrenKeySet.has(prevKey);
    const prevHasNextKey = prevChildrenKeySet.has(nextKey);

    if (!nextHasPrevKey) {
      // If removing the last node, insert remaining new nodes immediately, otherwise if the node
      // cannot be empty, it will remove itself from its parent.
      if (nextIndex === 0 && node.getChildrenSize() === 1) {
        node.splice(nextIndex, 1, nextChildren.slice(nextIndex));
        return;
      }
      // Remove
      node.splice(nextIndex, 1, []);
      prevIndex++;
      continue;
    }

    // Create or replace
    const nextChildNode = nextChildren[nextIndex];
    if (prevHasNextKey) {
      node.splice(nextIndex, 1, [nextChildNode]);
      prevIndex++;
      nextIndex++;
    } else {
      node.splice(nextIndex, 0, [nextChildNode]);
      nextIndex++;
    }
  }

  const appendNewChildren = prevIndex > prevEndIndex;
  const removeOldChildren = nextIndex > nextEndIndex;

  if (appendNewChildren && !removeOldChildren) {
    node.append(...nextChildren.slice(nextIndex));
  } else if (removeOldChildren && !appendNewChildren) {
    node.splice(
      nextChildren.length,
      node.getChildrenSize() - nextChildren.length,
      [],
    );
  }
};

const isItemVisible = (item: Item, snapshot?: Snapshot): boolean =>
  snapshot === undefined
    ? !item.deleted
    : snapshot.sv.has(item.id.client) &&
      snapshot.sv.get(item.id.client)! > item.id.clock &&
      !isDeleted(snapshot.ds, item.id);

const $createOrUpdateTextNodesFromYText = (
  text: XmlText,
  binding: BindingV2,
  snapshot?: Snapshot,
  prevSnapshot?: Snapshot,
  computeYChange?: ComputeYChange,
): Array<TextNode> | null => {
  const deltas = toDelta(text, snapshot, prevSnapshot, computeYChange);

  // Use existing text nodes if the count and types all align, otherwise throw out the existing
  // nodes and create new ones.
  let nodes: TextNode[] = binding.mapping.get(text) ?? [];

  const nodeTypes: string[] = deltas.map(
    (delta) => delta.attributes.t ?? TextNode.getType(),
  );
  const canReuseNodes =
    nodes.length === nodeTypes.length &&
    nodes.every((node, i) => node.getType() === nodeTypes[i]);
  if (!canReuseNodes) {
    const registeredNodes = binding.editor._nodes;
    nodes = nodeTypes.map((type) => {
      const nodeInfo = registeredNodes.get(type);
      if (nodeInfo === undefined) {
        throw new Error(
          `$createTextNodesFromYText: Node ${type} is not registered`,
        );
      }
      const node = new nodeInfo.klass();
      if (!$isTextNode(node)) {
        throw new Error(
          `$createTextNodesFromYText: Node ${type} is not a TextNode`,
        );
      }
      return node;
    });
  }

  // Sync text, properties and state to the text nodes.
  for (let i = 0; i < deltas.length; i++) {
    const node = nodes[i];
    const delta = deltas[i];
    const {attributes, insert} = delta;
    if (node.__text !== insert) {
      node.setTextContent(insert);
    }
    const properties = {
      ...getDefaultNodeProperties(node, binding),
      ...attributes.p,
    };
    const state = Object.fromEntries(
      Object.entries(attributes)
        .filter(([k]) => k.startsWith(STATE_KEY_PREFIX))
        .map(([k, v]) => [attrKeyToStateKey(k), v]),
    );
    $syncPropertiesFromYjs(binding, properties, node, null);
    $getWritableNodeState(node).updateFromJSON(state);
  }

  const latestNodes = nodes.map((node) => node.getLatest());
  binding.mapping.set(text, latestNodes);
  return latestNodes;
};

const $createTypeFromTextNodes = (
  nodes: TextNode[],
  binding: BindingV2,
): XmlText => {
  const type = new XmlText();
  $updateYText(type, nodes, binding);
  return type;
};

const createTypeFromElementNode = (
  node: LexicalNode,
  binding: BindingV2,
): XmlElement => {
  const type = new XmlElement(node.getType());
  const attrs = {
    ...propertiesToAttributes(node, binding),
    ...stateToAttributes(node),
  };
  for (const key in attrs) {
    const val = attrs[key];
    if (val !== null) {
      // TODO(collab-v2): typing for XmlElement generic
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type.setAttribute(key, val as any);
    }
  }
  if (!(node instanceof ElementNode)) {
    return type;
  }
  type.insert(
    0,
    normalizeNodeContent(node).map((n) =>
      $createTypeFromTextOrElementNode(n, binding),
    ),
  );
  binding.mapping.set(type, node);
  return type;
};

const $createTypeFromTextOrElementNode = (
  node: LexicalNode | TextNode[],
  meta: BindingV2,
): XmlElement | XmlText =>
  node instanceof Array
    ? $createTypeFromTextNodes(node, meta)
    : createTypeFromElementNode(node, meta);

const isObject = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val != null;

const equalAttrs = (
  pattrs: Record<string, unknown>,
  yattrs: Record<string, unknown> | null,
) => {
  const keys = Object.keys(pattrs).filter((key) => pattrs[key] !== null);
  if (yattrs == null) {
    return keys.length === 0;
  }
  let eq =
    keys.length ===
    Object.keys(yattrs).filter((key) => yattrs[key] !== null).length;
  for (let i = 0; i < keys.length && eq; i++) {
    const key = keys[i];
    const l = pattrs[key];
    const r = yattrs[key];
    eq =
      key === 'ychange' ||
      l === r ||
      (isObject(l) && isObject(r) && equalAttrs(l, r));
  }
  return eq;
};

type NormalizedPNodeContent = Array<Array<TextNode> | LexicalNode>;

const normalizeNodeContent = (node: LexicalNode): NormalizedPNodeContent => {
  if (!(node instanceof ElementNode)) {
    return [];
  }
  const c = node.getChildren();
  const res: NormalizedPNodeContent = [];
  for (let i = 0; i < c.length; i++) {
    const n = c[i];
    if ($isTextNode(n)) {
      const textNodes: TextNode[] = [];
      for (
        let maybeTextNode = c[i];
        i < c.length && $isTextNode(maybeTextNode);
        maybeTextNode = c[++i]
      ) {
        textNodes.push(maybeTextNode);
      }
      i--;
      res.push(textNodes);
    } else {
      res.push(n);
    }
  }
  return res;
};

const equalYTextLText = (
  ytext: XmlText,
  ltexts: TextNode[],
  binding: BindingV2,
) => {
  const deltas = toDelta(ytext);
  return (
    deltas.length === ltexts.length &&
    deltas.every((d, i) => {
      const ltext = ltexts[i];
      const type = d.attributes.t ?? TextNode.getType();
      const propertyAttrs = d.attributes.p ?? {};
      const stateAttrs = Object.fromEntries(
        Object.entries(d.attributes).filter(([k]) =>
          k.startsWith(STATE_KEY_PREFIX),
        ),
      );
      return (
        d.insert === ltext.getTextContent() &&
        type === ltext.getType() &&
        equalAttrs(propertyAttrs, propertiesToAttributes(ltext, binding)) &&
        equalAttrs(stateAttrs, stateToAttributes(ltext))
      );
    })
  );
};

const equalYTypePNode = (
  ytype: XmlElement | XmlText | XmlHook,
  lnode: LexicalNode | TextNode[],
  binding: BindingV2,
): ytype is XmlElement | XmlText => {
  if (
    ytype instanceof XmlElement &&
    !(lnode instanceof Array) &&
    matchNodeName(ytype, lnode)
  ) {
    const normalizedContent = normalizeNodeContent(lnode);
    return (
      ytype._length === normalizedContent.length &&
      equalAttrs(ytype.getAttributes(), {
        ...propertiesToAttributes(lnode, binding),
        ...stateToAttributes(lnode),
      }) &&
      ytype
        .toArray()
        .every((ychild, i) =>
          equalYTypePNode(ychild, normalizedContent[i], binding),
        )
    );
  }
  return (
    ytype instanceof XmlText &&
    lnode instanceof Array &&
    equalYTextLText(ytype, lnode, binding)
  );
};

const mappedIdentity = (
  mapped: LexicalNode | TextNode[] | undefined,
  lcontent: LexicalNode | TextNode[],
) =>
  mapped === lcontent ||
  (mapped instanceof Array &&
    lcontent instanceof Array &&
    mapped.length === lcontent.length &&
    mapped.every((a, i) => lcontent[i] === a));

type EqualityFactor = {
  foundMappedChild: boolean;
  equalityFactor: number;
};

const computeChildEqualityFactor = (
  ytype: XmlElement,
  lnode: LexicalNode,
  binding: BindingV2,
): EqualityFactor => {
  const yChildren = ytype.toArray();
  const pChildren = normalizeNodeContent(lnode);
  const pChildCnt = pChildren.length;
  const yChildCnt = yChildren.length;
  const minCnt = Math.min(yChildCnt, pChildCnt);
  let left = 0;
  let right = 0;
  let foundMappedChild = false;
  for (; left < minCnt; left++) {
    const leftY = yChildren[left];
    const leftP = pChildren[left];
    if (leftY instanceof XmlHook) {
      break;
    } else if (mappedIdentity(binding.mapping.get(leftY), leftP)) {
      foundMappedChild = true; // definite (good) match!
    } else if (!equalYTypePNode(leftY, leftP, binding)) {
      break;
    }
  }
  for (; left + right < minCnt; right++) {
    const rightY = yChildren[yChildCnt - right - 1];
    const rightP = pChildren[pChildCnt - right - 1];
    if (rightY instanceof XmlHook) {
      break;
    } else if (mappedIdentity(binding.mapping.get(rightY), rightP)) {
      foundMappedChild = true;
    } else if (!equalYTypePNode(rightY, rightP, binding)) {
      break;
    }
  }
  return {
    equalityFactor: left + right,
    foundMappedChild,
  };
};

const ytextTrans = (
  ytext: YText,
): {nAttrs: Record<string, null>; str: string} => {
  let str = '';
  let n = ytext._start;
  const nAttrs: Record<string, null> = {};
  while (n !== null) {
    if (!n.deleted) {
      if (n.countable && n.content instanceof ContentString) {
        str += n.content.str;
      } else if (n.content instanceof ContentFormat) {
        nAttrs[n.content.key] = null;
      }
    }
    n = n.right;
  }
  return {
    nAttrs,
    str,
  };
};

const $updateYText = (
  ytext: XmlText,
  ltexts: TextNode[],
  binding: BindingV2,
) => {
  binding.mapping.set(ytext, ltexts);
  const {nAttrs, str} = ytextTrans(ytext);
  const content = ltexts.map((node, i) => {
    const nodeType = node.getType();
    let p: TextAttributes['p'] | null = propertiesToAttributes(node, binding);
    if (Object.keys(p).length === 0) {
      p = null;
    }
    return {
      attributes: Object.assign({}, nAttrs, {
        ...(nodeType !== TextNode.getType() && {t: nodeType}),
        p,
        ...stateToAttributes(node),
        ...(i > 0 && {i}), // Prevent Yjs from merging text nodes itself.
      }),
      insert: node.getTextContent(),
      nodeKey: node.getKey(),
    };
  });

  const nextText = content.map((c) => c.insert).join('');
  const selection = $getSelection();
  let cursorOffset: number;
  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    cursorOffset = 0;
    for (const c of content) {
      if (c.nodeKey === selection.anchor.key) {
        cursorOffset += selection.anchor.offset;
        break;
      }
      cursorOffset += c.insert.length;
    }
  } else {
    cursorOffset = nextText.length;
  }

  const {insert, remove, index} = simpleDiffWithCursor(
    str,
    nextText,
    cursorOffset,
  );
  ytext.delete(index, remove);
  ytext.insert(index, insert);
  ytext.applyDelta(
    content.map((c) => ({attributes: c.attributes, retain: c.insert.length})),
  );
};

const toDelta = (
  ytext: YText,
  snapshot?: Snapshot,
  prevSnapshot?: Snapshot,
  computeYChange?: ComputeYChange,
): Array<{insert: string; attributes: TextAttributes}> => {
  return ytext
    .toDelta(snapshot, prevSnapshot, computeYChange)
    .map((delta: {insert: string; attributes?: TextAttributes}) => {
      const attributes = delta.attributes ?? {};
      if ('ychange' in attributes) {
        attributes[stateKeyToAttrKey('ychange')] = attributes.ychange;
        delete attributes.ychange;
      }
      return {...delta, attributes};
    });
};

const propertiesToAttributes = (node: LexicalNode, meta: BindingV2) => {
  const defaultProperties = getDefaultNodeProperties(node, meta);
  const attrs: Record<string, unknown> = {};
  Object.entries(defaultProperties).forEach(([property, defaultValue]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (node as any)[property];
    if (value !== defaultValue) {
      attrs[property] = value;
    }
  });
  return attrs;
};

const STATE_KEY_PREFIX = 's_';
const stateKeyToAttrKey = (key: string): `s_${string}` => `s_${key}`;
const attrKeyToStateKey = (key: string) => {
  if (!key.startsWith(STATE_KEY_PREFIX)) {
    throw new Error(`Invalid state key: ${key}`);
  }
  return key.slice(STATE_KEY_PREFIX.length);
};

const stateToAttributes = (node: LexicalNode) => {
  const state = node.__state;
  if (!state) {
    return {};
  }
  const [unknown = {}, known] = state.getInternalState();
  const attrs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(unknown)) {
    attrs[stateKeyToAttrKey(k)] = v;
  }
  for (const [stateConfig, v] of known) {
    attrs[stateKeyToAttrKey(stateConfig.key)] = stateConfig.unparse(v);
  }
  return attrs;
};

export const $updateYFragment = (
  y: YDoc,
  yDomFragment: XmlElement,
  node: LexicalNode,
  binding: BindingV2,
  dirtyElements: Set<NodeKey>,
) => {
  if (
    yDomFragment instanceof XmlElement &&
    yDomFragment.nodeName !== node.getType() &&
    !(isRootElement(yDomFragment) && node.getType() === RootNode.getType())
  ) {
    throw new Error('node name mismatch!');
  }
  binding.mapping.set(yDomFragment, node);
  // update attributes
  if (yDomFragment instanceof XmlElement) {
    const yDomAttrs = yDomFragment.getAttributes();
    const lexicalAttrs = {
      ...propertiesToAttributes(node, binding),
      ...stateToAttributes(node),
    };
    for (const key in lexicalAttrs) {
      if (lexicalAttrs[key] != null) {
        if (yDomAttrs[key] !== lexicalAttrs[key] && key !== 'ychange') {
          // TODO(collab-v2): typing for XmlElement generic
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          yDomFragment.setAttribute(key, lexicalAttrs[key] as any);
        }
      } else {
        yDomFragment.removeAttribute(key);
      }
    }
    // remove all keys that are no longer in pAttrs
    for (const key in yDomAttrs) {
      if (lexicalAttrs[key] === undefined) {
        yDomFragment.removeAttribute(key);
      }
    }
  }
  // update children
  const lChildren = normalizeNodeContent(node);
  const lChildCnt = lChildren.length;
  const yChildren = yDomFragment.toArray();
  const yChildCnt = yChildren.length;
  const minCnt = Math.min(lChildCnt, yChildCnt);
  let left = 0;
  let right = 0;
  // find number of matching elements from left
  for (; left < minCnt; left++) {
    const leftY = yChildren[left];
    const leftL = lChildren[left];
    if (leftY instanceof XmlHook) {
      break;
    } else if (mappedIdentity(binding.mapping.get(leftY), leftL)) {
      if (leftL instanceof ElementNode && dirtyElements.has(leftL.getKey())) {
        $updateYFragment(
          y,
          leftY as XmlElement,
          leftL as LexicalNode,
          binding,
          dirtyElements,
        );
      }
    } else if (equalYTypePNode(leftY, leftL, binding)) {
      // update mapping
      binding.mapping.set(leftY, leftL);
    } else {
      break;
    }
  }
  // find number of matching elements from right
  for (; right + left < minCnt; right++) {
    const rightY = yChildren[yChildCnt - right - 1];
    const rightL = lChildren[lChildCnt - right - 1];
    if (rightY instanceof XmlHook) {
      break;
    } else if (mappedIdentity(binding.mapping.get(rightY), rightL)) {
      if (rightL instanceof ElementNode && dirtyElements.has(rightL.getKey())) {
        $updateYFragment(
          y,
          rightY as XmlElement,
          rightL as LexicalNode,
          binding,
          dirtyElements,
        );
      }
    } else if (equalYTypePNode(rightY, rightL, binding)) {
      // update mapping
      binding.mapping.set(rightY, rightL);
    } else {
      break;
    }
  }
  // try to compare and update
  while (yChildCnt - left - right > 0 && lChildCnt - left - right > 0) {
    const leftY = yChildren[left];
    const leftL = lChildren[left];
    const rightY = yChildren[yChildCnt - right - 1];
    const rightL = lChildren[lChildCnt - right - 1];
    if (leftY instanceof XmlText && leftL instanceof Array) {
      if (!equalYTextLText(leftY, leftL, binding)) {
        $updateYText(leftY, leftL, binding);
      }
      left += 1;
    } else {
      let updateLeft =
        leftY instanceof XmlElement && matchNodeName(leftY, leftL);
      let updateRight =
        rightY instanceof XmlElement && matchNodeName(rightY, rightL);
      if (updateLeft && updateRight) {
        // decide which which element to update
        const equalityLeft = computeChildEqualityFactor(
          leftY as XmlElement,
          leftL as LexicalNode,
          binding,
        );
        const equalityRight = computeChildEqualityFactor(
          rightY as XmlElement,
          rightL as LexicalNode,
          binding,
        );
        if (equalityLeft.foundMappedChild && !equalityRight.foundMappedChild) {
          updateRight = false;
        } else if (
          !equalityLeft.foundMappedChild &&
          equalityRight.foundMappedChild
        ) {
          updateLeft = false;
        } else if (equalityLeft.equalityFactor < equalityRight.equalityFactor) {
          updateLeft = false;
        } else {
          updateRight = false;
        }
      }
      if (updateLeft) {
        $updateYFragment(
          y,
          leftY as XmlElement,
          leftL as LexicalNode,
          binding,
          dirtyElements,
        );
        left += 1;
      } else if (updateRight) {
        $updateYFragment(
          y,
          rightY as XmlElement,
          rightL as LexicalNode,
          binding,
          dirtyElements,
        );
        right += 1;
      } else {
        binding.mapping.delete(yDomFragment.get(left));
        yDomFragment.delete(left, 1);
        yDomFragment.insert(left, [
          $createTypeFromTextOrElementNode(leftL, binding),
        ]);
        left += 1;
      }
    }
  }
  const yDelLen = yChildCnt - left - right;
  if (yChildCnt === 1 && lChildCnt === 0 && yChildren[0] instanceof XmlText) {
    binding.mapping.delete(yChildren[0]);
    // Edge case handling https://github.com/yjs/y-prosemirror/issues/108
    // Only delete the content of the Y.Text to retain remote changes on the same Y.Text object
    yChildren[0].delete(0, yChildren[0].length);
  } else if (yDelLen > 0) {
    yDomFragment
      .slice(left, left + yDelLen)
      .forEach((type) => binding.mapping.delete(type));
    yDomFragment.delete(left, yDelLen);
  }
  if (left + right < lChildCnt) {
    const ins = [];
    for (let i = left; i < lChildCnt - right; i++) {
      ins.push($createTypeFromTextOrElementNode(lChildren[i], binding));
    }
    yDomFragment.insert(left, ins);
  }
};

const matchNodeName = (yElement: XmlElement, lnode: LexicalNode | TextNode[]) =>
  !(lnode instanceof Array) && yElement.nodeName === lnode.getType();
