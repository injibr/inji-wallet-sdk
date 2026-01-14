"use strict";

import AsyncStorage from '@react-native-async-storage/async-storage';
export class AuthIntegrationService {
  /**
   * Helper to check if user is authenticated
   */
  static async isUserAuthenticated() {
    try {
      const accessToken = await AsyncStorage.getItem('access_token');
      const idToken = await AsyncStorage.getItem('id_token');
      return !!(accessToken && idToken);
    } catch (error) {
      console.error('[AUTH INTEGRATION] Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Helper to get all auth data from storage
   */
  static async getAllAuthDataFromStorage() {
    try {
      const [accessToken, idToken, tokenType, expiresIn, scope, userSub, userName, userSocialName, userProfile, userPicture, userEmail, userEmailVerified, userData] = await Promise.all([AsyncStorage.getItem('access_token'), AsyncStorage.getItem('id_token'), AsyncStorage.getItem('token_type'), AsyncStorage.getItem('expires_in'), AsyncStorage.getItem('scope'), AsyncStorage.getItem('user_sub'), AsyncStorage.getItem('user_name'), AsyncStorage.getItem('user_social_name'), AsyncStorage.getItem('user_profile'), AsyncStorage.getItem('user_picture'), AsyncStorage.getItem('user_email'), AsyncStorage.getItem('user_email_verified'), AsyncStorage.getItem('user_data')]);
      return {
        token: {
          accessToken,
          idToken,
          tokenType,
          expiresIn: expiresIn ? parseInt(expiresIn, 10) : null,
          scope
        },
        user: {
          sub: userSub || '',
          name: userName || '',
          socialName: userSocialName || '',
          profile: userProfile || '',
          picture: userPicture || '',
          email: userEmail || '',
          emailVerified: userEmailVerified === 'true',
          fullData: userData ? JSON.parse(userData) : null
        }
      };
    } catch (error) {
      console.error('[AUTH INTEGRATION] Error getting auth data from storage:', error);
      return null;
    }
  }

  /**
   * Checks if authentication is required for credential operations
   */
  static async requiresAuthenticationForCredentials() {
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
      const accessToken = await AsyncStorage.getItem('access_token');
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
  static async getUserInfo() {
    try {
      console.log('[AUTH INTEGRATION] Getting user info...');
      const authData = await this.getAllAuthDataFromStorage();
      if (!authData || !authData.user || !authData.user.fullData) {
        console.log('[AUTH INTEGRATION] No user data found');
        return null;
      }
      const user = authData.user;
      const userInfo = {
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
  static async getAccessToken() {
    try {
      console.log('[AUTH INTEGRATION] Getting access token...');
      const accessToken = await AsyncStorage.getItem('access_token');
      if (!accessToken) {
        console.log('[AUTH INTEGRATION] No access token found');
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
  static async isSessionValid() {
    try {
      console.log('[AUTH INTEGRATION] Checking session validity...');
      const authData = await this.getAllAuthDataFromStorage();
      if (!authData || !authData.token || !authData.token.accessToken) {
        console.log('[AUTH INTEGRATION] Session invalid - no token data');
        return false;
      }

      // Check if token has expired
      const expiresIn = authData.token.expiresIn;
      if (expiresIn && expiresIn <= 0) {
        console.log('[AUTH INTEGRATION] Session invalid - token expired');
        return false;
      }

      // Optionally, you could make a test API call to verify the token
      // For now, we'll just check if we have the required data
      const hasRequiredData = !!(authData.token.accessToken && authData.user && authData.user.fullData);
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
  static async getAuthHeaders() {
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
  static async refreshToken() {
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
  static async logout() {
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
  static async clearAuthData() {
    try {
      console.log('[AUTH INTEGRATION] Clearing authentication data...');
      const keysToRemove = ['auth_params', 'auth_code', 'auth_state', 'access_token', 'id_token', 'token_type', 'expires_in', 'scope', 'token_data', 'user_sub', 'user_name', 'user_social_name', 'user_profile', 'user_picture', 'user_email', 'user_email_verified', 'user_data'];
      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
      console.log('[AUTH INTEGRATION] Authentication data cleared successfully');
    } catch (error) {
      console.error('[AUTH INTEGRATION] Error clearing authentication data:', error);
    }
  }

  /**
   * Gets authentication status for display purposes
   */
  static async getAuthenticationStatus() {
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
//# sourceMappingURL=AuthIntegrationService.js.map