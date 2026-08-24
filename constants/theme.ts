import { Platform } from 'react-native';

export const Palette = {
  green: '#34C759',
  greenDark: '#249A44',
  greenSoft: '#E8F8EC',
  greenMuted: '#D7F3DE',
  background: '#F4F6F5',
  card: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#6B7280',
  textMuted: '#9AA3A0',
  border: '#E8ECE9',
  danger: '#FF3B30',
};

const tintColorLight = Palette.green;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: Palette.text,
    background: Palette.background,
    tint: tintColorLight,
    icon: Palette.textSecondary,
    tabIconDefault: Palette.textMuted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
