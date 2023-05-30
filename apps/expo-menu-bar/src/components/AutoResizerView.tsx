import {useRef} from 'react';
import {LayoutChangeEvent, View, ViewProps} from 'react-native';

import MenuBarModule from '../MenuBarModule';

const minimumViewSize = {
  width: 40,
  height: 40,
};

type AutoResizerViewProps = ViewProps & {
  enabled: boolean;
};

export const AutoResizerView = ({enabled, ...props}: AutoResizerViewProps) => {
  const isResizingRef = useRef(false);

  const onLayout: (event: LayoutChangeEvent) => void = ({nativeEvent}) => {
    const {height, width} = nativeEvent.layout;
    if (!isResizingRef.current && height > minimumViewSize.height) {
      isResizingRef.current = true;
      MenuBarModule.setPopoverSize(width, height).then(() => {
        isResizingRef.current = false;
      });
    }
  };

  return (
    <View>
      <View {...props} onLayout={enabled ? onLayout : undefined}>
        {props.children}
      </View>
    </View>
  );
};
