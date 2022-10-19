---
id: "image-editor"
title: "Images Plugin"
sidebar_label: "Images Plugin"
sidebar_position: 1
custom_edit_url: null
---

This page focuses on the implementation of the image plugin and the steps you need to take to add image insertion from a sample, URL or a local file into your editor. The below code is in TypeScript.

<iframe src="/demos/image/images"
     style={{width:100+"%", height:300+"px", border:0, "border-radius": 4+"px", overflow:"hidden" }}
></iframe>

```tsx
import {AutoScrollPlugin} from '@lexical/react/LexicalAutoScrollPlugin';
import {CharacterLimitPlugin} from '@lexical/react/LexicalCharacterLimitPlugin';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {useRef, useState} from 'react';
import * as React from 'react';
import {useSettings} from '../../context/SettingsContext';
import {useSharedHistoryContext} from '../../context/SharedHistoryContext';
import ImagesPlugin from '../../plugins/ImagesPlugin';
import {MaxLengthPlugin} from '../../plugins/MaxLengthPlugin';
import ToolbarPlugin from '../../plugins/ToolbarPlugin/demos/image-demo';
import TreeViewPlugin from '../../plugins/TreeViewPlugin';
import ContentEditable from '../../ui/ContentEditable';
import Placeholder from '../../ui/Placeholder';
export default function Editor(): JSX.Element {
  const {historyState} = useSharedHistoryContext();
  const {
    settings: {
      isMaxLength,
      isCharLimit,
      isCharLimitUtf8,
      isRichText,
      showTreeView,
    },
  } = useSettings();
  const text =
    'Enter some text... Play around with the images and try inserting via different sources.';
  const placeholder = <Placeholder>{text}</Placeholder>;
  const scrollRef = useRef(null);
  const [, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);
  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };
  return (
    <>
      {isRichText && <ToolbarPlugin />}
      <div
        className={`editor-container ${showTreeView ? 'tree-view' : ''} ${
          !isRichText ? 'plain-text' : ''
        }`}
        ref={scrollRef}>
        {isMaxLength && <MaxLengthPlugin maxLength={30} />}
        <AutoScrollPlugin scrollRef={scrollRef} />
        {isRichText ? (
          <>
            <RichTextPlugin
              contentEditable={
                <div className="editor-scroller">
                  <div className="editor" ref={onRef}>
                    <ContentEditable />
                  </div>
                </div>
              }
              placeholder={placeholder}
            />
            <ImagesPlugin />
          </>
        ) : (
          <>
            <PlainTextPlugin
              contentEditable={<ContentEditable />}
              placeholder={placeholder}
            />
            <HistoryPlugin externalHistoryState={historyState} />
          </>
        )}
        {(isCharLimit || isCharLimitUtf8) && (
          <CharacterLimitPlugin charset={isCharLimit ? 'UTF-16' : 'UTF-8'} />
        )}
      </div>
      {showTreeView && <TreeViewPlugin />}
    </>
  );
}
```