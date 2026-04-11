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
import CommunityTeam from '@site/src/components/CommunityTeam';
import Layout from '@theme/Layout';

export default function Community() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout description={siteConfig.tagline}>
      <main>
        <div className="mx-auto my-20 flex max-w-220 flex-col gap-16 px-4">
          <CommunityHeader />

          <CommunityLinks />

          <CommunityHowToContribute />

          <CommunityTeam />

          <CommunityContributors />
        </div>
      </main>
    </Layout>
  );
}
