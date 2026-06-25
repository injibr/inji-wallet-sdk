import { createMachine, assign, interpret } from 'xstate';
import type { IssuerConfig, CredentialInput } from '../../types';

export interface IssuerInfo {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  website?: string;
  supportedCredentialTypes: CredentialType[];
  trustLevel: 'high' | 'medium' | 'low';
  issuerUrl: string;
  authenticationMethods: AuthMethod[];
  credential_issuer?: string; // From well-known config - used as JWT aud claim
  credential_endpoint?: string; // From well-known config
  metadata: {
    [key: string]: any;
  };
}

export interface CredentialType {
  id: string;
  name: string;
  description: string;
  schema: string;
  category: string;
  requiredFields: string[];
  optionalFields: string[];
  icon?: string;
  estimatedTime?: string;
  documentRequirements?: string[];
  credentialDefinitionTypes?: string[]; // Array like ["VerifiableCredential", "CCIR"]
}

export interface AuthMethod {
  type: 'oauth' | 'biometric' | 'otp' | 'pin' | 'certificate';
  name: string;
  description: string;
  config: {
    [key: string]: any;
  };
}

export interface IssuerContext {
  availableIssuers: IssuerInfo[];
  selectedIssuer: IssuerInfo | null;
  selectedCredentialType: CredentialType | null;
  credentialTypes: CredentialType[];
  searchQuery: string;
  filteredIssuers: IssuerInfo[];
  filteredCredentialTypes: CredentialType[];
  authMethod: AuthMethod | null;
  issuanceProgress: number;
  error: string | null;
  isLoading: boolean;
  categories: string[];
  selectedCategory: string | null;
}

export type IssuerEvent = 
  | { type: 'LOAD_ISSUERS' }
  | { type: 'SEARCH_ISSUERS'; query: string }
  | { type: 'SELECT_ISSUER'; issuer: IssuerInfo }
  | { type: 'LOAD_CREDENTIAL_TYPES'; issuerId: string }
  | { type: 'SEARCH_CREDENTIAL_TYPES'; query: string }
  | { type: 'SELECT_CREDENTIAL_TYPE'; credentialType: CredentialType }
  | { type: 'FILTER_BY_CATEGORY'; category: string }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SELECT_AUTH_METHOD'; method: AuthMethod }
  | { type: 'START_ISSUANCE'; credentialData: CredentialInput }
  | { type: 'AUTHENTICATE'; credentials: any }
  | { type: 'COMPLETE_ISSUANCE' }
  | { type: 'RETRY' }
  | { type: 'RESET' }
  | { type: 'GO_BACK' };

