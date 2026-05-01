import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// ─────────────────────────────────────────────────────────────────────────────
// Validation rules are loaded at runtime from /validation-rules.json so they
// can be edited and redeployed WITHOUT rebuilding the application code.
//
// To add a new validation:
//   1. Open public/validation-rules.json
//   2. Append a new rule object to the "rules" array
//   3. Save → refresh browser
//
// See the "supportedCheckTypes" key inside the JSON for the full check syntax.
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  message: string;
}

export interface ValidationContext {
  /** Other attribute values on the same node. Keys are attribute names (lowercase). */
  siblingValues?: Record<string, string>;
}

/** A single validation error found on the current document.
 *  - `field` is the attribute or element tag name that failed.
 *  - `path` is the XML path of the OWNING node (use this for navigation).
 *  - `kind` distinguishes "attribute" errors from element "text" errors.
 *  - `attrName` is set only when kind === 'attr', so the editor can scroll to that row.
 *  - `message` is the human-readable rule violation. */
export interface ValidationError {
  field: string;
  path: string;
  kind: 'attr' | 'text';
  attrName?: string;
  message: string;
}

interface CheckSpec {
  type: string;
  // Common optional fields used by multiple check types
  value?: number;
  values?: string[];
  pattern?: string;
  flags?: string;
  message?: string;
  chars?: string;
  label?: string;
  thisLabel?: string;
  allowSpaces?: boolean;
  allowHyphen?: boolean;
  allowBlank?: boolean;
  caseSensitive?: boolean;
  siblingFields?: string[];
}

interface RuleSpec {
  name?: string;
  fields: string[];
  description: string;
  checks: CheckSpec[];
}

interface RulesFile {
  /** Attribute names that should be read-only in the editor. Matched case-insensitive,
   *  and underscores/hyphens/spaces are ignored when comparing — same normalization
   *  rules as field names in `rules[].fields`. */
  restrictedFields?: string[];
  rules: RuleSpec[];
}

@Injectable({ providedIn: 'root' })
export class ValidationService {
  private http = inject(HttpClient);

  private rules: RuleSpec[] = [];
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  /** Map of normalized field name → matching rule. Built once after load. */
  private fieldRuleIndex: Map<string, RuleSpec> = new Map();

  /** Set of normalized field names that are restricted (read-only in the editor). */
  private restrictedSet: Set<string> = new Set();

  constructor() {
    // Kick off the load immediately. Consumers calling validate()/hasRule()
    // before the load completes will simply get null/false until rules arrive.
    this.loadRules();
  }

  /** Load the validation-rules.json. Safe to call multiple times. */
  loadRules(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;

    // Cache-bust query param avoids stale rules after redeploy
    const url = 'validation-rules.json?v=' + Date.now();

    this.loadPromise = firstValueFrom(this.http.get<RulesFile>(url))
      .then(data => {
        if (!data || !Array.isArray(data.rules)) {
          console.error('[ValidationService] validation-rules.json is missing a "rules" array. No validations will run.');
          return;
        }
        this.rules = data.rules;
        this.buildIndex();
        this.buildRestrictedSet(data.restrictedFields);
        this.loaded = true;
        console.info(`[ValidationService] Loaded ${this.rules.length} validation rules and ${this.restrictedSet.size} restricted field(s) from JSON config.`);
      })
      .catch(err => {
        console.error('[ValidationService] Failed to load validation-rules.json — no validations will run.', err);
      });

    return this.loadPromise;
  }

  private buildIndex(): void {
    this.fieldRuleIndex.clear();
    for (const rule of this.rules) {
      if (!Array.isArray(rule.fields)) continue;
      for (const f of rule.fields) {
        this.fieldRuleIndex.set(normalizeFieldName(f), rule);
      }
    }
  }

  private buildRestrictedSet(list: string[] | undefined): void {
    this.restrictedSet.clear();
    if (!Array.isArray(list)) return;
    for (const f of list) {
      if (typeof f === 'string' && f.trim() !== '') {
        this.restrictedSet.add(normalizeFieldName(f));
      }
    }
  }

  /** Whether the given attribute is locked (read-only) per the JSON config.
   *  Field name matching follows the same normalization rules as validation rules
   *  (case-insensitive, underscores/hyphens/spaces ignored). */
  isRestricted(fieldName: string): boolean {
    if (!fieldName) return false;
    return this.restrictedSet.has(normalizeFieldName(fieldName));
  }

