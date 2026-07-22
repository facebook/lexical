/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export type MathTypeCustomEditors = {
  disable: () => void;
  enable: (name: string) => void;
};

export type MathTypeIntegrationInstance = {
  core: {
    editionProperties: {
      dbclick?: boolean;
      isNewElement?: boolean;
      temporalImage?: HTMLImageElement | null;
    };
    getCustomEditors: () => MathTypeCustomEditors;
  };
  destroy: () => void;
  init: () => void;
  insertFormula: (
    focusElement: HTMLElement | Window,
    windowTarget: Window,
    mathML: string,
    wirisProperties: null | object,
  ) => object;
  listeners: {
    fire: (eventName: string, payload: object) => void;
  };
  openExistingFormulaEditor: () => void;
  openNewFormulaEditor: () => void;
  toolbar: HTMLElement | null;
};

export type MathTypeIntegrationProperties = {
  integrationParameters?: {
    editorParameters?: {
      language?: string;
    };
    serviceProviderProperties?: {
      server?: string;
      URI?: string;
    };
  };
  target: HTMLElement;
  toolbar: HTMLElement;
};

export type WirisPluginGlobal = {
  Configuration?: {
    get: (key: string) => false | string;
  };
  currentInstance?: MathTypeIntegrationInstance | null;
  GenericIntegration: new (
    properties: MathTypeIntegrationProperties,
  ) => MathTypeIntegrationInstance;
  MathML: {
    safeXmlDecode: (mathML: string) => string;
    safeXmlEncode: (mathML: string) => string;
  };
  Parser: {
    endParse: (html: string) => string;
    initParse: (html: string, language?: string) => string;
    mathmlToImgObject: (
      document: Document,
      mathML: string,
      wirisProperties: null | object,
      language?: string,
    ) => HTMLImageElement;
  };
};

declare global {
  interface Window {
    WirisPlugin?: WirisPluginGlobal;
  }
}

export function getWirisPlugin(): WirisPluginGlobal {
  const {WirisPlugin} = window;
  if (WirisPlugin === undefined) {
    throw new Error('MathType generic integration did not initialize.');
  }
  return WirisPlugin;
}
