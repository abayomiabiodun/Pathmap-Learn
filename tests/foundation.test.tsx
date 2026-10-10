import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Providers } from '@/components/providers';
import { Shell } from '@/components/shell';
import { Home } from '@/components/home';
import { AuthForm } from '@/components/auth-form';
import { Button } from '@/components/ui/button';
import { LearningProviders } from '@/components/learning-providers';
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
function app(children: React.ReactNode) {
  return render(
    <Providers>
      <Shell>{children}</Shell>
    </Providers>,
  );
}
describe('foundation', () => {
  it('provides isolated query and motion scaffolding for learning routes', () => {
    app(
      <LearningProviders>
        <p>Ready for learning</p>
      </LearningProviders>,
    );
    expect(screen.getByText('Ready for learning')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lite mode' }));
    expect(screen.getByText('Ready for learning')).toBeInTheDocument();
  });
  it('renders learning discovery with accessible navigation', () => {
    app(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Small steps.');
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Find my path' })).toHaveAttribute('href', '/quiz');
  });
  it('persists Lite mode and theme and switches language', async () => {
    app(<Home />);
    fireEvent.click(screen.getByRole('button', { name: 'Lite mode' }));
    expect(screen.getByRole('button', { name: 'Lite mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(JSON.parse(localStorage.getItem('pathmap-preferences')!).lite).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Use dark mode' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    fireEvent.click(screen.getByRole('button', { name: 'Use light mode' }));
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'fr' } });
    expect(screen.getByRole('link', { name: 'Trouver ma voie' })).toBeInTheDocument();
  });
  it('shows offline notice', async () => {
    app(<Home />);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    fireEvent(window, new Event('offline'));
    expect(await screen.findByRole('status')).toHaveTextContent('offline');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    fireEvent(window, new Event('online'));
  });
  it('offers Lite mode on save-data', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    });
    app(<Home />);
    fireEvent.click(screen.getByRole('button', { name: 'Turn on Lite mode' }));
    expect(
      screen.queryByText('On a slow connection? Lite mode keeps things light.'),
    ).not.toBeInTheDocument();
    Object.defineProperty(navigator, 'connection', { configurable: true, value: undefined });
  });
  it('registers the service worker', async () => {
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
    app(<Home />);
    await waitFor(() => expect(register).toHaveBeenCalledWith('/sw.js'));
  });
  it('shows auth validation, demo and provider configuration states', async () => {
    app(<AuthForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send me a magic link' }));
    expect(screen.getByRole('status')).toHaveTextContent('Enter your email first');
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'learner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'strong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Live accounts are not configured'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send me a magic link' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Email sign-in needs'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Google sign-in needs'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'New here? Create an account' }));
    expect(screen.getByRole('heading', { name: 'Start your next chapter' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Already have an account? Sign in' }));
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });
  it('supports the shadcn button variants and link composition', () => {
    render(
      <>
        <Button>Primary</Button>
        <Button variant="outline">Outline</Button>
        <Button asChild>
          <a href="/">Linked</a>
        </Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Outline' })).toHaveClass('button-outline');
    expect(screen.getByRole('link', { name: 'Linked' })).toHaveClass('button-primary');
  });
});
