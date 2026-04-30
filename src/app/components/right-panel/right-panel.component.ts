import { Component, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XmlStateService, XmlChange } from '../../services/xml-state.service';
import { EditorService } from '../editor/editor.service';

type Tab = 'preview' | 'changes' | 'schema';

@Component({
  selector: 'app-right-panel',
  standalone: true,
  imports: [CommonModule],
  styles: [`:host { display: flex; flex-direction: column; height: 100%; flex-shrink: 0; }`],
  template: `
    <div class="right-panel">
      <div class="panel-tabs">
        @for (tab of tabs; track tab.id) {
          <div class="panel-tab" [class.active]="activeTab() === tab.id" (click)="switchTab(tab.id)">
            {{ tab.label }}
          </div>
        }
      </div>
      <div class="panel-body">

        <!-- PREVIEW TAB -->
        @if (activeTab() === 'preview') {
          @if (!state.xmlDoc) {
            <div class="empty-state">
              <div class="icon">👁</div>
              <p>Load files to see XML preview</p>
            </div>
          } @else {
            <div class="xml-preview" [innerHTML]="previewHtml()"></div>
          }
        }

        <!-- CHANGES TAB -->
        @if (activeTab() === 'changes') {
          @if (changeCount() === 0) {
            <div class="empty-state"><div class="icon">✓</div><p>No changes yet</p></div>
          } @else {
            @for (c of state.changes; track $index; let i = $index) {
              <div class="change-item"
                   style="cursor:pointer;"
                   (click)="navigateToChange(c)"
                   title="Click to open in editor">
                <div class="change-item-header">
                  <span class="path" style="word-break:break-all;overflow-wrap:anywhere;flex:1;min-width:0;">{{ state.formatPathDisplay(c.type === 'add-element' ? c.path + ' > <' + c.tag + '>' : c.path + (c.attrName ? ' @' + c.attrName : '')) }}</span>
                  <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;margin-left:6px;">
                    <span class="badge type-badge" [class]="typeClass(c.type)">{{ typeLabel(c.type) }}</span>
                    <button class="btn btn-danger btn-sm" style="padding:2px 7px;font-size:11px;flex-shrink:0;"
                      (click)="revertChange(i); $event.stopPropagation()" title="Undo">↺</button>
                  </div>
                </div>
                @if (c.type === 'edit' || c.type === 'text-content') {
                  <div class="old-val">- {{ c.oldVal || '(empty)' }}</div>
                  <div class="new-val">+ {{ c.newVal }}</div>
                }
                @if (c.type === 'add-attr') {
                  <div class="new-val">+ {{ c.attrName }} = "{{ c.newVal }}"</div>
                }
                @if (c.type === 'add-element') {
                  <div class="new-val">+ &lt;{{ c.tag }}&gt; added to &lt;{{ c.path.split('/').pop() }}&gt;</div>
                }
              </div>
            }
          }
        }

        <!-- SCHEMA TAB -->
        @if (activeTab() === 'schema') {
          @if (!state.xsdDoc) {
            <div class="empty-state"><div class="icon">📋</div><p>Schema not loaded</p></div>
          } @else {
            <div style="font-size:11px;color:var(--text2);margin-bottom:12px;font-family:'IBM Plex Mono',monospace;">
              XSD Element Registry
            </div>
            @for (el of schemaItems(); track el.name) {
              <div class="xsd-tree-item">
                <span class="xsd-el-name">&lt;{{ el.name }}&gt;</span>
                @for (attr of el.attrs; track attr) {
                  <br/><span style="color:var(--text3)">  </span>
                  <span class="xsd-attr-name">&#64;{{ attr }}</span>
                }
              </div>
            }
          }
        }

      </div>
    </div>
  `
})
export class RightPanelComponent implements OnInit {
  activeTab = signal<Tab>('preview');
  previewHtml = signal('');
  schemaItems = signal<{ name: string; attrs: string[] }[]>([]);
  changeCount = signal(0);

  tabs = [
    { id: 'preview' as Tab, label: 'Preview' },
    { id: 'changes' as Tab, label: 'Changes' },
    { id: 'schema' as Tab, label: 'Schema' }
  ];

  constructor(public state: XmlStateService, private editorService: EditorService) {
    effect(() => {
      const _ = this.editorService.selectedPath();
      if (this.activeTab() === 'preview') this.updatePreview();
    });
    effect(() => {
      const _ = this.editorService.refreshTrigger();
      this.changeCount.set(this.state.changes.length);
      if (this.activeTab() === 'preview') this.updatePreview();
    });
  }

