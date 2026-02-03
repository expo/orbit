import { Checkbox as FluentCheckbox } from '@fluentui/react-checkbox';
import React from 'react';

import { CheckboxChangeEvent, NativeCheckboxProps } from './types';

const Checkbox = ({
  value,
  onChange,
  ref: _ref,
}: NativeCheckboxProps & { ref?: React.Ref<unknown> }) => {
  return (
    <FluentCheckbox
      type="checkbox"
      checked={Boolean(value)}
      size="medium"
      style={{ marginLeft: -6 }}
      onChange={(event) =>
        onChange?.({
          nativeEvent: { value: event.target.checked },
        } as CheckboxChangeEvent)
      }
    />
  );
};

export default Checkbox;
