# vc-sdk-headless

**Headless Verifiable Credentials SDK for React Native**

Pure logic layer with event-based API. No UI components - perfect for integrating into any React Native app with custom UI.

---

## Features

✅ **Headless Architecture** - Zero UI components, pure business logic
✅ **Event-Based API** - Listen to events, render your own UI
✅ **OpenID4VC Support** - Full OpenID4VCI credential issuance
✅ **OpenID4VP Support** - Complete credential sharing/verification flow
✅ **Error Handling** - Detailed error events including HTTP 424 handling
✅ **Authentication** - OAuth 2.0 / OpenID Connect support
✅ **Device Registration** - CPF + FCM token registration
✅ **Notification Support** - Push notification handling
✅ **TypeScript** - Full type safety

---

## Installation

```bash
npm install vc-sdk-headless
# or
yarn add vc-sdk-headless
```

### Peer Dependencies

```bash
npm install @react-native-async-storage/async-storage \
            @react-native-community/netinfo \
            expo-crypto \
            react-native-device-info \
            react-native-keychain \
            react-native-mmkv
```

---

## Quick Start

### 1. Initialize SDK

```typescript
import { VCSDK } from 'vc-sdk-headless';

await VCSDK.init({
  appId: 'my-wallet-app',
  network: {
    baseUrl: 'https://api.example.com',
    notificationBaseUrl: 'https://notifications.example.com',
    timeout: 30000,
    oauth: {
      authorizationUrl: 'https://sso.staging.acesso.gov.br/authorize',
      tokenUrl: 'https://sso.staging.acesso.gov.br/token',
      userInfoUrl: 'https://sso.staging.acesso.gov.br/userinfo/',
      clientId: 'your-client-id',
      clientSecret: 'your-client-secret',
      redirectUri: 'myapp://oauth/callback',
      scopes: ['openid', 'profile', 'email'],
    },
  },
  storage: {
    encrypted: true,
  },
});
```

### 2. Listen to Events

```typescript
// Credential download events
VCSDK.events.on('credential:downloadStarted', ({ credentialType, issuer }) => {
  console.log('Download started:', credentialType.name);
  // Show loading UI
});

VCSDK.events.on('credential:downloadProgress', ({ current, total, progress }) => {
  console.log(`Progress: ${progress}%`);
  // Update progress bar
});

VCSDK.events.on('credential:downloadComplete', ({ credential }) => {
  console.log('Downloaded:', credential.id);
  // Show success, refresh credential list
});

VCSDK.events.on('credential:downloadError', ({ error, credentialType }) => {
  console.error('Download failed:', error);
  // Show error UI with retry option
});

VCSDK.events.on('credential:notAvailable424', ({ credentialType, issuer }) => {
  console.log('Credential not available from provider');
  // Show "Share" button instead of retry
});

// Authentication required
VCSDK.events.on('auth:required', ({ authUrl, reason }) => {
  console.log('Auth required:', authUrl);
  // Show WebView with authUrl
});
```

### 3. Use SDK Methods

```typescript
// Get all issuers
const issuers = await VCSDK.issuers.getAll();

// Get credential types for an issuer
const credTypes = await VCSDK.issuers.getCredentialTypes(issuer.id);

// Download credential
const credential = await VCSDK.credentials.download(issuer, credentialType);

// Get all downloaded credentials
const credentials = await VCSDK.credentials.getAll();

// Delete credential
await VCSDK.credentials.delete(credentialId);
```

---

## Configuration

### OAuth 2.0 Configuration

The SDK supports configurable OAuth 2.0 endpoints for authentication. All OAuth URLs (authorization, token, userinfo) can be customized during SDK initialization.

#### Default OAuth Endpoints

If you don't provide OAuth configuration, the SDK uses these defaults:

```typescript
{
  authorizationUrl: 'https://sso.staging.acesso.gov.br/authorize',
  tokenUrl: 'https://sso.staging.acesso.gov.br/token',
  userInfoUrl: 'https://sso.staging.acesso.gov.br/userinfo/',
  clientId: 'inji-dev',
  clientSecret: '<default-secret>',
  redirectUri: 'http://localhost:3001/redirect',
  scopes: ['openid', 'profile', 'email'],
}
```

