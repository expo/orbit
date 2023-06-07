import React from 'react';
import {Animated, ColorValue, View} from 'react-native';

import {withAnchorPoint} from '../utils/withAnchorPoint';

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
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          backgroundColor: 'blue',
        },
        withAnchorPoint(
          {
            transform: [{rotateZ: '270deg'}],
          },
          {x: 0.5, y: 0.5},
          {width: size, height: size},
        ),
      ]}></View>
  );
};

export default ProgressCircle;
