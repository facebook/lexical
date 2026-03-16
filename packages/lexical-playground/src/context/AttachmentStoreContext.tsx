/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {AttachmentStore} from '../stores/AttachmentStore';
import type {JSX, ReactNode} from 'react';

import {createContext, useContext, useEffect, useMemo} from 'react';

import {DemoAttachmentStore} from '../stores/DemoAttachmentStore';

export interface AttachmentStoreContextValue {
  store: AttachmentStore;
  /** Flag to show UI warning about demo mode limitations */
  showDemoWarning: boolean;
}

const Context = createContext<AttachmentStoreContextValue | null>(null);

interface AttachmentStoreProviderProps {
  children: ReactNode;
  /** Custom store implementation. Defaults to DemoAttachmentStore */
  store?: AttachmentStore;
}

export function AttachmentStoreProvider({
  children,
  store,
}: AttachmentStoreProviderProps): JSX.Element {
  const contextValue = useMemo(() => {
    const resolvedStore = store ?? new DemoAttachmentStore();
    return {
      showDemoWarning:
        !resolvedStore.isPersistent() &&
        resolvedStore.getConfig().demoWarningLevel === 'ui',
      store: resolvedStore,
    };
  }, [store]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const currentStore = contextValue.store;
      if (currentStore instanceof DemoAttachmentStore) {
        currentStore.cleanup();
      }
    };
  }, [contextValue.store]);

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}

export function useAttachmentStore(): AttachmentStoreContextValue {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error(
      'useAttachmentStore must be used within AttachmentStoreProvider',
    );
  }
  return ctx;
}
