import frappe



def get_usps_settings():
    usps_settings = frappe.db.sql(""" SELECT * FROM `tabUSPS Charges` WHERE parent=%s """, "USPS Settings", as_dict=1)
    print('USPS Priority Mail - Regional Rate Box - A1' in [i.shipment for i in usps_settings])
    print([i.charge for i in usps_settings if i.shipment == 'USPS Priority Mail - Regional Rate Box - A1'])