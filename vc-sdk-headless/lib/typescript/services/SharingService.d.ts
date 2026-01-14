import { VCSDKConfig, VP, VC, ShareResult, SharingRecipient, SharingRecord } from '../types';
import { CredentialService } from './CredentialService';
export declare class SharingService {
    private config;
    private credentialService;
    private uid;
    private sharingHistory;
    constructor(config: VCSDKConfig);
    init(credentialService: CredentialService): Promise<void>;
    createVerifiablePresentation(credentialIds: string[], recipient: SharingRecipient): Promise<VP>;
    generateQRCode(vp: VP): Promise<string>;
    shareViaBluetooth(credentialIds: string[], deviceId: string): Promise<ShareResult>;
    shareViaNetwork(credentialIds: string[], endpoint: string): Promise<ShareResult>;
    receiveCredential(sharingData: string): Promise<VC>;
    getSharingHistory(): Promise<SharingRecord[]>;
    private getHolderDID;
    private generatePresentationProof;
    private simulateBluetoothTransmission;
    private logSharingActivity;
    private loadSharingHistory;
    private saveSharingHistory;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=SharingService.d.ts.map