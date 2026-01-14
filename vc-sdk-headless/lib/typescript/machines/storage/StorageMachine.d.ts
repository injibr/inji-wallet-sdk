import { interpret } from 'xstate';
import type { StorageStats, ExportData, BackupResult, RestoreResult } from '../../types';
export interface StorageContext {
    stats: StorageStats | null;
    exportData: ExportData | null;
    backupResult: BackupResult | null;
    restoreResult: RestoreResult | null;
    error: string | null;
    progress: number;
    isEncryptionEnabled: boolean;
    storageQuota: number;
    usedSpace: number;
}
export type StorageEvent = {
    type: 'LOAD_STATS';
} | {
    type: 'EXPORT_DATA';
    format: 'json' | 'csv' | 'pdf';
} | {
    type: 'CREATE_BACKUP';
} | {
    type: 'RESTORE_BACKUP';
    backupData: string;
} | {
    type: 'CLEAR_STORAGE';
} | {
    type: 'OPTIMIZE_STORAGE';
} | {
    type: 'TOGGLE_ENCRYPTION';
    enabled: boolean;
} | {
    type: 'CHECK_QUOTA';
} | {
    type: 'RETRY';
} | {
    type: 'RESET';
};
export declare const storageMachine: import("xstate").StateMachine<StorageContext, any, StorageEvent, {
    value: any;
    context: TContext;
}, import("xstate").BaseActionObject, import("xstate").ServiceMap, import("xstate").ResolveTypegenMeta<import("xstate").TypegenDisabled, StorageEvent, import("xstate").BaseActionObject, import("xstate").ServiceMap>>;
export type StorageActor = ReturnType<typeof interpret>;
//# sourceMappingURL=StorageMachine.d.ts.map