import frappe
from global_app.events import change_so_status

def on_cancel_dn(doc, method):
    packing_slip = frappe.db.sql(""" SELECT * FROM `tabPacking Slip` WHERE delivery_note = %s""", doc.name, as_dict=1)

    for i in packing_slip:
        packing_slip_packages = frappe.db.sql(""" SELECT * FROM `tabPacking Slip packages shadow` WHERE parent=%s """, i.name, as_dict=1)
        for ii in packing_slip_packages:
            if ii.shipment_tracking_number:
                frappe.throw("Cannot cancel Delivery Note, Shipment Tracking Number is existing in one of the boxes in Packing Slip " + i.name)




# def validate_dn(items):
#     so = items.items[0].__dict__['against_sales_order']
#     change_so_status(so)

