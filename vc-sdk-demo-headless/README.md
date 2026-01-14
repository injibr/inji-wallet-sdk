# vc-sdk-demo-headless

**Demo Application for vc-sdk-headless**

This is a complete reference implementation showing how to integrate the headless VC SDK into a React Native app with custom UI.

---

## What This Demo Shows

✅ **SDK Initialization** - How to configure and initialize the SDK
✅ **Event Handling** - How to listen to SDK events and update UI
✅ **Credential Download** - Complete flow with progress, errors, 424 handling
✅ **Credential Sharing** - OpenID4VP flow with consent and error handling
✅ **Authentication** - WebView-based OAuth flow
✅ **Error Handling** - HTTP 424, auth errors, network errors
✅ **Custom UI** - All UI components implemented in the host app
✅ **Navigation** - React Navigation integration

---

## Project Structure

```
vc-sdk-demo-headless/
├── src/
│   ├── screens/
│   │   ├── AllCredentialsScreen.tsx      # Credential list with download
│   │   ├── ShareVCScreen.tsx             # OpenID4VP sharing flow
│   │   ├── VCDetailScreen.tsx            # Credential detail view
│   │   └── SettingsScreen.tsx            # Settings and device registration
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   └── CustomAuthWebView.tsx     # OAuth WebView
│   │   ├── modals/
│   │   │   ├── ProcessingModal.tsx       # Loading/progress modal
│   │   │   ├── AuthorizationConsentModal.tsx  # Share consent modal
│   │   │   └── DeclineScreen.tsx         # Share decline screen
│   │   ├── cards/
│   │   │   ├── VCCard.tsx                # Credential card component
│   │   │   ├── RequestedCredentialCard.tsx    # Requested credential card
│   │   │   └── VerifierInfoCard.tsx      # Verifier info display
│   │   └── common/
│   │       ├── StatusBanner.tsx          # Status/error banner
│   │       ├── ProgressBar.tsx           # Progress bar
│   │       └── SuccessScreen.tsx         # Success screen
│   │
│   ├── services/
│   │   └── SDKManager.ts                 # SDK initialization & event setup
│   │
│   ├── types/
│   │   └── index.ts                      # TypeScript types
│   │
│   └── utils/
│       └── navigation.ts                 # Navigation helpers
│
├── App.tsx                               # Main app entry point
└── package.json
```

---

## Installation

### 1. Clone/Copy the Demo

```bash
cd vc-sdk-demo-headless
npm install
```

### 2. Install vc-sdk-headless

The demo already includes `vc-sdk-headless` as a local dependency:

```json
{
  "dependencies": {
    "vc-sdk-headless": "file:../vc-sdk-headless"
  }
}
```

### 3. Run the Demo

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

---

## Key Integration Points

### 1. SDK Initialization (SDKManager.ts)

```typescript
import { VCSDK } from 'vc-sdk-headless';

export class SDKManager {
  static async initialize() {
    await VCSDK.init({
      appId: 'vc-demo-app',
      network: {
        baseUrl: 'https://vcdemo.crabdance.com',
        notificationBaseUrl: 'https://vcdemo.crabdance.com',
        timeout: 30000,
        oauth: {
          authorizationUrl: 'https://sso.staging.acesso.gov.br/authorize',
          tokenUrl: 'https://sso.staging.acesso.gov.br/token',
          userInfoUrl: 'https://sso.staging.acesso.gov.br/userinfo/',
          clientId: 'h-credenciaisverificaveis-dev.dataprev.gov.br',
          clientSecret: 'your-client-secret',
          redirectUri: 'http://localhost:3001/redirect',
          scopes: ['openid', 'email', 'profile', 'govbr_confiabilidades'],
        },
      },
      storage: {
        encrypted: true,
      },
    });

    // Setup event listeners
    this.setupEventListeners();
  }

  static setupEventListeners() {
    // Global error handler
    VCSDK.events.on('sdk:error', ({ error, context }) => {
      console.error(`SDK Error [${context}]:`, error);
    });

    // Auth session expired
    VCSDK.events.on('auth:sessionExpired', () => {
      // Navigate to login
    });
  }
}
```

### 2. Credential Download Screen

**AllCredentialsScreen.tsx** - Complete implementation:

