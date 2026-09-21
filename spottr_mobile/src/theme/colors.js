/**
 * Spottr Design System Theme
 * Soft, cute, approachable aesthetic with warm pastels (blush pink, cream, lavender, mint).
 */

export const Colors = {
  // Primary Palette (Cherry & Blush Pink)
  primary: '#FF4D6D',
  primaryDark: '#E63946',
  primaryLight: '#FF758F',
  blushPink: '#FF8FA3',
  pastelPink: '#FFB3C1',
  softPinkBg: '#FFF0F3',
  creamBg: '#FFFDF9',
  
  // Accent Pastels
  lavender: '#E8E0F8',
  lavenderDark: '#9D8DF1',
  mint: '#D8F3DC',
  mintDark: '#52B788',
  butterYellow: '#FEF3C7',
  
  // Surfaces
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  inputBg: '#FFF5F7',
  
  // Typography
  textDark: '#2B0914',
  textMuted: '#805D67',
  textLight: '#A3828B',
  
  // Borders & Dividers
  border: 'rgba(255, 77, 109, 0.15)',
  borderLight: 'rgba(255, 77, 109, 0.08)',
  borderActive: '#FF4D6D',
  
  // States
  success: '#52B788',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Gradients
  gradientPrimary: ['#FF4D6D', '#FF758F'],
  gradientVibeBadge: ['#FF758F', '#9D8DF1'],
  gradientCream: ['#FFF0F3', '#FFFDF9'],
  gradientMint: ['#D8F3DC', '#B7E4C7'],
};

export const Radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 9999,
};

export const Shadows = {
  soft: {
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  card: {
    shadowColor: '#2B0914',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  button: {
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 5,
  },
};

export const Typography = {
  fontFamilyHeading: 'System', // Nunito/Poppins fallback
  fontFamilyBody: 'System',
};
