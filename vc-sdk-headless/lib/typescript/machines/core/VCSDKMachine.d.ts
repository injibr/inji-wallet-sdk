import { SDKServices } from '../../core/VCSDKCore';
import { VCSDKConfig, User, VC } from '../../types';
export interface VCSDKMachineContext {
    config: VCSDKConfig | null;
    services: SDKServices | null;
    user: User | null;
    credentials: VC[];
    isAuthenticated: boolean;
    error: string | null;
    isInitialized: boolean;
}
export type VCSDKMachineEvents = {
    type: 'INIT';
    config: VCSDKConfig;
} | {
    type: 'AUTHENTICATE';
} | {
    type: 'LOGOUT';
} | {
    type: 'ADD_CREDENTIAL';
    credentialData: any;
} | {
    type: 'DELETE_CREDENTIAL';
    vcId: string;
} | {
    type: 'LOAD_CREDENTIALS';
} | {
    type: 'BACKUP_DATA';
} | {
    type: 'RESTORE_DATA';
    backupData: any;
} | {
    type: 'RESET';
} | {
    type: 'ERROR';
    error: string;
};
export declare const createVCSDKMachine: (services: SDKServices) => import("xstate").StateMachine<VCSDKMachineContext, any, VCSDKMachineEvents, {
    value: any;
    context: VCSDKMachineContext;
}, import("xstate").BaseActionObject, import("xstate").ServiceMap, import("xstate").ResolveTypegenMeta<import("xstate").TypegenDisabled, VCSDKMachineEvents, import("xstate").BaseActionObject, import("xstate").ServiceMap>>;
//# sourceMappingURL=VCSDKMachine.d.ts.map