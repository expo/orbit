import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { storage } from './Storage';

// TODO: Remove after v1.0.0
const migratedStorageKey = 'hasMigratedFromAsyncStorage';

interface Props {
  children: React.ReactElement;
}

export function PersistGate({ children }: Props) {
  const [hasMigrated, setHasMigrated] = useState(storage.getBoolean(migratedStorageKey) || false);

  useEffect(() => {
    async function migrateFromAsyncStorage() {
      const keys = await AsyncStorage.getAllKeys();

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);

        if (value != null) {
          if (['true', 'false'].includes(value)) {
            storage.set(key, value === 'true');
          } else {
            storage.set(key, value);
          }

          AsyncStorage.removeItem(key);
        }
      }

      storage.set(migratedStorageKey, true);
      setHasMigrated(true);
    }

    if (!hasMigrated) {
      migrateFromAsyncStorage();
    }
  }, [hasMigrated]);

  if (!hasMigrated) {
    return null;
  }

  return children;
}
