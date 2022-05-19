declare global {
  interface InputEvent {
    dataTransfer: DataTransfer;
  }

  interface Window {
    twttr: {
      widgets: {
        createTweet(id: string, el: Element);
      };
    };
  }
}

export type Spread<T1, T2> = {[K in Exclude<keyof T1, keyof T2>]: T1[K]} & T2;