#### Custom OAuth Configuration

To use custom OAuth endpoints (e.g., for production environment):

```typescript
await VCSDK.init({
  appId: 'my-wallet-app',
  network: {
    baseUrl: 'https://api.production.example.com',
    oauth: {
      // Production OAuth endpoints
      authorizationUrl: 'https://sso.acesso.gov.br/authorize',
      tokenUrl: 'https://sso.acesso.gov.br/token',
      userInfoUrl: 'https://sso.acesso.gov.br/userinfo/',

      // Your app credentials
      clientId: 'production-client-id',
      clientSecret: 'production-client-secret',
      redirectUri: 'myapp://oauth/callback',

      // Required scopes
      scopes: ['openid', 'profile', 'email', 'govbr_confiabilidades'],
    },
  },
});
```

#### Environment-Based Configuration

Recommended pattern for switching between environments:

```typescript
const environment = process.env.NODE_ENV; // 'production' or 'development'

const config = {
  appId: 'my-wallet-app',
  network: {
    baseUrl: environment === 'production'
      ? 'https://api.production.example.com'
      : 'https://api.staging.example.com',
    oauth: {
      authorizationUrl: environment === 'production'
        ? 'https://sso.acesso.gov.br/authorize'
        : 'https://sso.staging.acesso.gov.br/authorize',
      tokenUrl: environment === 'production'
        ? 'https://sso.acesso.gov.br/token'
        : 'https://sso.staging.acesso.gov.br/token',
      userInfoUrl: environment === 'production'
        ? 'https://sso.acesso.gov.br/userinfo/'
        : 'https://sso.staging.acesso.gov.br/userinfo/',
      clientId: environment === 'production'
        ? process.env.OAUTH_CLIENT_ID_PROD
        : process.env.OAUTH_CLIENT_ID_DEV,
      clientSecret: environment === 'production'
        ? process.env.OAUTH_CLIENT_SECRET_PROD
        : process.env.OAUTH_CLIENT_SECRET_DEV,
      redirectUri: 'myapp://oauth/callback',
      scopes: ['openid', 'profile', 'email'],
    },
  },
};

await VCSDK.init(config);
```

#### OAuth Config Reference

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `authorizationUrl` | `string` | No | Staging URL | OAuth authorization endpoint |
| `tokenUrl` | `string` | No | Staging URL | OAuth token endpoint |
| `userInfoUrl` | `string` | No | Staging URL | OAuth user info endpoint |
| `clientId` | `string` | No | `'inji-dev'` | OAuth client ID |
| `clientSecret` | `string` | No | Default secret | OAuth client secret |
| `redirectUri` | `string` | No | `'http://localhost:3001/redirect'` | OAuth redirect URI |
| `scopes` | `string[]` | No | `['openid', 'profile', 'email']` | OAuth scopes |

#### Security Note

For production apps, **never hardcode client secrets** in your code. Use environment variables or secure configuration management:

```typescript
// ❌ Bad: Hardcoded secret
oauth: {
  clientSecret: 'abc123secret',
}

// ✅ Good: Environment variable
oauth: {
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
}

// ✅ Better: Backend token exchange (no secret in app)
// Implement server-side token exchange instead
```

---

## Event Reference

### Credential Events

| Event | Data | Description |
|-------|------|-------------|
| `credential:downloadStarted` | `{ credentialType, issuer }` | Credential download initiated |
| `credential:downloadProgress` | `{ current, total, progress, currentStep }` | Download progress update |
| `credential:downloadComplete` | `{ credential, credentialType, issuer }` | Download successful |
| `credential:downloadError` | `{ error, errorCode, credentialType, issuer }` | Download failed |
| `credential:notAvailable424` | `{ credentialType, issuer, message }` | Provider doesn't have credential (HTTP 424) |
| `credential:deleted` | `{ credentialId }` | Credential deleted |
| `credential:listUpdated` | `{ credentials[] }` | Credential list changed |

### Share Events (OpenID4VP)

