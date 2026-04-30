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
      min-width: 280px;
      max-width: 280px;
      flex-shrink: 0;
      overflow: hidden;
    }
    #xml-sidebar {
      display: flex;
      flex-direction: column;
      height: 100%;
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

  buildTree() {
    if (!this.state.xmlDoc) { this.flatNodes.set([]); return; }
    const root = this.state.xmlDoc.documentElement;
    this.state.expandedNodes.add(this.state.getNodePath(root));
    this.flatNodes.set(this.flatten(root, 0));
  }

  private flatten(node: Element, indent: number): TreeNode[] {
    if (node.nodeType !== 1) return [];
    const path = this.state.getNodePath(node);
    const children = Array.from(node.children);
    const isExpanded = this.state.expandedNodes.has(path);
    const textContent = node.textContent?.trim() ?? '';
    const textPreview = children.length === 0 && textContent
      ? textContent.slice(0, 22) + (textContent.length > 22 ? '…' : '') : '';

    // Show num_icn or acn_icn next to the tag name if present
    const icnLabel = node.getAttribute('num_icn') || node.getAttribute('acn_icn') || '';

    const result: TreeNode[] = [{
      tag: node.tagName, path, indent,
      hasChildren: children.length > 0,
      isExpanded,
      textPreview,
      childCount: children.length,
      hasChanges: this.state.hasNodeChanges(path),
      icnLabel
    }];

    if (children.length > 0 && isExpanded) {
      children.forEach(child => result.push(...this.flatten(child, indent + 1)));
    }
    return result;
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
    const addAll = (n: Element) => {
      this.state.expandedNodes.add(this.state.getNodePath(n));
      Array.from(n.children).forEach(addAll);
    };
    addAll(this.state.xmlDoc.documentElement);
    this.buildTree();
  }
}
