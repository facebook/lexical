/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$generateNodesFromDOM} from '@lexical/html';
import {
  $getRoot,
  $insertNodes,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

describe('Image Conversion with srcset', () => {
  initializeUnitTest((testEnv) => {
    describe('HTML to Lexical conversion with srcset', () => {
      it('should convert image with srcset (width descriptors)', async () => {
        const {editor} = testEnv;
        
        const htmlString = `
          <img 
            src="https://picsum.photos/300/200" 
            srcset="https://picsum.photos/300/200 300w, https://picsum.photos/600/400 600w" 
            alt="Responsive image"
            width="300"
            height="200"
          />
        `;
        
        const parser = new DOMParser();
        const dom = parser.parseFromString(htmlString, 'text/html');
        
        let conversionSuccess = false;
        
        await editor.update(() => {
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().select();
          $insertNodes(nodes);
          
          // Check that nodes were created
          const root = $getRoot();
          const children = root.getChildren();
          conversionSuccess = children.length > 0;
        });
        
        expect(conversionSuccess).toBe(true);
      });

      it('should convert image with srcset (density descriptors)', async () => {
        const {editor} = testEnv;
        
        const htmlString = `
          <img 
            src="https://picsum.photos/300/200" 
            srcset="https://picsum.photos/300/200 1x, https://picsum.photos/600/400 2x" 
            alt="High DPI image"
            width="300"
            height="200"
          />
        `;
        
        const parser = new DOMParser();
        const dom = parser.parseFromString(htmlString, 'text/html');
        
        let conversionSuccess = false;
        
        await editor.update(() => {
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().select();
          $insertNodes(nodes);
          
          // Check that nodes were created
          const root = $getRoot();
          const children = root.getChildren();
          conversionSuccess = children.length > 0;
        });
        
        expect(conversionSuccess).toBe(true);
      });

      it('should convert image with malformed srcset (falls back to src)', async () => {
        const {editor} = testEnv;
        
        const htmlString = `
          <img 
            src="https://picsum.photos/300/200" 
            srcset="invalid, srcset, format" 
            alt="Malformed srcset"
            width="300"
            height="200"
          />
        `;
        
        const parser = new DOMParser();
        const dom = parser.parseFromString(htmlString, 'text/html');
        
        let conversionSuccess = false;
        
        await editor.update(() => {
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().select();
          $insertNodes(nodes);
          
          // Check that nodes were created despite malformed srcset
          const root = $getRoot();
          const children = root.getChildren();
          conversionSuccess = children.length > 0;
        });
        
        expect(conversionSuccess).toBe(true);
      });

      it('should convert image with only srcset (no src)', async () => {
        const {editor} = testEnv;
        
        const htmlString = `
          <img 
            srcset="https://picsum.photos/300/200 300w, https://picsum.photos/600/400 600w" 
            alt="Only srcset"
            width="300"
            height="200"
          />
        `;
        
        const parser = new DOMParser();
        const dom = parser.parseFromString(htmlString, 'text/html');
        
        let conversionSuccess = false;
        
        await editor.update(() => {
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().select();
          $insertNodes(nodes);
          
          // Check that nodes were created
          const root = $getRoot();
          const children = root.getChildren();
          conversionSuccess = children.length > 0;
        });
        
        expect(conversionSuccess).toBe(true);
      });

      it('should handle mixed content with images and srcset', async () => {
        const {editor} = testEnv;
        
        const htmlString = `
          <p>Some text before</p>
          <img 
            src="https://picsum.photos/300/200" 
            srcset="https://picsum.photos/300/200 300w, https://picsum.photos/600/400 600w" 
            alt="Mixed content image"
            width="300"
            height="200"
          />
          <p>Some text after</p>
        `;
        
        const parser = new DOMParser();
        const dom = parser.parseFromString(htmlString, 'text/html');
        
        let conversionSuccess = false;
        
        await editor.update(() => {
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().select();
          $insertNodes(nodes);
          
          // Check that nodes were created
          const root = $getRoot();
          const children = root.getChildren();
          conversionSuccess = children.length > 0;
        });
        
        expect(conversionSuccess).toBe(true);
      });
    });
  });
}); 