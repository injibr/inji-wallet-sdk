export interface AuthCheckResult {
    required: boolean;
    reason?: string;
}
export interface UserInfo {
    sub: string;
    name: string;
    email: string;
    socialName?: string;
    profile: string;
    picture: string;
    emailVerified: boolean;
}
export declare class AuthIntegrationService {
    /**
     * Helper to check if user is authenticated
     */
    private static isUserAuthenticated;
    /**
     * Helper to get all auth data from storage
     */
    private static getAllAuthDataFromStorage;
    /**
     * Checks if authentication is required for credential operations
     */
    static requiresAuthenticationForCredentials(): Promise<AuthCheckResult>;
    /**
     * Gets the current user information
     */
    static getUserInfo(): Promise<UserInfo | null>;
    /**
     * Gets the current access token
     */
    static getAccessToken(): Promise<string | null>;
    /**
     * Checks if the current session is valid
     */
    static isSessionValid(): Promise<boolean>;
    /**
     * Gets authentication headers for API requests
     */
    static getAuthHeaders(): Promise<Record<string, string>>;
    /**
     * Refreshes the authentication token if possible
     */
    static refreshToken(): Promise<boolean>;
    /**
     * Logs out the user and clears all authentication data
     */
    static logout(): Promise<void>;
    /**
     * Clears all authentication data
     */
    static clearAuthData(): Promise<void>;
    /**
     * Gets authentication status for display purposes
     */
    static getAuthenticationStatus(): Promise<{
        isAuthenticated: boolean;
        userInfo?: UserInfo;
        reason?: string;
    }>;
}
//# sourceMappingURL=AuthIntegrationService.d.ts.map