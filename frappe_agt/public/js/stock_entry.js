frappe.ui.form.on('Stock Entry', {
	refresh: function(frm) {
		// Add custom button to auto-fill items from serial numbers
		if (frm.doc.docstatus === 0) {
			frm.add_custom_button(__('Auto-fill Items from Serial Numbers'), function() {
				auto_fill_items_from_serial_numbers(frm);
			}, __('Tools'));
		}
	},
	
	// Detect when CSV is uploaded/imported
	before_load: function(frm) {
		// Check if items were just imported
		setTimeout(function() {
			if (frm.doc.items && frm.doc.items.length > 0) {
				let has_serial_no_without_item = false;
				frm.doc.items.forEach(function(row) {
					if (row.serial_no && !row.item_code) {
						has_serial_no_without_item = true;
					}
				});
				
				if (has_serial_no_without_item) {
					frappe.show_alert({
						message: __('Serial numbers detected. Click "Auto-fill Items" to populate item codes.'),
						indicator: 'blue'
					});
				}
			}
		}, 500);
	}
});

frappe.ui.form.on('Stock Entry Detail', {
	serial_no: function(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		
		// Auto-fill when serial number is entered
		if (row.serial_no && row.serial_no.trim()) {
			auto_fill_item_for_row(frm, row);
		}
	},
	
	items_add: function(frm, cdt, cdn) {
		// When new row is added, check if it has serial_no
		let row = locals[cdt][cdn];
		if (row.serial_no && !row.item_code) {
			setTimeout(function() {
				auto_fill_item_for_row(frm, row);
			}, 100);
		}
	}
});

function auto_fill_items_from_serial_numbers(frm) {
	console.log('[AGT] Starting auto-fill process...');
	
	frappe.show_alert({
		message: __('Processing serial numbers...'),
		indicator: 'blue'
	});
	
	// Step 1: Batch lookup items by item_name (for CSV imports)
	let rows_with_item_name = [];
	let item_names = [];
	
	frm.doc.items.forEach(function(row) {
		console.log('[AGT] Checking row:', row.idx, 'SN:', row.serial_no, 'Item Code:', row.item_code, 'Item Name:', row.item_name);
		if (row.item_name && !row.item_code && row.serial_no) {
			rows_with_item_name.push(row);
			if (!item_names.includes(row.item_name)) {
				item_names.push(row.item_name);
			}
		}
	});
	
	console.log('[AGT] Found', item_names.length, 'unique item names to lookup:', item_names);
	
	let batch_promise = Promise.resolve({});
	
	if (item_names.length > 0) {
		console.log('[AGT] Calling batch_get_item_code_by_name...');
		batch_promise = frappe.call({
			method: 'frappe_agt.api.batch_get_item_code_by_name',
			args: {
				item_names: item_names
			}
		}).then(function(r) {
			console.log('[AGT] Batch lookup response:', r.message);
			return r.message || {};
		}).catch(function(error) {
			console.error('[AGT] Batch lookup error:', error);
			return {};
		});
	}
	
	// Step 2: Process all rows
	batch_promise.then(function(item_name_map) {
		console.log('[AGT] Processing rows with item_name_map:', item_name_map);
		let promises = [];
		
		frm.doc.items.forEach(function(row) {
			if (!row.serial_no) return;
			
			// Check if we have item_name and it's in batch results
			if (row.item_name && item_name_map[row.item_name]) {
				let items = item_name_map[row.item_name];
				console.log('[AGT] Row', row.idx, 'found', items.length, 'items for name:', row.item_name);
				
				if (items.length === 1 && !row.item_code) {
					console.log('[AGT] Auto-filling row', row.idx, 'with item_code:', items[0].item_code);
					let promise = new Promise(function(resolve) {
						frappe.model.set_value(row.doctype, row.name, 'item_code', items[0].item_code)
							.then(function() {
								console.log('[AGT] Successfully set item_code for row', row.idx);
								resolve();
							});
					});
					promises.push(promise);
				} else if (items.length > 1 && !row.item_code) {
					console.log('[AGT] Multiple items found for row', row.idx, '- showing dialog');
					// Multiple matches - show dialog
					let sn = row.serial_no.split('\n')[0].trim();
					show_item_selection_dialog(frm, row, sn, items, row.item_name);
				} else if (items.length === 0) {
					console.log('[AGT] No items found by name for row', row.idx, '- trying API');
					// Not found by name, try API
					promises.push(auto_fill_item_for_row(frm, row));
				}
			} else {
				console.log('[AGT] Row', row.idx, 'using API lookup');
				// No item_name, use API
				promises.push(auto_fill_item_for_row(frm, row));
			}
		});
		
		console.log('[AGT] Waiting for', promises.length, 'promises to complete...');
		
		Promise.all(promises).then(function() {
			// Wait a bit for all set_value operations to complete
			setTimeout(function() {
				console.log('[AGT] All promises resolved, refreshing grid...');
				frm.refresh_field('items');
				frappe.show_alert({
					message: __('Items auto-filled successfully'),
					indicator: 'green'
				});
			}, 300);
		}).catch(function(error) {
			console.error('[AGT] Error auto-filling items:', error);
			frappe.show_alert({
				message: __('Error auto-filling some items'),
				indicator: 'red'
			});
		});
	});
}

