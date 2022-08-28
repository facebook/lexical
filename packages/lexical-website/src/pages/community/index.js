/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import CommunityContributors from '@site/src/components/CommunityContributors';
import CommunityHeader from '@site/src/components/CommunityHeader';
import CommunityHowToContribute from '@site/src/components/CommunityHowToContribute';
import CommunityLinks from '@site/src/components/CommunityLinks';
import Layout from '@theme/Layout';
import React from 'react';

export default function Community() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout description={siteConfig.tagline}>
      <main>
        <div className="container">
          <div className="row">
            <div className="col col--8 col--offset-2">
              <section className="margin-vert--xl">
                <CommunityHeader />
              </section>
              <section className="margin-vert--xl">
                <CommunityLinks />
              </section>
              <section className="margin-vert--xl">
                <CommunityContributors />
              </section>
              <section className="margin-vert--xl">
                <CommunityHowToContribute />
              </section>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
