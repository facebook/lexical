/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Translate from '@docusaurus/Translate';
import React from 'react';

const CONTRIBUTORS = [
  {
    imageUrl: 'https://github.com/trueadm.png',
    link: 'https://github.com/trueadm',
    name: 'Dominic Gannaway',
  },
  {
    imageUrl: 'https://github.com/zurfyx.png',
    link: 'https://github.com/zurfyx',
    name: 'Gerard Rovira',
  },
  {
    imageUrl: 'https://github.com/acywatson.png',
    link: 'https://github.com/acywatson',
    name: 'Acy Watson',
  },
  {
    imageUrl: 'https://github.com/trueadm.png',
    link: 'https://github.com/trueadm',
    name: 'Dominic Gannaway',
  },
  {
    imageUrl: 'https://github.com/zurfyx.png',
    link: 'https://github.com/zurfyx',
    name: 'Gerard Rovira',
  },
  {
    imageUrl: 'https://github.com/acywatson.png',
    link: 'https://github.com/acywatson',
    name: 'Acy Watson',
  },
];

export default function CommunityContributors() {
  return (
    <div>
      <h2>
        <Translate
          id="pages.community.contributors.subHeader"
          description="Subtitle of section on contributors"
        >
          Contributors
        </Translate>
      </h2>
      <div className="row">
        <div className="col col--9">
          <p>
            <Translate
              id="pages.community.contributors.subtext"
              description="The descriptive text of the header section of the community page"
            >
              Lexical development is led by small team at Meta. It also receives
              contributions from people all over the world. Here are just a few
              members.
            </Translate>
          </p>
          <p>
            <a
              href="https://github.com/facebook/lexical/graphs/contributors"
              target="_blank"
              rel="noopener"
            >
              <Translate
                id="pages.community.contributors.gitHubLink"
                description="Link to GitHub's contribute page for the repository"
              >
                See the rest of the contributors on Github.
              </Translate>
            </a>
          </p>
        </div>
      </div>
      <div className="row">
        {CONTRIBUTORS.map(({name, imageUrl, link}, index) => (
          <div className="col col--3 margin-top--lg" key={index}>
            <div className="avatar avatar--vertical text--center">
              <div>
                <img
                  class="avatar__photo avatar__photo--xl"
                  alt={name}
                  src={imageUrl}
                />
              </div>
              <div className="margin-top--xs">
                <a
                  className="avatar__name"
                  href={link}
                  target="_blank"
                  rel="noopener"
                >
                  {name}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
