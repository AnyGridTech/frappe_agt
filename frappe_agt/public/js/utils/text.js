frappe.provide('agt.utils.text');
agt.utils.text.normalize = function (text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[-_\s]/g, '')
        .replace(/[^a-z0-9]/g, '');
};
agt.utils.text.is_valid = function (v) {
    return v !== null && v !== undefined && (typeof v === 'string' ? v.trim() !== '' : true);
};
agt.utils.text.to_snake_case = function (str) {
    str = str.replace(/\s+/g, '_');
    str = str.replace(/([a-z])([A-Z])/g, '$1_$2');
    return str.toLowerCase();
};
agt.utils.text.to_pascal_case_spaced = function (str) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[^a-zA-Z0-9 ]/g, ' ')
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};
//# sourceMappingURL=text.js.map