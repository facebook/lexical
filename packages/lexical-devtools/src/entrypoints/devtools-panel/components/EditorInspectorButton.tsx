/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {IconButton, Image} from '@chakra-ui/react';
import {getRPCService} from '@webext-pegasus/rpc';
import * as React from 'react';

import {useExtensionStore} from '../../../store';
import {IInjectedPegasusService} from '../../injected/InjectedPegasusService';

interface Props {
  tabID: number;
  setErrorMessage: (value: string) => void;
}

export function EditorInspectorButton({tabID, setErrorMessage}: Props) {
  const {isSelecting} = useExtensionStore();
  const isActive = isSelecting[tabID] ?? false;

  const handleClick = () => {
    const injectedPegasusService = getRPCService<IInjectedPegasusService>(
      'InjectedPegasusService',
      {context: 'window', tabId: tabID},
    );

    injectedPegasusService
      .refreshLexicalEditors()
      .then(() => injectedPegasusService.toggleEditorPicker())
      .catch((err) => {
        setErrorMessage(err.message);
        console.error(err);
      });
  };

  return (
    <IconButton
      aria-label="dsds"
      colorScheme="gray"
      variant="ghost"
      size="xs"
      onClick={handleClick}
      icon={<Image w={5} src="/inspect.svg" />}
      isActive={isActive}
      _active={{bg: 'blue.100'}}
    />
  );
}
