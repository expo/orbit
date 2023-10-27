import { createContext, useContext } from 'react';

const WindowContext = createContext<string>('');
export const useWindowId = () => useContext(WindowContext);

type WindowProviderProps = {
  children: React.ReactNode;
  id: string;
};

export function WindowProvider({ children, id }: WindowProviderProps) {
  return <WindowContext.Provider value={id}>{children}</WindowContext.Provider>;
}

export const withWindowProvider = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  id: string
) => {
  const WithWindowProvider = (props: P) => {
    return (
      <WindowProvider id={id}>
        <WrappedComponent {...props} />
      </WindowProvider>
    );
  };

  return WithWindowProvider;
};
