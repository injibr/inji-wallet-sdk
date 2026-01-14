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
    '@context'?: string | string[];
}
export interface VP {
    id: string;
    type: string[];
    verifiableCredential: VC[];
    proof: Proof;
    holder: string;
}
export interface CredentialSubject {
    id: string;
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
export interface SharingRequest {
    requesterDID: string;
    requestedCredentials: string[];
    purpose: string;
    deadline?: string;
}
export interface ShareResult {
    success: boolean;
    transactionId: string;
    error?: string;
}
export interface BackupResult {
    success: boolean;
    backupId: string;
    timestamp: string;
    size: number;
    error?: string;
}
export interface RestoreResult {
    success: boolean;
    restoredCredentials: number;
    errors: string[];
}
export interface VCSDKConfig {
    appId: string;
    environment?: 'development' | 'production';
    storage?: StorageConfig;
    ui?: UIConfig;
    issuer?: IssuerConfig;
    network?: NetworkConfig;
}
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
export interface UIConfig {
    theme?: 'light' | 'dark' | 'auto';
    primaryColor?: string;
    secondaryColor?: string;
    customComponents?: Partial<CustomComponents>;
    animations?: boolean;
}
export interface IssuerConfig {
    defaultIssuers?: IssuerInfo[];
    customIssuers?: IssuerInfo[];
}
export interface NetworkConfig {
    timeout?: number;
    retries?: number;
    baseUrl?: string;
    notificationBaseUrl?: string;
    endpoints?: APIEndpoints;
    oauth?: OAuthConfig;
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
    authorizationUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    scopes?: string[];
}
export interface IssuerInfo {
    id: string;
    name: string;
    url: string;
    trusted: boolean;
    credentialTypes: string[];
}
export interface CustomComponents {
    VCCard: React.ComponentType<VCCardProps>;
    VCScanner: React.ComponentType<VCScannerProps>;
    VCAuth: React.ComponentType<VCAuthProps>;
    LoadingScreen: React.ComponentType;
    ErrorBoundary: React.ComponentType<{
        children: React.ReactNode;
    }>;
}
export interface UseCredentialsResult {
    credentials: VC[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
    addCredential: (credential: CredentialInput) => Promise<VC>;
    deleteCredential: (id: string) => Promise<boolean>;
    searchCredentials: (query: string) => Promise<VC[]>;
}
export interface UseAuthResult {
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
    authenticate: () => Promise<AuthResult>;
    logout: () => Promise<void>;
}
export interface SDKEvents {
    credentialAdded: (credential: VC) => void;
    credentialRemoved: (credentialId: string) => void;
    credentialShared: (shareResult: ShareResult) => void;
    authenticationRequired: () => void;
    authenticationSuccess: (user: User) => void;
    authenticationFailed: (error: string) => void;
    backupCompleted: (result: BackupResult) => void;
    error: (error: SDKError) => void;
}
export interface SDKError {
    code: string;
    message: string;
    context?: Record<string, any>;
    timestamp: string;
}
export interface VCCardProps {
    credential: VC;
    onPress?: (credential: VC) => void;
    onShare?: (credential: VC) => void;
    onDelete?: (credential: VC) => void;
    showActions?: boolean;
    customStyle?: any;
}
export interface VCScannerProps {
    onQRScanned: (data: string) => void;
    onCredentialReceived?: (credential: VC) => void;
    enableFaceVerification?: boolean;
    showInstructions?: boolean;
    customOverlay?: React.ComponentType;
}
export interface VCWalletProps {
    credentials?: VC[];
    onCredentialSelect?: (credential: VC) => void;
    enableSearch?: boolean;
    enableFilters?: boolean;
    customCard?: React.ComponentType<VCCardProps>;
    emptyState?: React.ComponentType;
}
export interface VCAuthProps {
    onAuthSuccess?: (user: User) => void;
    onAuthError?: (error: string) => void;
    showLogo?: boolean;
    customTitle?: string;
}
export interface CredentialInput {
    type: string;
    issuer: string;
    credentialSubject: CredentialSubject;
    name?: string;
    metadata?: Partial<VCMetadata>;
}
export interface CredentialFilters {
    type?: string;
    issuer?: string;
    tags?: string[];
    isPinned?: boolean;
    dateRange?: {
        start: string;
        end: string;
    };
}
export interface CredentialUpdate {
    name?: string;
    metadata?: Partial<VCMetadata>;
}
export interface CredentialStats {
    total: number;
    byType: Record<string, number>;
    byIssuer: Record<string, number>;
    pinned: number;
    expired: number;
}
export interface SharingRecipient {
    did: string;
    name?: string;
    purpose: string;
}
export interface SharingRecord {
    id: string;
    timestamp: string;
    credentialIds: string[];
    recipient: SharingRecipient;
    method: 'qr' | 'bluetooth' | 'network';
    status: 'success' | 'failed' | 'pending';
}
export interface StorageStats {
    totalSize: number;
    credentialCount: number;
    backupCount: number;
    lastBackup?: string;
}
export interface ExportData {
    format: 'json' | 'csv';
    data: string;
    timestamp: string;
}
//# sourceMappingURL=index.d.ts.map