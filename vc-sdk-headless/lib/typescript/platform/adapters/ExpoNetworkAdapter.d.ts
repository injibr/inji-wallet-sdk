import { INetworkAdapter } from '../types';
/**
 * Network adapter for Expo environment
 */
export declare class ExpoNetworkAdapter implements INetworkAdapter {
    private Network;
    constructor();
    initialize(): Promise<void>;
    getNetworkState(): Promise<{
        isConnected: boolean;
        connectionType: string;
        isExpensive?: boolean;
    }>;
    addNetworkListener(callback: (state: any) => void): () => void;
    /**
     * Map Expo network types to standard connection types
     */
    private mapConnectionType;
    /**
     * Get IP address information
     */
    getIpAddress(): Promise<string | null>;
    /**
     * Check if internet is reachable
     */
    isInternetReachable(): Promise<boolean>;
    /**
     * Get comprehensive network information
     */
    getNetworkInfo(): Promise<any>;
}
//# sourceMappingURL=ExpoNetworkAdapter.d.ts.map