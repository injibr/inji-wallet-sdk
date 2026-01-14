import { VCSDKConfig, AuthResult, User } from '../types';
import { StorageServicePlatform as StorageService } from './StorageService_Platform';
export declare class AuthService {
    private config;
    private storageService;
    private currentUser;
    private isAuthenticated;
    constructor(config: VCSDKConfig);
    init(storageService: StorageService): Promise<void>;
    authenticateUser(): Promise<AuthResult>;
    private handleSuccessfulAuth;
    isUserAuthenticated(): Promise<boolean>;
    setupBiometrics(): Promise<boolean>;
    private getBiometryType;
    getCurrentUser(): Promise<User | null>;
    private createOrUpdateUser;
    private loadUserData;
    private saveUserData;
    logout(): Promise<void>;
    deleteUser(): Promise<void>;
    updateUser(updates: Partial<User>): Promise<User>;
    enableBiometrics(): Promise<boolean>;
    disableBiometrics(): Promise<boolean>;
    isBiometricAvailable(): Promise<boolean>;
    isBiometricEnabled(): Promise<boolean>;
    refreshSession(): Promise<boolean>;
    isSessionValid(): Promise<boolean>;
    cleanup(): Promise<void>;
    isAuthenticated(): Promise<boolean>;
}
//# sourceMappingURL=AuthService.d.ts.map