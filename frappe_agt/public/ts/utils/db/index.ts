import { JoinStep } from "@anygridtech/frappe-agt-types/agt/client/utils/db";

frappe.provide('agt.db');

agt.db.filter_join = async function <Steps extends readonly JoinStep[]>(
  steps: Steps
): Promise<
  Steps extends [...any, infer Last]
  ? Last extends JoinStep<infer T>
  ? T[]
  : any[]
  : any[]
> {
  // Inferir o tipo do resultado final
  type Result = Steps extends [...any, infer Last]
    ? Last extends JoinStep<infer T>
    ? T[]
    : any[]
    : any[];

  let results: Result = [] as unknown as Result;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step) continue;

    const filters = { ...step.filters };
    if (i > 0 && step.joinOn && (results as any[]).length > 0) {
      const joinOn = step.joinOn;
      const joinValues = (results as any[]).map(item => item[joinOn.sourceField]);
      filters[joinOn.targetField] = ["in", joinValues];
    }

    if (step.joinOn && (results as any[]).length === 0) {
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

    results = (response.message.data || []) as Result;
  }

  return results;
};