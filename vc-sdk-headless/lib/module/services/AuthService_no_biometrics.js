"use strict";

// import ReactNativeBiometrics from 'react-native-biometrics';
// import Keychain from 'react-native-keychain'; // Replaced with platform adapters
import AsyncStorage from '@react-native-async-storage/async-storage';
export class AuthService {
  storageService = null;
  // private biometrics: ReactNativeBiometrics;
  currentUser = null;
  isAuthenticated = false;
  constructor(config) {
    this.config = config;
    // Removed biometrics initialization
    // this.biometrics = new ReactNativeBiometrics({
    //   allowDeviceCredentials: config.biometrics?.fallbackToPasscode || false,
    // });
  }
  async init(storageService) {
    this.storageService = storageService;
    try {
      // Check if user data exists
      await this.loadUserData();
      console.log('Auth service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
      throw error;
    }
  }
  async authenticateUser() {
    try {
      // Simplified authentication - always return success for now
      // In a real implementation, you might want basic username/password authentication
      return await this.handleSuccessfulAuth();
    } catch (error) {
      console.error('Authentication failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  async handleSuccessfulAuth() {
    this.isAuthenticated = true;
    if (!this.currentUser) {
      this.currentUser = await this.createOrUpdateUser();
    }
    this.currentUser.lastLogin = new Date().toISOString();
    await this.saveUserData(this.currentUser);
    return {
      success: true,
      user: this.currentUser
    };
  }
  async isUserAuthenticated() {
    return this.isAuthenticated;
  }

  // Biometric methods - commented out or simplified
  async setupBiometrics() {
    console.log('Biometrics not available - feature disabled');
    return false;

    // Original biometric implementation commented out
    // try {
    //   const { available, biometryType } = await this.biometrics.isSensorAvailable();
    //
    //   if (!available) {
    //     console.log('Biometric authentication not available');
    //     return false;
    //   }
    //   // ... rest of biometric setup
    //   return true;
    // } catch (error) {
    //   console.error('Failed to setup biometrics:', error);
    //   return false;
    // }
  }
  async getBiometryType() {
    // return null since biometrics are disabled
    return null;

    // Original implementation commented out
    // try {
    //   const { available, biometryType } = await this.biometrics.isSensorAvailable();
    //   return available ? biometryType : null;
    // } catch (error) {
    //   console.error('Failed to get biometry type:', error);
    //   return null;
    // }
  }
  async getCurrentUser() {
    return this.currentUser;
  }
  async createOrUpdateUser() {
    const existingUser = await this.loadUserData();
    if (existingUser) {
      return existingUser;
    }

    // Create new user - biometrics disabled by default
    const newUser = {
      id: `user-${Date.now()}`,
      name: undefined,
      email: undefined,
      biometricsEnabled: false,
      // Always false since biometrics are disabled
      lastLogin: new Date().toISOString()
    };
    await this.saveUserData(newUser);
    return newUser;
  }
  async loadUserData() {
    try {
      const userData = await AsyncStorage.getItem(`vc-sdk-user-${this.config.appId}`);
      if (userData) {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
    return null;
  }
  async saveUserData(user) {
    try {
      await AsyncStorage.setItem(`vc-sdk-user-${this.config.appId}`, JSON.stringify(user));
      this.currentUser = user;
    } catch (error) {
      console.error('Failed to save user data:', error);
      throw error;
    }
  }
  async logout() {
    try {
      this.isAuthenticated = false;
      this.currentUser = null;

      // Clear sensitive data but keep user profile
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Failed to logout:', error);
      throw error;
    }
  }
  async deleteUser() {
    try {
      await AsyncStorage.removeItem(`vc-sdk-user-${this.config.appId}`);

      // Biometric key deletion commented out
      // try {
      //   const { keysExist } = await this.biometrics.biometricKeysExist();
      //   if (keysExist) {
      //     await this.biometrics.deleteKeys();
      //   }
      // } catch (error) {
      //   console.warn('Failed to delete biometric keys:', error);
      // }

      this.currentUser = null;
      this.isAuthenticated = false;
      console.log('User data deleted successfully');
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  }
  async updateUser(updates) {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }
    const updatedUser = {
      ...this.currentUser,
      ...updates
    };
    await this.saveUserData(updatedUser);
    return updatedUser;
  }

  // Biometric methods - simplified to always return false/fail
  async enableBiometrics() {
    console.log('Biometrics not available - feature disabled');
    return false;

    // Original implementation commented out
    // try {
    //   const success = await this.setupBiometrics();
    //
    //   if (success && this.currentUser) {
    //     await this.updateUser({ biometricsEnabled: true });
    //   }
    //
    //   return success;
    // } catch (error) {
    //   console.error('Failed to enable biometrics:', error);
    //   return false;
    // }
  }
  async disableBiometrics() {
    console.log('Biometrics already disabled');
    if (this.currentUser) {
      await this.updateUser({
        biometricsEnabled: false
      });
    }
    return true;

    // Original implementation commented out
    // try {
    //   // Delete biometric keys
    //   const { keysExist } = await this.biometrics.biometricKeysExist();
    //   if (keysExist) {
    //     await this.biometrics.deleteKeys();
    //   }
    //   if (this.currentUser) {
    //     await this.updateUser({ biometricsEnabled: false });
    //   }
    //   console.log('Biometrics disabled successfully');
    //   return true;
    // } catch (error) {
    //   console.error('Failed to disable biometrics:', error);
    //   return false;
    // }
  }
  async isBiometricAvailable() {
    return false; // Always false since biometrics are disabled

    // Original implementation commented out
    // try {
    //   const { available } = await this.biometrics.isSensorAvailable();
    //   return available;
    // } catch (error) {
    //   console.error('Failed to check biometric availability:', error);
    //   return false;
    // }
  }
  async isBiometricEnabled() {
    return false; // Always false since biometrics are disabled
    // return this.currentUser?.biometricsEnabled || false;
  }

  // Session management (unchanged)
  async refreshSession() {
    try {
      if (!this.isAuthenticated) {
        return false;
      }

      // Extend session if user is still authenticated
      if (this.currentUser) {
        this.currentUser.lastLogin = new Date().toISOString();
        await this.saveUserData(this.currentUser);
      }
      return true;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return false;
    }
  }
  async isSessionValid() {
    if (!this.isAuthenticated || !this.currentUser) {
      return false;
    }

    // Check if session is still valid (example: within last 24 hours)
    const lastLogin = new Date(this.currentUser.lastLogin);
    const now = new Date();
    const hoursSinceLogin = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);
    return hoursSinceLogin < 24; // 24 hour session timeout
  }
  async cleanup() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.storageService = null;
    console.log('Auth service cleaned up');
  }

  // Simple authentication method (placeholder)
  async isAuthenticated() {
    return this.isAuthenticated;
  }
}
//# sourceMappingURL=AuthService_no_biometrics.js.map