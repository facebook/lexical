/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import BrowserOnly from '@docusaurus/BrowserOnly';
import {useEffect, useState} from 'react';

export default function GalleryPage() {
  return <BrowserOnly>{() => <GalleryImpl />}</BrowserOnly>;
}

function GalleryImpl() {
  const [internGallery, setInternGallery] = useState(null);

  useEffect(() => {
    try {
      if (process.env.FB_INTERNAL) {
        import('../../../InternGalleryPage').then(setInternGallery);
      }
    } catch (e) {
      throw e;
    }
  }, []);
  return internGallery != null ? internGallery.InternGalleryPage() : <></>;
}
