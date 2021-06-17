/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createImageNode, ImageNode} from 'outline/ImageNode';
import {initializeUnitTest} from '../utils';

const editorThemeClasses = Object.freeze({
  image: 'my-image-class',
});

describe('OutlineImageNode tests', () => {
  initializeUnitTest((testEnv) => {
    const src = 'image.jpg';
    const alt = 'Example Image';

    test('ImageNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const imageNode = new ImageNode(src, alt);
        expect(imageNode.__src).toBe(src);
        expect(imageNode.__altText).toBe(alt);
        expect(imageNode.getFlags()).toBe(0);
        expect(imageNode.getType()).toBe('image');
        expect(imageNode.getTextContent()).toBe('');
      });
      expect(() => new ImageNode(src, alt)).toThrow();
    });

    test('ImageNode.clone()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const imageNode = new ImageNode(src, alt);
        const imageNodeClone = imageNode.clone();
        expect(imageNodeClone).not.toBe(imageNode);
        expect(imageNode.__type).toEqual(imageNodeClone.__type);
        expect(imageNode.__flags).toEqual(imageNodeClone.__flags);
        expect(imageNode.__parent).toEqual(imageNodeClone.__parent);
        expect(imageNode.__src).toEqual(imageNodeClone.__src);
        expect(imageNode.__altText).toEqual(imageNodeClone.__altText);
        expect(imageNode.__key).toEqual(imageNodeClone.__key);
      });
    });

    test('ImageNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const imageNode = new ImageNode(src, alt);
        expect(imageNode.createDOM(editorThemeClasses).outerHTML).toBe(
          '<div class="my-image-class"><img src="image.jpg" alt="Example Image"></div>',
        );
        expect(imageNode.createDOM({}).outerHTML).toBe(
          '<div><img src="image.jpg" alt="Example Image"></div>',
        );
      });
    });

    test('ImageNode.updateDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const tryUpdateDOM = (newSrc, newAlt) => {
          const newImageNode = new ImageNode(newSrc, newAlt);
          const imageNode = new ImageNode(src, alt);
          const domElement = imageNode.createDOM(editorThemeClasses);
          expect(domElement.outerHTML).toBe(
            '<div class="my-image-class"><img src="image.jpg" alt="Example Image"></div>',
          );
          const result = newImageNode.updateDOM(imageNode, domElement);
          expect(result).toBe(false);
          expect(domElement.outerHTML).toBe(
            `<div class="my-image-class"><img src="${newSrc}" alt="${newAlt}"></div>`,
          );
        };
        tryUpdateDOM(src, alt);
        tryUpdateDOM('image2.jpg', alt);
        tryUpdateDOM(src, 'Example Image 2');
        tryUpdateDOM('image2.jpg', 'Example Image 2');
      });
    });

    test('ImageNode.isImage()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const imageNode = new ImageNode(src, alt);
        expect(imageNode.isImage()).toBe(true);
      });
    });

    test('createImageNode()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const imageNode = new ImageNode(src, alt);
        const createdImageNode = createImageNode(src, alt);
        expect(imageNode.__type).toEqual(createdImageNode.__type);
        expect(imageNode.__flags).toEqual(createdImageNode.__flags);
        expect(imageNode.__parent).toEqual(createdImageNode.__parent);
        expect(imageNode.__src).toEqual(createdImageNode.__src);
        expect(imageNode.__altText).toEqual(createdImageNode.__altText);
        expect(imageNode.__key).not.toEqual(createdImageNode.__key);
      });
    });
  });
});
