import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { XmlStateService } from '../../services/xml-state.service';
import { EditorService } from '../editor/editor.service';

export interface TreeNode {
  tag: string;
  path: string;
  indent: number;
  hasChildren: boolean;
  isExpanded: boolean;
  textPreview: string;
  childCount: number;
  hasChanges: boolean;
  icnLabel: string; // num_icn or acn_icn value if present
}

@Component({
  selector: 'app-tree',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 280px;
      min-width: 160px;
      flex-shrink: 0;
      overflow: hidden;
    }
    #xml-sidebar {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background: var(--surface);
      border-right: 1px solid var(--border);
      overflow: hidden;
    }
    .tree-scroll-body {
      flex: 1;
      overflow-x: auto;
      overflow-y: auto;
      min-height: 0;
      padding: 8px 0;
    }
    .tree-inner {
      min-width: max-content;
      padding-right: 12px;
    }
    /* Each row sized to its content so the widest row dictates the
       horizontal scroll width of .tree-inner */
    ::ng-deep .tree-scroll-body .tree-label {
      width: max-content;
      min-width: 100%;
    }
  `],
  template: `
    <div id="xml-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">XML Tree</span>
        <button class="btn btn-ghost btn-sm" (click)="expandAll()" title="Expand all">⊞</button>
      </div>
      <div class="tree-scroll-body">
        @if (!state.xmlDoc) {
          <div class="empty-state">
            <div class="icon">🌲</div>
            <p>Load an XML file to see the tree</p>
          </div>
        } @else {
          @if (truncated()) {
            <div style="padding:8px 12px;margin:6px 8px;background:rgba(210,153,34,0.1);border:1px solid rgba(210,153,34,0.3);border-radius:4px;font-size:11px;color:#d29922;line-height:1.4;">
              ⚠️ Tree truncated to {{ flatNodes().length }} visible rows.
              Collapse some nodes or click on individual claims to navigate.
            </div>
          }
          <div class="tree-inner">
            @for (node of flatNodes(); track node.path) {
              <div class="tree-label"
                [class.selected]="state.selectedPath === node.path"
                [class.has-changes]="node.hasChanges"
                [style.paddingLeft.px]="16 + node.indent * 14"
                (click)="selectNode(node)">
                <span class="tree-toggle" (click)="toggleNode($event, node)">
                  {{ node.hasChildren ? (node.isExpanded ? '▾' : '▸') : '' }}
                </span>
                <span class="tree-icon">{{ node.hasChildren ? '🗂' : '📄' }}</span>
                <span class="tree-name element">{{ node.tag }}</span>
                @if (node.icnLabel) {
                  <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--accent);background:rgba(88,166,255,0.1);border-radius:3px;padding:1px 5px;margin-left:4px;white-space:nowrap;">{{ node.icnLabel }}</span>
                }
                @if (node.textPreview) {
                  <span class="text-node-indicator" style="margin-left:4px;">{{ node.textPreview }}</span>
                }
                @if (node.childCount > 0) {
                  <span class="tree-count" style="margin-left:4px;">{{ node.childCount }}</span>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class TreeComponent implements OnInit {
  flatNodes = signal<TreeNode[]>([]);

  constructor(public state: XmlStateService, private editorService: EditorService) {}

  ngOnInit() {
    window.addEventListener('xml-loaded', () => this.buildTree());
    window.addEventListener('xml-reset', () => { this.flatNodes.set([]); });
    window.addEventListener('xml-tree-refresh', () => this.buildTree());
  }

  // Maximum visible rows in the tree at any time — prevents DOM freeze on huge XMLs
  static readonly MAX_VISIBLE_NODES = 3000;
  truncated = signal(false);

  buildTree() {
    if (!this.state.xmlDoc) { this.flatNodes.set([]); this.truncated.set(false); return; }
    const root = this.state.xmlDoc.documentElement;
    this.state.expandedNodes.add(this.state.getNodePath(root));
    const flat: TreeNode[] = [];
    this.flattenInto(root, 0, flat);
    if (flat.length >= TreeComponent.MAX_VISIBLE_NODES) {
      this.truncated.set(true);
    } else {
      this.truncated.set(false);
    }
    this.flatNodes.set(flat);
  }

  private flattenInto(node: Element, indent: number, out: TreeNode[]): void {
    if (node.nodeType !== 1) return;
    if (out.length >= TreeComponent.MAX_VISIBLE_NODES) return; // hard cap to prevent freeze

    const path = this.state.getNodePath(node);
    const children = node.children;
    const isExpanded = this.state.expandedNodes.has(path);

    let textPreview = '';
    if (children.length === 0) {
      const tc = (node.textContent ?? '').trim();
      if (tc) textPreview = tc.length > 22 ? tc.slice(0, 22) + '…' : tc;
    }

    const icnLabel = node.getAttribute('num_icn') || node.getAttribute('acn_icn') || '';

    out.push({
      tag: node.tagName, path, indent,
      hasChildren: children.length > 0,
      isExpanded,
      textPreview,
      childCount: children.length,
      hasChanges: this.state.hasNodeChanges(path),
      icnLabel
    });

    if (children.length > 0 && isExpanded) {
      for (let i = 0; i < children.length; i++) {
        if (out.length >= TreeComponent.MAX_VISIBLE_NODES) return;
        this.flattenInto(children[i], indent + 1, out);
      }
    }
  }

  // Old flatten kept for backwards compat (not used now)
  private flatten(node: Element, indent: number): TreeNode[] {
    const out: TreeNode[] = [];
    this.flattenInto(node, indent, out);
    return out;
  }

  toggleNode(e: Event, node: TreeNode) {
    e.stopPropagation();
    if (!node.hasChildren) return;
    if (node.isExpanded) this.state.expandedNodes.delete(node.path);
    else this.state.expandedNodes.add(node.path);
    this.buildTree();
  }

  selectNode(node: TreeNode) {
    this.state.selectedPath = node.path;
    this.editorService.selectNode(node.path);
    this.buildTree();
  }

  expandAll() {
    if (!this.state.xmlDoc) return;

    // Count total elements first to decide strategy
    let totalCount = 0;
    const countAll = (n: Element) => {
      totalCount++;
      const children = n.children;
      for (let i = 0; i < children.length; i++) countAll(children[i]);
    };
    countAll(this.state.xmlDoc.documentElement);

    // Hard limit: if document has more than 5000 elements, warn user instead of freezing
    if (totalCount > 5000) {
      const proceed = confirm(
        `This document has ${totalCount.toLocaleString()} elements.\n\n` +
        `Expanding all would freeze the browser. Only the first level (top-level Claims) will be expanded.\n\n` +
        `Click on individual nodes to expand them as needed.`
      );
      // Just expand root + immediate children
      const root = this.state.xmlDoc.documentElement;
      this.state.expandedNodes.add(this.state.getNodePath(root));
      Array.from(root.children).forEach(child => {
        this.state.expandedNodes.add(this.state.getNodePath(child));
      });
      this.buildTree();
      return;
    }

    // Safe to expand all — document is small enough
    const addAll = (n: Element) => {
      this.state.expandedNodes.add(this.state.getNodePath(n));
      const children = n.children;
      for (let i = 0; i < children.length; i++) addAll(children[i]);
    };
    addAll(this.state.xmlDoc.documentElement);
    this.buildTree();
  }
}
