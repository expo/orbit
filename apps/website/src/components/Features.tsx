import styles from './Features.module.css';

const FEATURES = [
  {
    title: 'One-click build installs',
    description:
      'Launch EAS builds directly on simulators and emulators without manual downloading.',
  },
  {
    title: 'Simulator management',
    description: 'Boot, list, and manage iOS Simulators and Android Emulators from your menu bar.',
  },
  {
    title: 'Snack previews',
    description: 'Preview Snack projects locally on simulators with a single click.',
  },
  {
    title: 'EAS Update previews',
    description: 'Launch EAS Updates directly on your local devices for quick testing.',
  },
];

export function Features() {
  return (
    <section className={styles.section}>
      <div className={styles.grid}>
        {FEATURES.map((feature) => (
          <div key={feature.title} className={styles.card}>
            <h3 className={styles.title}>{feature.title}</h3>
            <p className={styles.description}>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
