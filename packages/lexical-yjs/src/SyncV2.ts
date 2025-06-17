/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createTextNode,
  ElementNode,
  LexicalNode,
  NodeKey,
  TextNode,
} from 'lexical';
// TODO(collab-v2): use internal implementation
import {simpleDiff} from 'lib0/diff';
import invariant from 'shared/invariant';
// TODO(collab-v2): import specific types
import * as Y from 'yjs';

import {BindingV2} from './Bindings';
import {$syncPropertiesFromYjs, getNodeProperties} from './Utils';

type ComputeYChange = (
  event: 'removed' | 'added',
  id: Y.ID,
) => Record<string, unknown>;

const isVisible = (item: Y.Item, snapshot?: Y.Snapshot): boolean =>
  snapshot === undefined
    ? !item.deleted
    : snapshot.sv.has(item.id.client) &&
      snapshot.sv.get(item.id.client)! > item.id.clock &&
      !Y.isDeleted(snapshot.ds, item.id);

/**
 * @return Returns node if node could be created. Otherwise it deletes the yjs type and returns null
 */
export const $createOrUpdateNodeFromYElement = (
  el: Y.XmlElement,
  meta: BindingV2,
  dirtyElements: Set<NodeKey>,
  snapshot?: Y.Snapshot,
  prevSnapshot?: Y.Snapshot,
  computeYChange?: ComputeYChange,
): LexicalNode | null => {
  let node = meta.mapping.get(el) as LexicalNode | undefined;
  if (node && !dirtyElements.has(node.getKey())) {
    return node;
  }

  const children: LexicalNode[] = [];
  const $createChildren = (type: Y.XmlElement | Y.XmlText | Y.XmlHook) => {
    if (type instanceof Y.XmlElement) {
      const n = $createOrUpdateNodeFromYElement(
        type,
        meta,
        dirtyElements,
        snapshot,
        prevSnapshot,
        computeYChange,
      );
      if (n !== null) {
        children.push(n);
      }
    } else if (type instanceof Y.XmlText) {
      // If the next ytext exists and was created by us, move the content to the current ytext.
      // This is a fix for #160 -- duplication of characters when two Y.Text exist next to each
      // other.
      // eslint-disable-next-line lexical/no-optional-chaining
      const content = type._item!.right?.content as Y.ContentType | undefined;
      // eslint-disable-next-line lexical/no-optional-chaining
      const nextytext = content?.type;
      if (
        nextytext instanceof Y.Text &&
        !nextytext._item!.deleted &&
        nextytext._item!.id.client === nextytext.doc!.clientID
      ) {
        type.applyDelta([{retain: type.length}, ...nextytext.toDelta()]);
        nextytext.doc!.transact((tr) => {
          nextytext._item!.delete(tr);
        });
      }
      // now create the prosemirror text nodes
      const ns = $createTextNodesFromYText(
        type,
        meta,
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
    Y.typeListToArraySnapshot(
      el,
      new Y.Snapshot(prevSnapshot.ds, snapshot.sv),
    ).forEach($createChildren);
  }
  try {
    const attrs = el.getAttributes(snapshot);
    if (snapshot !== undefined) {
      if (!isVisible(el._item!, snapshot)) {
        // TODO(collab-v2): add type for ychange, store in node state?
        attrs.ychange = computeYChange
          ? computeYChange('removed', el._item!.id)
          : {type: 'removed'};
      } else if (!isVisible(el._item!, prevSnapshot)) {
        attrs.ychange = computeYChange
          ? computeYChange('added', el._item!.id)
          : {type: 'added'};
      }
    }
    const type = attrs.__type;
    const registeredNodes = meta.editor._nodes;
    const nodeInfo = registeredNodes.get(type);
    if (nodeInfo === undefined) {
      throw new Error(`Node ${type} is not registered`);
    }
    node = node || new nodeInfo.klass();
    $syncPropertiesFromYjs(meta, attrs, node, null);
    // TODO(collab-v2): be more targeted with splicing, similar to CollabElementNode's syncChildrenFromLexical
    if (node instanceof ElementNode) {
      node.splice(0, node.getChildrenSize(), children);
    }
    meta.mapping.set(el, node.getLatest());
    return node;
  } catch (e) {
    // an error occured while creating the node. This is probably a result of a concurrent action.
    // TODO(collab-v2): also delete the mapped node from editor state.
    el.doc!.transact((transaction) => {
      el._item!.delete(transaction);
    }, meta);
    meta.mapping.delete(el);
    return null;
  }
};

const $createTextNodesFromYText = (
  text: Y.XmlText,
  meta: BindingV2,
  snapshot?: Y.Snapshot,
  prevSnapshot?: Y.Snapshot,
  computeYChange?: ComputeYChange,
): Array<TextNode> | null => {
  const deltas = text.toDelta(snapshot, prevSnapshot, computeYChange);
  const nodes: TextNode[] = (meta.mapping.get(text) as TextNode[]) ?? [];
  while (nodes.length < deltas.length) {
    nodes.push($createTextNode());
  }
  try {
    for (let i = 0; i < deltas.length; i++) {
      const node = nodes[i];
      const delta = deltas[i];
      const {attributes, insert} = delta;
      node.setTextContent(insert);
      const properties = {
        ...attributes.__properties,
        ...attributes.ychange,
      };
      $syncPropertiesFromYjs(meta, properties, node, null);
    }
    while (nodes.length > deltas.length) {
      nodes.pop()!.remove();
    }
  } catch (e) {
    // an error occured while creating the node. This is probably a result of a concurrent action.
    // TODO(collab-v2): also delete the mapped text nodes from editor state.
    text.doc!.transact((transaction) => {
      text._item!.delete(transaction);
    });
    return null;
  }
  meta.mapping.set(
    text,
    nodes.map((node) => node.getLatest()),
  );
  return nodes;
};

const createTypeFromTextNodes = (
  nodes: TextNode[],
  meta: BindingV2,
): Y.XmlText => {
  const type = new Y.XmlText();
  const delta = nodes.map((node) => ({
    // TODO(collab-v2): exclude ychange, handle node state
    attributes: {__properties: propertiesToAttributes(node, meta)},
    insert: node.getTextContent(),
  }));
  type.applyDelta(delta);
  meta.mapping.set(type, nodes);
  return type;
};

const createTypeFromElementNode = (
  node: LexicalNode,
  meta: BindingV2,
): Y.XmlElement => {
  const type = new Y.XmlElement(node.getType());
  // TODO(collab-v2): exclude ychange, handle node state
  const attrs = propertiesToAttributes(node, meta);
  for (const key in attrs) {
    const val = attrs[key];
    if (val !== null) {
      type.setAttribute(key, val);
    }
  }
  if (!(node instanceof ElementNode)) {
    return type;
  }
  type.insert(
    0,
    normalizePNodeContent(node).map((n) =>
      createTypeFromTextOrElementNode(n, meta),
    ),
  );
  meta.mapping.set(type, node);
  return type;
};

const createTypeFromTextOrElementNode = (
  node: LexicalNode | TextNode[],
  meta: BindingV2,
): Y.XmlElement | Y.XmlText =>
  node instanceof Array
    ? createTypeFromTextNodes(node, meta)
    : createTypeFromElementNode(node, meta);

const isObject = (val: unknown) => typeof val === 'object' && val !== null;

const equalAttrs = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pattrs: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yattrs: Record<string, any> | null,
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

const normalizePNodeContent = (pnode: LexicalNode): NormalizedPNodeContent => {
  if (!(pnode instanceof ElementNode)) {
    return [];
  }
  const c = pnode.getChildren();
  const res: NormalizedPNodeContent = [];
  for (let i = 0; i < c.length; i++) {
    const n = c[i];
    if (n instanceof TextNode) {
      const textNodes: TextNode[] = [];
      for (
        let tnode = c[i];
        i < c.length && tnode instanceof TextNode;
        tnode = c[++i]
      ) {
        textNodes.push(tnode);
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
  ytext: Y.XmlText,
  ltexts: TextNode[],
  meta: BindingV2,
) => {
  const delta = ytext.toDelta();
  return (
    delta.length === ltexts.length &&
    delta.every(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (d: any, i: number) =>
        d.insert === ltexts[i].getTextContent() &&
        equalAttrs(
          d.attributes.__properties,
          propertiesToAttributes(ltexts[i], meta),
        ),
    )
  );
};

const equalYTypePNode = (
  ytype: Y.XmlElement | Y.XmlText | Y.XmlHook,
  pnode: LexicalNode | TextNode[],
  meta: BindingV2,
): boolean => {
  if (
    ytype instanceof Y.XmlElement &&
    !(pnode instanceof Array) &&
    matchNodeName(ytype, pnode)
  ) {
    const normalizedContent = normalizePNodeContent(pnode);
    return (
      ytype._length === normalizedContent.length &&
      equalAttrs(ytype.getAttributes(), propertiesToAttributes(pnode, meta)) &&
      ytype
        .toArray()
        .every((ychild, i) =>
          equalYTypePNode(ychild, normalizedContent[i], meta),
        )
    );
  }
  return (
    ytype instanceof Y.XmlText &&
    pnode instanceof Array &&
    equalYTextLText(ytype, pnode, meta)
  );
};

const mappedIdentity = (
  mapped: LexicalNode | TextNode[] | undefined,
  pcontent: LexicalNode | TextNode[],
) =>
  mapped === pcontent ||
  (mapped instanceof Array &&
    pcontent instanceof Array &&
    mapped.length === pcontent.length &&
    mapped.every((a, i) => pcontent[i] === a));

type EqualityFactor = {
  foundMappedChild: boolean;
  equalityFactor: number;
};

const computeChildEqualityFactor = (
  ytype: Y.XmlElement,
  pnode: LexicalNode,
  meta: BindingV2,
): EqualityFactor => {
  const yChildren = ytype.toArray();
  const pChildren = normalizePNodeContent(pnode);
  const pChildCnt = pChildren.length;
  const yChildCnt = yChildren.length;
  const minCnt = Math.min(yChildCnt, pChildCnt);
  let left = 0;
  let right = 0;
  let foundMappedChild = false;
  for (; left < minCnt; left++) {
    const leftY = yChildren[left];
    const leftP = pChildren[left];
    if (mappedIdentity(meta.mapping.get(leftY), leftP)) {
      foundMappedChild = true; // definite (good) match!
    } else if (!equalYTypePNode(leftY, leftP, meta)) {
      break;
    }
  }
  for (; left + right < minCnt; right++) {
    const rightY = yChildren[yChildCnt - right - 1];
    const rightP = pChildren[pChildCnt - right - 1];
    if (mappedIdentity(meta.mapping.get(rightY), rightP)) {
      foundMappedChild = true;
    } else if (!equalYTypePNode(rightY, rightP, meta)) {
      break;
    }
  }
  return {
    equalityFactor: left + right,
    foundMappedChild,
  };
};

const ytextTrans = (
  ytext: Y.Text,
): {nAttrs: Record<string, null>; str: string} => {
  let str = '';
  let n = ytext._start;
  const nAttrs: Record<string, null> = {};
  while (n !== null) {
    if (!n.deleted) {
      if (n.countable && n.content instanceof Y.ContentString) {
        str += n.content.str;
      } else if (n.content instanceof Y.ContentFormat) {
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

const updateYText = (ytext: Y.XmlText, ltexts: TextNode[], meta: BindingV2) => {
  meta.mapping.set(ytext, ltexts);
  const {nAttrs, str} = ytextTrans(ytext);
  const content = ltexts.map((l) => ({
    attributes: Object.assign({}, nAttrs, {
      __properties: propertiesToAttributes(l, meta),
    }),
    insert: l.getTextContent(),
  }));
  const {insert, remove, index} = simpleDiff(
    str,
    content.map((c) => c.insert).join(''),
  );
  ytext.delete(index, remove);
  ytext.insert(index, insert);
  ytext.applyDelta(
    content.map((c) => ({attributes: c.attributes, retain: c.insert.length})),
  );
};

const propertiesToAttributes = (node: LexicalNode, meta: BindingV2) => {
  const properties = getNodeProperties(node, meta);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attrs: Record<string, any> = {};
  properties.forEach((property) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attrs[property] = (node as any)[property];
  });
  return attrs;
};

/**
 * Update a yDom node by syncing the current content of the prosemirror node.e
 */
export const updateYFragment = (
  y: Y.Doc,
  yDomFragment: Y.XmlElement,
  pNode: LexicalNode,
  meta: BindingV2,
  dirtyElements: Set<NodeKey>,
) => {
  if (
    yDomFragment instanceof Y.XmlElement &&
    yDomFragment.nodeName !== pNode.getType() &&
    // TODO(collab-v2): the root XmlElement should have a valid node name
    !(yDomFragment.nodeName === 'UNDEFINED' && pNode.getType() === 'root')
  ) {
    throw new Error('node name mismatch!');
  }
  meta.mapping.set(yDomFragment, pNode);
  // update attributes
  if (yDomFragment instanceof Y.XmlElement) {
    const yDomAttrs = yDomFragment.getAttributes();
    const pAttrs = propertiesToAttributes(pNode, meta);
    for (const key in pAttrs) {
      if (pAttrs[key] !== null) {
        if (yDomAttrs[key] !== pAttrs[key] && key !== 'ychange') {
          yDomFragment.setAttribute(key, pAttrs[key]);
        }
      } else {
        yDomFragment.removeAttribute(key);
      }
    }
    // remove all keys that are no longer in pAttrs
    for (const key in yDomAttrs) {
      if (pAttrs[key] === undefined) {
        yDomFragment.removeAttribute(key);
      }
    }
  }
  // update children
  const pChildren = normalizePNodeContent(pNode);
  const pChildCnt = pChildren.length;
  const yChildren = yDomFragment.toArray();
  const yChildCnt = yChildren.length;
  const minCnt = Math.min(pChildCnt, yChildCnt);
  let left = 0;
  let right = 0;
  // find number of matching elements from left
  for (; left < minCnt; left++) {
    const leftY = yChildren[left];
    const leftP = pChildren[left];
    if (mappedIdentity(meta.mapping.get(leftY), leftP)) {
      if (leftP instanceof ElementNode && dirtyElements.has(leftP.getKey())) {
        updateYFragment(
          y,
          leftY as Y.XmlElement,
          leftP as LexicalNode,
          meta,
          dirtyElements,
        );
      }
    } else {
      if (equalYTypePNode(leftY, leftP, meta)) {
        // update mapping
        meta.mapping.set(leftY, leftP);
      } else {
        break;
      }
    }
  }
  // find number of matching elements from right
  for (; right + left + 1 < minCnt; right++) {
    const rightY = yChildren[yChildCnt - right - 1];
    const rightP = pChildren[pChildCnt - right - 1];
    if (mappedIdentity(meta.mapping.get(rightY), rightP)) {
      if (rightP instanceof ElementNode && dirtyElements.has(rightP.getKey())) {
        updateYFragment(
          y,
          rightY as Y.XmlElement,
          rightP as LexicalNode,
          meta,
          dirtyElements,
        );
      }
    } else {
      if (equalYTypePNode(rightY, rightP, meta)) {
        // update mapping
        meta.mapping.set(rightY, rightP);
      } else {
        break;
      }
    }
  }
  y.transact(() => {
    // try to compare and update
    while (yChildCnt - left - right > 0 && pChildCnt - left - right > 0) {
      const leftY = yChildren[left];
      const leftP = pChildren[left];
      const rightY = yChildren[yChildCnt - right - 1];
      const rightP = pChildren[pChildCnt - right - 1];
      if (leftY instanceof Y.XmlText && leftP instanceof Array) {
        if (!equalYTextLText(leftY, leftP, meta)) {
          updateYText(leftY, leftP, meta);
        }
        left += 1;
      } else {
        let updateLeft =
          leftY instanceof Y.XmlElement && matchNodeName(leftY, leftP);
        let updateRight =
          rightY instanceof Y.XmlElement && matchNodeName(rightY, rightP);
        if (updateLeft && updateRight) {
          // decide which which element to update
          const equalityLeft = computeChildEqualityFactor(
            leftY as Y.XmlElement,
            leftP as LexicalNode,
            meta,
          );
          const equalityRight = computeChildEqualityFactor(
            rightY as Y.XmlElement,
            rightP as LexicalNode,
            meta,
          );
          if (
            equalityLeft.foundMappedChild &&
            !equalityRight.foundMappedChild
          ) {
            updateRight = false;
          } else if (
            !equalityLeft.foundMappedChild &&
            equalityRight.foundMappedChild
          ) {
            updateLeft = false;
          } else if (
            equalityLeft.equalityFactor < equalityRight.equalityFactor
          ) {
            updateLeft = false;
          } else {
            updateRight = false;
          }
        }
        if (updateLeft) {
          updateYFragment(
            y,
            leftY as Y.XmlElement,
            leftP as LexicalNode,
            meta,
            dirtyElements,
          );
          left += 1;
        } else if (updateRight) {
          updateYFragment(
            y,
            rightY as Y.XmlElement,
            rightP as LexicalNode,
            meta,
            dirtyElements,
          );
          right += 1;
        } else {
          meta.mapping.delete(yDomFragment.get(left));
          yDomFragment.delete(left, 1);
          yDomFragment.insert(left, [
            createTypeFromTextOrElementNode(leftP, meta),
          ]);
          left += 1;
        }
      }
    }
    const yDelLen = yChildCnt - left - right;
    if (
      yChildCnt === 1 &&
      pChildCnt === 0 &&
      yChildren[0] instanceof Y.XmlText
    ) {
      meta.mapping.delete(yChildren[0]);
      // Edge case handling https://github.com/yjs/y-prosemirror/issues/108
      // Only delete the content of the Y.Text to retain remote changes on the same Y.Text object
      yChildren[0].delete(0, yChildren[0].length);
    } else if (yDelLen > 0) {
      yDomFragment
        .slice(left, left + yDelLen)
        .forEach((type) => meta.mapping.delete(type));
      yDomFragment.delete(left, yDelLen);
    }
    if (left + right < pChildCnt) {
      const ins = [];
      for (let i = left; i < pChildCnt - right; i++) {
        ins.push(createTypeFromTextOrElementNode(pChildren[i], meta));
      }
      yDomFragment.insert(left, ins);
    }
  }, meta);
};

const matchNodeName = (
  yElement: Y.XmlElement,
  pNode: LexicalNode | TextNode[],
) => !(pNode instanceof Array) && yElement.nodeName === pNode.getType();
