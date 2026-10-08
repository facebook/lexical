/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CompiledMdast} from './types';
import type {Nodes, Root} from 'mdast';

import {fromMarkdown} from 'mdast-util-from-markdown';

type Point = NonNullable<Nodes['position']>['start'];

/**
 * Parses `markdown` with the registry's extensions. The import reads the
 * source by offset, so every parse whose tree is imported goes through here,
 * which also fills the offsets a tree transform left out.
 */
export function parseMarkdown(
  compiled: Pick<CompiledMdast, 'mdastExtensions' | 'micromarkExtensions'>,
  markdown: string,
): Root {
  const tree = fromMarkdown(markdown, {
    extensions: compiled.micromarkExtensions,
    mdastExtensions: compiled.mdastExtensions,
  });
  // Only a tree transform can leave a point without an offset.
  if (
    compiled.mdastExtensions
      .flat()
      .some(extension => extension.transforms && extension.transforms.length)
  ) {
    fillOffsets(tree, markdown);
  }
  return tree;
}

/**
 * Gives each point in `tree` that has a line and column but no offset the
 * offset they stand for in `source`, which the tree was parsed from. A tree
 * transform may leave points without offsets, and the import reads the
 * source by offset.
 */
export function fillOffsets(tree: Nodes, source: string): void {
  let lineStarts: number[] | null = null;
  const fill = (point: Point) => {
    if (
      point.offset != null ||
      point.line == null ||
      point.column == null ||
      // A transform may share one frozen position; it keeps no offset.
      Object.isFrozen(point)
    ) {
      return;
    }
    if (lineStarts === null) {
      lineStarts = [0];
      for (const match of source.matchAll(/\r\n?|\n/g)) {
        lineStarts.push(match.index + match[0].length);
      }
    }
    const lineStart = lineStarts[point.line - 1];
    if (lineStart !== undefined) {
      point.offset = lineStart + point.column - 1;
    }
  };
  const stack: Nodes[] = [tree];
  for (let node = stack.pop(); node !== undefined; node = stack.pop()) {
    if (node.position) {
      fill(node.position.start);
      fill(node.position.end);
    }
    if ('children' in node) {
      for (const child of node.children as Nodes[]) {
        stack.push(child);
      }
    }
  }
}
