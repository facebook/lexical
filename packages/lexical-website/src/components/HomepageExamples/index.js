/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import ChatInputEditor from '@site/src/components/editors/ChatInputEditor';
import NotionLikeEditor from '@site/src/components/editors/NotionLikeEditor';
import RichInputEditor from '@site/src/components/editors/RichInputEditor';
import ToolbarEditor from '@site/src/components/editors/ToolbarEditor';

const SECTIONS = [
  {
    description:
      'A familiar full rich text editor with formatting controls for headings, quotes, and text styles.',
    editor: <ToolbarEditor />,
    title: (
      <>
        Standard <span className="text-gradient">rich text</span> + toolbar
      </>
    ),
  },
  {
    description:
      'A block-first writing flow inspired by Notion, with slash commands and drag handles for reorganizing content.',
    editor: <NotionLikeEditor />,
    title: (
      <>
        Notion-like <span className="text-gradient">block editor</span>
      </>
    ),
  },
  {
    description:
      'A lightweight chat composer for conversational products like support tools, AI assistants, and chat apps.',
    editor: <ChatInputEditor />,
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
    title: (
      <>
        Rich <span className="text-gradient">input field</span>
      </>
    ),
  },
];

function ExampleSection({title, description, children}) {
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
        <div className="w-full md:max-w-xl lg:max-w-2xl">{children}</div>
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
          tabs={section.tabs}>
          {section.editor}
        </ExampleSection>
      ))}
    </div>
  );
}
