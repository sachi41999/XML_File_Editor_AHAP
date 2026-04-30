import { Injectable } from '@angular/core';

export interface ValidationResult {
  valid: boolean;
  message: string;
}

interface ValidationRule {
  fields: string[];          // attribute/element names this rule applies to (lowercase)
  validate: (value: string, context?: ValidationContext) => ValidationResult;
  description: string;
}

interface ValidationContext {
  siblingValues?: Record<string, string>; // other attribute values on same node (for cross-field rules)
}

@Injectable({ providedIn: 'root' })
export class ValidationService {

  private readonly rules: ValidationRule[] = [

    // ── Name fields: letters, hyphens, spaces only, max 60 chars ─────────────
    {
      fields: ['nam_first', 'subscriberfirstname', 'medicaidmemberfirstname',
               'nam_last',  'medicaidmemberlastname', 'subscriberlastname'],
      description: 'Only letters, hyphens, and spaces allowed. Max 60 characters.',
      validate(value: string): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (value.length > 60)
          return { valid: false, message: `Must not exceed 60 characters (currently ${value.length}).` };
        if (!/^[a-zA-Z\- ]+$/.test(value))
          return { valid: false, message: 'Only letters, hyphens (-), and spaces are allowed.' };
        return { valid: true, message: '' };
      }
    },

