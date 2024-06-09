/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Translate from '@docusaurus/Translate';

const FeatureList = [
  {
    Svg: require('@site/static/img/feature-reliable.svg').default,
    description: (
      <Translate
        id="page.home.features.reliable"
        description="short description of why Lexical is reliable">
        Lexical is comprised of editor instances that each attach to a single
        content editable element. A set of editor states represent the current
        and pending states of the editor at any given time.
      </Translate>
    ),
    title: 'Reliable',
  },
  {
    Svg: require('@site/static/img/feature-accessible.svg').default,
    description: (
      <Translate
        id="page.home.features.accessible"
        description="short description of why Lexical is accessible">
        Lexical is designed for everyone. It follows best practices established
        in WCAG and is compatible with screen readers and other assistive
        technologies.
      </Translate>
    ),
    title: 'Accessible',
  },
  {
    Svg: require('@site/static/img/feature-fast.svg').default,
    description: (
      <Translate
        id="page.home.features.fast"
        description="short description of why Lexical is fast">
        Lexical is minimal. It doesn't directly concern itself with UI
        components, toolbars or rich-text features and markdown. The logic for
        these features can be included via a plugin interface.
      </Translate>
    ),
    title: 'Fast',
  },
  {
    Svg: require('@site/static/img/feature-cross-platform.svg').default,
    description: (
      <Translate
        id="page.home.features.crossplatform"
        description="short description of why Lexical is cross platform (web/iOS)">
        Lexical is available as a JavaScript framework for use in web browsers,
        as well as a Swift framework for native iOS development.
      </Translate>
    ),
    title: 'Cross Platform',
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className="text-center">
      <Svg className="h-[200px] w-[200px]" alt={title} />

      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className="mx-auto grid gap-10 py-8 lg:grid-cols-3">
      {FeatureList.map((props, idx) => (
        <div key={idx}>
          <Feature {...props} />
        </div>
      ))}
    </section>
  );
}