  /** True when rules have been fetched at least once. */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Validate a field value. Returns null if no rule applies (field not in any rule list).
   * Returns { valid: true } if value passes all checks, otherwise the first failing check's message.
   */
  validate(fieldName: string, value: string, context?: ValidationContext): ValidationResult | null {
    const rule = this.findRule(fieldName);
    if (!rule) return null;
    if (!Array.isArray(rule.checks) || rule.checks.length === 0) return { valid: true, message: '' };

    for (const check of rule.checks) {
      const result = runCheck(check, value, context);
      if (!result.valid) return result;
    }
    return { valid: true, message: '' };
  }

  /**
   * Walk the user's recorded changes and return every validation error currently
   * present in the document. Only checks fields that the user has actually edited
   * (matches the policy in the topbar download check) — this keeps the error
   * panel focused on what the user can fix, not pre-existing data issues.
   *
   * Caller passes in the changes list and a `getNodeByPath` resolver so this
   * service stays free of any circular dependency on XmlStateService.
   */
  collectErrorsFromChanges(
    changes: ReadonlyArray<{
      path: string;
      attrName: string | null;
      newVal: string;
      type: 'edit' | 'add-attr' | 'add-element' | 'text-content';
    }>,
    getNodeByPath: (p: string) => Element | null
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const change of changes) {
      if (change.type === 'add-element') continue; // structural change, no value to validate

      const node = getNodeByPath(change.path);
      if (!node) continue;

      if (change.type === 'text-content') {
        const currentVal = node.textContent ?? '';
        const r = this.validate(node.tagName, currentVal);
        if (r && !r.valid) {
          errors.push({
            field: node.tagName,
            path: change.path,
            kind: 'text',
            message: r.message
          });
        }
        continue;
      }

      // edit OR add-attr — both are attribute-value changes
      const attrName = change.attrName;
      if (!attrName) continue;
      const currentVal = node.getAttribute(attrName) ?? change.newVal;

      // Sibling context for cross-field rules (e.g. discharge ≥ admit)
      const siblingValues: Record<string, string> = {};
      Array.from(node.attributes).forEach(a => { siblingValues[a.name.toLowerCase()] = a.value; });

      const r = this.validate(attrName, currentVal, { siblingValues });
      if (r && !r.valid) {
        errors.push({
          field: attrName,
          path: change.path,
          kind: 'attr',
          attrName,
          message: r.message
        });
      }
    }

