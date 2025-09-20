/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {getImageSource} from '../../src/utils/imageUtils';

describe('getImageSource', () => {
  it('should return src when no srcset is present', () => {
    const img = document.createElement('img');
    img.src = 'https://example.com/image.jpg';
    
    expect(getImageSource(img)).toBe('https://example.com/image.jpg');
  });

  it('should return first srcset entry when srcset is present without descriptors', () => {
    const img = document.createElement('img');
    img.src = 'https://example.com/fallback.jpg';
    img.srcset = 'https://example.com/image1.jpg, https://example.com/image2.jpg';
    
    expect(getImageSource(img)).toBe('https://example.com/image1.jpg');
  });

  it('should return first valid URL from srcset with width descriptors', () => {
    const img = document.createElement('img');
    img.src = 'https://example.com/fallback.jpg';
    img.srcset = 'https://example.com/image1.jpg 300w, https://example.com/image2.jpg 600w';
    
    expect(getImageSource(img)).toBe('https://example.com/image1.jpg');
  });

  it('should return first valid URL from srcset with density descriptors', () => {
    const img = document.createElement('img');
    img.src = 'https://example.com/fallback.jpg';
    img.srcset = 'https://example.com/image1.jpg 1x, https://example.com/image2.jpg 2x';
    
    expect(getImageSource(img)).toBe('https://example.com/image1.jpg');
  });

  it('should fall back to src when srcset is malformed', () => {
    const img = document.createElement('img');
    img.src = 'https://example.com/fallback.jpg';
    img.srcset = 'invalid, srcset, format';
    
    expect(getImageSource(img)).toBe('https://example.com/fallback.jpg');
  });

  it('should handle data URLs in srcset', () => {
    const img = document.createElement('img');
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    img.srcset = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg== 1x';
    
    expect(getImageSource(img)).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  });

  it('should return empty string when no src or valid srcset is available', () => {
    const img = document.createElement('img');
    img.srcset = 'invalid, srcset, format';
    
    expect(getImageSource(img)).toBe('');
  });
}); 