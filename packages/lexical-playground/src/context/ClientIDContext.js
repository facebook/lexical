/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';
import {createContext, useContext, useMemo} from 'react';

const Context: React$Context<string> = createContext('localhost');

export const ClientIDContext = ({
  clientID,
  children,
}: {
  clientID: string,
  children: React$Node,
}): React$Node => {
  const contextValue = useMemo(() => clientID, [clientID]);
  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export const useClientIDContext = (): string => {
  return useContext(Context);
};
