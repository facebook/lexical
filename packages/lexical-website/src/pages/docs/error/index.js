/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import BrowserOnly from '@docusaurus/BrowserOnly';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React, {useMemo} from 'react';

import codes from '../../../../../../scripts/error-codes/codes.json';
import styles from './styles.module.css';

export default function ErrorCodePage() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout description={siteConfig.tagline}>
      <div className="container padding-top--md padding-bottom--lg">
        <h1>Error Code</h1>
        <p>
          In the minified production build of Lexical, we avoid sending down
          full error messages in order to reduce the number of bytes sent over
          the wire.
        </p>

        <p>
          We highly recommend using the development build locally when debugging
          your app since it tracks additional debug info and provides helpful
          warnings about potential problems in your apps, but if you encounter
          an exception while using the production build, this page will
          reassemble the original text of the error.
        </p>

        <BrowserOnly>{() => <ErrorFinder />}</BrowserOnly>
      </div>
    </Layout>
  );
}

function ErrorFinder() {
  const error = useMemo(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code === null) {
      return null;
    }
    const description = codes[code];
    if (description === undefined) {
      return null;
    }
    return {code, description};
  }, []);

  if (error !== null) {
    return (
      <>
        <h2>Error code #{error.code}</h2>
        <div className={styles.errorContainer}>{error.description}</div>
      </>
    );
  } else {
    return (
      <p>
        When you encounter an error, you'll receive a link to this page for that
        specific error and we'll show you the full error text.
      </p>
    );
  }
}
