/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {type DecoratorTextNode} from '@lexical/extension';
import {
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  $isTextNode,
  type ElementNode,
  type TextNode,
} from 'lexical';

export interface TextNodeOffset {
  key: string;
  length: number;
  start: number;
}

export interface EntitySpan {
  end: number;
  entity: string;
  start: number;
  text: string;
}

/**
 * Walk the editor tree and build a plain-text string by concatenating
 * the content of every TextNode with a single space between block-level
 * boundaries. Returns the concatenated text alongside an offset map that
 * records where each TextNode's content starts within that string.
 *
 * Unlike `$getRoot().getTextContent()` which inserts `\n\n` between
 * paragraphs, this function joins blocks with a single space so that
 * NER character offsets map 1-to-1 back to TextNode positions without
 * fragile separator arithmetic.
 */
export function $collectTextNodeOffsets(): {
  fullText: string;
  textNodes: TextNodeOffset[];
} {
  const textNodes: TextNodeOffset[] = [];
  const chunks: string[] = [];
  let offset = 0;

  let isFirstBlock = true;
  const walk = (node: ElementNode) => {
    for (const child of node.getChildren()) {
      if ($isTextNode(child)) {
        const content = child.getTextContent();
        textNodes.push({
          key: child.getKey(),
          length: content.length,
          start: offset,
        });
        chunks.push(content);
        offset += content.length;
      } else if ($isElementNode(child)) {
        if (!child.isInline()) {
          if (!isFirstBlock) {
            chunks.push(' ');
            offset += 1;
          }
          isFirstBlock = false;
        }
        walk(child);
      } else {
        const content = child.getTextContent();
        if (content.length > 0) {
          chunks.push(content);
          offset += content.length;
        }
      }
    }
  };
  walk($getRoot());

  return {fullText: chunks.join(''), textNodes};
}

/**
 * Wrap a DecoratorTextNode factory so it copies the text format from
 * the source TextNode and replaces it in the tree.
 */
export function replaceWithEntity(
  create: (text: string) => DecoratorTextNode,
): (textNode: TextNode) => void {
  return (textNode) => {
    const entity = create(textNode.getTextContent());
    entity.setFormat(textNode.getFormat());
    textNode.replace(entity);
  };
}

/**
 * Replace text spans identified by NER entities with structured Lexical nodes.
 *
 * Entities are grouped by their parent TextNode and all split points for a
 * given node are computed at once so that a single `splitText` call produces
 * stable part references. Replacements within each node are then applied in
 * reverse order to keep array indices valid.
 *
 * @param textNodes  Offset map produced by `$collectTextNodeOffsets`
 * @param entities   Entity spans from the NER model
 * @param replacers  Map from entity label (e.g. `"LOC"`) to a function that
 *                   receives the split TextNode and replaces it in-place.
 *                   Use `$replaceWithEntity` to create these from a factory.
 */
export function $replaceTextWithEntityNodes(
  textNodes: TextNodeOffset[],
  entities: EntitySpan[],
  replacers: Record<string, (textNode: TextNode) => void>,
): void {
  // Group entities by the text node they belong to
  const entitiesByNode = new Map<string, EntitySpan[]>();
  for (const entity of entities) {
    if (replacers[entity.entity]) {
      for (const tn of textNodes) {
        const nodeEnd = tn.start + tn.length;
        if (entity.start >= tn.start && entity.end <= nodeEnd) {
          let list = entitiesByNode.get(tn.key);
          if (!list) {
            list = [];
            entitiesByNode.set(tn.key, list);
          }
          list.push(entity);
          break;
        }
      }
    }
  }

  // For each text node, compute all split points at once, then replace
  // the entity segments. Nodes are independent so processing order is
  // irrelevant.
  for (const tn of textNodes) {
    const nodeEntities = entitiesByNode.get(tn.key);
    const node = $getNodeByKey(tn.key);
    if (!nodeEntities || !$isTextNode(node)) {
      continue;
    }

    // Sort entities by start offset ascending within this node
    const sorted = [...nodeEntities].sort((a, b) => a.start - b.start);

    // Collect all unique split points (local to this text node)
    const splitPointSet = new Set<number>();
    for (const entity of sorted) {
      const localStart = entity.start - tn.start;
      const localEnd = entity.end - tn.start;
      if (localStart > 0) {
        splitPointSet.add(localStart);
      }
      if (localEnd < tn.length) {
        splitPointSet.add(localEnd);
      }
    }

    const splitPoints = [...splitPointSet].sort((a, b) => a - b);

    // Split once to get all segments
    const parts =
      splitPoints.length > 0 ? node.splitText(...splitPoints) : [node];

    // Build an offset-to-part-index map: parts[0] starts at 0,
    // parts[1] starts at splitPoints[0], etc.
    const partOffsets = [0, ...splitPoints];

    // Replace entity segments (iterate in reverse so indices stay valid)
    for (let i = sorted.length - 1; i >= 0; i--) {
      const entity = sorted[i];
      const localStart = entity.start - tn.start;
      const partIndex = partOffsets.indexOf(localStart);
      if (partIndex >= 0) {
        const replacer = replacers[entity.entity];
        if (replacer) {
          replacer(parts[partIndex]);
        }
      }
    }
  }
}
