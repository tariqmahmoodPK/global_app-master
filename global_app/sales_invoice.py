import frappe

@frappe.whitelist()
def get_customer_email(customer):
    customer = frappe.db.sql(""" SELECT * FROM `tabCustomer` WHERE name=%s""",customer,as_dict=True)
    return customer[0].billing_email if customer[0].billing_email else ""