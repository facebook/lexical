/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Translate from '@docusaurus/Translate';
import CommunityHeaderSvg from '@site/static/img/community-header.svg';

export default function CommunityHeader() {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2">
      <div className="flex flex-col">
        <h1>
          <Translate
            id="pages.community.header.title"
            description="The title of the header section of the community page">
            We're here to help
          </Translate>
        </h1>

        <p>
          <Translate
            id="pages.community.header.subtext"
            description="The descriptive text of the header section of the community page">
            We are deeply committed to being open-source. That means openly
            helping each other in improving Lexical. We've listed some
            Lexical-related communities that you should check out.
          </Translate>
        </p>
      </div>

      <CommunityHeaderSvg />
    </div>
  );
}
