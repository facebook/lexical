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
  // Sort descending by start so replacements don't shift earlier offsets
  const sorted = [...entities].sort((a, b) => b.start - a.start);

  for (const entity of sorted) {
    const creator = creators[entity.entity];
    if (!creator) {
      continue;
    }

    for (const tn of textNodes) {
      const nodeEnd = tn.start + tn.length;
      // Entity must fall entirely within this text node
      if (entity.start >= tn.start && entity.end <= nodeEnd) {
        const node = $getNodeByKey(tn.key);
        if (!$isTextNode(node)) {
          break;
        }

        const localStart = entity.start - tn.start;
        const localEnd = entity.end - tn.start;

        // Split the text node to isolate the entity text
        const splitPoints: number[] = [];
        if (localEnd < tn.length) {
          splitPoints.push(localEnd);
        }
        if (localStart > 0) {
          splitPoints.push(localStart);
        }

        let targetNode = node;
        if (splitPoints.length > 0) {
          const parts = node.splitText(...splitPoints);
          // After splitting, the entity text is at index 1 if we split at
          // localStart, otherwise index 0
          targetNode = localStart > 0 ? parts[1] : parts[0];
        }

        targetNode.replace(creator(entity.text));
        break;
      }
    }
  }
}
