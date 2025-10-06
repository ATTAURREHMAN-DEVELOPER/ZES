import React from 'react';

type Props = { children: React.ReactNode };

type State = { hasError: boolean; message?: string };

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: (error as Error)?.message };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-xl font-semibold">Something went wrong.</h2>
          <p className="text-sm text-muted-foreground mt-2">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children as any;
  }
}

export default ErrorBoundary;


