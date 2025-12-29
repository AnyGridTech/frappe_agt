# In [your_app]/utils/importer.py

import frappe
import csv
import os
import glob # New import

def import_private_csvs():
    """
    Finds all .csv files in the 'private_files' directory of the app,
    and imports them. The filename is used as the DocType name,
    and the CSV headers are used as the field names.
    """
    
    # Get the path to your app
    app_path = frappe.get_app_path('frappe_agt')
    private_files_dir = os.path.join(app_path, 'private_files')

    # Find all .csv files in the directory
    csv_files = glob.glob(os.path.join(private_files_dir, '*.csv'))

    if not csv_files:
        print("No private CSVs found to import.")
        return

    print(f"Found {len(csv_files)} CSV file(s) to import...")

    for csv_file_path in csv_files:
        # === REQUIREMENT 1: Get DocType from filename ===
        # Gets the filename (e.g., "Item.csv")
        filename = os.path.basename(csv_file_path)
        # Gets the name without extension (e.g., "Item")
        doctype_name = os.path.splitext(filename)[0]

        print(f"--- Importing data for DocType: {doctype_name} from {filename} ---")

        # Check if DocType exists first
        if not frappe.db.exists('DocType', doctype_name):
            print(f"ERROR: DocType {doctype_name} does not exist. Skipping file.")
            continue

        try:
            # Open and read the CSV
            with open(csv_file_path, 'r', encoding='utf-8') as csv_file:
                
                # === REQUIREMENT 2: Use header as fields ===
                # DictReader automatically uses the first row as keys (field names)
                reader = csv.DictReader(csv_file)
                
                imported_count = 0
                for row in reader:
                    # 'row' is already a dict: {'item_code': 'A001', 'item_name': 'Test', ...}
                    
                    # Add the doctype to the dictionary
                    row_data = row.copy()
                    row_data['doctype'] = doctype_name
                    
                    try:
                        # Create the new document
                        doc = frappe.get_doc(row_data)
                        doc.insert(ignore_permissions=True)
                        imported_count += 1
                    
                    except frappe.exceptions.DuplicateEntryError:
                        # Handle case where it already exists
                        # This checks for duplicates based on the 'name' field (e.g., item_code)
                        print(f"Skipping duplicate entry for DocType {doctype_name}: {row}")
                    except Exception as e:
                        # Handle other errors (like missing mandatory fields)
                        print(f"Error importing row for {doctype_name}: {row}")
                        print(f"Error: {e}")
            
            print(f"Successfully imported {imported_count} document(s) for {doctype_name}.")

        except Exception as e:
            print(f"Failed to read or process file {filename}: {e}")


    frappe.db.commit() # Commit all changes at the end
    print("--- Private CSV import complete. ---")