  ngOnInit() {
    window.addEventListener('xml-loaded', () => {
      this.updatePreview();
      this.buildSchema();
      this.changeCount.set(0);
    });
    window.addEventListener('xml-reset', () => {
      this.previewHtml.set('');
      this.schemaItems.set([]);
      this.changeCount.set(0);
    });
    window.addEventListener('xml-changes-updated', () => {
      this.changeCount.set(this.state.changes.length);
      if (this.activeTab() === 'preview') this.updatePreview();
    });
  }

  switchTab(tab: Tab) {
    this.activeTab.set(tab);
    if (tab === 'preview') this.updatePreview();
    if (tab === 'schema') this.buildSchema();
  }

  updatePreview() {
    if (!this.state.xmlDoc) { this.previewHtml.set(''); return; }
    const path = this.state.selectedPath;
    const node = path ? this.state.getNodeByPath(path) : this.state.xmlDoc.documentElement;
    if (!node) return;
    const s = new XMLSerializer();
    let raw = s.serializeToString(node);
    if (raw.length > 4000) raw = raw.slice(0, 4000) + '\n  ... (truncated)';
    this.previewHtml.set(this.syntaxHighlight(raw));
  }

  navigateToChange(c: XmlChange) {
    // c.path is always the raw XML path (e.g. ClaimList/Claim[0]/claim)
    const targetPath = c.path;

    // Expand every ancestor segment so the node is visible in the tree
    const parts = targetPath.split('/');
    let accumulated = '';
    parts.forEach(part => {
      accumulated = accumulated ? accumulated + '/' + part : part;
      this.state.expandedNodes.add(accumulated);
    });

    // Set as selected and open in editor
    this.state.selectedPath = targetPath;
    this.editorService.selectNode(targetPath);

    // Refresh tree and preview
    window.dispatchEvent(new Event('xml-tree-refresh'));
    window.dispatchEvent(new Event('xml-changes-updated'));
  }

  revertChange(index: number) {
    const c = this.state.changes[index];
    if (!c) return;

    if (c.type === 'edit') {
      const node = this.state.getNodeByPath(c.path);
      if (node) node.setAttribute(c.attrName!, c.oldVal ?? '');

    } else if (c.type === 'text-content') {
      const node = this.state.getNodeByPath(c.path);
      if (node) node.textContent = c.oldVal ?? '';

    } else if (c.type === 'add-attr') {
      const node = this.state.getNodeByPath(c.path);
      if (node && c.attrName) node.removeAttribute(c.attrName);

    } else if (c.type === 'add-element' && c.tag) {
      // c.path is the PARENT path; find parent then remove the LAST child with this tag
      const parentNode = this.state.getNodeByPath(c.path);
      if (parentNode) {
        // Get all direct children with this tag name, remove the last one added
        const matching = Array.from(parentNode.children).filter(el => el.tagName === c.tag);
        if (matching.length > 0) {
          matching[matching.length - 1].remove(); // remove last = most recently added
        }
      }
    }

    this.state.changes.splice(index, 1);
    this.changeCount.set(this.state.changes.length);
    window.dispatchEvent(new Event('xml-changes-updated'));
    window.dispatchEvent(new Event('xml-tree-refresh'));
    this.editorService.refresh();
  }

  private syntaxHighlight(xml: string): string {
    xml = xml.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return xml
      .replace(/&lt;(\/?)(\w[\w:.-]*)/g, (_m: string, slash: string, tag: string) =>
        '<span class="xml-punct">&lt;' + slash + '</span><span class="xml-el">' + tag + '</span>')
      .replace(/&gt;/g, '<span class="xml-punct">&gt;</span>')
      .replace(/(\w[\w:.-]*)=&quot;([^&]*)&quot;/g, (_m: string, a: string, v: string) =>
        '<span class="xml-attr">' + a + '</span><span class="xml-punct">=&quot;</span><span class="xml-val">' + v + '</span><span class="xml-punct">&quot;</span>');
  }

  buildSchema() {
    if (!this.state.xsdDoc) return;
    const els = this.state.xsdDoc.querySelectorAll('element[name]');
    const seen = new Set<string>();
    const items: { name: string; attrs: string[] }[] = [];
    els.forEach(el => {
      const name = el.getAttribute('name')!;
      if (seen.has(name)) return;
      seen.add(name);
      const attrs: string[] = [];
      el.querySelectorAll(':scope > complexType > attribute').forEach(a => {
        const n = a.getAttribute('name'); if (n) attrs.push(n);
      });
      if (attrs.length > 0) items.push({ name, attrs });
    });
    this.schemaItems.set(items);
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = { 'edit': 'EDIT', 'add-attr': 'NEW ATTR', 'add-element': 'NEW ELEM', 'text-content': 'TEXT' };
    return map[type] ?? type.toUpperCase();
  }

  typeClass(type: string): string {
    return (type === 'edit' || type === 'text-content') ? 'type-edit' : 'type-add';
  }
}
