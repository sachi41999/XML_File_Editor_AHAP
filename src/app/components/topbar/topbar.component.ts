import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XmlStateService } from '../../services/xml-state.service';
import { ToastService } from '../../services/toast.service';
import { SearchService } from '../../services/search.service';
import { ValidationService } from '../../services/validation.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  styles: [`:host { display: block; flex-shrink: 0; }`],
  template: `
    <div class="topbar">
      <div class="topbar-left">
        <div class="logo">XML<span>&nbsp;</span>Editor</div>
        <div class="file-badge" [class.active]="!!state.xmlFileName">
          {{ state.xmlFileName || 'No XML loaded' }}
        </div>
      </div>
      <div class="topbar-right">
        @if (saveStatus()) {
          <span class="autosave-status visible">
            <span [class]="'autosave-dot ' + saveState()"></span>
            <span>{{ saveStatus() }}</span>
          </span>
        }
        @if (state.changes.length > 0) {
          <span class="change-count">{{ state.changes.length }} change{{ state.changes.length !== 1 ? 's' : '' }}</span>
        }
        @if (hasSession()) {
          <button class="btn btn-restore btn-sm" (click)="showRestore()">⚡ Restore Session</button>
        }
        <button class="btn btn-ghost btn-sm" [class.active]="searchService.isOpen()" (click)="toggleSearch()">
          🔍 Search
        </button>
        <button class="btn btn-ghost btn-sm" (click)="reset()">↺ Reset</button>
        <!-- User Profile -->
        @if (authService.userProfile()) {
          <div class="user-pill" [title]="authService.userProfile()!.name + '\n' + authService.userProfile()!.email">
            <span class="user-avatar">{{ authService.userProfile()!.initials }}</span>
            <span class="user-name">{{ authService.userProfile()!.name.split(' ')[0] }}</span>
          </div>
          @if (authService.authEnabled) {
            <button class="btn btn-ghost btn-sm" (click)="authService.logout()" title="Sign out">⎋ Sign out</button>
          }
        }
        <button class="btn btn-success btn-sm" [disabled]="!state.xmlDoc"
          [title]="state.xmlDoc && state.changes.length === 0 ? 'No modifications to download' : 'Download updated XML'"
          (click)="download()">
          ⬇ Download XML
        </button>
      </div>
    </div>
  `
})
export class TopbarComponent implements OnInit {
  saveStatus = signal('');
  saveState = signal('saved');
  hasSession = signal(false);

  constructor(
    public state: XmlStateService,
    public searchService: SearchService,
    private toast: ToastService,
    private validationSvc: ValidationService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    window.addEventListener('xml-session-found', () => this.hasSession.set(true));
    window.addEventListener('xml-session-cleared', () => this.hasSession.set(false));
    window.addEventListener('xml-autosave', (e: Event) => {
      const ce = e as CustomEvent;
      this.saveStatus.set(ce.detail.text);
      this.saveState.set(ce.detail.state);
    });
  }

  toggleSearch() {
    this.searchService.isOpen.update(v => !v);
    if (!this.searchService.isOpen()) this.searchService.clear();
  }

  showRestore() {
    window.dispatchEvent(new CustomEvent('xml-show-restore'));
  }

  reset() {
    if (this.state.changes.length > 0 && !confirm('Reset will lose all changes. Continue?')) return;
    this.state.reset();
    window.dispatchEvent(new Event('xml-reset'));
    this.saveStatus.set('');
    this.hasSession.set(false);
    this.toast.show('Reset complete');
  }

  // Scan entire XML document for validation errors
  private collectAllValidationErrors(): { field: string; path: string; message: string }[] {
    if (!this.state.xmlDoc) return [];
    const errors: { field: string; path: string; message: string }[] = [];

    // ONLY validate fields the user has actually changed — not the entire document
    for (const change of this.state.changes) {
      if (change.type === 'add-element') continue; // no value to validate

      const node = this.state.getNodeByPath(change.path);
      if (!node) continue;

      if (change.type === 'text-content') {
        // Validate the text content of the changed node
        const currentVal = node.textContent ?? '';
        const r = this.validationSvc.validate(node.tagName, currentVal);
        if (r && !r.valid) {
          errors.push({ field: node.tagName, path: change.path, message: r.message });
        }

      } else if (change.type === 'edit' || change.type === 'add-attr') {
        // Validate the changed attribute value
        const attrName = change.attrName!;
        const currentVal = node.getAttribute(attrName) ?? change.newVal;

        // Build sibling context for cross-field rules
        const siblingValues: Record<string, string> = {};
        Array.from(node.attributes).forEach(a => { siblingValues[a.name.toLowerCase()] = a.value; });

        const r = this.validationSvc.validate(attrName, currentVal, { siblingValues });
        if (r && !r.valid) {
          errors.push({ field: attrName, path: change.path + ' @' + attrName, message: r.message });
        }
      }
    }

    return errors;
  }

  async download() {
    if (!this.state.xmlDoc) return;

    // Block download if no changes have been made
    if (this.state.changes.length === 0) {
      this.toast.show('📋 No modifications found. Please make changes before downloading.', '', 4000);
      return;
    }

    // Block download if any validation errors exist in the document
    const validationErrors = this.collectAllValidationErrors();
    if (validationErrors.length > 0) {
      const fieldList = validationErrors.slice(0, 4).map(e => `• ${e.field}: ${e.message}`).join('\n');
      const extra = validationErrors.length > 4 ? `\n• ...and ${validationErrors.length - 4} more error(s)` : '';
      this.toast.show(
        `🚫 Cannot download — ${validationErrors.length} validation error(s) found:\n${fieldList}${extra}`,
        'error', 7000
      );
      // Also dispatch event so editor can highlight these fields
      window.dispatchEvent(new CustomEvent('xml-validation-errors-on-download', { detail: validationErrors }));
      return;
    }

    const content = this.state.serializeXML();
    const ts = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const baseName = (this.state.xmlFileName || 'claim').replace(/\.xml$/i, '');
    const fileName = baseName + '_' + ts + '.xml';

    // Strategy 1: File System Access API (Edge/Chrome native Save As)
    if ((window as any).showSaveFilePicker) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: 'XML File', accept: { 'application/xml': ['.xml'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        this.state.clearSavedSession();
        this.saveStatus.set('');
        this.toast.show('✅ Saved: ' + fileName, 'success');
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') return;
      }
    }

    // Strategy 2: Base64 data URI anchor download
    try {
      const b64 = btoa(unescape(encodeURIComponent(content)));
      const uri = 'data:application/xml;charset=utf-8;base64,' + b64;
      const a = document.createElement('a');
      a.href = uri;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      this.state.clearSavedSession();
      this.saveStatus.set('');
      this.toast.show('✅ Downloaded: ' + fileName, 'success');
      return;
    } catch (_e) { /* fall through */ }

    // Strategy 3: Show copy modal as last resort
    window.dispatchEvent(new CustomEvent('xml-show-download-modal', { detail: { content, fileName } }));
  }
}
