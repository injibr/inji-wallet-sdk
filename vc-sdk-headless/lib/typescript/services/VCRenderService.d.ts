import type { VC, CredentialSubject } from '../types';
export interface DisplayField {
    name: string;
    label: string;
    value: any;
    type?: 'text' | 'image' | 'date' | 'address';
}
export interface VCDisplayData {
    id: string;
    credentialType: string;
    issuerName: string;
    issuerLogo?: string;
    profileImage?: string;
    backgroundColor?: string;
    backgroundImage?: string;
    textColor?: string;
    fields: DisplayField[];
    cardFields: DisplayField[];
    detailFields: DisplayField[];
    issuanceDate: string;
    expirationDate?: string;
    isExpired: boolean;
}
export interface IssuerDisplayMetadata {
    name: string;
    logo?: {
        url: string;
        alt_text?: string;
    };
    background_color?: string;
    background_image?: {
        url: string;
    };
    text_color?: string;
    description?: string;
}
export interface WellKnownConfig {
    credential_issuer: string;
    credential_configurations_supported?: Record<string, CredentialConfig>;
    display?: IssuerDisplayMetadata[];
}
export interface CredentialConfig {
    format: string;
    credential_definition?: {
        type: string[];
        credentialSubject?: Record<string, FieldDefinition>;
    };
    display?: Array<{
        name: string;
        locale?: string;
        logo?: {
            url: string;
            alt_text?: string;
        };
        background_color?: string;
        background_image?: {
            url: string;
        };
        text_color?: string;
    }>;
    claims?: Record<string, FieldDefinition>;
}
export interface FieldDefinition {
    mandatory?: boolean;
    value_type?: string;
    display?: Array<{
        name: string;
        locale?: string;
    }>;
}
export declare class VCRenderService {
    /**
     * Extract and format credential data for rendering
     */
    static prepareCredentialForDisplay(credential: VC, wellKnownConfig?: WellKnownConfig): VCDisplayData;
    /**
     * Get issuer display metadata from well-known config or credential metadata
     */
    private static getIssuerDisplayMetadata;
    /**
     * Known issuer DID to friendly name mapping
     */
    private static ISSUER_NAME_MAPPING;
    /**
     * Extract issuer name from URL or DID
     */
    private static extractIssuerName;
    /**
     * Get credential type from VC metadata or well-known config
     */
    private static getCredentialType;
    /**
     * Extract profile image from credential subject
     */
    private static extractProfileImage;
    /**
     * Extract all fields from credential subject
     */
    private static extractFields;
    /**
     * Get field definitions from well-known config
     */
    private static getFieldDefinitions;
    /**
     * Get field label from field definitions or format key
     */
    private static getFieldLabel;
    /**
     * Filter fields for card view (show only key fields)
     */
    private static filterFieldsForCardView;
    /**
     * Filter fields for detail view (show all relevant fields)
     */
    private static filterFieldsForDetailView;
    /**
     * Format address fields into a single string
     */
    static formatAddress(credentialSubject: CredentialSubject): string;
    /**
     * Format date value for display
     */
    static formatDate(dateValue: any): string;
}
//# sourceMappingURL=VCRenderService.d.ts.map