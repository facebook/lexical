declare module '*.svg' {
  const content: any;
  export default content;
}
declare module '*.gif' {
  const content: any;
  export default content;
}
declare module '*.jpg' {
  const content: any;
  export default content;
}

export type Spread<T1, T2> = {[K in Exclude<keyof T1, keyof T2>]: T1[K]} & T2;

declare var __DEV__: boolean;
