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

function normalize_item_name(item_name) {
	if (!item_name) return '';
	
	return item_name
		.toLowerCase()
		.replace(/[-_]/g, ' ')  // Replace hyphens and underscores with space
		.replace(/\s+/g, '');  // Remove ALL spaces for aggressive matching
}

function auto_fill_items_from_serial_numbers(frm) {
	let start_time = new Date();
	console.log('[AGT] ========== Starting auto-fill process ==========');
	console.log('[AGT] Start time:', start_time.toLocaleTimeString());
	
	frappe.show_alert({
		message: __('Processing serial numbers...'),
		indicator: 'blue'
	});
	
	// Statistics tracking
	let stats = {
		batch_lookup: 0,
		api_lookup: 0,
		multiple_matches: 0,
		not_found: 0
	};
	
	// Track items needing manual selection
	let items_needing_selection = [];
	
	// Step 1: Batch lookup items by item_name (for CSV imports)
	let rows_with_item_name = [];
	let item_names = [];
	
	frm.doc.items.forEach(function(row) {
		if (row.item_name && !row.item_code && row.serial_no) {
			rows_with_item_name.push(row);
			let normalized = normalize_item_name(row.item_name);
			// Store both original and normalized, avoid duplicates
			if (!item_names.some(name => normalize_item_name(name) === normalized)) {
				item_names.push(row.item_name);
			}
		}
	});
	
	console.log('[AGT] Found', item_names.length, 'unique item names for lookup');
	
	let name_lookup_promise = Promise.resolve({});
	
	if (item_names.length > 0) {
		let lookup_start = new Date();
		console.log('[AGT] Starting item name lookup at', lookup_start.toLocaleTimeString());
		
		name_lookup_promise = frappe.call({
			method: 'frappe_agt.api.batch_get_item_code_by_name',
			args: {
				item_names: item_names
			}
		}).then(function(r) {
			let lookup_end = new Date();
			let lookup_duration = ((lookup_end - lookup_start) / 1000).toFixed(2);
			console.log('[AGT] Item name lookup completed in', lookup_duration, 'seconds');
			return r.message || {};
		}).catch(function(error) {
			console.error('[AGT] Item name lookup error:', error);
			return {};
		});
	}
	
	// Step 2: Process all rows
	name_lookup_promise.then(function(item_name_map) {
		console.log('[AGT] Starting row processing...');
		let api_start = new Date();
		let api_rows = []; // Rows that need API lookup
		
		frm.doc.items.forEach(function(row) {
			if (!row.serial_no || row.item_code) return;
			
			// Check if we have item_name and it's in results
			if (row.item_name && item_name_map[row.item_name]) {
				let items = item_name_map[row.item_name];
				
				if (items.length === 1) {
					stats.batch_lookup++;
					// Set directly without triggering validations
					row.item_code = items[0].item_code;
				} else if (items.length > 1) {
					stats.multiple_matches++;
					let sn = row.serial_no.split('\n')[0].trim();
					items_needing_selection.push({
						row: row,
						sn: sn,
						items: items,
						model: row.item_name
					});
				} else {
					// Not found by name, try API
					api_rows.push(row);
				}
			} else {
				// No item_name, use API
				api_rows.push(row);
			}
		});
		
		console.log('[AGT] Found', api_rows.length, 'items requiring Growatt API lookup');
		
		// Process API calls sequentially
		function process_api_sequential(rows) {
			if (rows.length === 0) {
				return Promise.resolve();
			}
			
			let index = 0;
			
			function process_next() {
				if (index >= rows.length) {
					return Promise.resolve();
				}
				
				let row = rows[index];
				let current = index + 1;
				console.log('[AGT] Processing item', current, 'of', rows.length);
				
				index++;
				
				return process_single_api_row(frm, row, stats, items_needing_selection)
					.then(function() {
						return process_next();
					})
					.catch(function(error) {
						console.error('[AGT] Error processing row:', error);
						return process_next();
					});
			}
			
			return process_next();
		}
		
		// Process API calls
		process_api_sequential(api_rows).then(function() {
			let api_end = new Date();
			let api_duration = ((api_end - api_start) / 1000).toFixed(2);
			console.log('[AGT] Growatt API lookups completed in', api_duration, 'seconds');
			
			// Refresh table once at the end - this triggers validations for all items at once
			console.log('[AGT] Refreshing table and triggering validations...');
			frm.refresh_field('items');
			
			let end_time = new Date();
			let total_duration = ((end_time - start_time) / 1000).toFixed(2);
			
			// Log summary
			console.log('[AGT] ========== Auto-fill Summary ==========');
			console.log('[AGT] Results:', {
				'Name Lookup': stats.batch_lookup,
				'API Lookup': stats.api_lookup,
				'Multiple Matches': stats.multiple_matches,
				'Not Found': stats.not_found,
				'Total Items': stats.batch_lookup + stats.api_lookup + stats.multiple_matches + stats.not_found
			});
			console.log('[AGT] Total execution time:', total_duration, 'seconds');
			console.log('[AGT] End time:', end_time.toLocaleTimeString());
			console.log('[AGT] ========== Process completed ==========');
			
			// Show combined selection dialog if needed
			if (items_needing_selection.length > 0) {
				console.log('[AGT] Showing combined selection dialog for', items_needing_selection.length, 'items');
				show_combined_item_selection_dialog(frm, items_needing_selection);
			}
			
			frappe.show_alert({
				message: __('Items auto-filled: {0} by name, {1} by API, {2} manual ({3}s)', 
					[stats.batch_lookup, stats.api_lookup, stats.multiple_matches, total_duration]),
				indicator: 'green'
			});
		}).catch(function(error) {
			console.error('[AGT] Error auto-filling items:', error);
			frappe.show_alert({
				message: __('Error auto-filling some items'),
				indicator: 'red'
			});
		});
	});
}

