/**
 * Display utilities for VC rendering
 * Provides styling helpers, color utilities, and display formatting
 */
export interface DisplayColors {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
}
export interface CardStyle {
    backgroundColor: string;
    backgroundImage?: string;
    textColor: string;
    borderColor: string;
    shadowColor: string;
}
/**
 * Default color palette
 */
export declare const DEFAULT_COLORS: DisplayColors;
/**
 * Display class for handling issuer branding and styling
 */
export declare class Display {
    private backgroundColor?;
    private backgroundImage?;
    private textColor?;
    constructor(wellknown?: any);
    getBackgroundColor(defaultColor?: string): string;
    getBackgroundImage(): string | undefined;
    getTextColor(defaultColor?: string): string;
    hasCustomBackground(): boolean;
}
/**
 * Generate card style from issuer metadata
 */
export declare function getCardStyle(backgroundColor?: string, backgroundImage?: string, textColor?: string): CardStyle;
/**
 * Check if a color is light or dark
 * Used to determine text color contrast
 */
export declare function isLightColor(hexColor: string): boolean;
/**
 * Get contrasting text color based on background
 */
export declare function getContrastTextColor(backgroundColor: string): string;
/**
 * Lighten or darken a color by a percentage
 */
export declare function adjustColorBrightness(hexColor: string, percent: number): string;
/**
 * Add alpha transparency to hex color
 */
export declare function hexToRGBA(hexColor: string, alpha?: number): string;
/**
 * Common styles for VC components
 */
export declare const VCStyles: {
    cardWidth: string;
    cardHeight: number;
    cardBorderRadius: number;
    cardPadding: number;
    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
    typography: {
        title: {
            fontSize: number;
            fontWeight: "600";
        };
        subtitle: {
            fontSize: number;
            fontWeight: "500";
        };
        body: {
            fontSize: number;
            fontWeight: "400";
        };
        caption: {
            fontSize: number;
            fontWeight: "400";
        };
        label: {
            fontSize: number;
            fontWeight: "600";
            textTransform: "uppercase";
            letterSpacing: number;
        };
    };
    shadow: {
        small: {
            shadowColor: string;
            shadowOffset: {
                width: number;
                height: number;
            };
            shadowOpacity: number;
            shadowRadius: number;
            elevation: number;
        };
        medium: {
            shadowColor: string;
            shadowOffset: {
                width: number;
                height: number;
            };
            shadowOpacity: number;
            shadowRadius: number;
            elevation: number;
        };
        large: {
            shadowColor: string;
            shadowOffset: {
                width: number;
                height: number;
            };
            shadowOpacity: number;
            shadowRadius: number;
            elevation: number;
        };
    };
    borderRadius: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        full: number;
    };
};
/**
 * Format field value for display
 */
export declare function formatFieldValue(value: any, type?: string): string;
/**
 * Truncate text with ellipsis
 */
export declare function truncateText(text: string, maxLength: number): string;
/**
 * Get initials from name for profile placeholder
 */
export declare function getInitials(name: string): string;
/**
 * Generate a placeholder color based on string
 * Useful for consistent profile image backgrounds
 */
export declare function getPlaceholderColor(str: string): string;
//# sourceMappingURL=VCDisplayUtils.d.ts.map