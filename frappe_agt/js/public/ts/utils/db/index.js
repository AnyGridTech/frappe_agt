frappe.provide('agt.db');
agt.db.filter_join = async function (steps) {
    let results = [];
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step)
            continue;
        const filters = { ...step.filters };
        if (i > 0 && step.joinOn && results.length > 0) {
            const joinOn = step.joinOn;
            const joinValues = results.map(item => item[joinOn.sourceField]);
            filters[joinOn.targetField] = ["in", joinValues];
        }
        if (step.joinOn && results.length === 0) {
            console.warn(`No results found for step ${i + 1}. Skipping further joins.`);
            break;
        }
        const response = await frappe.call({
            method: "backend_get_all",
            args: {
                doctype: step.doctype,
                filters,
                fields: step.fields,
            }
        });
        results = (response.message.data || []);
    }
    return results;
};
