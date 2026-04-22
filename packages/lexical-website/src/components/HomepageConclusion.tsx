/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Link from '@docusaurus/Link';
import DiscordSvg from '@site/static/img/discord-logo-color.svg';
import DocsSvg from '@site/static/img/documentation.svg';
import React from 'react';

interface CardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkLabel: string;
  to?: string;
  href?: string;
}

function Card({icon, title, description, linkLabel, to, href}: CardProps) {
  return (
    <Link
      to={to}
      href={href}
      className="group flex flex-1 flex-col gap-4 rounded-2xl p-8 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-1 hover:no-underline"
      style={{
        color: 'inherit',
      }}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
          {icon}
        </div>
        <h3 className="m-0 text-lg font-bold">{title}</h3>
      </div>
      <p className="m-0 text-sm font-light opacity-70">{description}</p>
      <span className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-(--ifm-color-primary-dark)">
        {linkLabel}
        <span className="transition-transform duration-150 group-hover:translate-x-1">
          →
        </span>
      </span>
    </Link>
  );
}

export default function HomepageConclusion() {
  return (
    <section className="px-4 py-12 sm:px-10">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-12">
        <div className="space-y-3 text-center">
          <p className="text-sm font-light tracking-widest uppercase opacity-70">
            What's next?
          </p>
          <h2 className="text-3xl font-light lg:text-4xl">
            You've seen a{' '}
            <span className="text-gradient font-bold">glimpse</span> of what
            Lexical can do.
          </h2>
        </div>
        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <Card
            icon={<DiscordSvg className="h-8 w-8" aria-label="Discord" />}
            title="Community"
            description="Have a question? Found a bug? Want to share something you built? The discord server is the right place to go to."
            linkLabel="Join our Discord"
            href="https://discord.gg/KmG4wQnnD9"
          />
          <Card
            icon={<DocsSvg className="h-8 w-8" aria-label="Documentation" />}
            title="Documentation"
            description="Guides and API references to help you build anything from a simple input to a fully-featured editor."
            linkLabel="Read the docs"
            to="/docs/intro"
          />
        </div>
      </div>
    </section>
  );
}
