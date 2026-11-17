import { setStringAsync } from 'expo-clipboard';
import { SFSymbol, SymbolView } from 'expo-symbols';
import { ReactElement, useState } from 'react';
import {
  ColorValue,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

import { PlatformColor } from '../../modules/PlatformColor';
import { useCurrentTheme } from '../../utils/useExpoTheme';

// Colors of the Debug Menu design ("Orbit Debug Menu" in the Orbit Settings Redesign canvas).
const dark = {
  window: '#1e1e21',
  hover: 'rgba(255,255,255,0.05)',
  group: 'rgba(255,255,255,0.05)',
  groupBorder: 'rgba(255,255,255,0.06)',
  separator: 'rgba(255,255,255,0.08)',
  track: 'rgba(255,255,255,0.1)',
  button: 'rgba(255,255,255,0.12)',
  buttonHover: 'rgba(255,255,255,0.18)',
  buttonBorder: 'rgba(0,0,0,0.3)',
  field: 'rgba(255,255,255,0.06)',
  fieldBorder: 'rgba(255,255,255,0.14)',
  code: 'rgba(0,0,0,0.28)',
  errorRow: 'rgba(255,69,58,0.08)',
  danger: '#ff453a',
  accent: '#0a84ff',
  success: '#30d158',
  // JSON syntax colors, from VS Code's Dark+ and Light+ themes.
  jsonKey: '#9cdcfe',
  jsonString: '#ce9178',
  jsonNumber: '#b5cea8',
  jsonKeyword: '#569cd6',
};
const light: typeof dark = {
  window: '#fcfcfd',
  hover: 'rgba(0,0,0,0.04)',
  group: 'rgba(0,0,0,0.035)',
  groupBorder: 'rgba(0,0,0,0.05)',
  separator: 'rgba(0,0,0,0.08)',
  track: 'rgba(0,0,0,0.07)',
  button: '#ffffff',
  buttonHover: '#f4f4f6',
  buttonBorder: 'rgba(0,0,0,0.14)',
  field: '#ffffff',
  fieldBorder: 'rgba(0,0,0,0.16)',
  code: '#ffffff',
  errorRow: 'rgba(215,0,21,0.06)',
  danger: '#d70015',
  accent: '#007aff',
  success: '#248a3d',
  jsonKey: '#0451a5',
  jsonString: '#a31515',
  jsonNumber: '#098658',
  jsonKeyword: '#0000ff',
};

export function useDebugColors() {
  return useCurrentTheme() === 'dark' ? dark : light;
}

export function Icon({
  name,
  fallback,
  size = 14,
  color = PlatformColor('labelColor'),
  style,
}: {
  name: SFSymbol;
  fallback: ReactElement;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      fallback={fallback}
      style={[{ width: size, height: size }, style]}
    />
  );
}

export function HoverPressable({
  style,
  hoverStyle,
  ...props
}: Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  hoverStyle?: StyleProp<ViewStyle>;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Pressable
      {...props}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[style, isHovered && hoverStyle]}
    />
  );
}

export function RoundButton({
  label,
  icon,
  size = 28,
  style,
  onPress,
}: {
  label: string;
  icon: ReactElement;
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
}) {
  const colors = useDebugColors();
  return (
    <HoverPressable
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.round,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.button,
          borderColor: colors.buttonBorder,
        },
        style,
      ]}
      hoverStyle={{ backgroundColor: colors.buttonHover }}>
      {icon}
    </HoverPressable>
  );
}

// Copies text and returns it for a moment, so the UI can show a check mark or what it copied.
export function useCopied(): [string | undefined, (text: string) => void] {
  const [copied, setCopied] = useState<string>();
  const copy = (text: string) => {
    setStringAsync(text);
    setCopied(text);
    setTimeout(() => setCopied(undefined), 1200);
  };
  return [copied, copy];
}

const pad = (value: number) => String(value).padStart(2, '0');
export function formatTime(time?: number) {
  if (!time) {
    return '';
  }
  const date = new Date(time);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const styles = StyleSheet.create({
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
