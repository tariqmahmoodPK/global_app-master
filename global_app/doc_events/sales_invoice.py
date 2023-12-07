import frappe

@frappe.whitelist()
def update_si(name, so):
    if so:
        frappe.db.sql(""" UPDATE `tabSales Invoice` SET reference_so=%s WHERE name=%s""", (so, name))
        frappe.db.commit()
        return "Success"
    return "Failed"

def on_submit_si(doc, method):
    print("SUBMIT SIIIIIIIIIIIIIIIIIIIIIIIIIIIII")
    for i in doc.items:
        print(i.__dict__)
        if not i.__dict__['sales_order']:
            frappe.throw(""" Please Create Invoice from Sales Order """)