import React from 'react';

import { CheckboxChangeEvent, NativeCheckboxProps } from './types';

const Checkbox = React.forwardRef(({ value, onChange }: NativeCheckboxProps, ref) => {
  return (
    <input
      type="checkbox"
      checked={Boolean(value)}
      onChange={(event) =>
        onChange?.({
          nativeEvent: { value: event.target.checked },
        } as CheckboxChangeEvent)
      }
    />
  );
});

export default Checkbox;
