import { Injectable, signal } from '@angular/core';
import { XmlStateService, XmlChange } from './xml-state.service';

export interface SearchResult {
  type: 'tag' | 'attr' | 'val' | 'text';
  path: string;
  tag: string;
  attrName: string | null;
  value: string;
  node?: Element;
  bulkSelected?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  results = signal<SearchResult[]>([]);
  cursor = signal<number>(-1);
  isOpen = signal<boolean>(false);

  constructor(private state: XmlStateService) {}

  // Maximum number of results returned to keep UI responsive
  // For documents with many matches, only first N are shown
  static readonly MAX_RESULTS = 5000;
  totalMatches = signal(0);
  truncated = signal(false);

  search(q: string, opts: { tags: boolean; attrs: boolean; vals: boolean; caseSensitive: boolean }) {
    if (!this.state.xmlDoc || !q.trim()) {
      this.results.set([]);
      this.cursor.set(-1);
      this.totalMatches.set(0);
      this.truncated.set(false);
      return;
    }
    const needle = opts.caseSensitive ? q : q.toLowerCase();
    const found: SearchResult[] = [];
    let totalCount = 0;
    let stopWalking = false;

    const walk = (node: Element) => {
      if (stopWalking) return;
      if (node.nodeType !== 1) return;
      const tag = node.tagName;
      const tagComp = opts.caseSensitive ? tag : tag.toLowerCase();
      let path: string | null = null; // lazy compute path only if needed (expensive)

      if (opts.tags && tagComp.includes(needle)) {
        totalCount++;
        if (found.length < SearchService.MAX_RESULTS) {
          path = path ?? this.state.getNodePath(node);
          found.push({ type: 'tag', path, tag, attrName: null, value: '', node });
        }
      }
      const attrs = node.attributes;
      for (let i = 0; i < attrs.length; i++) {
        const a = attrs[i];
        const attrComp = opts.caseSensitive ? a.name : a.name.toLowerCase();
        const valComp = opts.caseSensitive ? a.value : a.value.toLowerCase();
        if (opts.attrs && attrComp.includes(needle)) {
          totalCount++;
          if (found.length < SearchService.MAX_RESULTS) {
            path = path ?? this.state.getNodePath(node);
            found.push({ type: 'attr', path, tag, attrName: a.name, value: a.value, node });
          }
        } else if (opts.vals && a.value && valComp.includes(needle)) {
          totalCount++;
          if (found.length < SearchService.MAX_RESULTS) {
            path = path ?? this.state.getNodePath(node);
            found.push({ type: 'val', path, tag, attrName: a.name, value: a.value, node });
          }
        }
      }
      if (opts.vals && node.children.length === 0 && node.textContent?.trim()) {
        const tc = opts.caseSensitive ? node.textContent : node.textContent.toLowerCase();
        if (tc.includes(needle)) {
          totalCount++;
          if (found.length < SearchService.MAX_RESULTS) {
            path = path ?? this.state.getNodePath(node);
            found.push({ type: 'text', path, tag, attrName: '#text', value: node.textContent ?? '', node });
          }
        }
      }
      // Hard safety cap: if we've already counted way too many, stop walking
      if (totalCount > SearchService.MAX_RESULTS * 2) {
        stopWalking = true;
        return;
      }
      const children = node.children;
      for (let i = 0; i < children.length; i++) {
        if (stopWalking) return;
        walk(children[i]);
      }
    };

    walk(this.state.xmlDoc.documentElement);
    this.results.set(found);
    this.totalMatches.set(totalCount);
    this.truncated.set(totalCount > found.length);
    this.cursor.set(found.length > 0 ? 0 : -1);
  }

  navigate(dir: 1 | -1) {
    const len = this.results().length;
    if (!len) return;
    this.cursor.set((this.cursor() + dir + len) % len);
  }

  applyReplace(idx: number, replaceVal: string): boolean {
    const results = this.results();
    const r = results[idx];
    if (!r || r.type === 'tag') return false;
    const node = r.node ?? this.state.getNodeByPath(r.path);
    if (!node) return false;
    this.applyReplaceToResult(r, node, replaceVal);
    return true;
  }

  applyReplaceAll(replaceVal: string): number {
    let count = 0;
    this.results().forEach(r => {
      if (r.type === 'tag') return;
      const node = r.node ?? this.state.getNodeByPath(r.path);
      if (!node) return;
      this.applyReplaceToResult(r, node, replaceVal);
      count++;
    });
    return count;
  }

  applyBulkReplace(replaceVal: string): number {
    let count = 0;
    this.results().filter(r => r.bulkSelected && r.type !== 'tag').forEach(r => {
      const node = r.node ?? this.state.getNodeByPath(r.path);
      if (!node) return;
      this.applyReplaceToResult(r, node, replaceVal);
      r.bulkSelected = false;
      count++;
    });
    return count;
  }

  private applyReplaceToResult(r: SearchResult, node: Element, replaceVal: string) {
    const oldVal = r.type === 'text' ? (node.textContent ?? '') : (node.getAttribute(r.attrName!) ?? '');
    if (r.type === 'text') {
      node.textContent = replaceVal;
      this.state.recordChange({ path: r.path, attrName: '#text', oldVal, newVal: replaceVal, type: 'text-content' });
    } else {
      node.setAttribute(r.attrName!, replaceVal);
      this.state.recordChange({ path: r.path, attrName: r.attrName!, oldVal, newVal: replaceVal, type: 'edit' });
    }
    r.value = replaceVal;
  }

  selectSameValue(val: string) {
    this.results.update(rs => rs.map(r => ({ ...r, bulkSelected: r.type !== 'tag' && r.value === val })));
  }

  toggleSelectAll(checked: boolean) {
    this.results.update(rs => rs.map(r => ({ ...r, bulkSelected: r.type !== 'tag' ? checked : false })));
  }

  clearBulkSelection() {
    this.results.update(rs => rs.map(r => ({ ...r, bulkSelected: false })));
  }

  clear() {
    this.results.set([]);
    this.cursor.set(-1);
  }

  highlight(text: string, q: string, caseSensitive: boolean, isActive: boolean): string {
    if (!q) return this.escHtml(text);
    const flag = caseSensitive ? 'g' : 'gi';
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cls = isActive ? 'sr-active-hl' : 'sr-hl';
    return this.escHtml(text).replace(new RegExp(esc, flag), m => `<span class="${cls}">${m}</span>`);
  }

  escHtml(s: string): string {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}
