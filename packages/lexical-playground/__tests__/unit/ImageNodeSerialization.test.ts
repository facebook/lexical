/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {$getRoot} from 'lexical';
import {describe, expect, test} from 'vitest';

import {$createImageNode, ImageNode} from '../../src/nodes/ImageNode';

describe('ImageNode serialization', () => {
  test('an unsized image round-trips through its 0 sentinel', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[image-serialization]',
        nodes: [ImageNode],
      }),
    );
    let json: ReturnType<ImageNode['exportJSON']> | undefined;
    editor.update(
      () => {
        // No width/height given, so both are the 'inherit' sentinel.
        const image = $createImageNode({altText: 'alt', src: 'x.png'});
        $getRoot().append(image);
        json = image.exportJSON();
      },
      {discrete: true},
    );
    // 'inherit' has always serialized as 0 ...
    expect(json).toMatchObject({
      altText: 'alt',
      height: 0,
      src: 'x.png',
      width: 0,
    });

    editor.update(
      () => {
        // ... and parsing 0 (or an absent property) restores the sentinel,
        // rather than sizing the image to zero pixels.
        const restored = ImageNode.importJSON(json!) as ImageNode;
        expect(restored.__width).toBe('inherit');
        expect(restored.__height).toBe('inherit');
        const fromLegacy = ImageNode.importJSON({
          altText: 'alt',
          src: 'x.png',
          type: 'image',
          version: 1,
        } as unknown as Parameters<
          typeof ImageNode.importJSON
        >[0]) as ImageNode;
        expect(fromLegacy.__width).toBe('inherit');
        expect(fromLegacy.__height).toBe('inherit');
      },
      {discrete: true},
    );

    editor.update(
      () => {
        // A real size still round-trips unchanged.
        const sized = $createImageNode({
          altText: 'alt',
          height: 24,
          src: 'x.png',
          width: 42,
        });
        const restored = ImageNode.importJSON(sized.exportJSON()) as ImageNode;
        expect(restored.__width).toBe(42);
        expect(restored.__height).toBe(24);
      },
      {discrete: true},
    );
  });
});
