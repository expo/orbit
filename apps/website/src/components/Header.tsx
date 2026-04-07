import { Link } from 'react-router-dom';

import { OrbitLogo } from './OrbitLogo';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <OrbitLogo size={36} />
          <span className={styles.wordmark}>Expo Orbit</span>
        </Link>
      </div>
    </header>
  );
}
