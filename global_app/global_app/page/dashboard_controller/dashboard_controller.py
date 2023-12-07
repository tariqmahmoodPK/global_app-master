import frappe
from .other_methods.accounting import get_accounting_data

@frappe.whitelist()
def get_dashboard_data():
    data = []
    get_accounting_data(data)
    return {
        "data": data
    }
