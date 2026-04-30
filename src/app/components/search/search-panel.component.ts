import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService, SearchResult } from '../../services/search.service';
import { XmlStateService } from '../../services/xml-state.service';
import { EditorService } from '../editor/editor.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-search-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`:host { display: block; flex-shrink: 0; }`],
  template: `
    @if (searchService.isOpen()) {
      <div class="search-panel">
        <div style="padding:12px 20px 0;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="position:relative;flex:1;min-width:220px;">
              <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text3)">🔍</span>
              <input class="attr-input" style="padding-left:32px;font-size:13px;"
                [(ngModel)]="query" (ngModelChange)="runSearch()"
                (keydown)="onKeyDown($event)"
                placeholder="Search tag names, attribute names, or values..." />
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
              <label style="font-size:12px;color:var(--text2);display:flex;align-items:center;gap:4px;cursor:pointer;">
                <input type="checkbox" [(ngModel)]="searchTags" (change)="runSearch()"> Tags
              </label>
              <label style="font-size:12px;color:var(--text2);display:flex;align-items:center;gap:4px;cursor:pointer;">
                <input type="checkbox" [(ngModel)]="searchAttrs" (change)="runSearch()"> Attr names
              </label>
              <label style="font-size:12px;color:var(--text2);display:flex;align-items:center;gap:4px;cursor:pointer;">
                <input type="checkbox" [(ngModel)]="searchVals" (change)="runSearch()"> Values
              </label>
              <label style="font-size:12px;color:var(--text2);display:flex;align-items:center;gap:4px;cursor:pointer;">
                <input type="checkbox" [(ngModel)]="caseSensitive" (change)="runSearch()"> Case sensitive
              </label>
            </div>
            <button style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:18px;" (click)="close()">×</button>
          </div>

          <!-- Replace bar -->
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
            <div style="position:relative;flex:1;min-width:200px;">
              <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:12px;">↔</span>
              <input class="attr-input" style="padding-left:28px;font-size:13px;"
                [(ngModel)]="replaceVal" placeholder="Replace with..."
                (keydown.enter)="replaceCurrent()" />
            </div>
            <button class="btn btn-ghost btn-sm" [disabled]="!canReplaceCurrent()" (click)="replaceCurrent()">Replace</button>
            <button class="btn btn-primary btn-sm" [disabled]="results().length === 0" (click)="replaceAll()">Replace All</button>
            @if (replaceStatus()) {
              <span style="font-size:12px;color:var(--green);">{{ replaceStatus() }}</span>
            }
          </div>
        </div>

        <!-- Summary -->
        <div style="padding:6px 20px 8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          @if (query) {
            <span style="font-size:12px;color:var(--text2);">
              <span style="color:var(--text)">{{ results().length }}</span>
              result{{ results().length !== 1 ? 's' : '' }} &nbsp;·&nbsp;
              <label style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                <input type="checkbox" [checked]="allSelected()" (change)="toggleSelectAll($any($event.target).checked)"> Select all
              </label>
            </span>
          } @else {
            <span style="font-size:12px;color:var(--text2)">Type to search...</span>
          }
          <div style="display:flex;gap:4px;margin-left:auto;">
            <button class="btn btn-ghost btn-sm" [disabled]="results().length === 0" (click)="searchService.navigate(-1); jumpToCursor()" style="padding:2px 8px;">▲</button>
            <button class="btn btn-ghost btn-sm" [disabled]="results().length === 0" (click)="searchService.navigate(1); jumpToCursor()" style="padding:2px 8px;">▼</button>
          </div>
        </div>

        <!-- Results -->
        <div class="search-result-list">
          @for (r of results(); track $index; let i = $index) {
            <div class="sr-item" [class.active]="searchService.cursor() === i"
              [class.selected-for-bulk]="r.bulkSelected"
              (click)="onResultClick(i, $event)">
              <input type="checkbox" class="sr-bulk-check"
                [checked]="r.bulkSelected" [disabled]="r.type === 'tag'"
                (change)="toggleBulk(i, $any($event.target).checked)"
                (click)="$event.stopPropagation()" />
              <div style="flex:1;">
                <div class="sr-path">{{ state.formatPathDisplay(r.path) }}</div>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  <span class="sr-type" [class]="srTypeCls(r.type)">{{ srTypeLabel(r.type) }}</span>
                  <span [innerHTML]="getMatchLine(r, i)"></span>
                  <span style="margin-left:auto;display:flex;gap:4px;flex-shrink:0;">
                    @if (r.type !== 'tag' && sameValueCount(r.value) > 1) {
                      <button class="btn btn-ghost btn-sm"
                        style="padding:1px 7px;font-size:10px;border-color:var(--green);color:var(--green);"
                        (click)="selectSame($event, r.value)">
                        ⊕ Same ({{ sameValueCount(r.value) }})
                      </button>
                    }
                    @if (r.type !== 'tag') {
                      <button class="btn btn-ghost btn-sm" style="padding:1px 7px;font-size:11px;"
                        (click)="openInlineEdit($event, i)">✏ Edit</button>
                    }
                  </span>
                </div>
                @if (inlineEditIdx() === i) {
                  <div style="display:flex;gap:6px;margin-top:6px;align-items:center;">
                    <input type="text" class="attr-input" [(ngModel)]="inlineEditVal" style="flex:1;font-size:12px;" />
                    <button class="btn btn-primary btn-sm" (click)="applyInlineEdit($event, i)">Apply</button>
                    <button class="btn btn-ghost btn-sm" (click)="inlineEditIdx.set(-1)">Cancel</button>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Bulk bar -->
          @if (selectedCount() > 0) {
            <div class="sr-bulk-bar visible">
              <span style="font-size:12px;color:var(--green);">{{ selectedCount() }} selected</span>
              <input type="text" class="attr-input" [(ngModel)]="bulkReplaceVal"
                placeholder="Replace selected values with..." style="flex:1;min-width:180px;font-size:12px;" />
              <button class="btn btn-primary btn-sm" (click)="applyBulkReplace()">Apply to Selected</button>
              <button class="btn btn-ghost btn-sm" (click)="searchService.clearBulkSelection()">Clear selection</button>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class SearchPanelComponent {
  query = '';
  replaceVal = '';
  bulkReplaceVal = '';
  searchTags = true;
  searchAttrs = true;
  searchVals = true;
  caseSensitive = false;
  replaceStatus = signal('');
  inlineEditIdx = signal(-1);
  inlineEditVal = '';

  results = this.searchService.results;

  constructor(
    public searchService: SearchService,
    public state: XmlStateService,
    private editorService: EditorService,
    private toast: ToastService
  ) {}

  runSearch() {
    this.searchService.search(this.query, {
      tags: this.searchTags, attrs: this.searchAttrs, vals: this.searchVals, caseSensitive: this.caseSensitive
    });
  }

  close() { this.searchService.isOpen.set(false); this.searchService.clear(); }

  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.shiftKey ? this.searchService.navigate(-1) : this.searchService.navigate(1); this.jumpToCursor(); }
    if (e.key === 'Escape') this.close();
  }

  jumpToCursor() {
    const r = this.results()[this.searchService.cursor()];
    if (r) {
      this.state.selectedPath = r.path;
      this.state.expandedNodes.add(r.path);
      this.editorService.selectNode(r.path);
      window.dispatchEvent(new Event('xml-tree-refresh'));
    }
  }

  onResultClick(i: number, e: Event) {
    this.searchService.cursor.set(i);
    this.jumpToCursor();
  }

  canReplaceCurrent(): boolean {
    const i = this.searchService.cursor();
    const r = this.results()[i];
    return !!r && r.type !== 'tag';
  }

  replaceCurrent() {
    const i = this.searchService.cursor();
    if (this.searchService.applyReplace(i, this.replaceVal)) {
      this.afterReplace('Replaced 1 occurrence');
    }
  }

  replaceAll() {
    const count = this.searchService.applyReplaceAll(this.replaceVal);
    this.afterReplace('Replaced ' + count + ' occurrences');
  }

  applyBulkReplace() {
    if (!this.bulkReplaceVal && this.bulkReplaceVal !== '0') { this.toast.show('Enter a replacement value', 'error'); return; }
    const count = this.searchService.applyBulkReplace(this.bulkReplaceVal);
    this.bulkReplaceVal = '';
    this.afterReplace('Bulk replaced ' + count + ' values');
    this.toast.show('Bulk replaced ' + count + ' values', 'success');
  }

  private afterReplace(msg: string) {
    window.dispatchEvent(new Event('xml-changes-updated'));
    window.dispatchEvent(new Event('xml-tree-refresh'));
    this.editorService.refresh();
    this.replaceStatus.set('✓ ' + msg);
    setTimeout(() => this.replaceStatus.set(''), 2500);
    this.runSearch();
  }

  toggleBulk(i: number, checked: boolean) {
    this.results.update(rs => { rs[i].bulkSelected = checked; return [...rs]; });
  }

  toggleSelectAll(checked: boolean) { this.searchService.toggleSelectAll(checked); }

  allSelected(): boolean {
    const rs = this.results().filter(r => r.type !== 'tag');
    return rs.length > 0 && rs.every(r => r.bulkSelected);
  }

  selectedCount(): number { return this.results().filter(r => r.bulkSelected).length; }

  selectSame(e: Event, val: string) {
    e.stopPropagation();
    this.searchService.selectSameValue(val);
    this.toast.show('Selected ' + this.results().filter(r => r.bulkSelected).length + ' items with this value', 'success');
  }

  sameValueCount(val: string): number {
    return this.results().filter(r => r.type !== 'tag' && r.value === val).length;
  }

  openInlineEdit(e: Event, i: number) {
    e.stopPropagation();
    const r = this.results()[i];
    this.inlineEditVal = r.type === 'text' || r.type === 'val' ? r.value : (r.attrName ?? '');
    this.inlineEditIdx.set(i);
  }

  applyInlineEdit(e: Event, i: number) {
    e.stopPropagation();
    if (this.searchService.applyReplace(i, this.inlineEditVal)) {
      this.inlineEditIdx.set(-1);
      this.afterReplace('Updated');
      this.toast.show('Updated successfully', 'success');
    }
  }

  getMatchLine(r: SearchResult, i: number): string {
    const q = this.query;
    const cs = this.caseSensitive;
    const active = this.searchService.cursor() === i;
    const hl = (t: string) => this.searchService.highlight(t, q, cs, active);
    const esc = (s: string) => this.searchService.escHtml(s);
    if (r.type === 'tag') return `<span class="sr-match-tag">&lt;${hl(r.tag)}&gt;</span>`;
    if (r.type === 'attr') return `<span class="sr-match-attr">${hl(r.attrName!)}</span><span style="color:var(--text3)">=</span><span style="color:var(--text2)">"${esc(r.value)}"</span>`;
    if (r.type === 'text') return `<span style="color:var(--accent)">&lt;${esc(r.tag)}&gt;</span><span class="sr-match-val">${hl(r.value)}</span><span style="color:var(--accent)">&lt;/${esc(r.tag)}&gt;</span>`;
    return `<span class="sr-match-attr">${esc(r.attrName!)}</span><span style="color:var(--text3)">=</span><span class="sr-match-val">"${hl(r.value)}"</span>`;
  }

  srTypeLabel(type: string): string {
    return type === 'tag' ? 'TAG' : type === 'attr' ? 'ATTR' : type === 'text' ? 'TEXT' : 'VALUE';
  }

  srTypeCls(type: string): string {
    return type === 'tag' ? 'sr-type-tag' : type === 'attr' ? 'sr-type-attr' : 'sr-type-val';
  }
}
