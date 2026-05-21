import {
  Blockquote,
  CodeBlock,
  FormatText,
  Heading,
  HR,
  Listing,
  Monocode,
  NormalParagraph,
  TextToLink,
  UnDoReDo,
} from './ToolbarItems';
import React from 'react';

// bold italic mono link, insert img and hr, type plain and code and heading, undo, redo, ul, ol, quote

const ToolbarPlugin = () => {
  const handleDropdown = () => {
    const dropdown = document.getElementById('type-dropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('open');
  };

  return (
    <div className={'customtoolbar'}>
      <FormatText />
      <Monocode />
      <TextToLink />

      {/*<InsertLink />*/}
      <HR />

      <div onClick={handleDropdown}>
        <button className={'toolbar__item'}>Type ⭣</button>
        <div className={'dropdown-content'} id={'type-dropdown'}>
          <NormalParagraph />
          <Heading />
          <CodeBlock />
        </div>
      </div>
      <UnDoReDo />
      <Listing />
      <Blockquote />
    </div>
  );
};

export default ToolbarPlugin;
