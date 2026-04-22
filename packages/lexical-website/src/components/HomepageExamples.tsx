/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import BrowserOnly from '@docusaurus/BrowserOnly';
import ChatEditor from '@examples/website-chat/Editor';
import NotionEditor from '@examples/website-notion/Editor';
import RichInputEditor from '@examples/website-rich-input/Editor';
import React from 'react';

import StackBlitzButton from './StackBlitzButton';

const AgentEditor = React.lazy(() =>
  import('@examples/agent-example/Editor').then((m) => ({default: m.Editor})),
);

interface Section {
  description: string;
  editor: React.ReactNode;
  stackblitzPath: string;
  title: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    description:
      'A block-first writing flow inspired by Notion, with slash commands and drag handles for reorganizing content.',
    editor: <NotionEditor />,
    stackblitzPath: 'website-notion',
    title: (
      <>
        Notion-like <span className="text-gradient">block editor</span>
      </>
    ),
  },
  {
    description:
      'A lightweight chat composer for conversational products like support tools, AI assistants, and chat apps.',
    editor: <ChatEditor />,
    stackblitzPath: 'website-chat',
    title: (
      <>
        Compact <span className="text-gradient">chat input</span>
      </>
    ),
  },
  {
    description:
      'A stripped-down, single-field editor that behaves like a text input but still supports rich features like bold, italic, underline and hashtags.',
    editor: <RichInputEditor />,
    stackblitzPath: 'website-rich-input',
    title: (
      <>
        Rich <span className="text-gradient">input field</span>
      </>
    ),
  },
  {
    description:
      'A rich text editor with AI-powered paragraph generation and named entity extraction using SmolLM2 and BERT-NER running in the browser via WebAssembly.',
    editor: (
      <BrowserOnly>
        {() => (
          <React.Suspense>
            <AgentEditor />
          </React.Suspense>
        )}
      </BrowserOnly>
    ),
    stackblitzPath: 'agent-example',
    title: (
      <>
        AI <span className="text-gradient">agent</span> editor
      </>
    ),
  },
];

interface ExampleSectionProps {
  title: React.ReactNode;
  description: string;
  stackblitzPath: string;
  children: React.ReactNode;
}

function ExampleSection({
  title,
  description,
  stackblitzPath,
  children,
}: ExampleSectionProps) {
  return (
    <section className="flex flex-col gap-6 p-8">
      <div className="space-y-4 text-center">
        <h2 className="mx-auto text-3xl font-bold lg:max-w-xl lg:text-4xl">
          {title}
        </h2>
        <p className="mx-auto max-w-2xl text-sm font-light opacity-70">
          {description}
        </p>
      </div>

      <div className="flex w-full flex-col gap-6 md:flex-row md:items-start md:justify-center">
        <div className="flex w-full flex-col gap-3 md:max-w-xl lg:max-w-2xl">
          {children}
          <div className="flex justify-end">
            <StackBlitzButton examplePath={stackblitzPath} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomepageExamples() {
  return (
    <div className="space-y-16 sm:space-y-36">
      {SECTIONS.map((section, index) => (
        <ExampleSection
          key={index}
          title={section.title}
          description={section.description}
          stackblitzPath={section.stackblitzPath}>
          {section.editor}
        </ExampleSection>
      ))}
    </div>
  );
}
