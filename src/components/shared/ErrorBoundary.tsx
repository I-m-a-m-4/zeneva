'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logErrorToFirestore } from '@/lib/error-logger';
import { ErrorScreen } from '@/components/shared/error-screen';

interface Props {
  children?: ReactNode;
  userId?: string;
  businessId?: string;
  /**
   * Changes whenever the user moves to another route. A caught error must not
   * outlive the page that caused it, otherwise the shell stays stuck on the
   * fallback until a full reload.
   */
  resetKey?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
    logErrorToFirestore(error, 'react', {
      userId: this.props.userId,
      businessId: this.props.businessId
    }).catch(console.error);
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return <ErrorScreen onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}
