/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React from 'react';

import CommnunityContributors from '../../components/CommunityContributors';
import CommunityHeader from '../../components/CommunityHeader';
import CommunityLinks from '../../components/CommunityLinks';

export default function Community() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout description={siteConfig.tagline}>
      <main>
        <div className="container">
          <div className="row">
            <div className="col col--2" />
            <div className="col col--8">
              <section className="margin-vert--xl">
                <CommunityHeader />
              </section>
              <section>
                <CommunityLinks />
              </section>
              <section className="margin-vert--xl">
                <CommnunityContributors />
              </section>
            </div>
            <div className="col col--2" />
          </div>
        </div>
      </main>
    </Layout>
  );
}
