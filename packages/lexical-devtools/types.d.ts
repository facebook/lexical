// To be fixed in https://github.com/sinanbekar/webext-zustand/pull/3
declare module 'webext-zustand' {
  declare const wrapStore: <T>(
    store: import('zustand').StoreApi<T>,
  ) => Promise<void>;
}
