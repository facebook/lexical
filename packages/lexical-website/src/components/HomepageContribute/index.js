/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Link from '@docusaurus/Link';

const DiscordSvg = require('@site/static/img/discord-logo-color.svg').default;

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
          helping each other in improving Lexical.
        </p>
        <Link
          to="https://discord.gg/KmG4wQnnD9"
          className="group mt-2 flex w-full max-w-md items-center gap-5 rounded-2xl border border-solid border-black/10 bg-white p-5 text-current shadow-md transition-all duration-300 hover:text-current hover:no-underline hover:opacity-70 dark:border-white/10 dark:bg-[#272A36] dark:shadow-lg dark:shadow-white/10">
          <DiscordSvg className="h-14 w-14 shrink-0" alt="Discord" />
          <div className="flex flex-col items-start text-left">
            <span className="font-semibold">Join our Discord</span>
            <span className="text-sm font-light opacity-70">
              Ask questions, share your work and connect with other users
            </span>
          </div>
          <span className="text-xl opacity-40 transition-transform duration-150 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
