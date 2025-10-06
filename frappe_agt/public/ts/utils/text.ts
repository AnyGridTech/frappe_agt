frappe.provide('agt.utils.text');

// Temporary fix for TypeScript issues - use any type for agt.utils
declare const agt: any;

agt.utils.text.normalize = function(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[-_\s]/g, '') // remove hífens, underlines e espaços
    .replace(/[^a-z0-9]/g, ''); // remove outros caracteres especiais
};

agt.utils.text.is_valid = function(v: any) {
  return v !== null && v !== undefined && (typeof v === 'string' ? v.trim() !== '' : true);
};

agt.utils.text.to_snake_case = function(str: string) {
  // Replace spaces with underscores
  str = str.replace(/\s+/g, '_');
  // Convert PascalCase/CamelCase to snake_case
  str = str.replace(/([a-z])([A-Z])/g, '$1_$2');
  return str.toLowerCase();
};

agt.utils.text.to_pascal_case_spaced = function(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Insert space before uppercase letters in camelCase
    .replace(/[^a-zA-Z0-9 ]/g, ' ') // Replace non-alphanumeric characters with spaces
    .split(/\s+/) // Split by spaces
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
    .join(' '); // Join with spaces
};