| Event | Data | Description |
|-------|------|-------------|
| `share:requestParsed` | `{ verifierInfo, requestedCredentials, authRequest }` | Share request parsed |
| `share:downloadStarted` | `{ totalCredentials }` | Downloading missing credentials |
| `share:downloadProgress` | `{ current, total, currentItem }` | Download progress |
| `share:downloadComplete` | `{ successCount, error424Count, realErrorCount }` | Downloads finished |
| `share:credentialNotAvailable424` | `{ credentialType, credentialName, issuer }` | Credential not available (424) |
| `share:consentRequired` | `{ verifierInfo }` | User consent needed |
| `share:sharingStarted` | - | Sharing in progress |
| `share:sharingProgress` | `{ message }` | Sharing progress message |
| `share:sharingComplete` | `{ success, protocolNumber, transactionId }` | Sharing finished |
| `share:error` | `{ error, step }` | Share error occurred |
| `share:userDeclined` | - | User declined sharing |

### Authentication Events

| Event | Data | Description |
|-------|------|-------------|
| `auth:required` | `{ authUrl, issuer, reason }` | Authentication needed |
| `auth:started` | - | Auth process started |
| `auth:progress` | `{ message }` | Auth progress message |
| `auth:complete` | `{ success, token }` | Auth finished |
| `auth:error` | `{ error, message }` | Auth failed |
| `auth:sessionExpired` | - | Session expired |
| `auth:logout` | - | User logged out |

### Issuer Events

| Event | Data | Description |
|-------|------|-------------|
| `issuer:listUpdated` | `{ issuers[] }` | Issuer list loaded |
| `issuer:selected` | `{ issuer }` | Issuer selected |
| `issuer:credentialTypesLoaded` | `{ issuer, credentialTypes[] }` | Credential types loaded |
| `issuer:error` | `{ error, issuer }` | Issuer operation failed |

### Device Events

| Event | Data | Description |
|-------|------|-------------|
| `device:registrationStarted` | - | Device registration started |
| `device:registrationComplete` | `{ deviceId, cpf }` | Registration successful |
| `device:registrationError` | `{ error }` | Registration failed |
| `device:fcmTokenUpdated` | `{ token }` | FCM token updated |

### Notification Events

| Event | Data | Description |
|-------|------|-------------|
| `notification:received` | `{ notification, type }` | Notification received |
| `notification:credentialReady` | `{ credentialType, issuer, notificationId }` | Credential ready for download |

### SDK Events

| Event | Data | Description |
|-------|------|-------------|
| `sdk:initialized` | - | SDK initialization complete |
| `sdk:ready` | - | SDK ready for use |
| `sdk:error` | `{ error, context }` | SDK-level error |

---

## API Reference

### VCSDK.credentials

#### `download(issuer, credentialType): Promise<VC | null>`

Download a credential from an issuer.

**Events emitted:**
- `credential:downloadStarted`
- `credential:downloadProgress`
- `credential:downloadComplete` (success)
- `credential:downloadError` (failure)
- `credential:notAvailable424` (HTTP 424)
- `auth:required` (needs authentication)

**Example:**
```typescript
const credential = await VCSDK.credentials.download(issuer, credentialType);
if (credential) {
  console.log('Downloaded:', credential.id);
}
```

#### `getAll(): Promise<VC[]>`

Get all stored credentials.

#### `get(credentialId): Promise<VC | null>`

Get a single credential by ID.

#### `delete(credentialId): Promise<boolean>`

Delete a credential.

**Events emitted:**
- `credential:deleted`
- `credential:listUpdated`

---

### VCSDK.issuers

#### `getAll(): Promise<Issuer[]>`

Get all available issuers.

**Events emitted:**
- `issuer:listUpdated`

#### `getCredentialTypes(issuerId): Promise<CredentialType[]>`

Get credential types offered by an issuer.

**Events emitted:**
- `issuer:credentialTypesLoaded`

#### `get(issuerId): Promise<Issuer>`

Get a single issuer by ID.

---

### VCSDK.auth

#### `getAuthUrl(): Promise<string>`

Get the authorization URL for OAuth authentication.

**Usage:**
```typescript
const authUrl = await VCSDK.auth.getAuthUrl();
// Show WebView with this URL
// When user completes auth, extract token and call:
await VCSDK.auth.completeAuthentication(token);
```

#### `completeAuthentication(token): Promise<void>`

Complete authentication after user finishes OAuth flow.

