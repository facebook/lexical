/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {IInjectedPegasusService} from '../../injected/InjectedPegasusService';
import type {EditorState} from 'lexical';

// import './App.css';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
} from '@chakra-ui/react';
import {TreeView} from '@lexical/devtools-core';
import {getRPCService} from '@webext-pegasus/rpc';
import * as React from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';

import {useExtensionStore} from '../../../store';
import {SerializedRawEditorState} from '../../../types';

interface Props {
  tabID: number;
  setErrorMessage: (value: string) => void;
}

export function EditorsList({tabID, setErrorMessage}: Props) {
  const tabRefs = useRef(new Map<number, HTMLDivElement | null>());
  const [expandedItems, setExpandedItems] = useState<number[] | number>([0]);
  const {lexicalState, selectedEditorKey} = useExtensionStore();
  const states = lexicalState[tabID] ?? {};
  const selectedEditorIdx = Object.keys(states).findIndex(
    (key) => key === selectedEditorKey[tabID],
  );

  useEffect(() => {
    if (selectedEditorIdx !== -1) {
      setExpandedItems([selectedEditorIdx]);
      setTimeout(
        () =>
          tabRefs.current
            .get(selectedEditorIdx)
            ?.scrollIntoView({behavior: 'smooth', block: 'start'}),
        // Delay scrolling to let accordion finish it's animation first
        100,
      );
    }
  }, [selectedEditorIdx]);

  const injectedPegasusService = useMemo(
    () =>
      getRPCService<IInjectedPegasusService>('InjectedPegasusService', {
        context: 'window',
        tabId: tabID,
      }),
    [tabID],
  );

  return (
    <Accordion
      defaultIndex={[0]}
      index={expandedItems}
      onChange={setExpandedItems}
      allowMultiple={true}
      allowToggle={true}>
      {Object.entries(states).map(([key, state], idx) => (
        <AccordionItem key={key} ref={(el) => tabRefs.current.set(idx, el)}>
          <h2>
            <AccordionButton>
              <Box as="span" flex="1" textAlign="left">
                ID: {key}
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <TreeView
              viewClassName="tree-view-output"
              treeTypeButtonClassName="debug-treetype-button"
              timeTravelPanelClassName="debug-timetravel-panel"
              timeTravelButtonClassName="debug-timetravel-button"
              timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
              timeTravelPanelButtonClassName="debug-timetravel-panel-button"
              setEditorReadOnly={(isReadonly) =>
                injectedPegasusService
                  .setEditorReadOnly(key, isReadonly)
                  .catch((e) => setErrorMessage(e.stack))
              }
              editorState={state as EditorState}
              setEditorState={(editorState) =>
                injectedPegasusService
                  .setEditorState(key, editorState as SerializedRawEditorState)
                  .catch((e) => setErrorMessage(e.stack))
              }
              generateContent={(exportDOM) =>
                injectedPegasusService.generateTreeViewContent(key, exportDOM)
              }
            />
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
