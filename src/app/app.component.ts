import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from './components/topbar/topbar.component';
import { TreeComponent } from './components/tree/tree.component';
import { EditorComponent } from './components/editor/editor.component';
import { RightPanelComponent } from './components/right-panel/right-panel.component';
import { SearchPanelComponent } from './components/search/search-panel.component';
import { ToastComponent } from './components/modals/toast.component';
import { DownloadModalComponent } from './components/modals/download-modal.component';
import { RestoreModalComponent } from './components/modals/restore-modal.component';
import { LoginComponent } from './components/login/login.component';
import { XmlStateService } from './services/xml-state.service';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    LoginComponent,
    TopbarComponent, TreeComponent, EditorComponent,
    RightPanelComponent, SearchPanelComponent,
    ToastComponent, DownloadModalComponent, RestoreModalComponent
  ],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: var(--bg);
    }
    .app-body {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .app-layout {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .resize-handle {
      width: 5px; cursor: col-resize; flex-shrink: 0;
      background: transparent; position: relative; z-index: 10;
      transition: background 0.15s;
    }
    .resize-handle:hover, .resize-handle.dragging { background: var(--accent); }
    .resize-handle::after {
      content: ''; position: absolute; top: 50%; left: 50%;
      transform: translate(-50%,-50%); width: 2px; height: 40px;
      border-radius: 2px; background: var(--border2);
    }
    .resize-handle:hover::after, .resize-handle.dragging::after { background: var(--accent); }
    .init-loader {
      display: flex; align-items: center; justify-content: center;
      height: 100vh; background: var(--bg); flex-direction: column; gap: 16px;
    }
    .init-spinner {
      width: 32px; height: 32px;
      border: 3px solid var(--border); border-top-color: var(--accent);
      border-radius: 50%; animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .init-text { color: var(--text2); font-size: 13px; font-family: 'IBM Plex Mono', monospace; }
  `],
  template: `
    @if (authService.isLoading()) {
      <!-- Initializing MSAL — brief loading state -->
      <div class="init-loader">
        <div class="init-spinner"></div>
        <span class="init-text">Initializing...</span>
      </div>
    } @else if (!authService.isAuthenticated()) {
      <!-- Not logged in — show login page -->
      <app-login />
    } @else {
      <!-- Authenticated — show main application -->
      <app-topbar />
      <div class="app-body">
        <app-search-panel />
        <div class="app-layout">
          <app-tree />
          <div class="resize-handle" id="resize-handle"></div>
          <app-editor />
          <app-right-panel />
        </div>
      </div>
      <app-toast />
      <app-download-modal />
      <app-restore-modal />
    }
  `
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(
    private state: XmlStateService,
    public authService: AuthService
  ) {}

  async ngOnInit() {
    // Initialize auth — handles redirect result and sets up listeners
    await this.authService.initialize();

    if (this.authService.isAuthenticated()) {
      setTimeout(() => this.checkSavedSession(), 400);
      setTimeout(() => this.initResizeHandle(), 200);
    }
  }

  ngOnDestroy() {
    this.authService.destroy();
  }

  private checkSavedSession() {
    const s = this.state.getSavedSession();
    if (s) window.dispatchEvent(new CustomEvent('xml-session-found', { detail: s }));
  }

  private initResizeHandle() {
    const handle = document.getElementById('resize-handle');
    if (!handle) return;
    let dragging = false, startX = 0, startW = 0;

    // Resize the <app-tree> host element so the entire tree column changes
    // width — resizing only #xml-sidebar (an inner div) has no effect when
    // the host has a fixed width.
    const getTreeHost = (): HTMLElement | null =>
      document.querySelector('app-tree') as HTMLElement | null;

    handle.addEventListener('mousedown', (e: MouseEvent) => {
      dragging = true; startX = e.clientX;
      const host = getTreeHost();
      startW = host ? host.offsetWidth : 280;
      handle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!dragging) return;
      const newW = Math.max(160, Math.min(700, startW + (e.clientX - startX)));
      const host = getTreeHost();
      if (host) {
        host.style.width = newW + 'px';
        host.style.flex = '0 0 ' + newW + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }
}
