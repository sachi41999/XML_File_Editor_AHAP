import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @for (t of toastService.toasts(); track t.id; let i = $index) {
      <div class="toast show"
        [class.success]="t.type === 'success'"
        [class.error]="t.type === 'error'"
        [class.info]="t.type === ''"
        [style.bottom.px]="24 + (i * 56)"
        style="white-space: pre-line;">
        {{ t.message }}
      </div>
    }
  `
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
