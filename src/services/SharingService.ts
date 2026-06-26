import { 
  VCSDKConfig, 
  VP, 
  VC,
  ShareResult,
  SharingRecipient,
  SharingRecord
} from '../types';
import { CredentialService } from './CredentialService';
import ShortUniqueId from 'short-unique-id';

export class SharingService {
  private config: VCSDKConfig;
  private credentialService: CredentialService | null = null;
  private uid: ShortUniqueId;
  private sharingHistory: SharingRecord[] = [];

  constructor(config: VCSDKConfig) {
    this.config = config;
    this.uid = new ShortUniqueId({ length: 16 });
  }

  async init(credentialService: CredentialService): Promise<void> {
    this.credentialService = credentialService;
    
    try {
      await this.loadSharingHistory();
      console.log('Sharing service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize sharing service:', error);
      throw error;
    }
  }

  async createVerifiablePresentation(credentialIds: string[], recipient: SharingRecipient): Promise<VP> {
    if (!this.credentialService) {
      throw new Error('Credential service not initialized');
    }

    try {
      // Get all requested credentials
      const credentials: VC[] = [];
      for (const vcId of credentialIds) {
        const credential = await this.credentialService.getCredential(vcId);
        credentials.push(credential);
      }

      if (credentials.length === 0) {
        throw new Error('No credentials found for sharing');
      }

      // Create Verifiable Presentation
      const vp: VP = {
        id: this.uid.rnd(),
        type: ['VerifiablePresentation'],
        verifiableCredential: credentials,
        holder: await this.getHolderDID(),
        proof: await this.generatePresentationProof(credentials, recipient),
      };

      // Log sharing activity
      await this.logSharingActivity(credentialIds, recipient, 'qr', 'success');

      console.log(`Verifiable Presentation created: ${vp.id}`);
      return vp;
    } catch (error) {
      console.error('Failed to create verifiable presentation:', error);
      throw error;
    }
  }

  async generateQRCode(vp: VP): Promise<string> {
    try {
      // In a real implementation, this would generate an actual QR code
      // For now, we'll return the VP as a JSON string
      const qrData = {
        type: 'VerifiablePresentation',
        data: vp,
        timestamp: new Date().toISOString(),
      };

      return JSON.stringify(qrData);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      throw error;
    }
  }

