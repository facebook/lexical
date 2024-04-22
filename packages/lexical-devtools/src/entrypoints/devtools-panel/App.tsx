/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {IInjectedPegasusService} from '../injected/InjectedPegasusService';
import type {EditorState} from 'lexical';

import './App.css';

import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertIcon,
  Box,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import {TreeView} from '@lexical/devtools-core';
import {getRPCService} from '@webext-pegasus/rpc';
import * as React from 'react';
import {useMemo, useState} from 'react';

import lexicalLogo from '@/public/lexical.svg';

import EditorsRefreshCTA from '../../components/EditorsRefreshCTA';
import {useExtensionStore} from '../../store';
import {SerializedRawEditorState} from '../../types';

interface Props {
  tabID: number;
}

function App({tabID}: Props) {
  const [errorMessage, setErrorMessage] = useState('');

  const {lexicalState} = useExtensionStore();
  const states = lexicalState[tabID] ?? {};
  const lexicalCount = Object.keys(states ?? {}).length;

  const injectedPegasusService = useMemo(
    () =>
      getRPCService<IInjectedPegasusService>('InjectedPegasusService', {
        context: 'window',
        tabId: tabID,
      }),
    [tabID],
  );

  return (
    <>
      <Flex>
        <Box p="2">
          <a href="https://lexical.dev" target="_blank">
            <img
              src={lexicalLogo}
              className="logo"
              width={178}
              height={40}
              alt="Lexical logo"
            />
          </a>
        </Box>
        <Spacer />
        <Box p="4">
          {states === undefined ? (
            <span>Loading...</span>
          ) : (
            <span>
              Found <b>{lexicalCount}</b> editor
              {lexicalCount > 1 || lexicalCount === 0 ? 's' : ''} on the page.
            </span>
          )}
        </Box>
        <Box p="4">
          <EditorsRefreshCTA tabID={tabID} setErrorMessage={setErrorMessage} />
        </Box>
      </Flex>
      {errorMessage !== '' ? (
        <div className="card error">{errorMessage}</div>
      ) : null}

      <Box mt={5}>
        {lexicalCount > 0 ? (
          <Accordion defaultIndex={[0]} allowMultiple={true}>
            {Object.entries(states).map(([key, state]) => (
              <AccordionItem key={key}>
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
                        .setEditorState(
                          key,
                          editorState as SerializedRawEditorState,
                        )
                        .catch((e) => setErrorMessage(e.stack))
                    }
                    generateContent={(exportDOM) =>
                      injectedPegasusService.generateTreeViewContent(
                        key,
                        exportDOM,
                      )
                    }
                  />
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Alert status="info">
            <AlertIcon />
            No Lexical editor found on the page.
          </Alert>
        )}
      </Box>
    </>
  );
}

export default App;
