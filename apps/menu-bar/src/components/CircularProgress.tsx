import React from 'react';
import { ColorValue, View } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';

import { withAnchorPoint } from '../utils/withAnchorPoint';

interface ProgressCircleProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  activeStrokeColor?: ColorValue;
  inactiveStrokeColor?: ColorValue;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({
  size = 25,
  progress,
  strokeWidth = size / 8,
  activeStrokeColor = '#35f688',
  inactiveStrokeColor = 'rgba(0,0,0,0.3)',
}) => {
  const radius = size / 2;
  const viewBox = radius + strokeWidth;

  const circleRadius = radius + strokeWidth / 2;
  const circleCircumference = 2 * Math.PI * circleRadius;

  let biggestValue: number = Math.max(progress, 100);
  biggestValue = biggestValue <= 0 ? 1 : biggestValue;
  const maxPercentage = (100 * progress) / biggestValue;
  const strokeDashoffset = circleCircumference - (circleCircumference * maxPercentage) / 100;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
        },
        withAnchorPoint(
          {
            transform: [{ rotateZ: '270deg' }],
          },
          { x: 0.5, y: 0.5 },
          { width: size, height: size }
        ),
      ]}>
      <Svg width={size} height={size} viewBox={`0 0 ${viewBox * 2} ${viewBox * 2}`}>
        <G>
          <Circle
            cx="50%"
            cy="50%"
            stroke={inactiveStrokeColor}
            strokeWidth={strokeWidth}
            r={circleRadius}
            fill="none"
          />
          <Circle
            cx="50%"
            cy="50%"
            stroke={activeStrokeColor}
            strokeWidth={strokeWidth}
            r={circleRadius}
            fill="none"
            strokeDasharray={circleCircumference}
            strokeLinecap="round"
            strokeDashoffset={strokeDashoffset}
          />
        </G>
      </Svg>
    </View>
  );
};

export default ProgressCircle;
