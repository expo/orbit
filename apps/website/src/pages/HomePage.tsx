import styles from './HomePage.module.css';

export function HomePage() {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Launch builds faster</h1>
        <p className={styles.subtitle}>
          Expo Orbit accelerates your development workflow with one-click build launches and
          simulator management for macOS, Windows, and Linux.
        </p>
      </section>
      {/* <DownloadGrid />
      <Features /> */}
    </div>
  );
}
