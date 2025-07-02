import type { StoreApi } from 'zustand';
import { ExtensionState } from '../../store';
export default class ActionIconWatchdog {
    private readonly extensionStore;
    private constructor();
    static start(store: StoreApi<ExtensionState>): Promise<void>;
    init(): Promise<void>;
    private setIcon;
    private handleTabsUpdatedEvent;
    private isRestrictedBrowserPage;
    private checkAndHandleRestrictedPageIfSo;
}
//# sourceMappingURL=ActionIconWatchdog.d.ts.map