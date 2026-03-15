/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Link from '@docusaurus/Link';
import CodeBlock from '@theme/CodeBlock';

const codeExample = `import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';

const Editor = () => {
  const initialConfig = {
    theme: {}
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        ErrorBoundary={LexicalErrorBoundary}
        placeholder={<div>Placeholder</div>}
      />
    </LexicalComposer>
  );
}

export default Editor`;

const paragraphs = [
  "At it's core, Lexical is a framework agnostic text editor framework. But there are also React bindings that let you create editors using React components.",
  "Lexical editors are simply built using plugins, where the LexicalComposer component wraps all of the editor's plugins which provide functionalities for the editor.",
  "While Lexical is a text-editing engine at it's core, we believe that users shouldn't have to rewrite the same rich text functionality over and over in every implementation. Lexical exposes a set of individual, modular packages that can be used to add common features like history, links, lists and tables.",
];

export default function HomepageSetup() {
  return (
    <section className="mx-4 flex flex-col gap-8 py-8 sm:mx-10 lg:mx-auto">
      <h1 className="text-center text-3xl font-bold lg:mx-auto lg:max-w-xl lg:text-4xl">
        With <span className="text-gradient">minimal setup</span>, it's quick to
        start using Lexical!
      </h1>
      <div className="flex h-fit flex-col items-center gap-2 lg:flex-row lg:items-start lg:justify-center lg:gap-8">
        <div className="max-w-[80vw] overflow-hidden rounded-2xl contain-content lg:max-w-[32rem]">
          <CodeBlock language="jsx">{codeExample}</CodeBlock>
        </div>
        <div className="flex max-w-[70vw] flex-col lg:max-w-[40%]">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="font-light">
              {paragraph}
            </p>
          ))}
          <Link to="/docs/packages/lexical" className="styled-button px-4 py-3">
            View all packages
          </Link>
        </div>
      </div>
    </section>
  );
}