  async shareViaBluetooth(credentialIds: string[], deviceId: string): Promise<ShareResult> {
    try {
      // Mock Bluetooth sharing implementation
      const recipient: SharingRecipient = {
        did: deviceId,
        purpose: 'Bluetooth sharing',
      };

      const vp = await this.createVerifiablePresentation(credentialIds, recipient);
      
      // Simulate Bluetooth transmission
      await this.simulateBluetoothTransmission(vp, deviceId);
      
      const result: ShareResult = {
        success: true,
        transactionId: vp.id,
      };

      await this.logSharingActivity(credentialIds, recipient, 'bluetooth', 'success');
      
      console.log(`Credentials shared via Bluetooth: ${result.transactionId}`);
      return result;
    } catch (error) {
      console.error('Failed to share via Bluetooth:', error);
      
      const result: ShareResult = {
        success: false,
        transactionId: this.uid.rnd(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return result;
    }
  }

  async shareViaNetwork(credentialIds: string[], endpoint: string): Promise<ShareResult> {
    try {
      const recipient: SharingRecipient = {
        did: endpoint,
        purpose: 'Network sharing',
      };

      const vp = await this.createVerifiablePresentation(credentialIds, recipient);
      
      // Send VP to network endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vp),
        timeout: this.config.network?.timeout || 30000,
      });

      if (!response.ok) {
        throw new Error(`Network request failed: ${response.status} ${response.statusText}`);
      }

      const result: ShareResult = {
        success: true,
        transactionId: vp.id,
      };

      await this.logSharingActivity(credentialIds, recipient, 'network', 'success');
      
      console.log(`Credentials shared via network: ${result.transactionId}`);
      return result;
    } catch (error) {
      console.error('Failed to share via network:', error);
      
      const result: ShareResult = {
        success: false,
        transactionId: this.uid.rnd(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return result;
    }
  }

  async receiveCredential(sharingData: string): Promise<VC> {
    if (!this.credentialService) {
      throw new Error('Credential service not initialized');
    }

    try {
      const parsedData = JSON.parse(sharingData);
      
      if (parsedData.type === 'VerifiablePresentation') {
        const vp = parsedData.data as VP;
        
        if (!vp.verifiableCredential || vp.verifiableCredential.length === 0) {
          throw new Error('No credentials found in presentation');
        }

        // For simplicity, return the first credential
        // In a real implementation, you might want to handle multiple credentials
        const credential = vp.verifiableCredential[0];
        
        // Verify the credential before adding
        const verificationResult = await this.credentialService.verifyCredential(credential);
        if (!verificationResult.isValid) {
          console.warn('Received credential failed verification:', verificationResult.errors);
        }

        // Add credential to storage
        await this.credentialService.addCredential({
          type: credential.type,
          issuer: credential.issuer,
          credentialSubject: credential.credentialSubject,
          name: credential.name,
          metadata: {
            ...credential.metadata,
            addedDate: new Date().toISOString(),
            tags: [...(credential.metadata.tags || []), 'received'],
          },
        });

        console.log(`Credential received and added: ${credential.id}`);
        return credential;
      } else {
        throw new Error('Invalid sharing data format');
      }
    } catch (error) {
      console.error('Failed to receive credential:', error);
      throw error;
    }
  }

  async getSharingHistory(): Promise<SharingRecord[]> {
    return this.sharingHistory;
  }

  private async getHolderDID(): Promise<string> {
    // In a real implementation, this would return the user's DID
    return `did:key:${this.config.appId}-holder`;
  }

  private async generatePresentationProof(credentials: VC[], recipient: SharingRecipient): Promise<any> {
    // In a real implementation, this would create a proper cryptographic proof
    return {
      type: 'Ed25519Signature2018',
      created: new Date().toISOString(),
      verificationMethod: `${await this.getHolderDID()}#key-1`,
      proofPurpose: 'authentication',
      challenge: recipient.did,
      proofValue: this.uid.rnd(64),
    };
  }

  private async simulateBluetoothTransmission(vp: VP, deviceId: string): Promise<void> {
    // Simulate network delay
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`VP transmitted to device ${deviceId}`);
        resolve();
      }, 1000);
    });
  }

  private async logSharingActivity(
    credentialIds: string[], 
    recipient: SharingRecipient, 
    method: 'qr' | 'bluetooth' | 'network',
    status: 'success' | 'failed' | 'pending'
  ): Promise<void> {
    const record: SharingRecord = {
      id: this.uid.rnd(),
      timestamp: new Date().toISOString(),
      credentialIds,
      recipient,
      method,
      status,
    };

    this.sharingHistory.unshift(record);
    
    // Keep only last 100 records
    if (this.sharingHistory.length > 100) {
      this.sharingHistory = this.sharingHistory.slice(0, 100);
    }

    await this.saveSharingHistory();
  }

  private async loadSharingHistory(): Promise<void> {
    try {
      // In a real implementation, this would load from persistent storage
      this.sharingHistory = [];
    } catch (error) {
      console.error('Failed to load sharing history:', error);
      this.sharingHistory = [];
    }
  }

  private async saveSharingHistory(): Promise<void> {
    try {
      // In a real implementation, this would save to persistent storage
      console.log('Sharing history saved');
    } catch (error) {
      console.error('Failed to save sharing history:', error);
    }
  }

  async cleanup(): Promise<void> {
    this.credentialService = null;
    this.sharingHistory = [];
    console.log('Sharing service cleaned up');
  }
}