"use strict";

/**
 * Network adapter for Expo environment
 */
export class ExpoNetworkAdapter {
  constructor() {}
  async initialize() {
    try {
      this.Network = require('expo-network');
      console.log('[ExpoNetworkAdapter] Initialized with Expo Network');
    } catch (error) {
      console.error('[ExpoNetworkAdapter] Failed to initialize:', error);
      throw new Error('expo-network is required for network operations in Expo');
    }
  }
  async getNetworkState() {
    if (!this.Network) {
      await this.initialize();
    }
    try {
      const networkState = await this.Network.getNetworkStateAsync();
      return {
        isConnected: networkState.isConnected || false,
        connectionType: this.mapConnectionType(networkState.type),
        isExpensive: networkState.isInternetReachable === false
      };
    } catch (error) {
      console.warn('[ExpoNetworkAdapter] Failed to get network state:', error);
      // Return default connected state as fallback
      return {
        isConnected: true,
        connectionType: 'unknown',
        isExpensive: false
      };
    }
  }
  addNetworkListener(callback) {
    if (!this.Network) {
      console.warn('[ExpoNetworkAdapter] Network not initialized, listener not added');
      return () => {}; // Return empty cleanup function
    }
    try {
      // Expo Network doesn't have direct listeners, so we poll
      const intervalId = setInterval(async () => {
        try {
          const state = await this.getNetworkState();
          callback(state);
        } catch (error) {
          console.warn('[ExpoNetworkAdapter] Error in network listener:', error);
        }
      }, 5000); // Check every 5 seconds

      console.log('[ExpoNetworkAdapter] Network listener added (polling every 5s)');

      // Return cleanup function
      return () => {
        clearInterval(intervalId);
        console.log('[ExpoNetworkAdapter] Network listener removed');
      };
    } catch (error) {
      console.error('[ExpoNetworkAdapter] Failed to add network listener:', error);
      return () => {};
    }
  }

  /**
   * Map Expo network types to standard connection types
   */
  mapConnectionType(expoType) {
    if (!expoType) {
      return 'unknown';
    }
    switch (expoType) {
      case this.Network?.NetworkStateType?.NONE:
        return 'none';
      case this.Network?.NetworkStateType?.WIFI:
        return 'wifi';
      case this.Network?.NetworkStateType?.CELLULAR:
        return 'cellular';
      case this.Network?.NetworkStateType?.ETHERNET:
        return 'ethernet';
      case this.Network?.NetworkStateType?.BLUETOOTH:
        return 'bluetooth';
      case this.Network?.NetworkStateType?.VPN:
        return 'vpn';
      case this.Network?.NetworkStateType?.OTHER:
        return 'other';
      default:
        return 'unknown';
    }
  }

  /**
   * Get IP address information
   */
  async getIpAddress() {
    if (!this.Network) {
      await this.initialize();
    }
    try {
      return await this.Network.getIpAddressAsync();
    } catch (error) {
      console.warn('[ExpoNetworkAdapter] Failed to get IP address:', error);
      return null;
    }
  }

  /**
   * Check if internet is reachable
   */
  async isInternetReachable() {
    if (!this.Network) {
      await this.initialize();
    }
    try {
      const networkState = await this.Network.getNetworkStateAsync();
      return networkState.isInternetReachable || false;
    } catch (error) {
      console.warn('[ExpoNetworkAdapter] Failed to check internet reachability:', error);
      return true; // Assume reachable as fallback
    }
  }

  /**
   * Get comprehensive network information
   */
  async getNetworkInfo() {
    if (!this.Network) {
      await this.initialize();
    }
    try {
      const [networkState, ipAddress] = await Promise.all([this.Network.getNetworkStateAsync(), this.Network.getIpAddressAsync().catch(() => null)]);
      return {
        // Basic state
        isConnected: networkState.isConnected,
        connectionType: this.mapConnectionType(networkState.type),
        isInternetReachable: networkState.isInternetReachable,
        // Additional info
        ipAddress,
        // Raw Expo data
        rawNetworkState: networkState
      };
    } catch (error) {
      console.error('[ExpoNetworkAdapter] Failed to get comprehensive network info:', error);
      return {
        isConnected: true,
        connectionType: 'unknown',
        isInternetReachable: true,
        ipAddress: null,
        rawNetworkState: null
      };
    }
  }
}
//# sourceMappingURL=ExpoNetworkAdapter.js.map