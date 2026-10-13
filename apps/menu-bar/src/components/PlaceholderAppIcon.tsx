import Svg, { Circle, ClipPath, Defs, G, Line, Rect } from 'react-native-svg';

/**
 * iOS's blank app icon — the white squircle with the icon-grid guides iOS shows
 * for an app bundle without an icon — redrawn as vectors, so a resigned app
 * without an icon looks the same in Orbit as on the phone's Home Screen.
 */
export function PlaceholderAppIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="placeholder-app-icon-tile">
          <Rect width={100} height={100} rx={22} />
        </ClipPath>
      </Defs>
      <Rect width={100} height={100} rx={22} fill="#FFFFFF" />
      <G clipPath="url(#placeholder-app-icon-tile)" stroke="#C7C9CF" strokeWidth={1.5} fill="none">
        {[20, 50, 80].map((v) => (
          <G key={v}>
            <Line x1={v} y1={0} x2={v} y2={100} />
            <Line x1={0} y1={v} x2={100} y2={v} />
          </G>
        ))}
        <Line x1={0} y1={0} x2={100} y2={100} />
        <Line x1={100} y1={0} x2={0} y2={100} />
        {[44, 30, 14].map((r) => (
          <Circle key={r} cx={50} cy={50} r={r} />
        ))}
      </G>
      <Rect
        x={0.75}
        y={0.75}
        width={98.5}
        height={98.5}
        rx={21.5}
        fill="none"
        stroke="#D9DBE0"
        strokeWidth={1.5}
      />
    </Svg>
  );
}
