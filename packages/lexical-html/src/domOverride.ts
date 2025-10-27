/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {AnyDOMRenderMatch, DOMRenderMatch, NodeMatch} from './types';
import type {LexicalNode} from 'lexical';

/**
 * A convenience function for type inference when constructing DOM overrides for
 * use with {@link DOMRenderExtension}.
 *
 * @__NO_SIDE_EFFECTS__
 */

export function domOverride(
  nodes: '*',
  config: Omit<DOMRenderMatch<LexicalNode>, 'nodes'>,
): DOMRenderMatch<LexicalNode>;
export function domOverride<T extends LexicalNode>(
  nodes: readonly NodeMatch<T>[],
  config: Omit<DOMRenderMatch<T>, 'nodes'>,
): DOMRenderMatch<T>;
export function domOverride(
  nodes: AnyDOMRenderMatch['nodes'],
  config: Omit<AnyDOMRenderMatch, 'nodes'>,
): AnyDOMRenderMatch {
  return {...config, nodes};
}