```typescript
import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, Text, Alert } from 'react-native';
import { VCSDK } from 'vc-sdk-headless';

export const AllCredentialsScreen = () => {
  const [issuers, setIssuers] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showAuthWebView, setShowAuthWebView] = useState(false);
  const [authUrl, setAuthUrl] = useState('');

  useEffect(() => {
    loadIssuers();
    loadCredentials();
    setupEventListeners();

    return () => {
      // Cleanup event listeners
      VCSDK.events.removeAllListeners('credential:downloadStarted');
      VCSDK.events.removeAllListeners('credential:downloadProgress');
      // ... remove all other listeners
    };
  }, []);

  const setupEventListeners = () => {
    // Download started
    VCSDK.events.on('credential:downloadStarted', ({ credentialType, issuer }) => {
      setDownloading(true);
      setDownloadProgress(0);
      console.log('Download started:', credentialType.name);
    });

    // Download progress
    VCSDK.events.on('credential:downloadProgress', ({ progress }) => {
      setDownloadProgress(progress);
    });

    // Download complete
    VCSDK.events.on('credential:downloadComplete', async () => {
      setDownloading(false);
      setDownloadProgress(0);
      await loadCredentials(); // Refresh list
      Alert.alert('Success', 'Credential downloaded successfully');
    });

    // Download error
    VCSDK.events.on('credential:downloadError', ({ error }) => {
      setDownloading(false);
      setDownloadProgress(0);
      Alert.alert('Error', error.message);
    });

    // Credential not available (424)
    VCSDK.events.on('credential:notAvailable424', ({ credentialType, issuer }) => {
      setDownloading(false);
      setDownloadProgress(0);
      Alert.alert(
        'Not Available',
        `${credentialType.name} is not available from ${issuer.name}. You can share your existing credentials.`,
        [
          { text: 'OK' },
          {
            text: 'Share',
            onPress: () => {
              // Navigate to share screen
            },
          },
        ]
      );
    });

    // Authentication required
    VCSDK.events.on('auth:required', ({ authUrl: url }) => {
      setDownloading(false);
      setAuthUrl(url);
      setShowAuthWebView(true);
    });
  };

  const loadIssuers = async () => {
    try {
      const issuersList = await VCSDK.issuers.getAll();
      setIssuers(issuersList);
    } catch (error) {
      console.error('Load issuers error:', error);
    }
  };

  const loadCredentials = async () => {
    try {
      const credList = await VCSDK.credentials.getAll();
      setCredentials(credList);
    } catch (error) {
      console.error('Load credentials error:', error);
    }
  };

  const handleDownload = async (issuer, credentialType) => {
    try {
      await VCSDK.credentials.download(issuer, credentialType);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleAuthComplete = async (token) => {
    setShowAuthWebView(false);
    try {
      await VCSDK.auth.completeAuthentication(token);
      // Retry download
    } catch (error) {
      console.error('Auth completion error:', error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Issuer & Credential List */}
      <FlatList
        data={issuers}
        renderItem={({ item: issuer }) => (
          <IssuerCard issuer={issuer} onDownload={handleDownload} />
        )}
      />

      {/* Processing Modal */}
      {downloading && (
        <ProcessingModal
          visible={downloading}
          progress={downloadProgress}
          title="Downloading Credential"
        />
      )}

      {/* Auth WebView */}
      {showAuthWebView && (
        <CustomAuthWebView
          url={authUrl}
          onComplete={handleAuthComplete}
          onCancel={() => setShowAuthWebView(false)}
        />
      )}
    </View>
  );
};
```

### 3. Share Credential Screen

**ShareVCScreen.tsx** - Complete OpenID4VP flow:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { VCSDK } from 'vc-sdk-headless';

