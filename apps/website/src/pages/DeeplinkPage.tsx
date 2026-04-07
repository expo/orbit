import { useLocation, useParams } from 'react-router-dom';

import { DeeplinkBanner } from '../components/DeeplinkBanner';
import { DownloadGrid } from '../components/DownloadGrid';
import { DEEPLINK_PATHS, type DeeplinkPath } from '../constants';
import styles from './DeeplinkPage.module.css';

export function DeeplinkPage() {
  const { action } = useParams<{ action: string }>();
  const location = useLocation();

  const isValidAction = DEEPLINK_PATHS.includes(action as DeeplinkPath);

  return (
    <div className={styles.container}>
      {isValidAction && action ? (
        <DeeplinkBanner
          deeplinkPath={action as DeeplinkPath}
          pathname={action}
          search={location.search}
        />
      ) : (
        <div className={styles.notFound}>
          <h2>Page not found</h2>
          <p>The link you followed doesn't match a known Orbit action.</p>
        </div>
      )}
      <DownloadGrid />
    </div>
  );
}
