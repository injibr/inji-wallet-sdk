"use strict";

// Default fields to show in card view (compact)
const CARD_VIEW_DEFAULT_FIELDS = ['fullName', 'name', 'firstName', 'lastName', 'UIN', 'VID', 'id'];

// Fields to show in detail view
const DETAIL_VIEW_DEFAULT_FIELDS = ['fullName', 'name', 'firstName', 'lastName', 'gender', 'phone', 'dateOfBirth', 'email', 'address', 'UIN', 'VID', 'id'];

// Address field components
const ADDRESS_FIELDS = ['addressLine1', 'addressLine2', 'addressLine3', 'city', 'province', 'region', 'postalCode', 'country'];
export class VCRenderService {
  /**
   * Extract and format credential data for rendering
   */
  static prepareCredentialForDisplay(credential, wellKnownConfig) {
    console.log('[VCRenderService] Preparing credential for display:', credential.id);
    const credentialSubject = credential.credentialSubject;
    const issuerMetadata = this.getIssuerDisplayMetadata(credential.issuer, wellKnownConfig, credential);

    // Extract credential type
    const credentialType = this.getCredentialType(credential, wellKnownConfig);

    // Extract all fields
    const allFields = this.extractFields(credentialSubject, wellKnownConfig, credential.type);

    // Filter fields for card view (compact)
    const cardFields = this.filterFieldsForCardView(allFields);

    // Filter fields for detail view
    const detailFields = this.filterFieldsForDetailView(allFields);

    // Check if credential is expired
    const isExpired = credential.expirationDate ? new Date(credential.expirationDate) < new Date() : false;
    return {
      id: credential.id,
      credentialType,
      issuerName: issuerMetadata.name,
      issuerLogo: issuerMetadata.logo?.url,
      profileImage: this.extractProfileImage(credentialSubject),
      backgroundColor: issuerMetadata.background_color || '#6C63FF',
      backgroundImage: issuerMetadata.background_image?.url,
      textColor: issuerMetadata.text_color || '#FFFFFF',
      fields: allFields,
      cardFields,
      detailFields,
      issuanceDate: credential.issuanceDate,
      expirationDate: credential.expirationDate,
      isExpired
    };
  }

  /**
   * Get issuer display metadata from well-known config or credential metadata
   */
  static getIssuerDisplayMetadata(issuerUrl, wellKnownConfig, credential) {
    // First try to get from credential metadata (Inji format)
    if (credential?.metadata?.credentialType?.display) {
      const display = credential.metadata.credentialType.display;
      return {
        name: credential.metadata.issuerInfo?.name || display.name || this.extractIssuerName(issuerUrl),
        logo: display.logo,
        background_color: display.background_color,
        background_image: display.background_image,
        text_color: display.text_color,
        description: display.name
      };
    }

    // Fallback to well-known config
    if (!wellKnownConfig?.display || wellKnownConfig.display.length === 0) {
      return {
        name: this.extractIssuerName(issuerUrl)
      };
    }

    // Return first display metadata (TODO: add locale support)
    return wellKnownConfig.display[0];
  }

  /**
   * Known issuer DID to friendly name mapping
   */
  static ISSUER_NAME_MAPPING = {
    'did:web:injibr.github.io:inji-did:dev:incra': 'INCRA',
    'did:web:injibr.github.io:inji-did:dev:gov': 'Government',
    'did:web:injibr.github.io:inji-did:dev:health': 'Ministry of Health'
    // Add more issuer DID mappings here as needed
  };

  /**
   * Extract issuer name from URL or DID
   */
  static extractIssuerName(issuerUrl) {
    // First check if it's a known DID with friendly name mapping
    if (this.ISSUER_NAME_MAPPING[issuerUrl]) {
      return this.ISSUER_NAME_MAPPING[issuerUrl];
    }

    // Try to extract from DID
    if (issuerUrl.startsWith('did:web:')) {
      // Extract from DID format: did:web:example.com:path:to:issuer
      const parts = issuerUrl.split(':');
      if (parts.length >= 3) {
        // Try to find a meaningful name from the DID parts
        // Look for organization name in the path
        for (let i = parts.length - 1; i >= 2; i--) {
          const part = parts[i];
          if (part && part !== 'dev' && part !== 'prod' && part !== 'test') {
            return part.toUpperCase();
          }
        }
        // Fallback to domain
        return parts[2].replace('www.', '');
      }
    }

    // Try to extract from URL
    try {
      const url = new URL(issuerUrl);
      return url.hostname.replace('www.', '');
    } catch {
      return issuerUrl;
    }
  }

  /**
   * Get credential type from VC metadata or well-known config
   */
  static getCredentialType(credential, wellKnownConfig) {
    // First try to get from credential metadata (Inji format)
    if (credential?.metadata?.credentialType?.display?.name) {
      return credential.metadata.credentialType.display.name;
    }
    if (credential?.metadata?.credentialType?.name) {
      return credential.metadata.credentialType.name;
    }

    // Try to get from well-known config display name
    if (wellKnownConfig?.credential_configurations_supported) {
      const configs = Object.values(wellKnownConfig.credential_configurations_supported);
      if (configs.length > 0 && configs[0].display?.[0]?.name) {
        return configs[0].display[0].name;
      }
    }

    // Fallback to credential type
    const types = Array.isArray(credential.type) ? credential.type : [credential.type];

    // Return the most specific type (not VerifiableCredential)
    const specificType = types.find(t => t !== 'VerifiableCredential');
    return specificType || types[0] || 'Credential';
  }

