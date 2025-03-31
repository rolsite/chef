import styles from './HomeBackground.module.scss';

export function HomeBackground() {
  return (
    <div className={styles.container}>
      <div className={styles.layer1} />
      <div className={styles.layer2} />
      <div className={styles.layer3} />
    </div>
  );
}
