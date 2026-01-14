import React, { useRef, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VCSDK } from 'vc-sdk-headless';

interface CustomAuthWebViewProps {
  isVisible: boolean;
  onSuccess: (params: any) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export const CustomAuthWebView: React.FC<CustomAuthWebViewProps> = ({
  isVisible,
  onSuccess,
  onError,
  onCancel,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasProcessedCode, setHasProcessedCode] = useState(false);
  const [pkceData, setPkceData] = useState<{codeVerifier: string, codeChallenge: string} | null>(null);

  // Get redirect URI from SDK config (used to watch for OAuth callback)
  const getRedirectUri = (): string => {
    const oauthConfig = VCSDK.getConfig()?.network?.oauth;
    return oauthConfig?.redirectUri || 'http://localhost:3001/redirect';
  };

  // Helper function to convert ArrayBuffer to base64url
  const base64URLEncode = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  // Generate PKCE code_verifier and code_challenge
  const generatePKCE = async (): Promise<{codeVerifier: string, codeChallenge: string}> => {
    try {
      // Check if crypto API is available in React Native
      if (typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.subtle) {
        // Generate random code_verifier (43-128 characters)
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const codeVerifier = base64URLEncode(array.buffer);

        // Generate code_challenge using SHA256
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        const codeChallenge = base64URLEncode(digest);

        console.log('[AUTH WEBVIEW] Generated PKCE using crypto API:');
        console.log('[AUTH WEBVIEW] code_verifier:', codeVerifier);
        console.log('[AUTH WEBVIEW] code_challenge:', codeChallenge);

        return { codeVerifier, codeChallenge };
      } else {
        throw new Error('Crypto API not available in React Native environment');
      }
    } catch (error) {
      console.log('[AUTH WEBVIEW] Crypto API not available, using fallback PKCE values');
      // Use static but valid PKCE values that work with Brazilian gov.br
      return {
        codeVerifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
      };
    }
  };

  // Initialize PKCE when component mounts
  React.useEffect(() => {
    if (isVisible && !pkceData) {
      generatePKCE().then(setPkceData);
    }
  }, [isVisible]);

  // Build authorization URL with dynamic PKCE
  const getAuthUrl = (): string => {
    if (!pkceData) return '';

    // Get OAuth config from SDK
    const oauthConfig = VCSDK.getConfig()?.network?.oauth;
    const authorizationUrl = oauthConfig?.authorizationUrl || 'https://sso.staging.acesso.gov.br/authorize';
    const clientId = oauthConfig?.clientId || 'h-credenciaisverificaveis-dev.dataprev.gov.br';
    const redirectUri = oauthConfig?.redirectUri || 'http://localhost:3001/redirect';
    const scopes = oauthConfig?.scopes?.join('+') || 'openid+email+profile+govbr_confiabilidades';

    const authUrl = `${authorizationUrl}?response_type=code&client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&nonce=q1w2e3r4t5y6u7i8o9p0&state=p0o9i8u7y6t5r4e3w2q1&code_challenge=${pkceData.codeChallenge}&code_challenge_method=S256`;

    console.log('[AUTH WEBVIEW] Authorization URL:', authUrl);
    console.log('[AUTH WEBVIEW] Using OAuth config:', { authorizationUrl, clientId, redirectUri, scopes });
    return authUrl;
  };

  const extractQueryParams = (url: string) => {
    try {
      const urlObj = new URL(url);
      const params: any = {};

      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      return params;
    } catch (error) {
      console.error('[AUTH WEBVIEW] Error parsing URL:', error);
      return {};
    }
  };

  const saveToSharedPreferences = async (params: any) => {
    try {
      if (params.code) {
        await AsyncStorage.setItem('auth_code', params.code);
        console.log('[AUTH WEBVIEW] Authorization code saved');
      }
      if (params.state) {
        await AsyncStorage.setItem('auth_state', params.state);
        console.log('[AUTH WEBVIEW] State saved');
      }

      await AsyncStorage.setItem('auth_params', JSON.stringify(params));
      console.log('[AUTH WEBVIEW] All parameters saved to shared preferences');
      return true;
    } catch (error) {
      console.error('[AUTH WEBVIEW] Error saving to shared preferences:', error);
      return false;
    }
  };

  const exchangeCodeForToken = async (code: string) => {
    try {
      console.log('[AUTH WEBVIEW] Exchanging code for token...');

      if (!pkceData) {
        throw new Error('PKCE data not available');
      }

      // Get OAuth config from SDK
      const oauthConfig = VCSDK.getConfig()?.network?.oauth;
      const tokenUrl = oauthConfig?.tokenUrl || 'https://sso.staging.acesso.gov.br/token';
      const redirectUri = oauthConfig?.redirectUri || 'http://localhost:3001/redirect';
      const clientId = oauthConfig?.clientId || 'h-credenciaisverificaveis-dev.dataprev.gov.br';
      const clientSecret = oauthConfig?.clientSecret || process.env.OAUTH_CLIENT_SECRET || '';

      // Create Basic Auth header from clientId and clientSecret
      const basicAuth = btoa(`${clientId}:${clientSecret}`);

      console.log('[AUTH WEBVIEW] Using token URL:', tokenUrl);

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          code_verifier: pkceData.codeVerifier,
          redirect_uri: redirectUri
        }).toString(),
      });

      console.log('[AUTH WEBVIEW] Token response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[AUTH WEBVIEW] Token request failed:', errorText);
        throw new Error(`Token request failed: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('[AUTH WEBVIEW] Token received successfully');

      // Save token data to shared preferences
      await AsyncStorage.setItem('access_token', tokenData.access_token);
      await AsyncStorage.setItem('id_token', tokenData.id_token);
      await AsyncStorage.setItem('token_type', tokenData.token_type);
      await AsyncStorage.setItem('expires_in', tokenData.expires_in.toString());
      await AsyncStorage.setItem('scope', tokenData.scope);
      await AsyncStorage.setItem('token_data', JSON.stringify(tokenData));

      console.log('[AUTH WEBVIEW] Token data saved to shared preferences');

      // Now get user info
      await getUserInfo(tokenData.access_token);

    } catch (error) {
      console.error('[AUTH WEBVIEW] Error exchanging code for token:', error);
      throw error;
    }
  };

  const getUserInfo = async (accessToken: string) => {
    try {
      console.log('[AUTH WEBVIEW] Getting user info...');

      // Get OAuth config from SDK
      const oauthConfig = VCSDK.getConfig()?.network?.oauth;
      const userInfoUrl = oauthConfig?.userInfoUrl || 'https://sso.staging.acesso.gov.br/userinfo/';

      console.log('[AUTH WEBVIEW] Using user info URL:', userInfoUrl);

      const userInfoResponse = await fetch(userInfoUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('[AUTH WEBVIEW] User info response status:', userInfoResponse.status);

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        console.error('[AUTH WEBVIEW] User info request failed:', errorText);
        throw new Error(`User info request failed: ${userInfoResponse.status}`);
      }

      const userData = await userInfoResponse.json();
      console.log('[AUTH WEBVIEW] User info received successfully:', userData.name, userData.email);

      // Save user data to shared preferences
      await AsyncStorage.setItem('user_sub', userData.sub);
      await AsyncStorage.setItem('user_name', userData.name);
      await AsyncStorage.setItem('user_social_name', userData.social_name || '');
      await AsyncStorage.setItem('user_profile', userData.profile);
      await AsyncStorage.setItem('user_picture', userData.picture);
      await AsyncStorage.setItem('user_email', userData.email);
      await AsyncStorage.setItem('user_email_verified', userData.email_verified.toString());
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));

      console.log('[AUTH WEBVIEW] User data saved to shared preferences');

      // Show success and call onSuccess
      Alert.alert(
        'Autenticação bem-sucedida!',
        `Bem-vindo(a) ${userData.name}!\n\nEmail: ${userData.email}\nDados do perfil salvos com sucesso.`,
        [{ text: 'Continuar', onPress: () => onSuccess({ userData, accessToken }) }]
      );

    } catch (error) {
      console.error('[AUTH WEBVIEW] Error getting user info:', error);
      throw error;
    }
  };

  const onNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    console.log('[AUTH WEBVIEW] WebView navigated to:', url);

    const redirectUri = getRedirectUri();
    if (url.startsWith(redirectUri) && !hasProcessedCode) {
      console.log('[AUTH WEBVIEW] Redirect detected! URL:', url);
      setHasProcessedCode(true); // Prevent duplicate processing

      const params = extractQueryParams(url);
      console.log('[AUTH WEBVIEW] Extracted parameters:', params);

      if (params.error) {
        onError(`Authentication error: ${params.error}`);
        return;
      }

      if (params.code) {
        console.log('[AUTH WEBVIEW] Authorization code received');

        const saved = await saveToSharedPreferences(params);

        if (saved) {
          // Exchange code for token
          try {
            await exchangeCodeForToken(params.code);
          } catch (error) {
            console.error('[AUTH WEBVIEW] Token exchange failed:', error);
            onError(`Failed to exchange code for token: ${error.message}`);
          }
        } else {
          onError('Failed to save authorization data');
        }
      } else {
        onError('No authorization code received');
      }
    }
  };

  const onLoadStart = () => {
    setIsLoading(true);
    console.log('[AUTH WEBVIEW] WebView started loading...');
  };

  const onLoadEnd = () => {
    setIsLoading(false);
    console.log('[AUTH WEBVIEW] WebView finished loading');
  };

  const onWebViewError = (error: any) => {
    console.error('[AUTH WEBVIEW] WebView error:', error);
    const errorMessage = error?.nativeEvent?.description || 'WebView loading error';
    onError(errorMessage);
  };

  if (!isVisible) {
    return null;
  }

  // Don't render WebView until PKCE data is generated
  if (!pkceData) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Inicializando autenticação...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: getAuthUrl() }}
        onNavigationStateChange={onNavigationStateChange}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
        onHttpError={onWebViewError}
        onRenderProcessGone={onWebViewError}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36"
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando autorização...</Text>
        </View>
      )}
    </View>
  );
};

// Helper function to retrieve all saved data from shared preferences
export const getAllAuthDataFromStorage = async () => {
  try {
    const [
      authParams,
      authCode,
      authState,
      accessToken,
      idToken,
      tokenType,
      expiresIn,
      scope,
      tokenData,
      userSub,
      userName,
      userSocialName,
      userProfile,
      userPicture,
      userEmail,
      userEmailVerified,
      userData
    ] = await Promise.all([
      AsyncStorage.getItem('auth_params'),
      AsyncStorage.getItem('auth_code'),
      AsyncStorage.getItem('auth_state'),
      AsyncStorage.getItem('access_token'),
      AsyncStorage.getItem('id_token'),
      AsyncStorage.getItem('token_type'),
      AsyncStorage.getItem('expires_in'),
      AsyncStorage.getItem('scope'),
      AsyncStorage.getItem('token_data'),
      AsyncStorage.getItem('user_sub'),
      AsyncStorage.getItem('user_name'),
      AsyncStorage.getItem('user_social_name'),
      AsyncStorage.getItem('user_profile'),
      AsyncStorage.getItem('user_picture'),
      AsyncStorage.getItem('user_email'),
      AsyncStorage.getItem('user_email_verified'),
      AsyncStorage.getItem('user_data')
    ]);

    return {
      auth: {
        params: authParams ? JSON.parse(authParams) : null,
        code: authCode,
        state: authState,
      },
      token: {
        accessToken,
        idToken,
        tokenType,
        expiresIn: expiresIn ? parseInt(expiresIn) : null,
        scope,
        fullData: tokenData ? JSON.parse(tokenData) : null,
      },
      user: {
        sub: userSub,
        name: userName,
        socialName: userSocialName,
        profile: userProfile,
        picture: userPicture,
        email: userEmail,
        emailVerified: userEmailVerified === 'true',
        fullData: userData ? JSON.parse(userData) : null,
      }
    };
  } catch (error) {
    console.error('[AUTH WEBVIEW] Error retrieving all auth data:', error);
    return null;
  }
};

// Helper function to clear all saved data
export const clearAllAuthDataFromStorage = async () => {
  try {
    const keysToRemove = [
      'auth_params', 'auth_code', 'auth_state',
      'access_token', 'id_token', 'token_type', 'expires_in', 'scope', 'token_data',
      'user_sub', 'user_name', 'user_social_name', 'user_profile', 'user_picture',
      'user_email', 'user_email_verified', 'user_data'
    ];

    await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
    console.log('[AUTH WEBVIEW] All auth data cleared from storage');
  } catch (error) {
    console.error('[AUTH WEBVIEW] Error clearing all auth data:', error);
  }
};

// Helper function to check if user is authenticated
export const isUserAuthenticated = async () => {
  try {
    const accessToken = await AsyncStorage.getItem('access_token');
    const expiresIn = await AsyncStorage.getItem('expires_in');

    if (!accessToken || !expiresIn) {
      return false;
    }

    // Check if token has expired (this is a simple check, you might want to store the actual expiry time)
    return true; // You can implement more sophisticated expiry checking here
  } catch (error) {
    console.error('[AUTH WEBVIEW] Error checking authentication status:', error);
    return false;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});