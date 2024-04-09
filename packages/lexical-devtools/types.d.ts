import type {ProtocolWithReturn} from 'webext-bridge';
import type {EditorState} from 'lexical';

declare module 'webext-bridge' {
  export interface ProtocolMap {
    getTabID: ProtocolWithReturn<null, number>;
    storeSyncDispatch: string;
    storeSyncGetState: ProtocolWithReturn<null, unknown>;
    refreshLexicalEditorsForTabID: ProtocolWithReturn<null, void>;
    generateTreeViewContent: ProtocolWithReturn<
      {key: string; exportDOM: boolean},
      string
    >;
    setEditorState: ProtocolWithReturn<{key: string; state: EditorState}, void>;
    setEditorReadOnly: ProtocolWithReturn<
      {key: string; isReadonly: boolean},
      void
    >;
  }
}
