import { VCSDKConfig, AuthResult, User } from '../types';
import { StorageServicePlatform as StorageService } from './StorageService_Platform';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class AuthService {
  private config: VCSDKConfig;
  private storageService: StorageService | null = null;
  private currentUser: User | null = null;
  private _isAuthenticated = false;

  constructor(config: VCSDKConfig) {
    this.config = config;
  }

  async init(storageService: StorageService): Promise<void> {
    this.storageService = storageService;
    await this.loadUserData();
  }

  async authenticateUser(): Promise<AuthResult> {
    try {
      return await this.handleSuccessfulAuth();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async handleSuccessfulAuth(): Promise<AuthResult> {
    this._isAuthenticated = true;
    if (!this.currentUser) {
      this.currentUser = await this.createOrUpdateUser();
    }
    this.currentUser.lastLogin = new Date().toISOString();
    await this.saveUserData(this.currentUser);
    return { success: true, user: this.currentUser };
  }

  async isAuthenticated(): Promise<boolean> {
    return this._isAuthenticated;
  }

  async getCurrentUser(): Promise<User | null> {
    return this.currentUser;
  }

  async handleAuthCallback(token: string): Promise<void> {
    this._isAuthenticated = true;
  }

  async logout(): Promise<void> {
    this._isAuthenticated = false;
    this.currentUser = null;
  }

  async cleanup(): Promise<void> {
    this.currentUser = null;
    this._isAuthenticated = false;
    this.storageService = null;
  }

  private async createOrUpdateUser(): Promise<User> {
    const existingUser = await this.loadUserData();
    if (existingUser) return existingUser;

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: undefined,
      email: undefined,
      biometricsEnabled: false,
      lastLogin: new Date().toISOString(),
    };
    await this.saveUserData(newUser);
    return newUser;
  }

  private async loadUserData(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(`vc-sdk-user-${this.config.appId}`);
      if (userData) {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      }
    } catch (error) {
      console.error('[AuthService] Failed to load user data:', error);
    }
    return null;
  }

  private async saveUserData(user: User): Promise<void> {
    await AsyncStorage.setItem(`vc-sdk-user-${this.config.appId}`, JSON.stringify(user));
    this.currentUser = user;
  }
}
