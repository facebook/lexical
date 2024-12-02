/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {IInjectedPegasusService} from '../entrypoints/injected/InjectedPegasusService';

import {Button} from '@chakra-ui/react';
import {getRPCService} from '@webext-pegasus/rpc';
import * as React from 'react';
import {useState} from 'react';

interface Props {
  tabID: number;
  setErrorMessage: (value: string) => void;
}

function EditorsRefreshCTA({tabID, setErrorMessage}: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);

    const injectedPegasusService = getRPCService<IInjectedPegasusService>(
      'InjectedPegasusService',
      {context: 'window', tabId: tabID},
    );

    injectedPegasusService
      .refreshLexicalEditors()
      .catch((err) => {
        setErrorMessage(err.message);
        console.error(err);
      })
      .finally(() => setIsRefreshing(false));
  };

  return (
    <Button
      colorScheme="gray"
      size="xs"
      isLoading={isRefreshing}
      onClick={handleRefreshClick}
      disabled={isRefreshing}>
      Refresh
    </Button>
  );
}

export default EditorsRefreshCTA;
