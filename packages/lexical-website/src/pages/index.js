/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import '../css/custom.css';

import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import HomepageSetup from '@site/src/components/HomepageSetup';
import Layout from '@theme/Layout';
import {inject} from '@vercel/analytics';

import HomepageContribute from '../components/HomepageContribute';

// activate analytics
inject();

function LandingHero() {
  return (
    <header className="flex w-screen flex-col items-center justify-center gap-10 p-10 lg:h-[75vh] lg:flex-row lg:justify-around">
      <div className="w-full space-y-6 lg:min-w-[20rem] lg:max-w-[40rem]">
        <p className="text-4xl font-extrabold lg:text-6xl">
          A text editor framework that does things{' '}
          <span className="text-gradient">differently</span>.
        </p>
        <p className="text-current/10 font-light">
          Lexical is a framework agnostic text editor framework focusing on
          reliability, accessibility and speed. Lexical exposes a set of
          individual, modular packages that can be used to add common features
          like lists, links and tables.
        </p>
        <div className="flex gap-4">
          <Link className="styled-button px-6 py-2" to="/docs/intro">
            Get Started
          </Link>
        </div>
      </div>
      <img
        onClick={() => {
          window.open('https://playground.lexical.dev', '_blank');
        }}
        className="w-full max-w-[40rem] rounded-lg border border-solid border-gray-300/40 transition-all duration-500 hover:cursor-pointer hover:[transform:scale(1.05)] lg:mt-0 lg:min-w-[32rem]"
        src="/img/lexical-preview.png"
        alt="Lexical Logo: containing an icon of a text editor glyph containing a text cursor on the left, with the text of 'Lexical' on the right."
      />
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout description={siteConfig.tagline}>
      <LandingHero />
      <main className="mx-auto mb-12 max-w-[82rem] space-y-12 px-4">
        <HomepageFeatures />
        <HomepageSetup />
        <HomepageContribute />
      </main>
    </Layout>
  );
}
