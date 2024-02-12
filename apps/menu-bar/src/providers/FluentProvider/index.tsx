import { ReactElement } from 'react';

export const withFluentProvider = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  return (props: P) => {
    return <WrappedComponent {...props} />;
  };
};

export const FluentProvider = ({ children }: { children: ReactElement }) => {
  return children;
};
