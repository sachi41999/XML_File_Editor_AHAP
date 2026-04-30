import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EditorService {
  selectedPath = signal<string | null>(null);
  refreshTrigger = signal(0);

  selectNode(path: string) {
    this.selectedPath.set(path);
  }

  refresh() {
    this.refreshTrigger.update(v => v + 1);
    window.dispatchEvent(new Event('xml-tree-refresh'));
  }
}
