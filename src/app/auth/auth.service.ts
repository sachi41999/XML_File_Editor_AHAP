import { Injectable, signal, inject } from '@angular/core';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import {
  AuthenticationResult,
  EventMessage,
  EventType,
  InteractionStatus,
  AccountInfo
} from '@azure/msal-browser';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { loginRequest } from './msal.config';
import { environment } from '../../environments/environment';

export interface UserProfile {
  name: string;
  email: string;
  initials: string;
  tenantId: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _destroying$ = new Subject<void>();

  private msalService          = inject(MsalService);
  private msalBroadcastService = inject(MsalBroadcastService);

  isAuthenticated = signal(false);
  isLoading       = signal(true);
  userProfile     = signal<UserProfile | null>(null);

  async initialize(): Promise<void> {
    // ── Auth DISABLED (local dev / testing) ──────────────────────────────────
    if (!environment.authEnabled) {
      this.isAuthenticated.set(true);
      this.userProfile.set({
        name:     'Developer (Auth Disabled)',
        email:    'dev@localhost',
        initials: 'DV',
        tenantId: 'local'
      });
      this.isLoading.set(false);
      return; // skip all MSAL logic
    }

    // ── Auth ENABLED — initialize MSAL ───────────────────────────────────────
    await this.msalService.instance.initialize();

    try {
      const result = await this.msalService.instance.handleRedirectPromise();
      if (result) {
        this.msalService.instance.setActiveAccount(result.account);
      }
    } catch (error) {
      console.error('[Auth] Redirect error:', error);
    }

    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this._destroying$)
      )
      .subscribe(() => this.updateAuthState());

    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) =>
          msg.eventType === EventType.LOGIN_SUCCESS ||
          msg.eventType === EventType.ACQUIRE_TOKEN_SUCCESS
        ),
        takeUntil(this._destroying$)
      )
      .subscribe((msg: EventMessage) => {
        const result = msg.payload as AuthenticationResult;
        if (result?.account) {
          this.msalService.instance.setActiveAccount(result.account);
          this.updateAuthState();
        }
      });

    this.updateAuthState();
    this.isLoading.set(false);
  }

  private updateAuthState(): void {
    const accounts = this.msalService.instance.getAllAccounts();
    const isAuth   = accounts.length > 0;
    this.isAuthenticated.set(isAuth);

    if (isAuth) {
      const account: AccountInfo = accounts[0];
      const name    = account.name || account.username || 'User';
      const email   = account.username || '';
      const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      this.userProfile.set({ name, email, initials, tenantId: account.tenantId });
    } else {
      this.userProfile.set(null);
    }
  }

  login(): void {
    if (!environment.authEnabled) return;
    this.msalService.instance.loginRedirect(loginRequest);
  }

  async logout(): Promise<void> {
    if (!environment.authEnabled) {
      // In dev mode — just reload the page
      window.location.reload();
      return;
    }
    const account = this.msalService.instance.getActiveAccount()
      || this.msalService.instance.getAllAccounts()[0];
    await this.msalService.instance.logoutRedirect({ account });
  }

  get authEnabled(): boolean {
    return environment.authEnabled;
  }

  destroy(): void {
    this._destroying$.next();
    this._destroying$.complete();
  }
}
