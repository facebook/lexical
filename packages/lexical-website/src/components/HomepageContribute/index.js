/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Link from '@docusaurus/Link';
import {useColorMode} from '@docusaurus/theme-common';

const StackOverflowSvg = require('@site/static/img/stack-overflow.svg').default;
const GithubDarkSvg = require('@site/static/img/github-mark-dark.svg').default;
const GithubLightSvg =
  require('@site/static/img/github-mark-light.svg').default;
const DiscordSvg = require('@site/static/img/discord-logo-color.svg').default;

const CommunityList = [
  {
    Svg: StackOverflowSvg,
    buttonText: 'View questions',
    title: 'Stack Overflow',
    url: 'https://stackoverflow.com/questions/tagged/lexicaljs',
  },
  {
    DarkSvg: GithubDarkSvg,
    Svg: GithubLightSvg,
    buttonText: 'Repository',
    title: 'Github',
    url: 'https://github.com/facebook/lexical',
  },
  {
    Svg: DiscordSvg,
    buttonText: 'Join server',
    title: 'Discord',
    url: 'https://discord.gg/KmG4wQnnD9',
  },
];

function CommunityCard({Svg, DarkSvg, title, buttonText, url}) {
  const {colorMode} = useColorMode();
  return (
    <div className="flex w-fit flex-col items-center rounded-2xl p-6 text-center">
      {colorMode === 'dark' && DarkSvg ? (
        <DarkSvg className="mb-4 h-16 w-16" alt={title} />
      ) : (
        <Svg className="mb-4 h-16 w-16" alt={title} />
      )}
      <h3 className="text-xl font-bold">{title}</h3>
      <Link className="styled-button px-6 py-2" to={url}>
        {buttonText}
      </Link>
    </div>
  );
}

export default function HomepageContribute() {
  return (
    <section className="mx-4 flex flex-col gap-4 py-8 sm:mx-10 lg:mx-auto">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold lg:max-w-lg lg:text-4xl">
          A <span className="text-gradient">helpful</span> community makes
          open-source better.
        </h1>
        <p className="max-w-xl text-sm font-light">
          We are deeply committed to being open-source. That means openly
          helping each other in improving Lexical. We've listed some
          Lexical-related communities that you can check out.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center gap-2 sm:flex-row lg:gap-8">
        {CommunityList.map((props, idx) => (
          <CommunityCard key={idx} {...props} />
        ))}
      </div>
    </section>
  );
}
