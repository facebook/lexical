/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
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
 * Walk the editor document tree and collect character offsets for every
 * TextNode. Returns the full plain-text content alongside the offset map.
 * Must be called inside editor.getEditorState().read().
 */
export function $collectTextNodeOffsets(): {
  fullText: string;
  textNodes: TextNodeOffset[];
} {
  const root = $getRoot();
  const fullText = root.getTextContent();
  const textNodes: TextNodeOffset[] = [];

  let offset = 0;
  const walk = (node: ElementNode) => {
    for (const child of node.getChildren()) {
      if ($isTextNode(child)) {
        const len = child.getTextContentSize();
        textNodes.push({key: child.getKey(), length: len, start: offset});
        offset += len;
      } else if ($isElementNode(child)) {
        walk(child);
        // Element boundaries (e.g. paragraph breaks) contribute a newline
        offset += 1;
      }
    }
  };
  walk(root);

  return {fullText, textNodes};
}

/**
 * Replace text spans identified by NER entities with structured Lexical nodes.
 *
 * Entities are processed in reverse document order so that earlier offsets
 * remain valid after later splits. Each entity must fall entirely within a
 * single TextNode (cross-node entities are skipped).
 *
 * Must be called inside editor.update().
 *
 * @param textNodes  Offset map produced by $collectTextNodeOffsets
 * @param entities   Entity spans from the NER model
 * @param creators   Map from entity label (e.g. "LOC") to a factory that
 *                   creates the replacement LexicalNode for a given text.
 */
export function $replaceTextWithEntityNodes(
  textNodes: TextNodeOffset[],
  entities: EntitySpan[],
  creators: Record<string, (text: string) => LexicalNode>,
): void {
  // Group entities by the text node they belong to
  const entitiesByNode = new Map<string, EntitySpan[]>();
  for (const entity of entities) {
    const creator = creators[entity.entity];
    if (!creator) {
      continue;
    }
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

  // For each text node, compute all split points at once, then replace
  // the entity segments. Process nodes in any order since they're independent.
  for (const tn of textNodes) {
    const nodeEntities = entitiesByNode.get(tn.key);
    if (!nodeEntities) {
      continue;
    }
    const node = $getNodeByKey(tn.key);
    if (!$isTextNode(node)) {
      continue;
    }

    // Sort entities by start offset ascending within this node
    const sorted = [...nodeEntities].sort((a, b) => a.start - b.start);

    // Collect all unique split points
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

    // Build an offset-to-part-index map: each part starts at a cumulative offset
    // parts[0] starts at 0, parts[1] starts at splitPoints[0], etc.
    const partOffsets = [0, ...splitPoints];

    // Replace entity segments (iterate in reverse so indices stay valid)
    for (let i = sorted.length - 1; i >= 0; i--) {
      const entity = sorted[i];
      const localStart = entity.start - tn.start;
      const partIndex = partOffsets.indexOf(localStart);
      if (partIndex === -1) {
        continue;
      }
      const creator = creators[entity.entity];
      if (!creator) {
        continue;
      }
      parts[partIndex].replace(creator(entity.text));
    }
  }
}
