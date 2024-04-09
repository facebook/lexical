import {ProtocolWithReturn} from 'webext-bridge';

declare module 'webext-bridge' {
  export interface ProtocolMap {
    getTabID: ProtocolWithReturn<null, number>;
    storeSyncDispatch: string;
    storeSyncGetState: ProtocolWithReturn<null, unknown>;
    refreshLexicalEditorsForTabID: ProtocolWithReturn<null, null>;
  }
}
