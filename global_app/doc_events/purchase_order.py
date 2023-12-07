import frappe
from global_app.events import change_so_status

def validate_po(doc, method):
    so = doc.items[0].__dict__['sales_order']
    change_so_status(so)