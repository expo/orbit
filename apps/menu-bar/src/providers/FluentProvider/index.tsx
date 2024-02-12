export const withFluentProvider = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  return (props: P) => {
    return <WrappedComponent {...props} />;
  };
};
