import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-download-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (_open) {
      <div class="modal-overlay" (click)="close()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="modal-title">📋 Copy XML Content</div>
              <div class="modal-sub">
                Browser blocked the download. Copy the content below and save as
                <strong>{{ fileName }}</strong>
              </div>
            </div>
            <button class="modal-close" (click)="close()">×</button>
          </div>
          <div class="modal-body">
            <textarea class="modal-textarea" [value]="content" readonly></textarea>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost btn-sm" (click)="close()">Close</button>
            <button class="btn btn-primary btn-sm" (click)="copy()">
              📋 Copy All to Clipboard
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class DownloadModalComponent {
  _open = false;
  content = '';
  fileName = '';

  constructor(private toast: ToastService) {
    window.addEventListener('xml-show-download-modal', (e: Event) => {
      const ce = e as CustomEvent;
      this.content = ce.detail.content;
      this.fileName = ce.detail.fileName;
      this._open = true;
    });
  }

  close() {
    this._open = false;
  }

  copy() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(this.content).then(() => {
        this.toast.show('Copied to clipboard!', 'success');
      }).catch(() => {
        this.toast.show('Copy failed — please select all and copy manually', 'error');
      });
    } else {
      const ta = document.querySelector('.modal-textarea') as HTMLTextAreaElement;
      if (ta) { ta.select(); document.execCommand('copy'); }
      this.toast.show('Copied!', 'success');
    }
  }
}