**Events emitted:**
- `auth:started`
- `auth:complete` (success)
- `auth:error` (failure)

#### `isAuthenticated(): Promise<boolean>`

Check if user is currently authenticated.

#### `logout(): Promise<void>`

Logout user.

**Events emitted:**
- `auth:logout`

---

### VCSDK.share

#### `parseRequest(shareUrl): Promise<{ verifierInfo, requestedCredentials, authRequest }>`

Parse a share request URL (OpenID4VP).

**Events emitted:**
- `share:requestParsed`
- `share:error`

**Example:**
```typescript
const { verifierInfo, requestedCredentials, authRequest } =
  await VCSDK.share.parseRequest(shareUrl);

// Show verifier info and requested credentials to user
console.log('Verifier:', verifierInfo.name);
console.log('Requested:', requestedCredentials.map(c => c.name));
```

#### `downloadCredentials(requestedCredentials): Promise<{ successCount, error424Count, realErrorCount }>`

Download missing credentials for sharing.

**Events emitted:**
- `share:downloadStarted`
- `share:downloadProgress`
- `share:downloadComplete`
- `share:credentialNotAvailable424`
- `auth:required`

**Example:**
```typescript
const result = await VCSDK.share.downloadCredentials(requestedCredentials);

if (result.successCount > 0) {
  // At least one credential downloaded, can proceed to share
} else {
  // All downloads failed, show retry
}
```

#### `completeShare(authRequest, requestedCredentials): Promise<{ success, protocolNumber }>`

Complete the share flow after user grants consent.

**Events emitted:**
- `share:consentRequired`
- `share:sharingStarted`
- `share:sharingProgress`
- `share:sharingComplete`
- `share:error`

**Example:**
```typescript
// After user clicks "Authorize"
const result = await VCSDK.share.completeShare(authRequest, requestedCredentials);

if (result.success) {
  console.log('Protocol:', result.protocolNumber);
  // Show success screen
}
```

#### `declineShare()`

User declined sharing.

**Events emitted:**
- `share:userDeclined`

---

### VCSDK.device

#### `register(cpf, fcmToken): Promise<void>`

Register device with CPF and FCM token for push notifications.

**Events emitted:**
- `device:registrationStarted`
- `device:registrationComplete`
- `device:registrationError`
- `device:fcmTokenUpdated`

---

### VCSDK.notifications

#### `handleNotification(notification)`

Handle an incoming push notification.

**Events emitted:**
- `notification:received`
- `notification:credentialReady`

---

## Complete Flow Examples

### Download Credential Flow

```typescript
// 1. Get issuers
VCSDK.events.on('issuer:listUpdated', ({ issuers }) => {
  // Display issuer list in UI
});

const issuers = await VCSDK.issuers.getAll();

// 2. Get credential types
VCSDK.events.on('issuer:credentialTypesLoaded', ({ credentialTypes }) => {
  // Display credential types in UI
});

const credTypes = await VCSDK.issuers.getCredentialTypes(selectedIssuer.id);

// 3. Download credential
VCSDK.events.on('credential:downloadStarted', () => {
  // Show loading modal
});

VCSDK.events.on('credential:downloadProgress', ({ progress }) => {
  // Update progress bar: progress%
});

VCSDK.events.on('auth:required', ({ authUrl }) => {
  // Show WebView with authUrl
  // After auth completes:
  // await VCSDK.auth.completeAuthentication(token);
  // Then retry download
});

VCSDK.events.on('credential:notAvailable424', () => {
  // Hide loading, show "Share" button instead of retry
});

VCSDK.events.on('credential:downloadComplete', ({ credential }) => {
  // Hide loading, show success, refresh list
});

VCSDK.events.on('credential:downloadError', ({ error }) => {
  // Hide loading, show error with retry button
});

await VCSDK.credentials.download(issuer, credentialType);
```

### Share Credential Flow (OpenID4VP)

