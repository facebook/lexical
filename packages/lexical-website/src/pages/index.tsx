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
import ToolbarEditor from '@examples/website-toolbar/Editor';
import HomepageConclusion from '@site/src/components/HomepageConclusion';
import HomepageExamples from '@site/src/components/HomepageExamples';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import StackBlitzButton from '@site/src/components/StackBlitzButton';
import Layout from '@theme/Layout';
import {inject} from '@vercel/analytics';

// activate analytics
inject();

function LandingHero() {
  return (
    <div className="flex w-screen flex-col items-center justify-start gap-10 p-10 lg:h-[75vh] lg:flex-row lg:justify-around">
      <div className="w-full space-y-6 lg:max-w-[40rem] lg:min-w-[20rem]">
        <p className="text-4xl font-extrabold lg:text-6xl">
          A text editor framework that does things{' '}
          <span className="text-gradient">differently</span>.
        </p>
        <p className="font-light opacity-70">
          Lexical is a lean text editor framework. It is very lightweight, and
          exposes a set of modular packages that can be used to add common
          features like lists, links and tables.
        </p>
        <div className="flex gap-4">
          <Link className="styled-button px-6 py-2" to="/docs/intro">
            Get Started
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-3 md:w-[530px] lg:min-w-[460px]">
        <ToolbarEditor />
        <div className="flex lg:justify-end">
          <StackBlitzButton examplePath="website-toolbar" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout description={siteConfig.tagline}>
      <main className="space-y-16 sm:space-y-28">
        <LandingHero />
        <HomepageFeatures />
        <HomepageExamples />
        <HomepageConclusion />
      </main>
    </Layout>
  );
}