  /**
   * Extract profile image from credential subject
   */
  static extractProfileImage(credentialSubject) {
    // Look for common profile image field names
    const imageFields = ['face', 'photo', 'image', 'picture', 'profileImage'];
    for (const field of imageFields) {
      if (credentialSubject[field]) {
        const value = credentialSubject[field];
        // If it's a string and looks like a base64 or URL, return it
        if (typeof value === 'string') {
          return value.startsWith('data:') || value.startsWith('http') ? value : `data:image/jpeg;base64,${value}`;
        }
      }
    }
    return undefined;
  }

  /**
   * Extract all fields from credential subject
   */
  static extractFields(credentialSubject, wellKnownConfig, credentialType) {
    const fields = [];

    // Get field definitions from well-known config
    const fieldDefinitions = this.getFieldDefinitions(wellKnownConfig, credentialType);
    for (const [key, value] of Object.entries(credentialSubject)) {
      // Skip id field
      if (key === 'id') continue;

      // Skip image fields (already extracted separately)
      if (['face', 'photo', 'image', 'picture', 'profileImage'].includes(key)) continue;

      // Get field label from well-known config or use formatted key
      const label = this.getFieldLabel(key, fieldDefinitions);

      // Handle address fields specially
      if (ADDRESS_FIELDS.includes(key)) {
        fields.push({
          name: key,
          label,
          value,
          type: 'address'
        });
        continue;
      }

      // Handle date fields
      if (key.toLowerCase().includes('date') || key.toLowerCase().includes('dob')) {
        fields.push({
          name: key,
          label,
          value,
          type: 'date'
        });
        continue;
      }

      // Handle arrays
      if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] !== 'object') {
          fields.push({
            name: key,
            label,
            value: value.join(', '),
            type: 'text'
          });
        }
        continue;
      }

      // Handle objects (skip complex nested objects)
      if (typeof value === 'object' && value !== null) {
        continue;
      }

      // Regular text field
      fields.push({
        name: key,
        label,
        value,
        type: 'text'
      });
    }
    return fields;
  }

  /**
   * Get field definitions from well-known config
   */
  static getFieldDefinitions(wellKnownConfig, credentialType) {
    if (!wellKnownConfig?.credential_configurations_supported) {
      return {};
    }

    // Get the first credential configuration
    const configs = Object.values(wellKnownConfig.credential_configurations_supported);
    if (configs.length === 0) {
      return {};
    }
    const config = configs[0];

    // Return credentialSubject definitions for ldp_vc or claims for mso_mdoc
    return config.credential_definition?.credentialSubject || config.claims || {};
  }

  /**
   * Get field label from field definitions or format key
   */
  static getFieldLabel(fieldKey, fieldDefinitions) {
    // Try to get from well-known config
    const definition = fieldDefinitions[fieldKey];
    if (definition?.display?.[0]?.name) {
      return definition.display[0].name;
    }

    // Fallback to formatted key (convert camelCase to Title Case)
    return fieldKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
  }

  /**
   * Filter fields for card view (show only key fields)
   */
  static filterFieldsForCardView(allFields) {
    const cardFields = [];

    // Add fields that match card view defaults
    for (const defaultField of CARD_VIEW_DEFAULT_FIELDS) {
      const field = allFields.find(f => f.name === defaultField);
      if (field) {
        cardFields.push(field);
        if (cardFields.length >= 2) break; // Show max 2 fields on card
      }
    }

    // If no default fields found, take first non-address field
    if (cardFields.length === 0) {
      const firstField = allFields.find(f => f.type !== 'address');
      if (firstField) {
        cardFields.push(firstField);
      }
    }
    return cardFields;
  }

  /**
   * Filter fields for detail view (show all relevant fields)
   */
  static filterFieldsForDetailView(allFields) {
    // Return all fields in a logical order
    const detailFields = [];

    // Add fields in default order first
    for (const defaultField of DETAIL_VIEW_DEFAULT_FIELDS) {
      const field = allFields.find(f => f.name === defaultField);
      if (field) {
        detailFields.push(field);
      }
    }

    // Add remaining fields that aren't in default list
    for (const field of allFields) {
      if (!detailFields.find(f => f.name === field.name)) {
        detailFields.push(field);
      }
    }
    return detailFields;
  }

  /**
   * Format address fields into a single string
   */
  static formatAddress(credentialSubject) {
    const addressParts = [];
    for (const field of ADDRESS_FIELDS) {
      const value = credentialSubject[field];
      if (value && typeof value === 'string') {
        addressParts.push(value);
      }
    }
    return addressParts.join(', ');
  }

  /**
   * Format date value for display
   */
  static formatDate(dateValue) {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return String(dateValue);
    }
  }
}
//# sourceMappingURL=VCRenderService.js.map