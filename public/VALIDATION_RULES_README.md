# Validation Rules — How to Add or Edit

The application's field validations are driven by `validation-rules.json` in this
folder. You can add, edit, or remove validations **without changing any code** —
just edit the JSON, save, and refresh the browser (or redeploy).

---

## Quick example

To add a validation that requires **`cde_billing_provider`** to be exactly
8 alphanumeric characters, append a new rule to the `rules` array:

```json
{
  "name": "Billing Provider Code",
  "fields": ["cde_billing_provider"],
  "description": "Alphanumeric only. Exactly 8 characters.",
  "checks": [
    { "type": "exactLength", "value": 8 },
    { "type": "alphanumeric" }
  ]
}
```

Save → refresh browser → done. The field will now show validation errors
inline, prevent download when invalid, and display the description as a hint.

---

## Rule object structure

| Field         | Type     | Required | Purpose                                                                 |
|---------------|----------|----------|-------------------------------------------------------------------------|
| `name`        | string   | optional | Internal label. Useful for searching the file.                          |
| `fields`      | string[] | yes      | All attribute or element names this rule applies to. Case-insensitive. Underscores/hyphens/spaces ignored — `dte_birth` and `DteBirth` match. |
| `description` | string   | yes      | Shown as a hint under the input box.                                    |
| `checks`      | array    | yes      | Validation steps run in order. First failing check produces the error.  |

---

## Restricted (read-only) fields

To make an attribute non-editable in the UI — locked with a 🔒 icon, with a
toast warning if the user tries to type — list its name in the top-level
`restrictedFields` array:

```json
{
  "restrictedFields": [
    "num_icn",
    "acn_icn",
    "id_internal"
  ],
  "rules": [ ... ]
}
```

Field-name matching here is **case-insensitive** and ignores underscores,
hyphens, and spaces, just like inside `rules[].fields`. So `num_icn`, `NUMICN`,
and `Num-ICN` all match the same field.

Restricted fields can also have validation rules — they just won't be
editable through the UI.

---

## Supported check types

### `regex`
```json
{ "type": "regex", "pattern": "^[A-Z]{3}\\d{4}$", "message": "Format must be ABC1234.", "flags": "i" }
```

### `maxLength` / `minLength` / `exactLength`
```json
{ "type": "maxLength", "value": 60 }
{ "type": "minLength", "value": 3 }
{ "type": "exactLength", "value": 10 }
```

### `exactDigits` (numeric, fixed length)
```json
{ "type": "exactDigits", "value": 10, "label": "NPI" }
```

### `digitsOnly`
```json
{ "type": "digitsOnly" }
```

### `alphanumeric`
```json
{ "type": "alphanumeric" }
```

### `lettersOnly`
```json
{ "type": "lettersOnly", "allowSpaces": true, "allowHyphen": true }
```

### `oneOf` (enum)
```json
{ "type": "oneOf", "values": ["M", "F", "U"], "caseSensitive": false }
```

### `noChars` (forbid specific characters)
```json
{ "type": "noChars", "chars": "-/", "message": "Hyphens and slashes are not allowed." }
```

### `dateYYYYMMDD`
```json
{ "type": "dateYYYYMMDD" }
```
Validates 8-digit format AND that the date is real (not Feb 30, etc.).

### `notFutureDate`
Pairs with `dateYYYYMMDD`. Rejects future dates.
```json
{ "type": "notFutureDate", "label": "Date of Birth" }
```

### `notBeforeSibling` (cross-field: must be ≥ another field)
```json
{
  "type": "notBeforeSibling",
  "siblingFields": ["dte_first_svc", "admitdate"],
  "label": "Admit Date",
  "thisLabel": "Discharge Date"
}
```
Looks at attributes on the same element. The first non-empty sibling found
in the list wins.

### `notOnOrBeforeSibling` (cross-field: must be > another field)
Same as above but strict `>` instead of `>=`. Used for Date of Death > DOB.

---

## Tips

* The `message` field on any check overrides the default error text.
* Checks run in array order — put cheap checks (length, regex) before
  expensive ones (cross-field date checks) for marginal speed.
* If you make a typo in `type`, the check is skipped and a warning is logged
  to the browser console — your other validations keep working.
* The `$schema` and `supportedCheckTypes` keys at the top of the JSON are
  inline documentation for editors. They are ignored by the app.

---

## Testing your changes

1. Edit `validation-rules.json`
2. Save
3. Hard-refresh the browser (`Ctrl+Shift+R`)
4. Open the browser console — look for:
   `[ValidationService] Loaded N validation rules from JSON config.`
5. Edit a field that should match your new rule and verify the error appears
