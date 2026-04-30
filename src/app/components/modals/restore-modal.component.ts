import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XmlStateService, SavedSession } from '../../services/xml-state.service';
import { EditorService } from '../editor/editor.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-restore-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (_open) {
      <div class="modal-overlay" (click)="close()">
        <div class="modal-box" style="max-width:520px;" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="modal-title">⚡ Restore Previous Session</div>
              <div class="modal-sub">Session auto-saved {{ timeAgo }}</div>
            </div>
            <button class="modal-close" (click)="close()">×</button>
          </div>
          <div class="modal-body" style="padding:16px 20px;">
            <div style="background:var(--surface2);border:1px solid var(--border);
                        border-radius:8px;padding:14px 16px;margin-bottom:14px;font-size:13px;line-height:1.7;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="color:var(--text2);font-size:12px;padding:4px 12px 4px 0;white-space:nowrap;">File</td>
                  <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--accent);">
                    {{ session?.fileName }}
                  </td>
                </tr>
                <tr>
                  <td style="color:var(--text2);font-size:12px;padding:4px 12px 4px 0;">Saved at</td>
                  <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--text);">
                    {{ savedAtStr }}
                  </td>
                </tr>
                <tr>
                  <td style="color:var(--text2);font-size:12px;padding:4px 12px 4px 0;">Changes</td>
                  <td style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--yellow);">
                    {{ session?.changeCount ?? 0 }}
                    pending change{{ (session?.changeCount ?? 0) !== 1 ? 's' : '' }}
                  </td>
                </tr>
              </table>
            </div>
            <div style="font-size:12px;color:var(--text2);">
              Your browser saved your work automatically.
              Restore it to continue from where you left off — no data lost.
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-danger btn-sm" (click)="discard()">🗑 Discard</button>
            <button class="btn btn-ghost btn-sm" (click)="close()">Cancel</button>
            <button class="btn btn-primary btn-sm" (click)="restore()">⚡ Restore &amp; Continue</button>
          </div>
        </div>
      </div>
    }
  `
})
export class RestoreModalComponent {
  _open = false;
  session: SavedSession | null = null;
  timeAgo = '';
  savedAtStr = '';

  constructor(
    private state: XmlStateService,
    private editorService: EditorService,
    private toast: ToastService
  ) {
    window.addEventListener('xml-session-found', (e: Event) => {
      const s = (e as CustomEvent).detail as SavedSession;
      this.session = s;
      this.populateTimes(s);
      if ((s.changeCount ?? 0) > 0) this._open = true;
    });

    window.addEventListener('xml-show-restore', () => {
      const s = this.state.getSavedSession();
      if (!s) {
        this.toast.show('No saved session found in this browser', 'error');
        return;
      }
      this.session = s;
      this.populateTimes(s);
      this._open = true;
    });
  }

  private populateTimes(s: SavedSession) {
    const d = new Date(s.savedAt);
    this.savedAtStr = d.toLocaleString();
    this.timeAgo = this.getTimeAgo(d);
  }

  close() {
    this._open = false;
  }

  discard() {
    this.state.clearSavedSession();
    this._open = false;
    window.dispatchEvent(new Event('xml-session-cleared'));
    this.toast.show('Saved session discarded');
  }

  restore() {
    if (!this.session) return;
    const ok = this.state.restoreFromSession(this.session);
    if (!ok) {
      this.toast.show('Restore failed: invalid session data', 'error');
      return;
    }
    this._open = false;
    window.dispatchEvent(new Event('xml-loaded'));
    window.dispatchEvent(new Event('xml-session-cleared'));
    this.editorService.selectedPath.set(null);
    const count = this.state.changes.length;
    this.toast.show(
      'Session restored — ' + count + ' change' + (count !== 1 ? 's' : '') + ' recovered',
      'success'
    );
  }

  private getTimeAgo(date: Date): string {
    const s = Math.round((Date.now() - date.getTime()) / 1000);
    if (s < 60) return s + ' seconds ago';
    if (s < 3600) return Math.round(s / 60) + ' minutes ago';
    if (s < 86400) return Math.round(s / 3600) + ' hours ago';
    return Math.round(s / 86400) + ' days ago';
  }
}
