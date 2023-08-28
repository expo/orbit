import React, { ErrorInfo, FunctionComponent, PropsWithChildren, createElement } from 'react';

export type FallbackProps = {
  error?: Error;
  errorInfo?: string;
};

type Props = PropsWithChildren<{
  fallback: FunctionComponent<FallbackProps>;
}>;
type State = {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo: JSON.stringify(errorInfo),
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return createElement(this.props.fallback, {
        error: this.state.error,
        errorInfo: this.state.errorInfo,
      });
    }

    return this.props.children;
  }
}
