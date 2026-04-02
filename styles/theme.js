// Marutham Brand Theme
// Primary: Deep Forest Green | Accent: Rich Gold

const theme = {
  // Core palette
  primary:        '#1B5E35',   // deep forest green
  primaryDark:    '#0D3B1E',   // darker green (gradients, shadows)
  primaryLight:   '#2E7D4F',   // lighter green
  primaryLighter: '#4CAF72',   // soft green tint
  primaryLightest:'#E8F5EC',   // near-white green tint

  // Gold accent
  gold:      '#C9A84C',   // rich gold
  goldLight: '#E2C97E',   // light gold
  goldDark:  '#A07830',   // dark gold

  // Neutrals
  white:     '#FFFFFF',
  black:     '#000000',
  textDark:  '#1A2E1F',
  textMid:   '#2E5C3A',
  textLight: '#5A8A68',
  textGray:  '#6C757D',
  bgLight:   '#F4F9F6',   // very light green-tinted background
  bgCard:    '#FFFFFF',
  border:    '#D4E8DA',   // soft green border

  // Status colors (keep semantic meaning)
  success:   '#2E7D4F',
  error:     '#C62828',
  warning:   '#C9A84C',  // gold doubles as warning
  info:      '#1B5E35',

  // Gradients (arrays for LinearGradient)
  gradientHeader:  ['#1B5E35', '#2E7D4F'],
  gradientCard:    ['#2E7D4F', '#1B5E35'],
  gradientGold:    ['#C9A84C', '#A07830'],
  gradientLight:   ['#E8F5EC', '#C8E6C9'],
  gradientLogin:   ['#0D3B1E', '#1B5E35', '#2E7D4F'],
};

export default theme;
