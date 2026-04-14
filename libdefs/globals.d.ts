declare module '*.css';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.png';
declare module '*.svg';
declare module 'prismjs/components/prism-*';

declare var __DEV__: boolean;

declare module '@babel/helper-module-imports' {
  import type {NodePath} from '@babel/traverse';
  import type {Identifier} from '@babel/types';
  export function addDefault(
    path: NodePath,
    importedSource: string,
    opts?: {nameHint?: string},
  ): Identifier;
}
