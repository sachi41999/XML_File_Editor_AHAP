import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <div class="logo-mark">⚕</div>
          <div class="logo-text">XML<span> </span>Editor</div>
          <div class="logo-subtitle">MA Claim File Editor</div>
        </div>

        <div class="login-divider"></div>

        <div class="login-body">
          <h2 class="login-title">Sign in to continue</h2>
          <p class="login-desc">
            Use your Accenture Microsoft account to access the XML Claim Editor.
            You will be redirected to the Microsoft login page.
          </p>

          <button class="login-btn" (click)="login()" [disabled]="loading">
            @if (loading) {
              <span class="login-spinner"></span>
              <span>Redirecting...</span>
            } @else {
              <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
              <span>Sign in with Microsoft</span>
            }
          </button>
        </div>

        <div class="login-footer">
          <span>🔒 Secured with Azure Active Directory</span>
          <span>Accenture Internal Use Only</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      background: #0d1117;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: 'IBM Plex Sans', sans-serif;
    }
    .login-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 16px;
      width: 100%;
      max-width: 420px;
      padding: 40px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    }
    .login-logo {
      text-align: center;
      margin-bottom: 28px;
    }
    .logo-mark {
      font-size: 40px;
      margin-bottom: 10px;
      filter: drop-shadow(0 0 12px rgba(88,166,255,0.4));
    }
    .logo-text {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 22px;
      font-weight: 700;
      color: #58a6ff;
      letter-spacing: -0.5px;
      span { color: #6e7681; }
    }
    .logo-subtitle {
      font-size: 12px;
      color: #6e7681;
      margin-top: 4px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .login-divider {
      height: 1px;
      background: #30363d;
      margin: 0 -40px 28px;
    }
    .login-body { text-align: center; }
    .login-title {
      font-size: 18px;
      font-weight: 600;
      color: #e6edf3;
      margin: 0 0 12px;
    }
    .login-desc {
      font-size: 13px;
      color: #8b949e;
      line-height: 1.6;
      margin: 0 0 28px;
    }
    .login-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 28px;
      background: #fff;
      color: #000;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      font-family: 'IBM Plex Sans', sans-serif;
      cursor: pointer;
      transition: all 0.15s;
      width: 100%;
      justify-content: center;
      &:hover { background: #f0f0f0; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(255,255,255,0.15); }
      &:active { transform: translateY(0); }
      &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    }
    .login-spinner {
      width: 16px; height: 16px;
      border: 2px solid #ccc;
      border-top-color: #333;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .login-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #21262d;
      font-size: 11px;
      color: #484f58;
    }
  `]
})
export class LoginComponent implements OnInit {
  loading = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    // If already authenticated, nothing to do (app.component handles routing)
  }

  login() {
    this.loading = true;
    this.authService.login();
  }
}
