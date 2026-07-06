/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Analytics} from '@vercel/analytics/react';
import {SpeedInsights} from '@vercel/speed-insights/react';
import * as React from 'react';

// Docusaurus wraps the entire app in the theme `Root` component, so it is the
// canonical place to mount app-wide clients. Both Vercel components render
// nothing during SSR and only activate after hydration in the browser.
export default function Root({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <>
      {children}
      <Analytics />
      <SpeedInsights />
    </>
  );
}
