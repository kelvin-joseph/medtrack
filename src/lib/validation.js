// Shared validation utilities — form screens call these instead of each
// rolling their own ad-hoc checks, per the "reusable validation utilities"
// requirement.

export function required(value, label) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return `${label} is required.`;
  }
  return null;
}

export function isNumber(value, label) {
  if (value === "" || value === undefined || value === null) return null; // let `required` handle emptiness
  if (Number.isNaN(Number(value))) return `${label} must be a number.`;
  return null;
}

export function isPositive(value, label) {
  if (value === "" || value === undefined || value === null) return null;
  if (Number(value) < 0) return `${label} can't be negative.`;
  return null;
}

export function isEmail(value, label) {
  if (!value) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : `${label} isn't a valid email address.`;
}

export function isDate(value, label) {
  if (!value) return null;
  return Number.isNaN(new Date(value).getTime()) ? `${label} isn't a valid date.` : null;
}

/**
 * Runs a set of { field, validators: [fn, ...] } rules against a data
 * object. Each validator fn receives (value, label) and returns an error
 * string or null. Returns { errors: {field: message}, isValid }.
 */
export function validateFields(data, rules) {
  const errors = {};
  for (const { field, label, validators } of rules) {
    for (const validate of validators) {
      const msg = validate(data[field], label || field);
      if (msg) {
        errors[field] = msg;
        break;
      }
    }
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}

/** Equipment-specific validation rules, used by both the Add/Edit form and CSV import. */
export function validateEquipment(data) {
  return validateFields(data, [
    { field: "name", label: "Equipment name", validators: [required] },
    { field: "assetTag", label: "Asset tag", validators: [required] },
    { field: "category", label: "Category", validators: [required] },
    { field: "department", label: "Department", validators: [required] },
    { field: "installDate", label: "Installation date", validators: [required, isDate] },
    { field: "purchaseDate", label: "Purchase date", validators: [isDate] },
    { field: "expectedLifespanYears", label: "Expected useful life", validators: [isNumber, isPositive] },
    { field: "operatingHoursPerWeek", label: "Operating hours/week", validators: [isNumber, isPositive] },
  ]);
}