export const ShareVCScreen = ({ route }) => {
  const { shareUrl } = route.params;

  const [verifierInfo, setVerifierInfo] = useState(null);
  const [requestedCredentials, setRequestedCredentials] = useState([]);
  const [authRequest, setAuthRequest] = useState(null);
  const [step, setStep] = useState('review'); // review, downloading, ready, sharing, success
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [protocolNumber, setProtocolNumber] = useState('');
  const [showConsentModal, setShowConsentModal] = useState(false);

  useEffect(() => {
    parseShareRequest();
    setupEventListeners();

    return () => {
      // Cleanup
      VCSDK.events.removeAllListeners('share:requestParsed');
      // ... remove all other listeners
    };
  }, []);

  const setupEventListeners = () => {
    // Request parsed
    VCSDK.events.on('share:requestParsed', (data) => {
      setVerifierInfo(data.verifierInfo);
      setRequestedCredentials(data.requestedCredentials);
      setAuthRequest(data.authRequest);
      setStep('review');
    });

    // Download events
    VCSDK.events.on('share:downloadStarted', ({ totalCredentials }) => {
      setStep('downloading');
      setDownloadProgress({ current: 0, total: totalCredentials });
    });

    VCSDK.events.on('share:downloadProgress', ({ current, total, currentItem }) => {
      setDownloadProgress({ current, total });
    });

    VCSDK.events.on('share:downloadComplete', ({ successCount, error424Count }) => {
      if (successCount > 0) {
        setStep('ready'); // Show "Share" button
      } else {
        setStep('error'); // Show "Retry" button
        Alert.alert('Error', 'All credentials failed to download');
      }
    });

    VCSDK.events.on('share:credentialNotAvailable424', ({ credentialName }) => {
      console.log(`Credential not available: ${credentialName}`);
      // Continue with other credentials
    });

    // Sharing events
    VCSDK.events.on('share:sharingStarted', () => {
      setStep('sharing');
    });

    VCSDK.events.on('share:sharingProgress', ({ message }) => {
      console.log('Sharing progress:', message);
    });

    VCSDK.events.on('share:sharingComplete', ({ success, protocolNumber: protocol }) => {
      if (success) {
        setProtocolNumber(protocol);
        setStep('success');
      }
    });

    VCSDK.events.on('share:error', ({ error, step: errorStep }) => {
      console.error(`Share error at ${errorStep}:`, error);
      setStep('error');
      Alert.alert('Error', error.message);
    });

    // Auth required
    VCSDK.events.on('auth:required', ({ authUrl }) => {
      // Show auth WebView
    });
  };

  const parseShareRequest = async () => {
    try {
      await VCSDK.share.parseRequest(shareUrl);
    } catch (error) {
      console.error('Parse error:', error);
    }
  };

  const handleDownload = async () => {
    try {
      await VCSDK.share.downloadCredentials(requestedCredentials);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleShare = () => {
    setShowConsentModal(true);
  };

  const handleAuthorize = async () => {
    setShowConsentModal(false);
    try {
      await VCSDK.share.completeShare(authRequest, requestedCredentials);
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleDecline = () => {
    setShowConsentModal(false);
    VCSDK.share.declineShare();
    // Show decline screen or go back
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Verifier Info */}
      {verifierInfo && <VerifierInfoCard verifierInfo={verifierInfo} />}

      {/* Requested Credentials */}
      <Text>Documentos solicitados</Text>
      {requestedCredentials.map((cred, index) => (
        <RequestedCredentialCard key={index} credential={cred} />
      ))}

      {/* Action Buttons */}
      {step === 'review' && (
        <TouchableOpacity onPress={handleDownload}>
          <Text>Baixar</Text>
        </TouchableOpacity>
      )}

      {step === 'ready' && (
        <TouchableOpacity onPress={handleShare}>
          <Text>Compartilhar</Text>
        </TouchableOpacity>
      )}

      {step === 'error' && (
        <TouchableOpacity onPress={handleDownload}>
          <Text>Tentar Novamente</Text>
        </TouchableOpacity>
      )}

      {/* Processing Modal */}
      {step === 'downloading' && (
        <ProcessingModal
          visible
          title="Incluindo documentos"
          current={downloadProgress.current}
          total={downloadProgress.total}
        />
      )}

      {step === 'sharing' && (
        <ProcessingModal
          visible
          title="Compartilhando credenciais"
          message="Por favor, aguarde..."
        />
      )}

      {/* Consent Modal */}
      <AuthorizationConsentModal
        visible={showConsentModal}
        verifierName={verifierInfo?.name}
        onAuthorize={handleAuthorize}
        onDecline={handleDecline}
      />

      {/* Success Screen */}
      {step === 'success' && (
        <SuccessScreen
          verifierName={verifierInfo?.name}
          protocolNumber={protocolNumber}
          onGoHome={() => {
            // Navigate home
          }}
        />
      )}
    </View>
  );
};
```

### 4. Authentication WebView

**CustomAuthWebView.tsx**:

```typescript
import React from 'react';
import { Modal } from 'react-native';
import { WebView } from 'react-native-webview';

export const CustomAuthWebView = ({ url, onComplete, onCancel }) => {
  const handleNavigationStateChange = (navState) => {
    // Check if URL contains auth code/token
    if (navState.url.includes('code=') || navState.url.includes('token=')) {
      const token = extractToken(navState.url);
      onComplete(token);
    }
  };

  const extractToken = (url) => {
    // Extract token from URL
    const match = url.match(/[?&]code=([^&]+)/);
    return match ? match[1] : '';
  };

  return (
    <Modal visible animationType="slide">
      <WebView
        source={{ uri: url }}
        onNavigationStateChange={handleNavigationStateChange}
      />
      <TouchableOpacity onPress={onCancel}>
        <Text>Cancel</Text>
      </TouchableOpacity>
    </Modal>
  );
};
```

### 5. Processing Modal

**ProcessingModal.tsx**:

```typescript
import React from 'react';
import { Modal, View, Text, ActivityIndicator } from 'react-native';
import { ProgressBar } from './ProgressBar';

export const ProcessingModal = ({
  visible,
  title,
  message,
  current,
  total,
  showProgressBar = true,
}) => {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#446443" />
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
          {showProgressBar && total > 0 && (
            <>
              <Text style={styles.progressText}>
                {current} / {total}
              </Text>
              <ProgressBar progress={progress} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};
```

---

## Error Handling Examples

### HTTP 424 - Credential Not Available

```typescript
// In AllCredentialsScreen
VCSDK.events.on('credential:notAvailable424', ({ credentialType, issuer }) => {
  // Option 1: Show alert with share option
  Alert.alert(
    'Credential Not Available',
    `${issuer.name} does not have ${credentialType.name} for your account.`,
    [
      { text: 'OK' },
      {
        text: 'Share Existing Credentials',
        onPress: () => navigation.navigate('ShareVC'),
      },
    ]
  );

  // Option 2: Change button color/text
  // (store in state and update UI)
});
```

### Authentication Required

```typescript
VCSDK.events.on('auth:required', async ({ authUrl, reason }) => {
  console.log(`Auth required for: ${reason}`);

  // Show WebView
  setAuthWebViewUrl(authUrl);
  setShowAuthWebView(true);
});

// After auth completes in WebView:
const handleAuthSuccess = async (token) => {
  setShowAuthWebView(false);

  try {
    await VCSDK.auth.completeAuthentication(token);

    // Retry the operation that required auth
    if (reason === 'download') {
      await VCSDK.credentials.download(issuer, credentialType);
    } else if (reason === 'share') {
      await VCSDK.share.downloadCredentials(requestedCredentials);
    }
  } catch (error) {
    Alert.alert('Authentication Error', error.message);
  }
};
```

### Network Errors

```typescript
VCSDK.events.on('credential:downloadError', ({ error, errorCode }) => {
  let message = error.message;

  if (errorCode === 500) {
    message = 'Server error. Please try again later.';
  } else if (errorCode === 503) {
    message = 'Service unavailable. Please try again later.';
  } else if (error.message.includes('timeout')) {
    message = 'Request timed out. Check your connection.';
  } else if (error.message.includes('Network')) {
    message = 'Network error. Check your internet connection.';
  }

  Alert.alert('Download Failed', message, [
    { text: 'Cancel' },
    { text: 'Retry', onPress: () => retryDownload() },
  ]);
});
```

---

## Testing the Demo

### 1. Test Credential Download

1. Launch app
2. Navigate to All Credentials screen
3. Select an issuer
4. Click on a credential type
5. Click "Baixar" button
6. **Expected Events:**
   - `credential:downloadStarted` → Show loading modal
   - `credential:downloadProgress` → Update progress bar
   - `credential:downloadComplete` → Hide modal, refresh list
7. **If 424 error:**
   - `credential:notAvailable424` → Show share option
8. **If auth required:**
   - `auth:required` → Show WebView

### 2. Test Credential Sharing (OpenID4VP)

1. Open a share request URL (e.g., from QR code or deep link)
2. ShareVCScreen opens
3. **Expected Events:**
   - `share:requestParsed` → Show verifier info and requested credentials
4. Click "Baixar" button
5. **Expected Events:**
   - `share:downloadStarted` → Show download modal
   - `share:downloadProgress` → Update progress
   - `share:credentialNotAvailable424` (for missing credentials) → Log and continue
   - `share:downloadComplete` → Hide modal, show "Compartilhar" button if successCount > 0
6. Click "Compartilhar" button
7. Consent modal appears
8. Click "Autorizar"
9. **Expected Events:**
   - `share:sharingStarted` → Show sharing modal
   - `share:sharingProgress` → Update status
   - `share:sharingComplete` → Show success screen with protocol number

### 3. Test Error Handling

**Test 424 Error:**
- Download a credential that provider doesn't have
- Verify `credential:notAvailable424` event fires
- Verify UI shows share option instead of retry

**Test Auth Error:**
- Download credential without being authenticated
- Verify `auth:required` event fires
- Verify WebView opens with auth URL
- Complete auth and verify download continues

**Test Network Error:**
- Turn off network
- Try downloading credential
- Verify `credential:downloadError` event fires
- Verify error message shows network issue

---

## Configuration

### OAuth Configuration

The demo app now uses configurable OAuth endpoints. You can customize the OAuth configuration in `App.tsx`:

```typescript
await VCSDK.init({
  appId: 'vc-sdk-demo-headless',
  network: {
    baseUrl: 'https://injiweb.credenciaisverificaveis-dev.dataprev.gov.br',
    notificationBaseUrl: 'https://injiweb.credenciaisverificaveis-dev.dataprev.gov.br',
    timeout: 30000,
    oauth: {
      // OAuth endpoints (staging)
      authorizationUrl: 'https://sso.staging.acesso.gov.br/authorize',
      tokenUrl: 'https://sso.staging.acesso.gov.br/token',
      userInfoUrl: 'https://sso.staging.acesso.gov.br/userinfo/',

      // Client credentials
      clientId: 'h-credenciaisverificaveis-dev.dataprev.gov.br',
      clientSecret: 'xzZXpe5Oz3IoFRYMonuDyYkJAEzI02nN6lro_M9XH96aXgokrRY_DYZxvBzxdcozccxwbyGfKxqKPQGmqam2oQ',

      // Redirect URI
      redirectUri: 'http://localhost:3001/redirect',

      // OAuth scopes
      scopes: ['openid', 'email', 'profile', 'govbr_confiabilidades'],
    },
  },
  storage: {
    encrypted: true,
  },
});
```

#### Production vs Staging

Use environment variables to switch between staging and production:

```typescript
const isProd = process.env.NODE_ENV === 'production';

await VCSDK.init({
  appId: 'vc-sdk-demo-headless',
  network: {
    baseUrl: isProd
      ? 'https://api.production.example.com'
      : 'https://injiweb.credenciaisverificaveis-dev.dataprev.gov.br',
    oauth: {
      authorizationUrl: isProd
        ? 'https://sso.acesso.gov.br/authorize'
        : 'https://sso.staging.acesso.gov.br/authorize',
      tokenUrl: isProd
        ? 'https://sso.acesso.gov.br/token'
        : 'https://sso.staging.acesso.gov.br/token',
      userInfoUrl: isProd
        ? 'https://sso.acesso.gov.br/userinfo/'
        : 'https://sso.staging.acesso.gov.br/userinfo/',
      clientId: isProd
        ? process.env.OAUTH_CLIENT_ID_PROD
        : 'h-credenciaisverificaveis-dev.dataprev.gov.br',
      clientSecret: isProd
        ? process.env.OAUTH_CLIENT_SECRET_PROD
        : 'xzZXpe5Oz3IoFRYMonuDyYkJAEzI02nN6lro_M9XH96aXgokrRY_DYZxvBzxdcozccxwbyGfKxqKPQGmqam2oQ',
      redirectUri: 'http://localhost:3001/redirect',
      scopes: ['openid', 'email', 'profile', 'govbr_confiabilidades'],
    },
  },
});
```

**Security Note:** For production, always use environment variables for sensitive data:

1. Create `.env` file:
```env
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
```

2. Install `react-native-dotenv`:
```bash
npm install react-native-dotenv
```

3. Use in code:
```typescript
import { OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET } from '@env';

oauth: {
  clientId: OAUTH_CLIENT_ID,
  clientSecret: OAUTH_CLIENT_SECRET,
  // ...
}
```

### app.json

```json
{
  "expo": {
    "name": "VC SDK Demo",
    "slug": "vc-sdk-demo-headless",
    "scheme": "vcsdkdemo",
    "version": "1.0.0",
    "platforms": ["ios", "android", "web"],
    "plugins": [
      "@react-native-async-storage/async-storage",
      "expo-crypto",
      "react-native-keychain"
    ]
  }
}
```

### Deep Link Configuration

For ShareVC deep links:

```typescript
// In App.tsx
import { Linking } from 'react-native';

useEffect(() => {
  Linking.addEventListener('url', handleDeepLink);
}, []);

const handleDeepLink = ({ url }) => {
  if (url.startsWith('openid4vp://')) {
    navigation.navigate('ShareVC', { shareUrl: url });
  }
};
```

---

## Next Steps

1. **Customize UI** - Modify styles, colors, fonts to match your brand
2. **Add Features** - Implement additional screens (settings, profile, etc.)
3. **Integrate Notifications** - Add Firebase Cloud Messaging for push notifications
4. **Add Biometrics** - Implement biometric authentication for sensitive operations
5. **Error Tracking** - Integrate Sentry or similar for error monitoring
6. **Analytics** - Add analytics to track user flows

---

## Reference

- **vc-sdk-headless README**: ../vc-sdk-headless/README.md
- **Event Reference**: See vc-sdk-headless README for complete event list
- **API Reference**: See vc-sdk-headless README for all API methods

---

## License

MIT
