/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React from 'react';

import styles from './styles.module.css';

export default function ErrorCodePage({errorCode, errorDescription}) {
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

        {errorDescription != null ? (
          <>
            <h2>Error code #{errorCode}</h2>
            <div className={styles.errorContainer}>{errorDescription}</div>
          </>
        ) : (
          <p>
            When you encounter an error, you'll receive a link to this page for
            that specific error and we'll show you the full error text.
          </p>
        )}
      </div>
    </Layout>
  );
}
