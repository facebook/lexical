/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {AnyDOMConfigMatch, DOMConfigMatch, NodeMatch} from './types';
import type {LexicalNode} from 'lexical';

/**
 * A convenience function for type inference when constructing DOM overrides for
 * use with {@link DOMExtension}.
 *
 * @__NO_SIDE_EFFECTS__
 */

export function domOverride(
  nodes: '*',
  config: Omit<DOMConfigMatch<LexicalNode>, 'nodes'>,
): DOMConfigMatch<LexicalNode>;
export function domOverride<T extends LexicalNode>(
  nodes: readonly NodeMatch<T>[],
  config: Omit<DOMConfigMatch<T>, 'nodes'>,
): DOMConfigMatch<T>;
export function domOverride(
  nodes: AnyDOMConfigMatch['nodes'],
  config: Omit<AnyDOMConfigMatch, 'nodes'>,
): AnyDOMConfigMatch {
  return {...config, nodes};
}
