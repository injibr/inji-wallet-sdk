import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import the headless SDK
import { VCSDK } from 'vc-sdk-headless';

// Import screens
import { QRScannerScreen } from './src/screens/QRScannerScreen';
import { ShareVCConsentScreen } from './src/screens/ShareVCConsentScreen';
import { ShareVCProcessingScreen } from './src/screens/ShareVCProcessingScreen';
import { ShareVCSuccessScreen } from './src/screens/ShareVCSuccessScreen';
import { ShareVCErrorScreen } from './src/screens/ShareVCErrorScreen';
import { DeviceRegistrationScreen } from './src/screens/DeviceRegistrationScreen';
import { CustomAuthWebView } from './src/components/CustomAuthWebView';

type Screen =
  | 'home'
  | 'auth-webview'
  | 'qr-scanner'
  | 'share-consent'
  | 'share-processing'
  | 'share-success'
  | 'share-error'
  | 'device-registration';

function AppContent() {
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [issuers, setIssuers] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigation state
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  // ShareVC flow state
  const [shareUrl, setShareUrl] = useState('');
  const [authRequest, setAuthRequest] = useState<any>(null);
  const [requestedCredentials, setRequestedCredentials] = useState<any[]>([]);
  const [protocolNumber, setProtocolNumber] = useState('');
  const [shareError, setShareError] = useState('');

  useEffect(() => {
    initializeSDK();
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('access_token');
      setIsAuthenticated(!!accessToken);
    } catch (error) {
      console.error('[Auth] Failed to check auth status:', error);
    }
  };

  const initializeSDK = async () => {
    try {
      console.log('Initializing VC SDK Headless...');

      // Initialize the SDK
      await VCSDK.init({
        appId: 'vc-sdk-demo-headless',
        network: {
          baseUrl: 'https://injiweb.credenciaisverificaveis-dev.dataprev.gov.br',
          notificationBaseUrl: 'https://injiweb.credenciaisverificaveis-dev.dataprev.gov.br',
          timeout: 30000,
          oauth: {
            authorizationUrl: 'https://sso.staging.acesso.gov.br/authorize',
            tokenUrl: 'https://sso.staging.acesso.gov.br/token',
            userInfoUrl: 'https://sso.staging.acesso.gov.br/userinfo/',
            clientId: 'h-credenciaisverificaveis-dev.dataprev.gov.br',
            clientSecret: process.env.OAUTH_CLIENT_SECRET || '',
            redirectUri: 'http://localhost:3001/redirect',
            scopes: ['openid', 'email', 'profile', 'govbr_confiabilidades'],
          },
        },
        storage: {
          encrypted: true,
        },
      });

      console.log('SDK Initialized successfully!');

      // Setup event listeners
      setupEventListeners();

      setSdkInitialized(true);

      // Load initial data
      await loadIssuers();
      await loadCredentials();
    } catch (error) {
      console.error('SDK Initialization failed:', error);
      setError(error instanceof Error ? error.message : 'Initialization failed');
    }
  };

  const startAuthentication = () => {
    setCurrentScreen('auth-webview');
  };

  const handleAuthSuccess = async (authData: any) => {
    console.log('[App] Authentication successful:', authData.userData?.name);
    setIsAuthenticated(true);
    setCurrentScreen('home');
    Alert.alert(
      'Autenticação bem-sucedida!',
      `Bem-vindo(a) ${authData.userData?.name}!\n\nVocê está autenticado e pode agora baixar credenciais.`
    );
  };

  const handleAuthError = (error: string) => {
    console.error('[App] Authentication error:', error);
    setCurrentScreen('home');
    Alert.alert('Erro de Autenticação', error);
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['access_token', 'id_token', 'token_type', 'expires_in', 'scope']);
      setIsAuthenticated(false);
      Alert.alert('Logged Out', 'Authentication tokens cleared');
      console.log('[MockAuth] Logged out');
    } catch (error) {
      console.error('[MockAuth] Failed to logout:', error);
    }
  };

  const setupEventListeners = () => {
    // SDK Events
    VCSDK.events.on('sdk:initialized', () => {
      console.log('✅ SDK Event: Initialized');
    });

    VCSDK.events.on('sdk:ready', () => {
      console.log('✅ SDK Event: Ready');
    });

    VCSDK.events.on('sdk:error', ({ error, context }) => {
      console.error(`❌ SDK Error [${context}]:`, error);
      Alert.alert('SDK Error', `${context}: ${error.message}`);
    });

    // Credential Events
    VCSDK.events.on('credential:downloadStarted', ({ credentialType, issuer }) => {
      console.log('📥 Download Started:', credentialType.name, 'from', issuer.name);
      setLoading(true);
    });

    VCSDK.events.on('credential:downloadProgress', ({ progress, currentStep }) => {
      console.log(`📊 Download Progress: ${progress}% - ${currentStep}`);
    });

    VCSDK.events.on('credential:downloadComplete', async ({ credential }) => {
      console.log('✅ Download Complete:', credential.id);
      setLoading(false);
      Alert.alert('Success', 'Credential downloaded successfully!');
      await loadCredentials();
    });

    VCSDK.events.on('credential:downloadError', ({ error }) => {
      console.error('❌ Download Error:', error);
      setLoading(false);
      Alert.alert('Download Error', error.message);
    });

    VCSDK.events.on('credential:notAvailable424', ({ credentialType, issuer }) => {
      console.log('⚠️ Credential Not Available (424):', credentialType.name);
      setLoading(false);
      Alert.alert(
        'Credential Not Available',
        `${issuer.name} does not have ${credentialType.name}. You can share your existing credentials.`,
        [
          { text: 'OK' },
          {
            text: 'Share Credentials',
            onPress: () => setCurrentScreen('qr-scanner'),
          },
        ]
      );
    });

    VCSDK.events.on('credential:deleted', async ({ credentialId }) => {
      console.log('🗑️ Credential Deleted:', credentialId);
      await loadCredentials();
    });

    // Auth Events
    VCSDK.events.on('auth:required', ({ authUrl, reason }) => {
      console.log(`🔐 Auth Required for ${reason}:`, authUrl);
      Alert.alert(
        'Authentication Required',
        `You need to authenticate to ${reason}. In a real app, this would open a WebView.`,
        [{ text: 'OK' }]
      );
    });

    // Issuer Events
    VCSDK.events.on('issuer:listUpdated', ({ issuers }) => {
      console.log('📋 Issuers Updated:', issuers.length);
    });
  };

  const loadIssuers = async () => {
    try {
      console.log('Loading issuers...');
      const issuersList = await VCSDK.issuers.getAll();
      console.log('Loaded issuers:', issuersList.length);
      setIssuers(issuersList);
    } catch (error) {
      console.error('Failed to load issuers:', error);
      setError(error instanceof Error ? error.message : 'Failed to load issuers');
    }
  };

  const loadCredentials = async () => {
    try {
      console.log('Loading credentials...');
      const credList = await VCSDK.credentials.getAll();
      console.log('Loaded credentials:', credList.length);
      setCredentials(credList);
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  };

  const handleDownloadCredential = async (issuer: any, credentialType: any) => {
    try {
      console.log('Downloading credential:', credentialType.name);
      await VCSDK.credentials.download(issuer, credentialType);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDeleteCredential = async (credentialId: string) => {
    Alert.alert(
      'Delete Credential',
      'Are you sure you want to delete this credential?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await VCSDK.credentials.delete(credentialId);
              Alert.alert('Success', 'Credential deleted');
            } catch (error) {
              console.error('Delete failed:', error);
              Alert.alert('Error', 'Failed to delete credential');
            }
          },
        },
      ]
    );
  };

  // ShareVC flow handlers
  const handleQRScanned = (url: string) => {
    console.log('[App] QR scanned:', url);
    setShareUrl(url);
    setCurrentScreen('share-consent');
  };

  const handleConsentApprove = (authReq: any, reqCredentials: any[]) => {
    console.log('[App] User approved consent');
    setAuthRequest(authReq);
    setRequestedCredentials(reqCredentials);
    setCurrentScreen('share-processing');
  };

  const handleConsentDecline = () => {
    console.log('[App] User declined consent');
    VCSDK.share.declineShare();
    setCurrentScreen('home');
  };

  const handleShareSuccess = (protocol: string) => {
    console.log('[App] Share success:', protocol);
    setProtocolNumber(protocol);
    setCurrentScreen('share-success');
  };

  const handleShareError = (err: string) => {
    console.log('[App] Share error:', err);
    setShareError(err);
    setCurrentScreen('share-error');
  };

  const handleShareRetry = () => {
    console.log('[App] Retrying share');
    setCurrentScreen('share-consent');
  };

  const handleShareDone = () => {
    console.log('[App] Share flow complete');
    setCurrentScreen('home');
    loadCredentials(); // Reload credentials after share
  };

  // Render screens
  if (!sdkInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#446443" />
        <Text style={styles.loadingText}>Initializing VC SDK...</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <StatusBar style="auto" />
      </View>
    );
  }

  // ShareVC flow screens
  if (currentScreen === 'qr-scanner') {
    return (
      <QRScannerScreen
        onScan={handleQRScanned}
        onClose={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'share-consent') {
    return (
      <ShareVCConsentScreen
        shareUrl={shareUrl}
        onApprove={handleConsentApprove}
        onDecline={handleConsentDecline}
        onBack={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'share-processing') {
    return (
      <ShareVCProcessingScreen
        authRequest={authRequest}
        requestedCredentials={requestedCredentials}
        onSuccess={handleShareSuccess}
        onError={handleShareError}
        onBack={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'share-success') {
    return (
      <ShareVCSuccessScreen
        protocolNumber={protocolNumber}
        onDone={handleShareDone}
      />
    );
  }

  if (currentScreen === 'share-error') {
    return (
      <ShareVCErrorScreen
        error={shareError}
        onRetry={handleShareRetry}
        onCancel={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'device-registration') {
    return (
      <DeviceRegistrationScreen
        onBack={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'auth-webview') {
    return (
      <CustomAuthWebView
        isVisible={true}
        onSuccess={handleAuthSuccess}
        onError={handleAuthError}
        onCancel={() => setCurrentScreen('home')}
      />
    );
  }

  // Home screen
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>VC SDK Headless Demo</Text>
        <Text style={styles.subtitle}>Complete ShareVC Flow</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Authentication */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Authentication</Text>
          {!isAuthenticated ? (
            <TouchableOpacity
              style={styles.authButton}
              onPress={startAuthentication}
            >
              <Text style={styles.authButtonText}>🔓 Login with gov.br</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <View style={styles.authStatus}>
                <Text style={styles.authStatusText}>✅ Authenticated</Text>
              </View>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={logout}
              >
                <Text style={styles.logoutButtonText}>🚪 Logout</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Quick Actions</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setCurrentScreen('qr-scanner')}
          >
            <Text style={styles.primaryButtonText}>📋 Enter ShareVC URL</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCurrentScreen('device-registration')}
          >
            <Text style={styles.secondaryButtonText}>🔔 Register Device (CPF + FCM)</Text>
          </TouchableOpacity>
        </View>

        {/* SDK Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ SDK Status</Text>
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>SDK Initialized: Yes</Text>
            <Text style={styles.statusText}>Issuers Loaded: {issuers.length}</Text>
            <Text style={styles.statusText}>Credentials: {credentials.length}</Text>
          </View>
        </View>

        {/* Credentials Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 My Credentials ({credentials.length})</Text>
          {credentials.length === 0 ? (
            <Text style={styles.emptyText}>No credentials yet. Download one below!</Text>
          ) : (
            credentials.map((cred, index) => (
              <View key={index} style={styles.credentialCard}>
                <Text style={styles.credentialName}>
                  {cred.metadata?.credentialType?.name || cred.type?.[1] || 'Credential'}
                </Text>
                <Text style={styles.credentialIssuer}>
                  From: {cred.metadata?.issuerInfo?.name || cred.issuer || 'Unknown'}
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteCredential(cred.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Issuers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏢 Available Issuers ({issuers.length})</Text>
          {issuers.length === 0 ? (
            <Text style={styles.emptyText}>Loading issuers...</Text>
          ) : (
            issuers.slice(0, 3).map((issuer, index) => (
              <IssuerCard
                key={index}
                issuer={issuer}
                onDownload={handleDownloadCredential}
                loading={loading}
              />
            ))
          )}
        </View>

        {/* Feature Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📡 Complete Features</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              ✅ Credential Management (Download, View, Delete)
            </Text>
            <Text style={styles.infoText}>
              ✅ ShareVC Flow (QR Scan, Consent, Share)
            </Text>
            <Text style={styles.infoText}>
              ✅ Device Registration (CPF + FCM Token)
            </Text>
            <Text style={styles.infoText}>
              ✅ Event-Based Architecture
            </Text>
            <Text style={styles.infoText}>
              ✅ Error Handling & Retry Logic
            </Text>
          </View>
        </View>
      </ScrollView>

      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return <AppContent />;
}

const IssuerCard: React.FC<{
  issuer: any;
  onDownload: (issuer: any, credType: any) => void;
  loading: boolean;
}> = ({ issuer, onDownload, loading }) => {
  const [expanded, setExpanded] = useState(false);
  const [credentialTypes, setCredentialTypes] = useState<any[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  const handleExpand = async () => {
    if (!expanded && credentialTypes.length === 0) {
      try {
        setLoadingTypes(true);
        const types = await VCSDK.issuers.getCredentialTypes(issuer.id);
        setCredentialTypes(types);
      } catch (error) {
        console.error('Failed to load credential types:', error);
      } finally {
        setLoadingTypes(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <View style={styles.issuerCard}>
      <TouchableOpacity onPress={handleExpand}>
        <Text style={styles.issuerName}>{issuer.name || issuer.id}</Text>
        <Text style={styles.issuerUrl}>{issuer.credential_issuer || 'Unknown URL'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.credentialTypesList}>
          {loadingTypes ? (
            <ActivityIndicator size="small" color="#446443" />
          ) : (
            credentialTypes.map((credType, index) => (
              <View key={index} style={styles.credentialTypeCard}>
                <Text style={styles.credentialTypeName}>{credType.name || credType.id}</Text>
                <TouchableOpacity
                  style={[styles.downloadButton, loading && styles.downloadButtonDisabled]}
                  onPress={() => !loading && onDownload(issuer, credType)}
                  disabled={loading}
                >
                  <Text style={styles.downloadButtonText}>
                    {loading ? 'Downloading...' : 'Download'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAF8',
  },
  header: {
    backgroundColor: '#446443',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#446443',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFA500',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  authButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  authStatus: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  authStatusText: {
    color: '#2D2D2D',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#F44336',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E6E6E6',
  },
  statusText: {
    fontSize: 14,
    color: '#2D2D2D',
    marginBottom: 8,
  },
  credentialCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E6E6E6',
  },
  credentialName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  credentialIssuer: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#DC3545',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  issuerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E6E6E6',
  },
  issuerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  issuerUrl: {
    fontSize: 12,
    color: '#666666',
  },
  credentialTypesList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E6E6E6',
  },
  credentialTypeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  credentialTypeName: {
    flex: 1,
    fontSize: 14,
    color: '#2D2D2D',
  },
  downloadButton: {
    backgroundColor: '#446443',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  downloadButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#81C784',
  },
  infoText: {
    fontSize: 14,
    color: '#2D2D2D',
    lineHeight: 20,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#2D2D2D',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#DC3545',
    marginTop: 16,
    textAlign: 'center',
  },
});
