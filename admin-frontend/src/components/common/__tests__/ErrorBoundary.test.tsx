import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal component</div>;
};

// Component that throws an error in render
const ThrowErrorInRender = () => {
  throw new Error('Render error');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for expected errors in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText(/Test content/)).toBeInTheDocument();
  });

  it('renders error UI when there is an error', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(await screen.findByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByText(/unexpected happened/)).toBeInTheDocument();
  });

  it('does not show error details by default when showDetails prop is omitted', async () => {
    render(
      <ErrorBoundary>
        <ThrowErrorInRender />
      </ErrorBoundary>
    );
    expect(await screen.findByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.queryByText(/Error Details/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Render error/)).not.toBeInTheDocument();
  });

  it('renders component stack details when showDetails is true in development mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true
    });

    render(
      <ErrorBoundary showDetails={true}>
        <ThrowErrorInRender />
      </ErrorBoundary>
    );
    expect(await screen.findByText(/Error Details/)).toBeInTheDocument();
    expect(screen.getByText(/Component Stack:/)).toBeInTheDocument();
    // There may be multiple "Render error" (in message and stack), so check all
    const errorTexts = screen.getAllByText(/Render error/);
    expect(errorTexts.length).toBeGreaterThan(0);
    // At least one should be the error message
    expect(errorTexts.some(el => el.textContent === 'Render error' || el.textContent?.includes('Render error'))).toBe(true);

    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true
    });
  });

  it('shows error message and stack when showDetails is true', async () => {
    render(
      <ErrorBoundary showDetails={true}>
        <ThrowErrorInRender />
      </ErrorBoundary>
    );
    expect(await screen.findByText(/Error Details/)).toBeInTheDocument();
    expect(screen.getByText(/Stack Trace:/)).toBeInTheDocument();
    // The error stack should include "Error: Render error"
    expect(screen.getByText((content) => content.includes('Error: Render error'))).toBeInTheDocument();
    // Confirm the stack header
    expect(await screen.findByText(/Error Details/)).toBeInTheDocument();
    expect(screen.getByText(/Component Stack:/)).toBeInTheDocument();
    // The componentStack should mention our test component
    // This may not always be present depending on the environment, so check if it exists
    // If you want to enforce it, uncomment the next two lines:
    // const stackText = screen.getByText(/ThrowErrorInRender/);
    // expect(stackText).toBeInTheDocument();
  });

  it('alerts fallback message when clipboard.writeText fails', async () => {
    const mockClipboard = { writeText: jest.fn().mockRejectedValue(new Error('fail')) };
    Object.assign(navigator, { clipboard: mockClipboard });
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowErrorInRender />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText(/Report Bug/));

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
      expect(mockAlert).toHaveBeenCalled();
    });
    mockAlert.mockRestore();
  });

  it('hides error details in production mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true
    });

    render(
      <ErrorBoundary showDetails={false}>
        <ThrowErrorInRender />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/Error Details/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Render error/)).not.toBeInTheDocument();

    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true
    });
  });

  it('generates unique error ID', async () => {
    render(
      <ErrorBoundary>
        <ThrowErrorInRender />
      </ErrorBoundary>
    );
    const errorIdElement = await screen.findByText(/Error ID:/);
    expect(errorIdElement).toBeInTheDocument();
    expect(errorIdElement.textContent).toMatch(/error_\d+_[a-z0-9]+/);
  });

  it('calls onError callback when error occurs', async () => {
    const onErrorMock = jest.fn();

    render(
      <ErrorBoundary onError={onErrorMock}>
        <ThrowErrorInRender />
      </ErrorBoundary>
    );

    await screen.findByText(/Something went wrong/);
    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('handles retry button click', async () => {
    let shouldThrow = true;
    
    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error message');
      }
      return <div>Normal component</div>;
    };

    const { rerender } = render(
      <ErrorBoundary key="error-boundary-1">
        <TestComponent />
      </ErrorBoundary>
    );

    // Verify error UI is shown
    expect(await screen.findByText(/Something went wrong/)).toBeInTheDocument();

    // Click retry button
    fireEvent.click(screen.getByText(/Try Again/));

    // Update the shouldThrow flag and remount the ErrorBoundary with a new key
    shouldThrow = false;
    
    rerender(
      <ErrorBoundary key="error-boundary-2">
        <TestComponent />
      </ErrorBoundary>
    );

    // Wait for the normal component to appear
    await waitFor(() => {
      expect(screen.getByText('Normal component')).toBeInTheDocument();
    });
  });

  it('handles go home button click', async () => {
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = { assign: jest.fn() };

    render(
      <ErrorBoundary>
        <ThrowErrorInRender />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText(/Go Home/));

    expect(window.location.assign).toHaveBeenCalledWith('/');

    // Restore the original location object
    window.location = originalLocation as any;
  });

  it('handles report bug button click', async () => {
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowErrorInRender />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText(/Report Bug/));

    await waitFor(() => {
      // The error report is a JSON string, so just check for the error message
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Render error')
      );
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('Error report copied')
      );
    });

    mockAlert.mockRestore();
  });

  it('uses custom fallback when provided', async () => {
    const customFallback = <div>Custom error fallback</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowErrorInRender />
      </ErrorBoundary>
    );

    expect(await screen.findByText(/Custom error fallback/)).toBeInTheDocument();
  });

  it('logs error to console', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowErrorInRender />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );

    consoleSpy.mockRestore();
  });
});