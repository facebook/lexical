/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useColorMode} from '@docusaurus/theme-common';
import Translate from '@docusaurus/Translate';
import AccessibleSvg from '@site/static/img/accessible.svg';
import FastSvg from '@site/static/img/fast.svg';
import ReliableSvg from '@site/static/img/reliable.svg';
import React from 'react';

type SvgComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface FeatureItem {
  Svg: SvgComponent;
  cardBg: string;
  cardBgDark: string;
  cardBorder: string;
  cardBorderDark: string;
  description: React.ReactNode;
  iconGradient: string;
  title: string;
}

const FeatureList: FeatureItem[] = [
  {
    Svg: ReliableSvg,
    cardBg: '#eef3ff',
    cardBgDark: '#1a2240',
    cardBorder: '1px solid #c5d5f5',
    cardBorderDark: '1px solid #2a3a60',
    description: (
      <Translate
        id="page.home.features.reliable"
        description="short description of why Lexical is reliable">
        Lexical is comprised of editor instances that each attach to a single
        content editable element. A set of editor states represent the current
        and pending states of the editor at any given time.
      </Translate>
    ),
    iconGradient: 'linear-gradient(135deg, #60a5fa, #3b5bdb)',
    title: 'Reliable',
  },
  {
    Svg: AccessibleSvg,
    cardBg: '#fdf4ff',
    cardBgDark: '#201228',
    cardBorder: '1px solid #e8cdf8',
    cardBorderDark: '1px solid #3a1f50',
    description: (
      <Translate
        id="page.home.features.accessible"
        description="short description of why Lexical is accessible">
        Lexical is designed for everyone. It follows best practices established
        in WCAG and is compatible with screen readers and other assistive
        technologies.
      </Translate>
    ),
    iconGradient: 'linear-gradient(135deg, #c084fc, #7c3aed)',
    title: 'Accessible',
  },
  {
    Svg: FastSvg,
    cardBg: '#f0faf0',
    cardBgDark: '#142214',
    cardBorder: '1px solid #bfe8bf',
    cardBorderDark: '1px solid #1f3d1f',
    description: (
      <Translate
        id="page.home.features.fast"
        description="short description of why Lexical is fast">
        Lexical is minimal. It doesn't directly concern itself with UI
        components, toolbars or rich-text features and markdown. The logic for
        these features can be included via a plugin interface.
      </Translate>
    ),
    iconGradient: 'linear-gradient(135deg, #86efac, #16a34a)',
    title: 'Fast',
  },
];

function Feature({
  Svg,
  title,
  description,
  cardBg,
  cardBgDark,
  cardBorder,
  cardBorderDark,
  iconGradient,
}: FeatureItem) {
  const {colorMode} = useColorMode();
  const isDark = colorMode === 'dark';
  return (
    <div
      className="rounded-2xl px-6"
      style={{
        backgroundColor: isDark ? cardBgDark : cardBg,
        border: isDark ? cardBorderDark : cardBorder,
      }}>
      <div
        className="relative mt-6 mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full"
        style={{background: iconGradient}}>
        <div className="absolute -bottom-1 flex h-11 w-11 justify-center rounded-md bg-white py-1.5">
          <Svg className="h-6 w-6 text-black" aria-label={title} />
        </div>
      </div>
      <h3 className="mb-2 font-bold">{title}</h3>
      <p className="text-sm">{description}</p>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className="mx-8 grid gap-4 py-8 sm:mx-10 lg:mx-16 lg:grid-cols-3">
      {FeatureList.map((props, idx) => (
        <Feature key={idx} {...props} />
      ))}
    </section>
  );
}
