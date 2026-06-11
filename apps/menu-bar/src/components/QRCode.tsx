import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

const QUIET_ZONE_MODULES = 2;

/**
 * Renders `value` as a QR code. Drawn on a white background regardless of the
 * current theme to keep the code scannable.
 */
const QRCode = ({ value, size }: { value: string; size: number }) => {
  const { path, moduleCount } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();

    const moduleCount = qr.getModuleCount();
    let path = '';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          path += `M${col} ${row}h1v1h-1z`;
        }
      }
    }

    return { path, moduleCount };
  }, [value]);

  const viewBoxSize = moduleCount + QUIET_ZONE_MODULES * 2;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`${-QUIET_ZONE_MODULES} ${-QUIET_ZONE_MODULES} ${viewBoxSize} ${viewBoxSize}`}>
      <Rect
        x={-QUIET_ZONE_MODULES}
        y={-QUIET_ZONE_MODULES}
        width={viewBoxSize}
        height={viewBoxSize}
        fill="#ffffff"
      />
      <Path d={path} fill="#000000" />
    </Svg>
  );
};

export default QRCode;