```typescript
// 1. Parse share request from deep link
const shareUrl = "openid4vp://...";

VCSDK.events.on('share:requestParsed', ({ verifierInfo, requestedCredentials }) => {
  // Show verifier info card
  // Show requested credentials list
  // Show "Download" button
});

const { verifierInfo, requestedCredentials, authRequest } =
  await VCSDK.share.parseRequest(shareUrl);

// 2. Download missing credentials
VCSDK.events.on('share:downloadStarted', ({ totalCredentials }) => {
  // Show download modal: "Downloading 0/4"
});

VCSDK.events.on('share:downloadProgress', ({ current, total, currentItem }) => {
  // Update modal: "Downloading 2/4: CAFCredential"
});

VCSDK.events.on('share:credentialNotAvailable424', ({ credentialName }) => {
  // Log: "Provider doesn't have ${credentialName}"
  // Continue downloading others
});

VCSDK.events.on('auth:required', ({ authUrl }) => {
  // Show WebView, then continue
});

VCSDK.events.on('share:downloadComplete', ({ successCount, error424Count }) => {
  // Hide download modal
  // If successCount > 0: Show "Share" button
  // If successCount === 0: Show "Retry" button
});

const downloadResult = await VCSDK.share.downloadCredentials(requestedCredentials);

// 3. Get consent from user
if (downloadResult.successCount > 0) {
  // Show consent modal: "Authorize sharing with ${verifierInfo.name}?"

  // If user clicks "Authorize":
  VCSDK.events.on('share:sharingStarted', () => {
    // Show sharing modal
  });

  VCSDK.events.on('share:sharingProgress', ({ message }) => {
    // Update modal: message
  });

  VCSDK.events.on('share:sharingComplete', ({ success, protocolNumber }) => {
    // Hide modal, show success screen with protocol number
  });

  await VCSDK.share.completeShare(authRequest, requestedCredentials);

  // If user clicks "Decline":
  VCSDK.share.declineShare();
  // Show decline screen
}
```

---

## Error Handling

### HTTP 424 - Credential Not Available

When a credential provider doesn't have a requested credential:

```typescript
VCSDK.events.on('credential:notAvailable424', ({ credentialType, issuer }) => {
  // Option 1: Change button from "Download" to "Share"
  setButtonText('Share');
  setButtonColor('purple');

  // Option 2: Show message
  Alert.alert(
    'Credential Not Available',
    `${credentialType.name} is not available from ${issuer.name}. You can share your existing credentials.`
  );
});
```

### Authentication Errors

```typescript
VCSDK.events.on('auth:required', ({ authUrl, reason }) => {
  // Show WebView
  setShowAuthWebView(true);
  setAuthWebViewUrl(authUrl);
});

VCSDK.events.on('auth:error', ({ error, message }) => {
  Alert.alert('Authentication Error', message);
});

VCSDK.events.on('auth:sessionExpired', () => {
  // Prompt re-authentication
});
```

---

## TypeScript Support

Full TypeScript support with type definitions for all events and methods:

```typescript
import { VCSDK, VC, Issuer, CredentialType } from 'vc-sdk-headless';

// Events are typed
VCSDK.events.on('credential:downloadComplete', (data) => {
  // data.credential is typed as VC
  // data.credentialType is typed as CredentialType
  // data.issuer is typed as Issuer
});

// Methods have return types
const credentials: VC[] = await VCSDK.credentials.getAll();
const issuer: Issuer = await VCSDK.issuers.get(issuerId);
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Your React Native App          │
│  (UI Screens, Components, Navigation)   │
└────────────────┬────────────────────────┘
                 │
                 │ Events & Method Calls
                 ▼
┌─────────────────────────────────────────┐
│         vc-sdk-headless                 │
│  ┌───────────────────────────────────┐  │
│  │  VCSDKCoreHeadless (Event API)    │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│  ┌───────────────▼───────────────────┐  │
│  │  Services Layer                   │  │
│  │  • CredentialService              │  │
│  │  • IssuerService                  │  │
│  │  • ShareVCService                 │  │
│  │  • AuthService                    │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│  ┌───────────────▼───────────────────┐  │
│  │  Platform Adapters                │  │
│  │  • Storage (AsyncStorage/MMKV)    │  │
│  │  • Crypto (Expo Crypto)           │  │
│  │  • Network (Fetch API)            │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## License

MIT

---

## Support

For issues, questions, or contributions:
- GitHub: [vc-sdk-headless](https://github.com/pankaj7121993/vc-sdk-headless)
- Email: pankajchaudhary7121994@gmail.com
