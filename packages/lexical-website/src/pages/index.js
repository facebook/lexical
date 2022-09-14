/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import HomepageExamples from '@site/src/components/HomepageExamples';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Layout from '@theme/Layout';
import clsx from 'clsx';
import React from 'react';

import styles from './styles.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header
      className={clsx('hero hero--dark hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">
          <img
            className={styles.logo}
            src="/img/logo-dark.svg"
            alt="Lexical Logo: containing an icon of a text editor glyph containing a text cursor on the left, with the text of 'Lexical' on the right."
          />
        </h1>
        <p className={clsx('hero__subtitle', styles.tagline)}>
          {siteConfig.tagline}
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary margin-right--sm"
            to="/docs/intro">
            Get Started
          </Link>
          <Link
            className="button button--outline margin-left--sm"
            to="https://playground.lexical.dev">
            Visit Playground
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <div className="margin-vert--lg">
          <HomepageFeatures />
        </div>
        <div className="margin-vert--lg">
          <HomepageExamples />
        </div>
      </main>
    </Layout>
  );
}
