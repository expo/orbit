import { Checkbox as FluentCheckbox } from '@fluentui/react-components';
import React from 'react';

import { CheckboxChangeEvent, NativeCheckboxProps } from './types';

const Checkbox = React.forwardRef(({ value, onChange }: NativeCheckboxProps, ref) => {
  return (
    <FluentCheckbox
      type="checkbox"
      checked={Boolean(value)}
      size="medium"
      onChange={(event) =>
        onChange?.({
          nativeEvent: { value: event.target.checked },
        } as CheckboxChangeEvent)
      }
    />
  );
});

export default Checkbox;