// Mock data for demonstration
const mockIssuers: IssuerInfo[] = [
  {
    id: 'gov-dmv',
    name: 'Department of Motor Vehicles',
    description: 'Official government issuer for driver licenses and vehicle registrations',
    logoUrl: 'https://example.com/dmv-logo.png',
    website: 'https://dmv.gov',
    issuerUrl: 'https://issuer.dmv.gov',
    trustLevel: 'high',
    authenticationMethods: [
      {
        type: 'oauth',
        name: 'Government ID Login',
        description: 'Login using your government ID credentials',
        config: { scope: 'dmv_records', redirectUri: 'vc-sdk://callback' }
      },
      {
        type: 'biometric',
        name: 'Biometric Verification',
        description: 'Verify your identity using biometrics',
        config: { requiredBiometrics: ['face', 'fingerprint'] }
      }
    ],
    supportedCredentialTypes: [
      {
        id: 'driver-license',
        name: 'Driver License',
        description: 'Official driver license credential',
        schema: 'https://schema.org/DriversLicense',
        category: 'Government ID',
        requiredFields: ['firstName', 'lastName', 'dateOfBirth', 'licenseNumber'],
        optionalFields: ['address', 'restrictions'],
        icon: '🚗',
        estimatedTime: '5-10 minutes',
        documentRequirements: ['Current driver license', 'Proof of identity']
      },
      {
        id: 'vehicle-registration',
        name: 'Vehicle Registration',
        description: 'Vehicle registration credential',
        schema: 'https://schema.org/VehicleRegistration',
        category: 'Government ID',
        requiredFields: ['vehicleId', 'ownerName', 'registrationNumber'],
        optionalFields: ['vehicleType', 'color'],
        icon: '🚙',
        estimatedTime: '3-5 minutes',
        documentRequirements: ['Vehicle registration document', 'Proof of ownership']
      }
    ],
    metadata: {
      jurisdiction: 'State Government',
      certificationLevel: 'Level 4',
      lastUpdated: '2024-01-15'
    }
  },
  {
    id: 'university-edu',
    name: 'State University',
    description: 'Educational credentials and academic achievements',
    logoUrl: 'https://example.com/university-logo.png',
    website: 'https://university.edu',
    issuerUrl: 'https://credentials.university.edu',
    trustLevel: 'high',
    authenticationMethods: [
      {
        type: 'oauth',
        name: 'Student Portal Login',
        description: 'Login using your student portal credentials',
        config: { scope: 'academic_records', redirectUri: 'vc-sdk://callback' }
      }
    ],
    supportedCredentialTypes: [
      {
        id: 'degree-diploma',
        name: 'Degree Diploma',
        description: 'Academic degree credential',
        schema: 'https://schema.org/EducationalCredential',
        category: 'Education',
        requiredFields: ['studentName', 'degree', 'major', 'graduationDate'],
        optionalFields: ['gpa', 'honors'],
        icon: '🎓',
        estimatedTime: '2-3 minutes',
        documentRequirements: ['Student ID', 'Academic transcript']
      },
      {
        id: 'transcript',
        name: 'Academic Transcript',
        description: 'Official academic transcript',
        schema: 'https://schema.org/Transcript',
        category: 'Education',
        requiredFields: ['studentName', 'courses', 'grades'],
        optionalFields: ['semester', 'credits'],
        icon: '📜',
        estimatedTime: '1-2 minutes',
        documentRequirements: ['Student ID verification']
      }
    ],
    metadata: {
      accreditation: 'Regional Accreditation Board',
      establishedYear: '1965',
      lastUpdated: '2024-01-10'
    }
  },
  {
    id: 'health-provider',
    name: 'National Health Service',
    description: 'Medical and health-related credentials',
    logoUrl: 'https://example.com/health-logo.png',
    website: 'https://nhs.gov',
    issuerUrl: 'https://credentials.nhs.gov',
    trustLevel: 'high',
    authenticationMethods: [
      {
        type: 'oauth',
        name: 'Health Portal Login',
        description: 'Login using your health portal credentials',
        config: { scope: 'medical_records', redirectUri: 'vc-sdk://callback' }
      },
      {
        type: 'otp',
        name: 'SMS Verification',
        description: 'Verify using SMS code',
        config: { phoneNumberRequired: true }
      }
    ],
    supportedCredentialTypes: [
      {
        id: 'vaccination-record',
        name: 'Vaccination Record',
        description: 'COVID-19 and other vaccination records',
        schema: 'https://schema.org/VaccinationRecord',
        category: 'Healthcare',
        requiredFields: ['patientName', 'vaccineName', 'vaccinationDate'],
        optionalFields: ['batchNumber', 'administeredBy'],
        icon: '💉',
        estimatedTime: '1-2 minutes',
        documentRequirements: ['Health ID', 'Vaccination card']
      },
      {
        id: 'medical-license',
        name: 'Medical License',
        description: 'Professional medical practice license',
        schema: 'https://schema.org/MedicalLicense',
        category: 'Professional',
        requiredFields: ['practitionerName', 'licenseNumber', 'specialty'],
        optionalFields: ['certifications', 'restrictions'],
        icon: '⚕️',
        estimatedTime: '5-7 minutes',
        documentRequirements: ['Medical degree', 'Board certification']
      }
    ],
    metadata: {
      healthSystemType: 'National',
      certificationBody: 'Medical Council',
      lastUpdated: '2024-01-20'
    }
  }
];

