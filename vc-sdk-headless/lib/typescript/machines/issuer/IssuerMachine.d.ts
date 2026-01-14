import { interpret } from 'xstate';
import type { CredentialInput } from '../../types';
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
    credential_issuer?: string;
    credential_endpoint?: string;
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
    credentialDefinitionTypes?: string[];
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
export type IssuerEvent = {
    type: 'LOAD_ISSUERS';
} | {
    type: 'SEARCH_ISSUERS';
    query: string;
} | {
    type: 'SELECT_ISSUER';
    issuer: IssuerInfo;
} | {
    type: 'LOAD_CREDENTIAL_TYPES';
    issuerId: string;
} | {
    type: 'SEARCH_CREDENTIAL_TYPES';
    query: string;
} | {
    type: 'SELECT_CREDENTIAL_TYPE';
    credentialType: CredentialType;
} | {
    type: 'FILTER_BY_CATEGORY';
    category: string;
} | {
    type: 'CLEAR_FILTERS';
} | {
    type: 'SELECT_AUTH_METHOD';
    method: AuthMethod;
} | {
    type: 'START_ISSUANCE';
    credentialData: CredentialInput;
} | {
    type: 'AUTHENTICATE';
    credentials: any;
} | {
    type: 'COMPLETE_ISSUANCE';
} | {
    type: 'RETRY';
} | {
    type: 'RESET';
} | {
    type: 'GO_BACK';
};
export declare const issuerMachine: import("xstate").StateMachine<IssuerContext, any, IssuerEvent, {
    value: any;
    context: TContext;
}, import("xstate").BaseActionObject, import("xstate").ServiceMap, import("xstate").ResolveTypegenMeta<import("xstate").TypegenDisabled, IssuerEvent, import("xstate").BaseActionObject, import("xstate").ServiceMap>>;
export type IssuerActor = ReturnType<typeof interpret>;
//# sourceMappingURL=IssuerMachine.d.ts.map