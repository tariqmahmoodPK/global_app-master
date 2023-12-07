import frappe
from datetime import *

def get_columns(fieldname):
    columns = []
    date_today = frappe.utils.now_datetime().date()
    from_ = frappe.utils.now_datetime().date()
    to_ = ""
    columns.append(fieldname +" = '" + str(from_) + "'")

    for i in [7,30,60]:
        to_ = from_ - timedelta(days=1)
        from_ = date_today - timedelta(days=i)
        columns.append(fieldname + " BETWEEN '" + str(from_) + "' and '" + str(to_) + "'")
    return columns

def get_columns_other_system(fieldname):
    columns = []
    date_today = frappe.utils.now_datetime().date()
    from_ = frappe.utils.now_datetime().date()
    to_ = ""
    columns.append(fieldname +" = '" + str(from_) + "'")

    for i in [2,3,4,5]:
        if i < 5:
            to_ = from_ - timedelta(days=1)
            from_ = date_today - timedelta(days=i)
            columns.append(fieldname + " BETWEEN '" + str(from_) + "' and '" + str(to_) + "'")
        else:
            to_ = from_ - timedelta(days=1)
            from_ = date_today - timedelta(days=i)
            columns.append(fieldname + " < '" + str(to_) + "'")

    return columns

