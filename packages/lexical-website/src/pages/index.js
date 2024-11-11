/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import '../css/tailwind.css';

import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import HomepageExamples from '@site/src/components/HomepageExamples';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Layout from '@theme/Layout';
import {inject} from '@vercel/analytics';

// activate analytics
inject();

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className="flex flex-col items-center bg-[#020528] p-8 text-center text-white lg:py-16">
      <h1 className="text-[300%]">
        <img
          className="w-[8em]"
          src="/img/logo-dark.svg"
          alt="Lexical Logo: containing an icon of a text editor glyph containing a text cursor on the left, with the text of 'Lexical' on the right."
        />
      </h1>

      <p className="text-2xl">{siteConfig.tagline}</p>

      <div className="flex gap-4">
        <Link
          className="whitespace-nowrap rounded-md bg-white/90 px-6 py-2 text-sm font-bold text-black transition-opacity hover:text-black hover:no-underline hover:opacity-90"
          to="/docs/intro">
          Get Started
        </Link>

        <Link
          className="whitespace-nowrap rounded-md px-6 py-2 text-sm font-bold text-white hover:text-white hover:no-underline"
          to="https://playground.lexical.dev">
          Visit Playground
        </Link>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout description={siteConfig.tagline}>
      <HomepageHeader />

      <main className="mx-auto max-w-[82rem] px-4">
        <div className="my-8">
          <HomepageFeatures />
        </div>

        <div className="my-8">
          <HomepageExamples />
        </div>
      </main>
    </Layout>
  );
}
