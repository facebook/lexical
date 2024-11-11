/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Translate from '@docusaurus/Translate';

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
    imageUrl: 'https://github.com/fantactuka.png',
    link: 'https://github.com/fantactuka',
    name: 'Maksim Horbachevsky',
  },
  {
    imageUrl: 'https://github.com/prontiol.png',
    link: 'https://github.com/prontiol',
    name: 'Denys Mikhailenko',
  },
  {
    imageUrl: 'https://github.com/thegreatercurve.png',
    link: 'https://github.com/thegreatercurve',
    name: 'John Flockton',
  },
  {
    imageUrl: 'https://github.com/tylerjbainbridge.png',
    link: 'https://github.com/tylerjbainbridge',
    name: 'Tyler Bainbridge',
  },
  {
    imageUrl: 'https://github.com/yangshun.png',
    link: 'https://github.com/yangshun',
    name: 'Yangshun Tay',
  },
  {
    imageUrl: 'https://github.com/kraisler.png',
    link: 'https://github.com/kraisler',
    name: 'Ken Kraisler',
  },
];

export default function CommunityContributors() {
  return (
    <div>
      <h2>
        <Translate
          id="pages.community.contributors.subHeader"
          description="Subtitle of section on contributors">
          Contributors
        </Translate>
      </h2>

      <p>
        <Translate
          id="pages.community.contributors.subtext"
          description="The descriptive text of the header section of the community page">
          Lexical development is led by small team at Meta. It also receives
          contributions from people all over the world. Here are just a few
          members.
        </Translate>
      </p>

      <p>
        <a
          href="https://github.com/facebook/lexical/graphs/contributors"
          target="_blank"
          rel="noreferrer">
          <Translate
            id="pages.community.contributors.gitHubLink"
            description="Link to GitHub's contribute page for the repository">
            See the rest of the contributors on Github.
          </Translate>
        </a>
      </p>

      <div className="mt-12 flex flex-wrap items-stretch gap-10">
        {CONTRIBUTORS.map(({name, imageUrl, link}, index) => (
          <div key={index} className="flex w-44 flex-col items-center gap-2">
            <img className="w-24 rounded-full" alt={name} src={imageUrl} />

            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="text-center font-bold">
              {name}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
