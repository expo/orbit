import { GITHUB_RELEASES_URL } from '../constants';
import styles from './DownloadGrid.module.css';

const PLATFORMS = [
  { icon: '\uF8FF', platform: 'macOS', meta: 'Universal (Apple Silicon + Intel)' },
  { icon: '\u229E', platform: 'Windows', meta: 'x64' },
  { icon: '\u2699', platform: 'Linux', meta: 'x64 (.deb / .rpm)' },
];

export function DownloadGrid() {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Download Expo Orbit</h2>
      <p className={styles.subtitle}>Available for macOS, Windows, and Linux</p>
      <div className={styles.grid}>
        {PLATFORMS.map((p) => (
          <a
            key={p.platform}
            className={styles.card}
            href={GITHUB_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer">
            <div className={styles.icon}>{p.icon}</div>
            <div className={styles.platform}>{p.platform}</div>
            <div className={styles.meta}>{p.meta}</div>
          </a>
        ))}
      </div>
    </section>
  );
}
