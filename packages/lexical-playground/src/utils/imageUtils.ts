/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Extracts the best image source from an img element, handling both src and srcset attributes.
 * If srcset is present, it tries to find the most appropriate source based on the current viewport.
 * Falls back to src if srcset is not available or cannot be parsed.
 */
export function getImageSource(img: HTMLImageElement): string {
  // If there's a srcset, try to use it
  if (img.srcset) {
    try {
      // For data URLs, just return the src since srcset parsing is complex
      if (img.src && img.src.startsWith('data:')) {
        return img.src;
      }
      
      // Parse srcset to find the best source
      const srcsetEntries = img.srcset.split(',').map(entry => {
        const trimmed = entry.trim();
        const parts = trimmed.split(/\s+/);
        const url = parts[0];
        const descriptor = parts[1];
        return { url, descriptor };
      });

      // Find the first valid URL from srcset
      for (const entry of srcsetEntries) {
        if (entry.url && isValidImageUrl(entry.url)) {
          return entry.url;
        }
      }
    } catch (error) {
      // If parsing fails, fall back to src
    }
  }

  // Fall back to src attribute
  return img.src || '';
}

/**
 * Validates if a URL looks like a valid image URL.
 * This is a simple validation to avoid using malformed URLs from srcset.
 */
function isValidImageUrl(url: string): boolean {
  // Check if it's a data URL
  if (url.startsWith('data:')) {
    return true;
  }

  // Check if it's a valid HTTP/HTTPS URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return true;
  }

  // Check if it's a relative URL (starts with / or ./ or ../)
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return true;
  }

  // Check if it has a common image extension
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext));
} 