function process_single_api_row(frm, row, stats, items_needing_selection) {
	return new Promise(function(resolve) {
		if (row.item_code) {
			resolve();
			return;
		}
		
		let serial_numbers = row.serial_no.split('\n').filter(sn => sn.trim());
		if (serial_numbers.length === 0) {
			resolve();
			return;
		}
		
		let sn = serial_numbers[0].trim();
		let resolved = false; // Flag to prevent multiple resolves
		
		console.log('[AGT] Consulting Growatt API for SN:', sn);
		
		let timeout_id = setTimeout(function() {
			if (resolved) return;
			resolved = true;
			console.log('[AGT] API timeout for SN:', sn);
			if (stats) stats.not_found++;
			resolve();
		}, 30000);
		
		frappe.call({
			method: 'frappe_agt.api.get_item_for_serial_number',
			args: {
				serial_number: sn
			},
			callback: function(r) {
				if (resolved) return;
				resolved = true;
				clearTimeout(timeout_id);
				console.log('[AGT] API response for SN', sn, '- Items found:', r.message?.items?.length || 0);
				
				if (r.message && r.message.items && r.message.items.length > 0) {
					let items = r.message.items;
					
					if (items.length === 1) {
						if (stats) stats.api_lookup++;
						// Set directly without triggering validations
						row.item_code = items[0].item_code;
						console.log('[AGT] Item code set for SN:', sn, '- Item:', items[0].item_code);
						resolve();
					} else {
						if (stats) stats.multiple_matches++;
						items_needing_selection.push({
							row: row,
							sn: sn,
							items: items,
							model: r.message.model
						});
						resolve();
					}
				} else {
					if (stats) stats.not_found++;
					console.log('[AGT] No items found for SN:', sn, '- Model:', r.message?.model);
					resolve();
				}
			},
			error: function(error) {
				if (resolved) return;
				resolved = true;
				clearTimeout(timeout_id);
				console.error('[AGT] API error for SN', sn, ':', error);
				if (stats) stats.not_found++;
				resolve();
			}
		}).catch(function(err) {
			// Catch any promise rejection from frappe.call
			if (resolved) return;
			resolved = true;
			clearTimeout(timeout_id);
			console.error('[AGT] Call error for SN', sn, ':', err);
			if (stats) stats.not_found++;
			resolve();
		});
	});
}

function auto_fill_item_for_row(frm, row, stats, items_needing_selection) {
	// This is kept for backward compatibility with items_add trigger
	return process_single_api_row(frm, row, stats, items_needing_selection || []);
}

function fetch_from_api_and_fill(frm, row, sn, stats, resolve, reject) {
	// Deprecated - kept for backward compatibility
	process_single_api_row(frm, row, stats, []).then(resolve).catch(resolve);
}

function show_combined_item_selection_dialog(frm, items_needing_selection) {
	let fields = [
		{
			fieldtype: 'HTML',
			options: `<p><strong>${items_needing_selection.length} items</strong> require manual selection. Please select the correct item for each serial number below:</p>`
		},
		{
			fieldtype: 'Section Break'
		}
	];
	
	// Add a select field for each item
	items_needing_selection.forEach(function(item_data, index) {
		fields.push({
			fieldtype: 'Section Break',
			label: `Serial Number: ${item_data.sn}`
		});
		
		fields.push({
			fieldtype: 'HTML',
			options: `<p><strong>Model:</strong> ${item_data.model || 'Unknown'}</p>${generate_items_table(item_data.items)}`
		});
		
		fields.push({
			fieldname: `item_${index}`,
			label: __('Select Item'),
			fieldtype: 'Select',
			options: item_data.items.map(item => item.item_code),
			reqd: 1,
			default: item_data.items[0].item_code
		});
	});
	
	let dialog = new frappe.ui.Dialog({
		title: __('Select Items for Multiple Serial Numbers'),
		fields: fields,
		size: 'large',
		primary_action_label: __('Apply All Selections'),
		primary_action: function(values) {
			// Apply all selections
			items_needing_selection.forEach(function(item_data, index) {
				let selected_item = values[`item_${index}`];
				item_data.row.item_code = selected_item;
			});
			
			dialog.hide();
			frm.refresh_field('items');
			
			frappe.show_alert({
				message: __('All items selected successfully'),
				indicator: 'green'
			});
		}
	});
	
	dialog.show();
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