    // ── Date of Birth: YYYYMMDD, not future ──────────────────────────────────
    {
      fields: ['medicaidmemberdateofbirth', 'subscriberdateofbirth', 'dob', 'dte_birth'],
      description: 'Valid date in YYYYMMDD format, cannot be a future date.',
      validate(value: string): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (!/^\d{8}$/.test(value))
          return { valid: false, message: 'Date must be in YYYYMMDD format (8 digits, e.g. 19900115).' };
        const parsed = parseYYYYMMDD(value);
        if (!parsed) return { valid: false, message: 'Invalid date value.' };
        if (parsed > new Date())
          return { valid: false, message: 'Date of Birth cannot be a future date.' };
        return { valid: true, message: '' };
      }
    },

    // ── Policy/Member ID: alphanumeric, max 80 chars ──────────────────────────
    {
      fields: ['policyid', 'subscriberid', 'medicaidmemberid', 'id_member', 'id_subscriber', 'id_policy'],
      description: 'Alphanumeric only. Max 80 characters.',
      validate(value: string): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (value.length > 80)
          return { valid: false, message: `Must not exceed 80 characters (currently ${value.length}).` };
        if (!/^[a-zA-Z0-9]+$/.test(value))
          return { valid: false, message: 'Only alphanumeric characters (letters and digits) are allowed.' };
        return { valid: true, message: '' };
      }
    },

    // ── Address fields: alphanumeric, max 55 chars per line ───────────────────
    {
      fields: ['subscriberaddress', 'medicaidmemberaddress', 'adr_street', 'adr_city',
               'adr_zip', 'adr_state', 'nam_street', 'nam_city',
               'renderingprovideraddress', 'adr_line1', 'adr_line2'],
      description: 'Alphanumeric only. Max 55 characters per line.',
      validate(value: string): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (value.length > 55)
          return { valid: false, message: `Must not exceed 55 characters (currently ${value.length}).` };
        if (!/^[a-zA-Z0-9 .,#\-]+$/.test(value))
          return { valid: false, message: 'Only alphanumeric characters, spaces, and basic punctuation allowed.' };
        return { valid: true, message: '' };
      }
    },

    // ── Discharge Date: YYYYMMDD, on or after Admit Date ─────────────────────
    {
      fields: ['dischargedate', 'dte_discharge', 'dte_to_date'],
      description: 'Valid date in YYYYMMDD format, must be on or after the Admit Date.',
      validate(value: string, ctx?: ValidationContext): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (!/^\d{8}$/.test(value))
          return { valid: false, message: 'Discharge date must be in YYYYMMDD format (8 digits).' };
        const dischargeParsed = parseYYYYMMDD(value);
        if (!dischargeParsed) return { valid: false, message: 'Invalid discharge date value.' };

        // Cross-field: check against admit date if available
        const admitVal = ctx?.siblingValues?.['dte_first_svc'] ||
                         ctx?.siblingValues?.['admitdate'] ||
                         ctx?.siblingValues?.['dte_admit'];
        if (admitVal && /^\d{8}$/.test(admitVal)) {
          const admitParsed = parseYYYYMMDD(admitVal);
          if (admitParsed && dischargeParsed < admitParsed)
            return { valid: false, message: 'Discharge date must be on or after the Admit Date.' };
        }
        return { valid: true, message: '' };
      }
    },

    // ── Rendering/Attending Provider NPI: exactly 10 digits ─────────────────
    {
      fields: ['npi', 'renderingprovidernpi', 'attendingprovidernpi',
               'npi_rendering', 'npi_attending', 'id_npi', 'npi_billing'],
      description: 'Must be exactly 10 numeric digits.',
      validate(value: string): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (!/^\d{10}$/.test(value))
          return { valid: false, message: `NPI must be exactly 10 numeric digits (currently ${value.length} chars).` };
        return { valid: true, message: '' };
      }
    },

    // ── NDC Information: exactly 11 digits, no hyphens ────────────────────────
    {
      fields: ['ndc', 'ndcinformation', 'cde_ndc', 'id_ndc'],
      description: 'Must be exactly 11 numeric digits. No hyphens.',
      validate(value: string): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (value.includes('-'))
          return { valid: false, message: 'NDC must not contain hyphens. Use 11 digits only.' };
        if (!/^\d{11}$/.test(value))
          return { valid: false, message: `NDC must be exactly 11 numeric digits (currently ${value.length} chars).` };
        return { valid: true, message: '' };
      }
    },

    // ── TOB / Type of Bill: exactly 4 numeric characters ─────────────────────
    {
      fields: ['tob', 'typeofbill', 'cde_tob', 'cde_bill_type'],
      description: 'Must be exactly 4 numeric characters.',
      validate(value: string): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (!/^\d{4}$/.test(value))
          return { valid: false, message: 'Type of Bill must be exactly 4 numeric digits.' };
        return { valid: true, message: '' };
      }
    },

    // ── Patient Relationship Code: max 2 numeric chars ────────────────────────
    {
      fields: ['patientrelationshipcode', 'cde_relationship', 'cde_pat_rel', 'cde_rel'],
      description: 'Max 2 characters, numeric only.',
      validate(value: string): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (!/^\d{1,2}$/.test(value))
          return { valid: false, message: 'Patient Relationship Code must be 1-2 numeric digits.' };
        return { valid: true, message: '' };
      }
    },

    // ── Admit Date: YYYYMMDD, not future ─────────────────────────────────────
    {
      fields: ['admitdate', 'dte_admit', 'dte_first_svc', 'dte_admission'],
      description: 'Valid date in YYYYMMDD format, cannot be a future date.',
      validate(value: string): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (!/^\d{8}$/.test(value))
          return { valid: false, message: 'Admit date must be in YYYYMMDD format (8 digits, e.g. 20230115).' };
        const parsed = parseYYYYMMDD(value);
        if (!parsed) return { valid: false, message: 'Invalid admit date value.' };
        if (parsed > new Date())
          return { valid: false, message: 'Admit date cannot be a future date.' };
        return { valid: true, message: '' };
      }
    },

    // ── Patient Date of Death: YYYYMMDD or blank, not future, after DOB ──────
    {
      fields: ['datedeath', 'dte_death', 'patientdateofdeath', 'dte_dod'],
      description: 'Valid YYYYMMDD or blank (if alive). Cannot be future. Must be after DOB.',
      validate(value: string, ctx?: ValidationContext): ValidationResult {
        if (!value) return { valid: true, message: '' }; // blank = alive, allowed
        if (!/^\d{8}$/.test(value))
          return { valid: false, message: 'Date of Death must be in YYYYMMDD format or left blank.' };
        const parsed = parseYYYYMMDD(value);
        if (!parsed) return { valid: false, message: 'Invalid Date of Death value.' };
        if (parsed > new Date())
          return { valid: false, message: 'Date of Death cannot be a future date.' };
        const dobVal = ctx?.siblingValues?.['dob'] || ctx?.siblingValues?.['dte_birth'] ||
                       ctx?.siblingValues?.['medicaidmemberdateofbirth'];
        if (dobVal && /^\d{8}$/.test(dobVal)) {
          const dob = parseYYYYMMDD(dobVal);
          if (dob && parsed <= dob)
            return { valid: false, message: 'Date of Death must be after Date of Birth.' };
        }
        return { valid: true, message: '' };
      }
    },

    // ── Patient Sex: M, F, or U ───────────────────────────────────────────────
    {
      fields: ['patientsex', 'cde_sex', 'cde_gender', 'sex', 'gender', 'cde_pat_sex'],
      description: 'Must be "M" (Male), "F" (Female), or "U" (Unknown).',
      validate(value: string): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (!['M', 'F', 'U', 'm', 'f', 'u'].includes(value))
          return { valid: false, message: 'Patient Sex must be "M" (Male), "F" (Female), or "U" (Unknown).' };
        return { valid: true, message: '' };
      }
    },

    // ── Admitting Diagnosis Code: alphanumeric, max 7 chars ───────────────────
    {
      fields: ['admittingdiagnosiscode', 'cde_diagnosis', 'cde_diag', 'cde_admitting_diag',
               'cde_admit_diag', 'cde_primary_diag'],
      description: 'Alphanumeric only. Max 7 characters.',
      validate(value: string): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (value.length > 7)
          return { valid: false, message: `Diagnosis code must not exceed 7 characters (currently ${value.length}).` };
        if (!/^[a-zA-Z0-9]+$/.test(value))
          return { valid: false, message: 'Diagnosis code must be alphanumeric only.' };
        return { valid: true, message: '' };
      }
    },

    // ── Patient Discharge Status: max 2 numeric chars ─────────────────────────
    {
      fields: ['patientdischargestatus', 'cde_discharge_status', 'cde_pat_discharge',
               'cde_discharge', 'cde_status_discharge'],
      description: 'Max 2 characters, numeric only.',
      validate(value: string): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (!/^\d{1,2}$/.test(value))
          return { valid: false, message: 'Patient Discharge Status must be 1-2 numeric digits.' };
        return { valid: true, message: '' };
      }
    },

    // ── cde_proc: alphanumeric, max 5 chars ───────────────────────────────────
    {
      fields: ['cde_proc', 'procedure_code', 'cde_procedure'],
      description: 'Alphanumeric only. Max 5 characters.',
      validate(value: string): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (value.length > 5)
          return { valid: false, message: `Procedure code must not exceed 5 characters (currently ${value.length}).` };
        if (!/^[a-zA-Z0-9]+$/.test(value))
          return { valid: false, message: 'Procedure code must be alphanumeric only.' };
        return { valid: true, message: '' };
      }
    },

    // ── Generic date fields: YYYYMMDD format ──────────────────────────────────
    {
      fields: ['dte_adjusted', 'dte_prescription', 'dte_service', 'dte_svc_adjud',
               'dte_service_adjud', 'dte_svc_adjud_dte'],
      description: 'Valid date in YYYYMMDD format.',
      validate(value: string): ValidationResult {
        if (!value) return { valid: true, message: '' };
        if (!/^\d{8}$/.test(value))
          return { valid: false, message: 'Date must be in YYYYMMDD format (8 digits, e.g. 20230115).' };
        if (!parseYYYYMMDD(value))
          return { valid: false, message: 'Invalid date value.' };
        return { valid: true, message: '' };
      }
    },

  ];

  /**
   * Validate a field value. Returns null if no rule applies (field not in any rule list).
   */
  validate(fieldName: string, value: string, context?: ValidationContext): ValidationResult | null {
    const key = fieldName.toLowerCase().replace(/[_\- ]/g, '');
    for (const rule of this.rules) {
      const normalizedFields = rule.fields.map(f => f.toLowerCase().replace(/[_\- ]/g, ''));
      if (normalizedFields.includes(key)) {
        return rule.validate(value, context);
      }
    }
    return null; // no rule for this field
  }

  /**
   * Get description for a field (used for tooltip/hint).
   */
  getDescription(fieldName: string): string | null {
    const key = fieldName.toLowerCase().replace(/[_\- ]/g, '');
    for (const rule of this.rules) {
      const normalizedFields = rule.fields.map(f => f.toLowerCase().replace(/[_\- ]/g, ''));
      if (normalizedFields.includes(key)) {
        return rule.description;
      }
    }
    return null;
  }

  /**
   * Check if a field has any validation rules defined.
   */
  hasRule(fieldName: string): boolean {
    return this.getDescription(fieldName) !== null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseYYYYMMDD(value: string): Date | null {
  if (!/^\d{8}$/.test(value)) return null;
  const y = parseInt(value.slice(0, 4));
  const m = parseInt(value.slice(4, 6)) - 1; // 0-indexed
  const d = parseInt(value.slice(6, 8));
  const dt = new Date(y, m, d);
  // Check the date is valid (e.g. not month 13 or day 32)
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return null;
  return dt;
}
