/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';

import ImageSwitcher from '../ImageSwitcher';

const links = [
  {
    description: (
      <Translate
        id="pages.community.links.github.description"
        description="Description of Github community">
        Want to add a new feature or get a bug fixed? Create a pull request or
        raise an issue.
      </Translate>
    ),
    image: (
      <ImageSwitcher
        light={require('@site/static/img/github-mark-light.svg').default}
        dark={require('@site/static/img/github-mark-dark.svg').default}
      />
    ),
    title: (
      <Translate
        id="pages.community.links.github.title"
        description="Hyperlink to Github">
        GitHub
      </Translate>
    ),
    url: 'https://github.com/facebook/lexical',
  },
  {
    description: (
      <Translate
        id="pages.community.links.stackoverflow.description"
        description="Description of StackOverflow community">
        Having trouble using Lexical? Just shoot us a question.
      </Translate>
    ),
    image: (
      <ImageSwitcher
        light={require('@site/static/img/stack-overflow.svg').default}
        dark={require('@site/static/img/stack-overflow.svg').default}
      />
    ),
    title: (
      <Translate
        id="pages.community.links.stackoverflow.title"
        description="Hyperlink to Stack Overflow">
        Stack Overflow
      </Translate>
    ),
    url: 'https://stackoverflow.com/questions/tagged/lexicaljs',
  },
  {
    description: (
      <Translate
        id="pages.community.links.discord.description"
        description="Description of Discord community">
        Let's discuss upcoming features and plans together.
      </Translate>
    ),
    image: (
      <ImageSwitcher
        light={require('@site/static/img/discord-logo-color.svg').default}
        dark={require('@site/static/img/discord-logo-color.svg').default}
      />
    ),
    title: (
      <Translate
        id="pages.community.links.discord.title"
        description="Hyperlink to Discord">
        Discord
      </Translate>
    ),
    url: 'https://discord.gg/KmG4wQnnD9',
  },
];

function CommunityLink({title, url, description, image}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[min-content_auto] lg:gap-20 lg:pl-20">
      <div className="flex h-24 w-24 justify-center overflow-hidden">
        {image}
      </div>

      <div>
        <Link to={url}>
          <h2>{title}</h2>
        </Link>

        <p>{description}</p>
      </div>
    </div>
  );
}

export default function CommunityLinks() {
  return (
    <div>
      {links.map((link, index) => (
        <div key={index} className="mb-4">
          <CommunityLink {...link} />
        </div>
      ))}
    </div>
  );
}
