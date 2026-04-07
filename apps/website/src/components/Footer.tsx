import { DOCS_URL, GITHUB_URL } from '../constants';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <a href="https://expo.dev" target="_blank" rel="noopener noreferrer">
          &copy; Expo
        </a>
        <div className={styles.links}>
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
            Docs
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href={`${GITHUB_URL}/releases`} target="_blank" rel="noopener noreferrer">
            Releases
          </a>
        </div>
      </div>
    </footer>
  );
}
