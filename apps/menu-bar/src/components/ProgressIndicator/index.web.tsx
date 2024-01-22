const ProgressIndicator = ({ progress }: { progress: number }) => {
  return <progress value={progress} max="100" />;
};

export default ProgressIndicator;
