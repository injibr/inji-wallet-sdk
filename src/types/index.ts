// Core types for the VC-SDK
export interface VC {
  id: string;
  type: string | string[];
  name: string;
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: CredentialSubject;
  proof: Proof;
  metadata: VCMetadata;
  '@context'?: string | string[]; // W3C VC context - optional for compatibility
}

export interface VP {
  id: string;
  type: string[];
  verifiableCredential: VC[];
  proof: Proof;
  holder: string;
}

export interface CredentialSubject {
  id?: string;
  [key: string]: any;
}

export interface Proof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
}

export interface VCMetadata {
  addedDate: string;
  lastAccessed: string;
  isPinned: boolean;
  tags: string[];
  customData?: Record<string, any>;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  biometricsEnabled: boolean;
  lastLogin: string;
}

export interface VerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  issuerTrusted: boolean;
  signatureValid: boolean;
  notExpired: boolean;
}

export interface ShareResult {
  success: boolean;
  transactionId: string;
  error?: string;
}

// SDK Configuration Types
export interface VCSDKConfig {
  appId: string;
  environment?: 'development' | 'production';
  // biometrics?: BiometricConfig;
  storage?: StorageConfig;
  ui?: UIConfig;
  issuer?: IssuerConfig;
  network?: NetworkConfig;
}

// export interface BiometricConfig {
//   enabled: boolean;
//   title?: string;
//   subtitle?: string;
//   description?: string;
//   fallbackToPasscode?: boolean;
//   invalidateOnEnrollmentChange?: boolean;
// }

export interface StorageConfig {
  encrypted?: boolean;
  backup?: BackupConfig;
  maxCredentials?: number;
  compressionEnabled?: boolean;
}

export interface BackupConfig {
  provider: 'icloud' | 'google-drive' | 'custom';
  automatic?: boolean;
  schedule?: 'daily' | 'weekly' | 'manual';
  encryptBackups?: boolean;
}

export interface IssuerConfig {
  defaultIssuers?: IssuerInfo[];
  customIssuers?: IssuerInfo[];
}

export interface NetworkConfig {
  timeout?: number;
  retries?: number;
  baseUrl?: string;
  notificationBaseUrl?: string;  // Base URL for notification service (e.g., https://noty.whatever-vcdemo.crabdance.com/)
  endpoints?: APIEndpoints;
  oauth?: OAuthConfig;  // OAuth 2.0 configuration for authentication
}

export interface APIEndpoints {
  trustedVerifiersList?: string;
  issuersList?: string;
  issuerConfig?: string;
  issuerWellknownConfig?: string;
  credentialRequest?: string;
  credentialStatus?: string;
  credentialDownload?: string;
  walletBinding?: string;
  requestOtp?: string;
  authenticate?: string;
}

export interface OAuthConfig {
  authorizationUrl?: string;  // OAuth authorization endpoint (e.g., https://sso.staging.acesso.gov.br/authorize)
  tokenUrl?: string;          // OAuth token endpoint (e.g., https://sso.staging.acesso.gov.br/token)
  userInfoUrl?: string;       // OAuth user info endpoint (e.g., https://sso.staging.acesso.gov.br/userinfo/)
  clientId?: string;          // OAuth client ID
  clientSecret?: string;      // OAuth client secret
  redirectUri?: string;       // OAuth redirect URI (e.g., http://localhost:3001/redirect)
  scopes?: string[];          // OAuth scopes (e.g., ['openid', 'profile', 'email'])
}

export interface IssuerInfo {
  id: string;
  name: string;
  url: string;
  trusted: boolean;
  credentialTypes: string[];
}

// Hook Types
// Event Types
export interface SDKEvents {
  credentialAdded: (credential: VC) => void;
  credentialRemoved: (credentialId: string) => void;
  credentialShared: (shareResult: ShareResult) => void;
  authenticationRequired: () => void;
  authenticationSuccess: (user: User) => void;
  authenticationFailed: (error: string) => void;
  error: (error: SDKError) => void;
}

export interface SDKError {
  code: string;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

// Component Props Types
export interface CredentialInput {
  type: string;
  issuer: string;
  credentialSubject: CredentialSubject;
  name?: string;
  metadata?: Partial<VCMetadata>;
}

