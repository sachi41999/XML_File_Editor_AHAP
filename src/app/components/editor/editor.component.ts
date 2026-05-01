import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { XmlStateService } from '../../services/xml-state.service';
import { EditorService } from './editor.service';
import { ToastService } from '../../services/toast.service';
import { ValidationService } from '../../services/validation.service';

interface AttrRow {
  name: string;
  value: string;
  origValue: string;
  source: 'in-xml' | 'in-xsd';
  isChanged: boolean;
}

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-width: 0; height: 100%; overflow: hidden; }`],
  template: `
    <div class="main-editor">
      @if (!state.xmlDoc) {
        <div class="upload-zone"
             (dragover)="$event.preventDefault()"
             (drop)="onDrop($event)">
          <div class="upload-card" (click)="triggerUpload()" style="cursor:pointer;">
            <div class="upload-icon">📄</div>
            <div class="upload-title">Upload XML File</div>
            <div class="upload-sub">Drop your XML file here or click to browse</div>
            <div class="upload-types"><span class="upload-type-badge">.xml</span></div>
          </div>
          <input type="file" #fileInput accept=".xml" style="display:none" (change)="onFileChange($event)" />
        </div>
      } @else {
        <div class="editor-header">
          <div class="editor-breadcrumb">
            @if (selectedPath()) {
              @for (part of breadcrumbParts(); track $index) {
                <span class="bc-part" [class.root]="$index === 0">{{ part }}</span>
                @if ($index < breadcrumbParts().length - 1) {
                  <span class="bc-sep"> / </span>
                }
              }
            } @else {
              <span style="color:var(--text3)">Select a node from the tree to edit</span>
            }
          </div>
        </div>
        <div class="editor-area">
          @if (!selectedPath()) {
            <div class="empty-state"><div class="icon">👈</div><p>Select a node from the tree to edit</p></div>
          } @else {
            <!-- Node Header -->
            <div class="node-header">
              <span class="node-tag">&lt;{{ currentTag() }}&gt;</span>
              <span class="node-meta">{{ childCount() }} child elements · {{ attrCount() }} attributes</span>
            </div>

            <!-- Text Content -->
            @if (textContent() !== null) {
              <div class="attr-section">
                <div class="attr-section-title">Text Content</div>
                <div class="text-content-box">
                  <div class="text-content-label">
                    <span>&lt;{{ currentTag() }}&gt; text value</span>
                    <span class="text-content-badge" [class.changed]="isTextChanged()">
                      {{ isTextChanged() ? '● Modified' : 'Current value' }}
                    </span>
                  </div>
                  <textarea class="text-content-input" [class.changed]="isTextChanged()"
                    [class.invalid-input]="validationErrors()['#text']"
                    [(ngModel)]="textInputVal"
                    (ngModelChange)="onTextChange($event)"
                    [rows]="(textInputVal || '').length > 60 ? 3 : 1">
                  </textarea>
                  @if (validationErrors()['#text']) {
                    <div class="validation-error-msg" style="margin-top:6px;">
                      ⚠ {{ validationErrors()['#text'] }}
                    </div>
                  }
                  @if (!validationErrors()['#text'] && validationSvc.hasRule(currentTag())) {
                    <div class="validation-hint-msg" style="margin-top:4px;">
                      {{ validationSvc.getDescription(currentTag()) }}
                    </div>
                  }
                  @if (isTextChanged()) {
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                      <span style="font-size:11px;color:var(--text3);">
                        Original: <code style="color:var(--text2);font-family:'IBM Plex Mono',monospace;">{{ originalText() }}</code>
                      </span>
                      <button class="btn btn-danger btn-sm" (click)="revertText()">↺ Revert</button>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Attributes -->
            <div class="attr-section">
              <div class="attr-section-title">Attributes</div>
              <table class="attr-table">
                <thead>
                  <tr>
                    <th style="width:36px"></th>
                    <th>Attribute Name</th>
                    <th>Value</th>
                    <th style="width:70px">Source</th>
                    <th style="width:40px"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (attr of attrRows(); track attr.name) {
                    <tr [class.changed]="attr.isChanged" [class.restricted]="isRestrictedAttr(attr.name)">
                      <td>
                        @if (attr.isChanged) {
                          <div class="changed-dot" style="margin:auto"></div>
                        }
                        @if (isRestrictedAttr(attr.name)) {
                          <span title="This field is restricted and cannot be modified" style="display:flex;justify-content:center;font-size:13px;cursor:not-allowed;">🔒</span>
                        }
                      </td>
                      <td>
                        <div class="attr-name-cell">
                          <code style="font-family:inherit">{{ attr.name }}</code>
                        </div>
                      </td>
                      <td>
                        <div style="position:relative;">
                          <input type="text" class="attr-input"
                            [class.changed]="attr.isChanged"
                            [class.restricted-input]="isRestrictedAttr(attr.name)"
                            [class.invalid-input]="validationErrors()[attr.name]"
                            [value]="attr.value"
                            [attr.data-attr]="attr.name"
                            [title]="isRestrictedAttr(attr.name) ? attr.name + ' is restricted and cannot be modified' :
                                     (validationSvc.getDescription(attr.name) || '')"
                            (input)="onAttrChange(attr, $any($event.target).value)" />
                          @if (isRestrictedAttr(attr.name)) {
                            <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;color:var(--red);font-family:'IBM Plex Sans',sans-serif;pointer-events:none;">LOCKED</span>
                          }
                        </div>
                        @if (validationErrors()[attr.name]) {
                          <div class="validation-error-msg">
                            ⚠ {{ validationErrors()[attr.name] }}
                          </div>
                        }
                        @if (!validationErrors()[attr.name] && validationSvc.hasRule(attr.name) && !isRestrictedAttr(attr.name)) {
                          <div class="validation-hint-msg">
                            {{ validationSvc.getDescription(attr.name) }}
                          </div>
                        }
                      </td>
                      <td>
                        <span class="attr-source" [class]="'attr-source ' + attr.source">
                          {{ attr.source === 'in-xml' ? 'XML' : 'XSD' }}
                        </span>
                      </td>
                      <td>
                        @if (attr.isChanged) {
                          <button class="btn btn-danger btn-sm" title="Revert" (click)="revertAttr(attr)">↺</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Add Custom Attribute -->
            <div class="attr-section">
              <div class="attr-section-title">Add Custom Attribute</div>
              <div class="custom-attr-row">
                <input type="text" class="attr-input" [(ngModel)]="newAttrKey" placeholder="attribute_name" style="flex:1" />
                <input type="text" class="attr-input" [(ngModel)]="newAttrVal" placeholder="value" style="flex:2" />
                <button class="btn btn-ghost btn-sm" (click)="addAttr()">+ Add</button>
              </div>
            </div>

            <!-- Add Child Element -->
            <div class="attr-section">
              <div class="attr-section-title">Add Child Element</div>
              <div class="add-child-panel">
                @if (xsdChildren().length > 0) {
                  <div class="xsd-chip-label">Suggested from XSD schema:</div>
                  <div class="xsd-suggest">
                    @for (child of xsdChildren(); track child) {
                      <span class="xsd-chip" (click)="addChildElement(child)">{{ child }}</span>
                    }
                  </div>
                  <div style="height:12px"></div>
                }
                <div class="add-child-row">
                  <div class="add-child-input-wrap">
                    <div class="add-child-label">Element tag name</div>
                    <input type="text" class="add-child-input" [(ngModel)]="newChildTag" placeholder="tagName" />
                  </div>
                  <button class="btn btn-primary btn-sm" style="align-self:flex-end" (click)="addChild()">+ Add Element</button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class EditorComponent {
  selectedPath = computed(() => this.editorService.selectedPath());
  textInputVal = '';
  newAttrKey = '';
  newAttrVal = '';
  newChildTag = '';
  // Track per-field validation errors: key = attrName, value = error message
  validationErrors = signal<Record<string, string>>({});
  private lastToastField: string | null = null; // debounce repeated error toasts

  breadcrumbParts = computed(() => {
    const p = this.selectedPath();
    if (!p) return [];
    const formatted = this.state.formatPathDisplay(p);
    return formatted.split('/');
  });

  currentTag = computed(() => {
    const node = this.currentNode();
    return node?.tagName ?? '';
  });

  childCount = computed(() => this.currentNode()?.children.length ?? 0);
  attrCount = computed(() => this.currentNode()?.attributes.length ?? 0);

  textContent = computed(() => {
    const _ = this.editorService.refreshTrigger();
    const node = this.currentNode();
    return node ? this.state.getNodeTextContent(node) : null;
  });

  originalText = computed(() => {
    const path = this.selectedPath();
    const _r = this.editorService.refreshTrigger(); // track so it updates after revert
    if (!path) return '';
    const ch = this.state.changes.find(c => c.path === path && c.type === 'text-content');
    // If a change exists, oldVal is the true original
    // If no change (reverted or first load), read directly from the DOM node
    return ch ? (ch.oldVal ?? '') : (this.currentNode()?.textContent ?? '');
  });

  isTextChanged = computed(() => {
    const _r = this.editorService.refreshTrigger();
    const path = this.selectedPath();
    return !!this.state.changes.find(c => c.path === path && c.type === 'text-content');
  });

  attrRows = computed((): AttrRow[] => {
    const _ = this.editorService.refreshTrigger();
    const node = this.currentNode();
    if (!node) return [];
    const path = this.selectedPath()!;
    const xmlAttrs = Array.from(node.attributes).map(a => ({ name: a.name, value: a.value }));
    const xsdAttrs = this.state.getXSDAttributesForElement(node.tagName);
    const attrMap = new Map<string, AttrRow>();
    xmlAttrs.forEach(a => {
      const ch = this.state.changes.find(c => c.path === path && c.attrName === a.name && c.type === 'edit');
      // origValue must be the TRUE original value before any edits:
      // If a change exists, its oldVal is the real original (DOM is already mutated).
      // If no change exists yet, a.value IS the original.
      const trueOriginal = ch ? (ch.oldVal ?? a.value) : a.value;
      attrMap.set(a.name, {
        name: a.name,
        origValue: trueOriginal,
        value: ch ? ch.newVal : a.value,
        source: 'in-xml',
        isChanged: !!ch
      });
    });
    xsdAttrs.forEach(name => {
      if (!attrMap.has(name)) {
        attrMap.set(name, { name, value: '', origValue: '', source: 'in-xsd', isChanged: false });
      }
    });
    return Array.from(attrMap.values());
  });

  xsdChildren = computed(() => {
    const _ = this.editorService.refreshTrigger();
    const node = this.currentNode();
    return node ? this.state.getXSDChildrenForElement(node.tagName) : [];
  });

  constructor(
    public state: XmlStateService,
    public editorService: EditorService,
    private toast: ToastService,
    public validationSvc: ValidationService
  ) {
    effect(() => {
      // Read BOTH signals so effect re-runs on path change AND on refresh (e.g. revert from Changes panel)
      const path = this.selectedPath();
      const _refresh = this.editorService.refreshTrigger(); // track refresh signal
      if (path) {
        const node = this.state.getNodeByPath(path);
        if (node) {
          // Always sync textInputVal from the source of truth:
          // - If a text-content change exists → show its newVal (current edited value)
          // - If reverted (change removed) → show the node's actual textContent (original)
          const ch = this.state.changes.find(c => c.path === path && c.type === 'text-content');
          this.textInputVal = ch ? ch.newVal : (this.state.getNodeTextContent(node) ?? '');
        }
      }
      // Clear validation errors when switching nodes
      this.validationErrors.set({});
    });
    window.addEventListener('xml-loaded', () => this.editorService.selectedPath.set(null));
    window.addEventListener('xml-reset', () => this.editorService.selectedPath.set(null));
  }

  private currentNode(): Element | null {
    const path = this.selectedPath();
    return path ? this.state.getNodeByPath(path) : null;
  }

  triggerUpload() {
    const el = document.querySelector('input[type=file]') as HTMLInputElement;
    el?.click();
  }

  onFileChange(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) this.loadXML(f);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files[0];
    if (f && f.name.endsWith('.xml')) this.loadXML(f);
  }

  loadXML(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(ev.target!.result as string, 'application/xml');
      if (doc.querySelector('parsererror')) {
        this.toast.show('XML parse error', 'error'); return;
      }
      this.state.xmlDoc = doc;
      this.state.xmlFileName = file.name;
      this.state.changes = [];
      this.state.selectedPath = null;
      this.state.expandedNodes.clear();
      window.dispatchEvent(new Event('xml-loaded'));
      this.toast.show('XML loaded: ' + file.name, 'success');
    };
    reader.readAsText(file);
  }

  // Restricted attributes are configured in public/validation-rules.json under
  // the top-level "restrictedFields" array. To add or remove a restricted field,
  // edit that JSON — no code changes needed.
  isRestrictedAttr(attrName: string): boolean {
    return this.validationSvc.isRestricted(attrName);
  }

  onAttrChange(attr: AttrRow, newVal: string) {
    // Block changes to restricted ICN attributes
    if (this.isRestrictedAttr(attr.name)) {
      const input = document.querySelector(`input[data-attr="${attr.name}"]`) as HTMLInputElement;
      if (input) input.value = attr.origValue;
      this.toast.show(`⛔ "${attr.name}" is restricted and cannot be modified.`, 'error');
      return;
    }

    const path = this.selectedPath()!;
    const node = this.currentNode()!;

    // Build sibling context for cross-field validation (e.g. discharge vs admit date)
    const siblingValues: Record<string, string> = {};
    Array.from(node.attributes).forEach(a => { siblingValues[a.name.toLowerCase()] = a.value; });

    // Run validation
    const result = this.validationSvc.validate(attr.name, newVal, { siblingValues });
    const errors = { ...this.validationErrors() };

    if (result && !result.valid) {
      errors[attr.name] = result.message;
      this.validationErrors.set(errors);
      // Show toast only on first error for this field (not on every keystroke)
      if (!this.lastToastField || this.lastToastField !== attr.name) {
        this.lastToastField = attr.name;
        this.toast.show(`⚠️ ${attr.name}: ${result.message}`, 'error', 4000);
      }
    } else {
      delete errors[attr.name];
      this.validationErrors.set(errors);
      if (this.lastToastField === attr.name) this.lastToastField = null;
    }

    node.setAttribute(attr.name, newVal);
    this.state.recordChange({ path, attrName: attr.name, oldVal: attr.origValue, newVal, type: 'edit' });
    window.dispatchEvent(new Event('xml-changes-updated'));
    this.editorService.refresh();
  }

  revertAttr(attr: AttrRow) {
    const path = this.selectedPath()!;
    const node = this.currentNode()!;
    node.setAttribute(attr.name, attr.origValue);
    this.state.removeChange(path, attr.name, 'edit');
    window.dispatchEvent(new Event('xml-changes-updated'));
    this.editorService.refresh();
  }

  onTextChange(val: string) {
    const path = this.selectedPath()!;
    const node = this.currentNode()!;
    const origVal = this.originalText();

    // Validate text content using the element tag name as the field key
    const result = this.validationSvc.validate(node.tagName, val);
    const errors = { ...this.validationErrors() };
    if (result && !result.valid) {
      errors['#text'] = result.message;
      this.validationErrors.set(errors);
      if (!this.lastToastField || this.lastToastField !== '#text') {
        this.lastToastField = '#text';
        this.toast.show(`⚠️ ${node.tagName}: ${result.message}`, 'error', 4000);
      }
    } else {
      delete errors['#text'];
      this.validationErrors.set(errors);
      if (this.lastToastField === '#text') this.lastToastField = null;
    }

    node.textContent = val;
    this.state.recordChange({ path, attrName: '#text', oldVal: origVal, newVal: val, type: 'text-content' });
    window.dispatchEvent(new Event('xml-changes-updated'));
    this.editorService.refresh();
  }

  revertText() {
    const path = this.selectedPath()!;
    const node = this.currentNode()!;
    const orig = this.originalText();
    node.textContent = orig;
    this.state.removeChange(path, '#text', 'text-content');
    this.textInputVal = orig;
    window.dispatchEvent(new Event('xml-changes-updated'));
    this.editorService.refresh();
  }

  addAttr() {
    const k = this.newAttrKey.trim();
    if (!k) { this.toast.show('Enter an attribute name', 'error'); return; }
    const path = this.selectedPath()!;
    const node = this.currentNode()!;
    node.setAttribute(k, this.newAttrVal);
    this.state.changes.push({ path, attrName: k, oldVal: null, newVal: this.newAttrVal, type: 'add-attr' });
    this.state.scheduleAutoSave();
    this.newAttrKey = ''; this.newAttrVal = '';
    window.dispatchEvent(new Event('xml-changes-updated'));
    this.editorService.refresh();
    this.toast.show('Attribute "' + k + '" added', 'success');
  }

  addChild() {
    const tag = this.newChildTag.trim();
    if (!tag || !/^[a-zA-Z_][\w.-]*$/.test(tag)) {
      this.toast.show('Enter a valid tag name', 'error'); return;
    }
    this.addChildElement(tag);
    this.newChildTag = '';
  }

  addChildElement(tag: string) {
    const path = this.selectedPath()!;
    const node = this.currentNode()!;
    const newEl = this.state.xmlDoc!.createElement(tag);
    node.appendChild(newEl);
    this.state.expandedNodes.add(path);
    // Store parentPath so revert can find the correct parent node and remove the last added child
    this.state.changes.push({
      path: path,           // parentPath — where the child was added TO
      attrName: null,
      oldVal: null,
      newVal: tag,          // store the tag name in newVal for display & revert
      type: 'add-element',
      tag
    });
    this.state.scheduleAutoSave();
    window.dispatchEvent(new Event('xml-changes-updated'));
    this.editorService.refresh();
    this.toast.show('<' + tag + '> added to <' + node.tagName + '>', 'success');
  }
}