    return errors;
  }

  /** Get the human-readable description for a field (used as inline hint under the input). */
  getDescription(fieldName: string): string | null {
    const rule = this.findRule(fieldName);
    return rule ? rule.description : null;
  }

  /** Whether this field has any validation rule attached. */
  hasRule(fieldName: string): boolean {
    return this.findRule(fieldName) !== null;
  }

  private findRule(fieldName: string): RuleSpec | null {
    return this.fieldRuleIndex.get(normalizeFieldName(fieldName)) ?? null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Field-name normalization: case-insensitive, ignore underscores/hyphens/spaces
// so users can list fields in JSON in whatever style they prefer.
// "dte_birth" === "DTEBIRTH" === "Dte-Birth"
// ─────────────────────────────────────────────────────────────────────────────
function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/[_\- ]/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Check runner: maps a CheckSpec from JSON to actual validation logic.
// To add a new check type:
//   1. Add a new case below
//   2. Document its JSON syntax in the "supportedCheckTypes" array in the JSON
// ─────────────────────────────────────────────────────────────────────────────
function runCheck(check: CheckSpec, value: string, ctx?: ValidationContext): ValidationResult {
  const v = value ?? '';

  switch (check.type) {

    case 'regex': {
      if (!v) return ok();
      if (!check.pattern) return ok();
      let re: RegExp;
      try { re = new RegExp(check.pattern, check.flags || ''); }
      catch { return fail('Invalid regex pattern in validation config.'); }
      if (!re.test(v)) return fail(check.message || 'Value does not match the required format.');
      return ok();
    }

    case 'maxLength': {
      if (!v) return ok();
      const max = check.value ?? 0;
      if (v.length > max)
        return fail(check.message || `Must not exceed ${max} characters (currently ${v.length}).`);
      return ok();
    }

    case 'minLength': {
      if (!v) return ok();
      const min = check.value ?? 0;
      if (v.length < min)
        return fail(check.message || `Must be at least ${min} characters (currently ${v.length}).`);
      return ok();
    }

    case 'exactLength': {
      if (!v) return ok();
      const exact = check.value ?? 0;
      if (v.length !== exact)
        return fail(check.message || `Must be exactly ${exact} characters (currently ${v.length}).`);
      return ok();
    }

    case 'exactDigits': {
      if (!v) return ok();
      const n = check.value ?? 0;
      const re = new RegExp('^\\d{' + n + '}$');
      if (!re.test(v)) {
        const label = check.label || 'Value';
        return fail(check.message || `${label} must be exactly ${n} numeric digits (currently ${v.length} chars).`);
      }
      return ok();
    }

    case 'digitsOnly': {
      if (!v) return ok();
      if (!/^\d+$/.test(v)) return fail(check.message || 'Only numeric digits are allowed.');
      return ok();
    }

    case 'alphanumeric': {
      if (!v) return ok();
      if (!/^[a-zA-Z0-9]+$/.test(v))
        return fail(check.message || 'Only alphanumeric characters (letters and digits) are allowed.');
      return ok();
    }

    case 'lettersOnly': {
      if (!v) return ok();
      let pattern = 'a-zA-Z';
      if (check.allowSpaces) pattern += ' ';
      if (check.allowHyphen) pattern += '\\-';
      const re = new RegExp(`^[${pattern}]+$`);
      if (!re.test(v)) {
        const allowedDesc = ['letters'];
        if (check.allowHyphen) allowedDesc.push('hyphens (-)');
        if (check.allowSpaces) allowedDesc.push('spaces');
        return fail(check.message || `Only ${allowedDesc.join(', ')} are allowed.`);
      }
      return ok();
    }

    case 'oneOf': {
      if (!v) return ok();
      const allowed = check.values || [];
      const compareV = check.caseSensitive ? v : v.toUpperCase();
      const allowedSet = check.caseSensitive ? allowed : allowed.map(x => x.toUpperCase());
      if (!allowedSet.includes(compareV))
        return fail(check.message || `Value must be one of: ${allowed.join(', ')}.`);
      return ok();
    }

    case 'noChars': {
      if (!v) return ok();
      const banned = check.chars || '';
      for (const c of banned) {
        if (v.includes(c))
          return fail(check.message || `Character "${c}" is not allowed.`);
      }
      return ok();
    }

    case 'dateYYYYMMDD': {
      if (!v) return ok();
      if (!/^\d{8}$/.test(v))
        return fail(check.message || 'Date must be in YYYYMMDD format (8 digits, e.g. 19900115).');
      if (!parseYYYYMMDD(v))
        return fail(check.message || 'Invalid date value.');
      return ok();
    }

    case 'notFutureDate': {
      if (!v) return ok();
      const parsed = parseYYYYMMDD(v);
      if (!parsed) return ok(); // a sibling dateYYYYMMDD check would already fail
      if (parsed > new Date()) {
        const label = check.label || 'Date';
        return fail(check.message || `${label} cannot be a future date.`);
      }
      return ok();
    }

    case 'notBeforeSibling': {
      if (!v) return ok();
      const parsed = parseYYYYMMDD(v);
      if (!parsed) return ok();
      const sibVal = lookupSibling(check.siblingFields, ctx);
      if (sibVal && /^\d{8}$/.test(sibVal)) {
        const sibParsed = parseYYYYMMDD(sibVal);
        if (sibParsed && parsed < sibParsed) {
          const me = check.thisLabel || 'This date';
          const other = check.label || 'the reference date';
          return fail(check.message || `${me} must be on or after ${other}.`);
        }
      }
      return ok();
    }

    case 'notOnOrBeforeSibling': {
      if (!v) return ok();
      const parsed = parseYYYYMMDD(v);
      if (!parsed) return ok();
      const sibVal = lookupSibling(check.siblingFields, ctx);
      if (sibVal && /^\d{8}$/.test(sibVal)) {
        const sibParsed = parseYYYYMMDD(sibVal);
        if (sibParsed && parsed <= sibParsed) {
          const me = check.thisLabel || 'This date';
          const other = check.label || 'the reference date';
          return fail(check.message || `${me} must be after ${other}.`);
        }
      }
      return ok();
    }

    default:
      // Unknown check types are skipped silently with a console warning so
      // a typo in JSON doesn't break validation entirely.
      console.warn(`[ValidationService] Unknown check type "${check.type}" — skipping.`);
      return ok();
  }
}

function lookupSibling(siblingFields: string[] | undefined, ctx?: ValidationContext): string | null {
  if (!siblingFields || !ctx?.siblingValues) return null;
  for (const f of siblingFields) {
    const v = ctx.siblingValues[normalizeFieldName(f)] ?? ctx.siblingValues[f.toLowerCase()] ?? ctx.siblingValues[f];
    if (v) return v;
  }
  return null;
}

function ok(): ValidationResult { return { valid: true, message: '' }; }
function fail(msg: string): ValidationResult { return { valid: false, message: msg }; }

function parseYYYYMMDD(value: string): Date | null {
  if (!/^\d{8}$/.test(value)) return null;
  const y = parseInt(value.slice(0, 4));
  const m = parseInt(value.slice(4, 6)) - 1;
  const d = parseInt(value.slice(6, 8));
  const dt = new Date(y, m, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return null;
  return dt;
}
