"use strict";

/**
 * Display utilities for VC rendering
 * Provides styling helpers, color utilities, and display formatting
 */

/**
 * Default color palette
 */
export const DEFAULT_COLORS = {
  primary: '#6C63FF',
  secondary: '#4CAF50',
  background: '#F5F5F5',
  text: '#333333',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: '#F44336',
  success: '#4CAF50',
  warning: '#FF9800'
};

/**
 * Display class for handling issuer branding and styling
 */
export class Display {
  constructor(wellknown) {
    if (wellknown?.display?.[0]) {
      const display = wellknown.display[0];
      this.backgroundColor = display.background_color;
      this.backgroundImage = display.background_image?.url;
      this.textColor = display.text_color;
    }
  }
  getBackgroundColor(defaultColor = DEFAULT_COLORS.primary) {
    return this.backgroundColor || defaultColor;
  }
  getBackgroundImage() {
    return this.backgroundImage;
  }
  getTextColor(defaultColor = '#FFFFFF') {
    return this.textColor || defaultColor;
  }
  hasCustomBackground() {
    return !!(this.backgroundColor || this.backgroundImage);
  }
}

/**
 * Generate card style from issuer metadata
 */
export function getCardStyle(backgroundColor, backgroundImage, textColor) {
  return {
    backgroundColor: backgroundColor || DEFAULT_COLORS.primary,
    backgroundImage,
    textColor: textColor || '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: 'rgba(0, 0, 0, 0.3)'
  };
}

/**
 * Check if a color is light or dark
 * Used to determine text color contrast
 */
export function isLightColor(hexColor) {
  const color = hexColor.replace('#', '');
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

/**
 * Get contrasting text color based on background
 */
export function getContrastTextColor(backgroundColor) {
  return isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
}

/**
 * Lighten or darken a color by a percentage
 */
export function adjustColorBrightness(hexColor, percent) {
  const color = hexColor.replace('#', '');
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const adjust = val => {
    const adjusted = Math.round(val + (255 - val) * (percent / 100));
    return Math.min(255, Math.max(0, adjusted));
  };
  const newR = adjust(r).toString(16).padStart(2, '0');
  const newG = adjust(g).toString(16).padStart(2, '0');
  const newB = adjust(b).toString(16).padStart(2, '0');
  return `#${newR}${newG}${newB}`;
}

/**
 * Add alpha transparency to hex color
 */
export function hexToRGBA(hexColor, alpha = 1) {
  const color = hexColor.replace('#', '');
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Common styles for VC components
 */
export const VCStyles = {
  // Card dimensions
  cardWidth: '100%',
  cardHeight: 200,
  cardBorderRadius: 16,
  cardPadding: 16,
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  // Typography
  typography: {
    title: {
      fontSize: 18,
      fontWeight: '600'
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '500'
    },
    body: {
      fontSize: 14,
      fontWeight: '400'
    },
    caption: {
      fontSize: 12,
      fontWeight: '400'
    },
    label: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5
    }
  },
  // Shadows
  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4
    },
    large: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 6
      },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6
    }
  },
  // Border radius
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999
  }
};

/**
 * Format field value for display
 */
export function formatFieldValue(value, type) {
  if (value == null || value === '') {
    return 'N/A';
  }

  // Handle dates
  if (type === 'date') {
    try {
      const date = new Date(value);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return String(value);
    }
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  // Handle objects
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Get initials from name for profile placeholder
 */
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a placeholder color based on string
 * Useful for consistent profile image backgrounds
 */
export function getPlaceholderColor(str) {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B3D9', '#E74C3C', '#3498DB'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
//# sourceMappingURL=VCDisplayUtils.js.map