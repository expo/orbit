import { useCallback, useEffect, useState } from 'react';

import { DEEPLINK_META, type DeeplinkPath } from '../constants';
import { buildDeeplinkURL, openViaScheme, tryLocalServer } from '../utils/openOrbit';
import styles from './DeeplinkBanner.module.css';

type Status = 'waiting' | 'success' | 'error';

type Props = {
  deeplinkPath: DeeplinkPath;
  pathname: string;
  search: string;
};

export function DeeplinkBanner({ deeplinkPath, pathname, search }: Props) {
  const [status, setStatus] = useState<Status>('waiting');
  const [statusText, setStatusText] = useState('Attempting to open Expo Orbit...');
  const [copied, setCopied] = useState(false);

  const meta = DEEPLINK_META[deeplinkPath];

  const attemptOpen = useCallback(async () => {
    setStatus('waiting');
    setStatusText('Attempting to open Expo Orbit...');

    try {
      const serverAvailable = await tryLocalServer(pathname, search);
      if (serverAvailable) {
        setStatus('success');
        setStatusText('Expo Orbit is opening your request.');
        return;
      }
    } catch {
      // Server not reachable
    }

    // Fall back to custom URL scheme
    openViaScheme(pathname, search);
    setStatus('waiting');
    setStatusText('Launched via URL scheme. If Orbit did not open, it may not be installed.');

    setTimeout(() => {
      setStatus((current) => {
        if (current === 'waiting') {
          setStatusText(
            'Could not confirm Orbit is running. Make sure it is installed and running.'
          );
          return 'error';
        }
        return current;
      });
    }, 4000);
  }, [pathname, search]);

  useEffect(() => {
    attemptOpen();
  }, [attemptOpen]);

  const handleCopy = useCallback(async () => {
    const url = buildDeeplinkURL(pathname, search);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [pathname, search]);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{meta.title}</h2>
      <p className={styles.description}>{meta.description}</p>

      <div className={`${styles.statusBox} ${styles[status]}`}>
        {status === 'waiting' && <span className={styles.spinner} />}
        <span>{statusText}</span>
      </div>

      <div className={styles.actions}>
        <button className={styles.button} onClick={attemptOpen}>
          Try again
        </button>
        <button className={styles.button} onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
