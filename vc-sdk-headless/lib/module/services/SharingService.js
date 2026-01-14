"use strict";

import ShortUniqueId from 'short-unique-id';
export class SharingService {
  credentialService = null;
  sharingHistory = [];
  constructor(config) {
    this.config = config;
    this.uid = new ShortUniqueId({
      length: 16
    });
  }
  async init(credentialService) {
    this.credentialService = credentialService;
    try {
      await this.loadSharingHistory();
      console.log('Sharing service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize sharing service:', error);
      throw error;
    }
  }
  async createVerifiablePresentation(credentialIds, recipient) {
    if (!this.credentialService) {
      throw new Error('Credential service not initialized');
    }
    try {
      // Get all requested credentials
      const credentials = [];
      for (const vcId of credentialIds) {
        const credential = await this.credentialService.getCredential(vcId);
        credentials.push(credential);
      }
      if (credentials.length === 0) {
        throw new Error('No credentials found for sharing');
      }

      // Create Verifiable Presentation
      const vp = {
        id: this.uid.rnd(),
        type: ['VerifiablePresentation'],
        verifiableCredential: credentials,
        holder: await this.getHolderDID(),
        proof: await this.generatePresentationProof(credentials, recipient)
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
  async generateQRCode(vp) {
    try {
      // In a real implementation, this would generate an actual QR code
      // For now, we'll return the VP as a JSON string
      const qrData = {
        type: 'VerifiablePresentation',
        data: vp,
        timestamp: new Date().toISOString()
      };
      return JSON.stringify(qrData);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      throw error;
    }
  }
  async shareViaBluetooth(credentialIds, deviceId) {
    try {
      // Mock Bluetooth sharing implementation
      const recipient = {
        did: deviceId,
        purpose: 'Bluetooth sharing'
      };
      const vp = await this.createVerifiablePresentation(credentialIds, recipient);

      // Simulate Bluetooth transmission
      await this.simulateBluetoothTransmission(vp, deviceId);
      const result = {
        success: true,
        transactionId: vp.id
      };
      await this.logSharingActivity(credentialIds, recipient, 'bluetooth', 'success');
      console.log(`Credentials shared via Bluetooth: ${result.transactionId}`);
      return result;
    } catch (error) {
      console.error('Failed to share via Bluetooth:', error);
      const result = {
        success: false,
        transactionId: this.uid.rnd(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      return result;
    }
  }
  async shareViaNetwork(credentialIds, endpoint) {
    try {
      const recipient = {
        did: endpoint,
        purpose: 'Network sharing'
      };
      const vp = await this.createVerifiablePresentation(credentialIds, recipient);

      // Send VP to network endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vp),
        timeout: this.config.network?.timeout || 30000
      });
      if (!response.ok) {
        throw new Error(`Network request failed: ${response.status} ${response.statusText}`);
      }
      const result = {
        success: true,
        transactionId: vp.id
      };
      await this.logSharingActivity(credentialIds, recipient, 'network', 'success');
      console.log(`Credentials shared via network: ${result.transactionId}`);
      return result;
    } catch (error) {
      console.error('Failed to share via network:', error);
      const result = {
        success: false,
        transactionId: this.uid.rnd(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      return result;
    }
  }
  async receiveCredential(sharingData) {
    if (!this.credentialService) {
      throw new Error('Credential service not initialized');
    }
    try {
      const parsedData = JSON.parse(sharingData);
      if (parsedData.type === 'VerifiablePresentation') {
        const vp = parsedData.data;
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
            tags: [...(credential.metadata.tags || []), 'received']
          }
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
  async getSharingHistory() {
    return this.sharingHistory;
  }
  async getHolderDID() {
    // In a real implementation, this would return the user's DID
    return `did:key:${this.config.appId}-holder`;
  }
  async generatePresentationProof(credentials, recipient) {
    // In a real implementation, this would create a proper cryptographic proof
    return {
      type: 'Ed25519Signature2018',
      created: new Date().toISOString(),
      verificationMethod: `${await this.getHolderDID()}#key-1`,
      proofPurpose: 'authentication',
      challenge: recipient.did,
      proofValue: this.uid.rnd(64)
    };
  }
  async simulateBluetoothTransmission(vp, deviceId) {
    // Simulate network delay
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(`VP transmitted to device ${deviceId}`);
        resolve();
      }, 1000);
    });
  }
  async logSharingActivity(credentialIds, recipient, method, status) {
    const record = {
      id: this.uid.rnd(),
      timestamp: new Date().toISOString(),
      credentialIds,
      recipient,
      method,
      status
    };
    this.sharingHistory.unshift(record);

    // Keep only last 100 records
    if (this.sharingHistory.length > 100) {
      this.sharingHistory = this.sharingHistory.slice(0, 100);
    }
    await this.saveSharingHistory();
  }
  async loadSharingHistory() {
    try {
      // In a real implementation, this would load from persistent storage
      this.sharingHistory = [];
    } catch (error) {
      console.error('Failed to load sharing history:', error);
      this.sharingHistory = [];
    }
  }
  async saveSharingHistory() {
    try {
      // In a real implementation, this would save to persistent storage
      console.log('Sharing history saved');
    } catch (error) {
      console.error('Failed to save sharing history:', error);
    }
  }
  async cleanup() {
    this.credentialService = null;
    this.sharingHistory = [];
    console.log('Sharing service cleaned up');
  }
}
//# sourceMappingURL=SharingService.js.map