/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Swizzled (ejected) from `@docusaurus/theme-classic` to render a
 * server-side `CopyPageButton` in a persistent right-hand column.
 *
 * Unlike the upstream layout, the right column is rendered on every doc page
 * (not only when a table of contents exists) so the "Copy page" button always
 * appears in the same place. On narrow viewports the right column is hidden and
 * the button falls back to the top of the article. Because the button is part
 * of the static HTML, it never flashes in after hydration.
 */

import type {Props} from '@theme/DocItem/Layout';

import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {useWindowSize} from '@docusaurus/theme-common';
import ContentVisibility from '@theme/ContentVisibility';
import DocBreadcrumbs from '@theme/DocBreadcrumbs';
import DocItemContent from '@theme/DocItem/Content';
import DocItemFooter from '@theme/DocItem/Footer';
import DocItemPaginator from '@theme/DocItem/Paginator';
import DocItemTOCDesktop from '@theme/DocItem/TOC/Desktop';
import DocItemTOCMobile from '@theme/DocItem/TOC/Mobile';
import DocVersionBadge from '@theme/DocVersionBadge';
import DocVersionBanner from '@theme/DocVersionBanner';
import clsx from 'clsx';
import React, {type ReactNode} from 'react';

import CopyPageButton from '../../../components/CopyPageButton';
import styles from './styles.module.css';

function useDocTOC() {
  const {frontMatter, toc} = useDoc();
  const windowSize = useWindowSize();

  const hidden = frontMatter.hide_table_of_contents;
  const canRender = !hidden && toc.length > 0;

  const mobile = canRender ? <DocItemTOCMobile /> : undefined;

  const desktop =
    canRender && (windowSize === 'desktop' || windowSize === 'ssr') ? (
      <DocItemTOCDesktop />
    ) : undefined;

  return {
    desktop,
    hidden,
    mobile,
  };
}

export default function DocItemLayout({children}: Props): ReactNode {
  const docTOC = useDocTOC();
  const {metadata} = useDoc();
  return (
    <div className="row">
      <div className={clsx('col', styles.docItemCol)}>
        <ContentVisibility metadata={metadata} />
        <DocVersionBanner />
        <div className={styles.docItemContainer}>
          <article>
            <DocBreadcrumbs />
            <DocVersionBadge />
            <div className={styles.copyPageMobile}>
              <CopyPageButton />
            </div>
            {docTOC.mobile}
            <DocItemContent>{children}</DocItemContent>
            <DocItemFooter />
          </article>
          <DocItemPaginator />
        </div>
      </div>
      <div className={clsx('col col--3', styles.tocCol)}>
        <div className={styles.copyPageDesktop}>
          <CopyPageButton />
        </div>
        {docTOC.desktop}
      </div>
    </div>
  );
}
