import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

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

export class AuthIntegrationService {

  /**
   * Helper to check if user is authenticated and token is not expired
   */
  private static async isUserAuthenticated(): Promise<boolean> {
    try {
      const [accessToken, idToken, expiresAt] = await Promise.all([
        SecureStore.getItemAsync('access_token'),
        SecureStore.getItemAsync('id_token'),
        AsyncStorage.getItem('expires_at'),
      ]);
      if (!accessToken || !idToken) return false;
      if (expiresAt && Date.now() > parseInt(expiresAt)) return false;
      return true;
    } catch (error) {
      console.error('[AUTH INTEGRATION] Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Helper to get all auth data from storage
   */
  private static async getAllAuthDataFromStorage() {
    try {
      const [accessToken, idToken, rawUserData, metaPairs] = await Promise.all([
        SecureStore.getItemAsync('access_token'),
        SecureStore.getItemAsync('id_token'),
        SecureStore.getItemAsync('user_data'),
        AsyncStorage.multiGet(['token_type', 'expires_at', 'scope']),
      ]);

      const meta = Object.fromEntries(metaPairs.map(([k, v]) => [k, v]));
      const userData = rawUserData ? JSON.parse(rawUserData) : null;

      return {
        token: {
          accessToken,
          idToken,
          tokenType: meta.token_type,
          expiresAt: meta.expires_at ? parseInt(meta.expires_at, 10) : null,
          scope: meta.scope,
        },
        user: userData ? {
          sub: userData.sub || '',
          name: userData.name || '',
          socialName: userData.social_name || '',
          profile: userData.profile || '',
          picture: userData.picture || '',
          email: userData.email || '',
          emailVerified: userData.email_verified === true || userData.email_verified === 'true',
          fullData: userData,
        } : null,
      };
    } catch (error) {
      console.error('[AUTH INTEGRATION] Error getting auth data from storage:', error);
      return null;
    }
  }

  /**
   * Checks if authentication is required for credential operations
   */
  static async requiresAuthenticationForCredentials(): Promise<AuthCheckResult> {
    try {
      console.log('[AUTH INTEGRATION] Checking if authentication is required...');

      const isAuthenticated = await this.isUserAuthenticated();

      if (!isAuthenticated) {
        console.log('[AUTH INTEGRATION] Authentication required - no valid tokens found');
        return {
          required: true,
          reason: 'Please authenticate with your gov.br account to download credentials'
        };
      }

      // Check if we have user info
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        console.log('[AUTH INTEGRATION] Authentication required - no user data found');
        return {
          required: true,
          reason: 'User profile information is missing. Please re-authenticate.'
        };
      }

      // Check if we have access token
      const accessToken = await SecureStore.getItemAsync('access_token');
      if (!accessToken) {
        console.log('[AUTH INTEGRATION] Authentication required - no access token found');
        return {
          required: true,
          reason: 'Access token is missing. Please re-authenticate.'
        };
      }

      console.log('[AUTH INTEGRATION] Authentication not required - user is authenticated');
      return {
        required: false
      };

    } catch (error) {
      console.error('[AUTH INTEGRATION] Error checking authentication requirements:', error);
      return {
        required: true,
        reason: 'Error checking authentication status. Please try again.'
      };
    }
  }

  /**
   * Gets the current user information
   */
  static async getUserInfo(): Promise<UserInfo | null> {
    try {
      console.log('[AUTH INTEGRATION] Getting user info...');

      const authData = await this.getAllAuthDataFromStorage();

      if (!authData || !authData.user || !authData.user.fullData) {
        console.log('[AUTH INTEGRATION] No user data found');
        return null;
      }

      const user = authData.user;

      const userInfo: UserInfo = {
        sub: user.sub || '',
        name: user.name || '',
        email: user.email || '',
        socialName: user.socialName || '',
        profile: user.profile || '',
        picture: user.picture || '',
        emailVerified: user.emailVerified || false
      };

      console.log('[AUTH INTEGRATION] User info retrieved:', {
        name: userInfo.name,
        email: userInfo.email,
        emailVerified: userInfo.emailVerified
      });

      return userInfo;

    } catch (error) {
      console.error('[AUTH INTEGRATION] Error getting user info:', error);
      return null;
    }
  }

  /**
   * Gets the current access token
   */
  static async getAccessToken(): Promise<string | null> {
    try {
      console.log('[AUTH INTEGRATION] Getting access token...');

      const [accessToken, expiresAt] = await Promise.all([
        SecureStore.getItemAsync('access_token'),
        AsyncStorage.getItem('expires_at'),
      ]);

      if (!accessToken) {
        console.log('[AUTH INTEGRATION] No access token found');
        return null;
      }

      if (expiresAt && Date.now() > parseInt(expiresAt)) {
        console.log('[AUTH INTEGRATION] Access token expired');
        return null;
      }

      console.log('[AUTH INTEGRATION] Access token retrieved');
      return accessToken;

    } catch (error) {
      console.error('[AUTH INTEGRATION] Error getting access token:', error);
      return null;
    }
  }

  /**
   * Checks if the current session is valid
   */
  static async isSessionValid(): Promise<boolean> {
    try {
      console.log('[AUTH INTEGRATION] Checking session validity...');

      const authData = await this.getAllAuthDataFromStorage();

      if (!authData || !authData.token || !authData.token.accessToken) {
        console.log('[AUTH INTEGRATION] Session invalid - no token data');
        return false;
      }

      // Check if token has expired
      const expiresAt = (authData.token as any).expiresAt;
      if (expiresAt && Date.now() > expiresAt) {
        console.log('[AUTH INTEGRATION] Session invalid - token expired');
        return false;
      }

      const hasRequiredData = !!(
        authData.token.accessToken &&
        authData.user &&
        authData.user.fullData
      );

      console.log('[AUTH INTEGRATION] Session validity:', hasRequiredData);
      return hasRequiredData;

    } catch (error) {
      console.error('[AUTH INTEGRATION] Error checking session validity:', error);
      return false;
    }
  }

  /**
   * Gets authentication headers for API requests
   */
  static async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      console.log('[AUTH INTEGRATION] Getting auth headers...');

      const accessToken = await this.getAccessToken();

      if (!accessToken) {
        console.log('[AUTH INTEGRATION] No access token available for headers');
        return {};
      }

      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-AppId': 'vc-sdk-app'
      };

      console.log('[AUTH INTEGRATION] Auth headers prepared');
      return headers;

    } catch (error) {
      console.error('[AUTH INTEGRATION] Error getting auth headers:', error);
      return {
        'Content-Type': 'application/json',
        'X-AppId': 'vc-sdk-app'
      };
    }
  }

  /**
   * Refreshes the authentication token if possible
   */
  static async refreshToken(): Promise<boolean> {
    try {
      console.log('[AUTH INTEGRATION] Refreshing token...');

      // In a real implementation, you would use the refresh token to get a new access token
      // For now, we'll just check if we have valid authentication data

      const isValid = await this.isSessionValid();

      if (isValid) {
        console.log('[AUTH INTEGRATION] Token refresh not needed - session is valid');
        return true;
      }

      console.log('[AUTH INTEGRATION] Token refresh failed - re-authentication required');
      return false;

    } catch (error) {
      console.error('[AUTH INTEGRATION] Error refreshing token:', error);
      return false;
    }
  }

  /**
   * Logs out the user and clears all authentication data
   */
  static async logout(): Promise<void> {
    try {
      console.log('[AUTH INTEGRATION] Logging out user...');
      await this.clearAuthData();
      console.log('[AUTH INTEGRATION] Logout completed successfully');
    } catch (error) {
      console.error('[AUTH INTEGRATION] Error during logout:', error);
      throw error;
    }
  }

  /**
   * Clears all authentication data
   */
  static async clearAuthData(): Promise<void> {
    try {
      console.log('[AUTH INTEGRATION] Clearing authentication data...');

      await Promise.all([
        SecureStore.deleteItemAsync('access_token'),
        SecureStore.deleteItemAsync('id_token'),
        SecureStore.deleteItemAsync('auth_code'),
        SecureStore.deleteItemAsync('c_nonce'),
        SecureStore.deleteItemAsync('user_data'),
        AsyncStorage.multiRemove(['token_type', 'expires_at', 'scope', 'auth_state']),
      ]);

      console.log('[AUTH INTEGRATION] Authentication data cleared successfully');

    } catch (error) {
      console.error('[AUTH INTEGRATION] Error clearing authentication data:', error);
    }
  }

  /**
   * Gets authentication status for display purposes
   */
  static async getAuthenticationStatus(): Promise<{
    isAuthenticated: boolean;
    userInfo?: UserInfo;
    reason?: string;
  }> {
    try {
      console.log('[AUTH INTEGRATION] Getting authentication status...');

      const authCheck = await this.requiresAuthenticationForCredentials();
      const userInfo = await this.getUserInfo();

      const status = {
        isAuthenticated: !authCheck.required,
        userInfo: userInfo || undefined,
        reason: authCheck.reason
      };

      console.log('[AUTH INTEGRATION] Authentication status:', {
        isAuthenticated: status.isAuthenticated,
        hasUserInfo: !!status.userInfo,
        userName: status.userInfo?.name
      });

      return status;

    } catch (error) {
      console.error('[AUTH INTEGRATION] Error getting authentication status:', error);
      return {
        isAuthenticated: false,
        reason: 'Error checking authentication status'
      };
    }
  }
}