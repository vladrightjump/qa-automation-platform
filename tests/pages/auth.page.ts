import type { Locator, Page } from '@playwright/test';

/**
 * Page Object for the /login page. The same form handles sign-in and
 * registration — `signIn` and `register` are kept as separate methods
 * because the affordances they exercise (and the post-action redirect)
 * differ.
 */
export class AuthPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  emailInput(): Locator {
    return this.page.getByLabel('Email');
  }

  passwordInput(): Locator {
    return this.page.getByLabel('Password');
  }

  submitButton(): Locator {
    return this.page.getByRole('button', { name: /sign in|register/i });
  }

  errorToast(): Locator {
    return this.page.getByTestId('auth-error');
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.page.getByRole('button', { name: /sign in/i }).click();
  }

  async register(email: string, password: string): Promise<void> {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.page.getByRole('button', { name: /register|create/i }).click();
  }
}