export const issuerMachine = createMachine<IssuerContext, IssuerEvent>(
  {
    id: 'issuer',
    initial: 'idle',
    context: {
      availableIssuers: [],
      selectedIssuer: null,
      selectedCredentialType: null,
      credentialTypes: [],
      searchQuery: '',
      filteredIssuers: [],
      filteredCredentialTypes: [],
      authMethod: null,
      issuanceProgress: 0,
      error: null,
      isLoading: false,
      categories: ['Government ID', 'Education', 'Healthcare', 'Professional', 'Financial'],
      selectedCategory: null,
    },
    states: {
      idle: {
        on: {
          LOAD_ISSUERS: 'loadingIssuers',
        },
      },
      loadingIssuers: {
        entry: 'setLoading',
        invoke: {
          id: 'loadIssuers',
          src: 'loadAvailableIssuers',
          onDone: {
            target: 'issuersLoaded',
            actions: 'setIssuers',
          },
          onError: {
            target: 'error',
            actions: 'setError',
          },
        },
      },
      issuersLoaded: {
        entry: 'clearLoading',
        on: {
          SEARCH_ISSUERS: {
            actions: 'searchIssuers',
          },
          SELECT_ISSUER: {
            target: 'issuerSelected',
            actions: 'selectIssuer',
          },
          FILTER_BY_CATEGORY: {
            actions: 'filterByCategory',
          },
          CLEAR_FILTERS: {
            actions: 'clearFilters',
          },
          LOAD_ISSUERS: 'loadingIssuers',
        },
      },
      issuerSelected: {
        entry: 'loadCredentialTypes',
        on: {
          LOAD_CREDENTIAL_TYPES: 'loadingCredentialTypes',
          SEARCH_CREDENTIAL_TYPES: {
            actions: 'searchCredentialTypes',
          },
          SELECT_CREDENTIAL_TYPE: {
            target: 'credentialTypeSelected',
            actions: 'selectCredentialType',
          },
          GO_BACK: 'issuersLoaded',
        },
      },
      loadingCredentialTypes: {
        entry: 'setLoading',
        invoke: {
          id: 'loadCredentialTypes',
          src: 'loadIssuerCredentialTypes',
          onDone: {
            target: 'issuerSelected',
            actions: 'setCredentialTypes',
          },
          onError: {
            target: 'error',
            actions: 'setError',
          },
        },
      },
      credentialTypeSelected: {
        on: {
          SELECT_AUTH_METHOD: {
            target: 'authMethodSelected',
            actions: 'selectAuthMethod',
          },
          GO_BACK: 'issuerSelected',
        },
      },
      authMethodSelected: {
        on: {
          START_ISSUANCE: 'authenticating',
          GO_BACK: 'credentialTypeSelected',
        },
      },
      authenticating: {
        invoke: {
          id: 'authenticate',
          src: 'performAuthentication',
          onDone: {
            target: 'issuing',
            actions: 'startIssuance',
          },
          onError: {
            target: 'authenticationFailed',
            actions: 'setError',
          },
        },
      },
      authenticationFailed: {
        on: {
          RETRY: 'authenticating',
          GO_BACK: 'authMethodSelected',
        },
      },
      issuing: {
        entry: 'resetProgress',
        invoke: {
          id: 'issueCredential',
          src: 'issueNewCredential',
          onDone: {
            target: 'issued',
            actions: 'completeIssuance',
          },
          onError: {
            target: 'issuanceFailed',
            actions: 'setError',
          },
        },
        on: {
          UPDATE_PROGRESS: {
            actions: 'updateProgress',
          },
        },
      },
      issued: {
        on: {
          RESET: 'idle',
          SELECT_CREDENTIAL_TYPE: {
            target: 'credentialTypeSelected',
            actions: 'selectCredentialType',
          },
        },
      },
      issuanceFailed: {
        on: {
          RETRY: 'issuing',
          GO_BACK: 'authMethodSelected',
          RESET: 'idle',
        },
      },
      error: {
        on: {
          RETRY: 'idle',
          RESET: 'idle',
        },
      },
    },
  },
  {
    actions: {
      setLoading: assign({ isLoading: true, error: null }),
      clearLoading: assign({ isLoading: false }),
      setIssuers: assign({
        availableIssuers: (_, event) => event.data,
        filteredIssuers: (_, event) => event.data,
        isLoading: false,
      }),
      setCredentialTypes: assign({
        credentialTypes: (_, event) => event.data,
        filteredCredentialTypes: (_, event) => event.data,
        isLoading: false,
      }),
      selectIssuer: assign({
        selectedIssuer: (_, event) => event.issuer,
        credentialTypes: (_, event) => event.issuer.supportedCredentialTypes,
        filteredCredentialTypes: (_, event) => event.issuer.supportedCredentialTypes,
      }),
      loadCredentialTypes: assign({
        credentialTypes: (context) => context.selectedIssuer?.supportedCredentialTypes || [],
        filteredCredentialTypes: (context) => context.selectedIssuer?.supportedCredentialTypes || [],
      }),
      selectCredentialType: assign({
        selectedCredentialType: (_, event) => event.credentialType,
      }),
      selectAuthMethod: assign({
        authMethod: (_, event) => event.method,
      }),
      searchIssuers: assign({
        searchQuery: (_, event) => event.query,
        filteredIssuers: (context, event) => {
          const query = event.query.toLowerCase();
          return context.availableIssuers.filter(issuer =>
            issuer.name.toLowerCase().includes(query) ||
            issuer.description.toLowerCase().includes(query)
          );
        },
      }),
      searchCredentialTypes: assign({
        searchQuery: (_, event) => event.query,
        filteredCredentialTypes: (context, event) => {
          const query = event.query.toLowerCase();
          return context.credentialTypes.filter(type =>
            type.name.toLowerCase().includes(query) ||
            type.description.toLowerCase().includes(query)
          );
        },
      }),
      filterByCategory: assign({
        selectedCategory: (_, event) => event.category,
        filteredCredentialTypes: (context, event) => {
          return context.credentialTypes.filter(type => type.category === event.category);
        },
      }),
      clearFilters: assign({
        selectedCategory: null,
        searchQuery: '',
        filteredIssuers: (context) => context.availableIssuers,
        filteredCredentialTypes: (context) => context.credentialTypes,
      }),
      resetProgress: assign({ issuanceProgress: 0 }),
      updateProgress: assign({
        issuanceProgress: (_, event) => event.progress,
      }),
      startIssuance: assign({ issuanceProgress: 25 }),
      completeIssuance: assign({ 
        issuanceProgress: 100,
        error: null,
      }),
      setError: assign({
        error: (_, event) => event.data?.message || 'An error occurred',
        isLoading: false,
      }),
    },
    services: {
      loadAvailableIssuers: async () => {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return mockIssuers;
      },
      loadIssuerCredentialTypes: async (context) => {
        if (!context.selectedIssuer) throw new Error('No issuer selected');
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return context.selectedIssuer.supportedCredentialTypes;
      },
      performAuthentication: async (context) => {
        if (!context.authMethod) throw new Error('No authentication method selected');
        
        // Simulate authentication process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock authentication success
        return {
          success: true,
          token: 'mock-auth-token',
          user: { id: 'user123', name: 'John Doe' }
        };
      },
      issueNewCredential: async (context, event) => {
        if (!context.selectedIssuer || !context.selectedCredentialType) {
          throw new Error('Missing issuer or credential type');
        }
        
        // Simulate credential issuance process
        for (let progress = 25; progress <= 100; progress += 25) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          // In a real implementation, you'd emit progress events here
        }
        
        // Mock issued credential
        return {
          id: `vc_${Date.now()}`,
          type: context.selectedCredentialType.name,
          issuer: context.selectedIssuer.id,
          issuanceDate: new Date().toISOString(),
          credentialSubject: event.credentialData.credentialSubject,
        };
      },
    },
  }
);

export type IssuerActor = ReturnType<typeof interpret>;