function auto_fill_item_for_row(frm, row) {
	return new Promise(function(resolve, reject) {
		console.log('[AGT] auto_fill_item_for_row called for row', row.idx);
		
		// Skip if already has item_code
		if (row.item_code) {
			console.log('[AGT] Row', row.idx, 'already has item_code, skipping');
			resolve();
			return;
		}
		
		// Get first serial number from the list
		let serial_numbers = row.serial_no.split('\n').filter(sn => sn.trim());
		
		if (serial_numbers.length === 0) {
			console.log('[AGT] Row', row.idx, 'has no serial numbers');
			resolve();
			return;
		}
		
		let sn = serial_numbers[0].trim();
		console.log('[AGT] Row', row.idx, 'processing SN:', sn);
		
		// If item_name exists, try to find by name first
		if (row.item_name && row.item_name.trim()) {
			console.log('[AGT] Row', row.idx, 'trying to lookup by item_name:', row.item_name);
			frappe.call({
				method: 'frappe_agt.api.batch_get_item_code_by_name',
				args: {
					item_names: [row.item_name]
				},
				callback: function(r) {
					console.log('[AGT] Row', row.idx, 'batch lookup response:', r.message);
					if (r.message && r.message[row.item_name]) {
						let items = r.message[row.item_name];
						
						if (items.length === 1) {
							console.log('[AGT] Row', row.idx, 'found single item, setting:', items[0].item_code);
							frappe.model.set_value(row.doctype, row.name, 'item_code', items[0].item_code)
								.then(function() {
									console.log('[AGT] Row', row.idx, 'item_code set successfully');
									resolve();
								});
						} else if (items.length > 1) {
							console.log('[AGT] Row', row.idx, 'found multiple items, showing dialog');
							show_item_selection_dialog(frm, row, sn, items, row.item_name);
							resolve();
						} else {
							console.log('[AGT] Row', row.idx, 'no items found by name, trying API');
							// Not found by name, try API
							fetch_from_api_and_fill(frm, row, sn, resolve, reject);
						}
					} else {
						console.log('[AGT] Row', row.idx, 'batch lookup failed, trying API');
						// Try API
						fetch_from_api_and_fill(frm, row, sn, resolve, reject);
					}
				},
				error: function(error) {
					console.error('[AGT] Row', row.idx, 'batch lookup error:', error);
					// Fallback to API
					fetch_from_api_and_fill(frm, row, sn, resolve, reject);
				}
			});
		} else {
			console.log('[AGT] Row', row.idx, 'no item_name, going directly to API');
			// No item_name, go directly to API
			fetch_from_api_and_fill(frm, row, sn, resolve, reject);
		}
	});
}

function fetch_from_api_and_fill(frm, row, sn, resolve, reject) {
	console.log('[AGT] fetch_from_api_and_fill called for SN:', sn);
	
	frappe.call({
		method: 'frappe_agt.api.get_item_for_serial_number',
		args: {
			serial_number: sn
		},
		callback: function(r) {
			console.log('[AGT] API response for SN', sn, ':', r.message);
			if (r.message && r.message.items) {
				let items = r.message.items;
				
				if (items.length === 1) {
					console.log('[AGT] API found single item:', items[0].item_code);
					// Auto-fill single match
					frappe.model.set_value(row.doctype, row.name, 'item_code', items[0].item_code)
						.then(function() {
							console.log('[AGT] API item_code set successfully');
							resolve();
						});
				} else if (items.length > 1) {
					console.log('[AGT] API found multiple items, showing dialog');
					// Show selection dialog for multiple matches
					show_item_selection_dialog(frm, row, sn, items, r.message.model);
					resolve();
				} else {
					console.log('[AGT] API found no items for SN:', sn);
					frappe.msgprint({
						title: __('No Items Found'),
						message: __('No items found for serial number {0} (Model: {1})', [sn, r.message.model || 'Unknown']),
						indicator: 'orange'
					});
					resolve();
				}
			} else {
				console.log('[AGT] API returned no data for SN:', sn);
				resolve();
			}
		},
		error: function(error) {
			console.error('[AGT] API error for SN', sn, ':', error);
			reject();
		}
	});
}

function show_item_selection_dialog(frm, row, serial_number, items, model) {
	let dialog = new frappe.ui.Dialog({
		title: __('Select Item for Serial Number: {0}', [serial_number]),
		fields: [
			{
				fieldtype: 'HTML',
				options: `<p><strong>Model:</strong> ${model || 'Unknown'}</p><p>Multiple items found. Please select the correct one:</p>`
			},
			{
				fieldname: 'item_code',
				label: __('Item'),
				fieldtype: 'Select',
				options: items.map(item => item.item_code),
				reqd: 1,
				description: __('Select the correct item code')
			},
			{
				fieldtype: 'HTML',
				fieldname: 'item_details',
				options: generate_items_table(items)
			}
		],
		primary_action_label: __('Select'),
		primary_action: function(values) {
			frappe.model.set_value(row.doctype, row.name, 'item_code', values.item_code);
			dialog.hide();
			frappe.show_alert({
				message: __('Item selected for serial number {0}', [serial_number]),
				indicator: 'green'
			});
		}
	});
	
	dialog.show();
}

function generate_items_table(items) {
	let html = '<table class="table table-bordered table-sm" style="margin-top: 10px;">';
	html += '<thead><tr><th>Item Code</th><th>Item Name</th></tr></thead>';
	html += '<tbody>';
	
	items.forEach(function(item) {
		html += `<tr><td>${item.item_code}</td><td>${item.item_name || ''}</td></tr>`;
	});
	
	html += '</tbody></table>';
	return html;
}
