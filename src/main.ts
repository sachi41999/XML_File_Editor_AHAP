import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  MsalService,
  MsalGuard,
  MsalBroadcastService,
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MSAL_INTERCEPTOR_CONFIG,
  MsalInterceptor
} from '@azure/msal-angular';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import { AppComponent } from './app/app.component';
import {
  MSALInstanceFactory,
  MSALGuardConfigFactory,
  MSALInterceptorConfigFactory
} from './app/auth/msal.config';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),

    // ── MSAL Providers ──────────────────────────────────────────────────────
    { provide: MSAL_INSTANCE,           useFactory: MSALInstanceFactory },
    { provide: MSAL_GUARD_CONFIG,       useFactory: MSALGuardConfigFactory },
    { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: MSALInterceptorConfigFactory },

    // MSAL Services — must be listed explicitly for standalone bootstrapping
    MsalService,
    MsalGuard,
    MsalBroadcastService,

    // Attach MSAL interceptor to add auth tokens to HTTP calls
    { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true }
  ]
}).catch(err => console.error(err));
