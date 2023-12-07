import frappe, json


def on_update_after_submit_so(doc, method):
    tracking_numbers = ""
    si = frappe.db.sql(""" SELECT parent FROM `tabSales Invoice Item` WHERE sales_order=%s LIMIT 1 """, (doc.name), as_dict=1)

    weight = 0.0
    for i in doc.shipment_items:
        if tracking_numbers:
            tracking_numbers += ",  "
        tracking_numbers += i.tracking
        weight += float(i.weight)
        if len(si) > 0:
            shipment_items = {
                "doctype": "Sales Invoice Shipment",
                "parent": si[0].parent,
                "parenttype": "Sales Invoice",
                "parentfield": "shipment_items",
                "package": i.package,
                "items": i.items,
                "tracking": i.tracking,
                "quantity": i.quantity,
                "weight": i.weight
            }
            frappe.get_doc(shipment_items).insert(ignore_permissions=True)

    frappe.db.sql(""" UPDATE `tabSales Order` SET shipment_details=%s, shipment_weight=%s WHERE name=%s""",
                  (tracking_numbers, weight, doc.name))
    if len(si) > 0:
        frappe.db.sql(""" UPDATE `tabSales Invoice` SET shipment_amount=%s, shipment_description=%s WHERE name=%s""",
                      (doc.shipment_cost,tracking_numbers, si[0].parent))
    frappe.db.commit()


    doc.reload()


def on_cancel_so(doc, method):
    delivery_notes = frappe.db.sql(
        """ SELECT * FROM `tabDelivery Note Item` WHERE against_sales_order = %s and idx = 1 """, doc.name, as_dict=1)

    for i in delivery_notes:
        packing_slips = frappe.db.sql(
            """ SELECT * FROM `tabPacking Slip` WHERE delivery_note = %s""", i.parent, as_dict=1)
        for ii in packing_slips:
            packing_slips_packages = frappe.db.sql(
                """ SELECT * FROM `tabPacking Slip packages shadow` WHERE parent = %s """, ii.name, as_dict=1)
            for iii in packing_slips_packages:
                if iii.shipment_tracking_number:
                    frappe.throw(
                        "Cannot cancel Sales Order, Shipment Tracking Number is existing in one of the boxes in Packing Slip " + ii.name)


def on_submit_so(doc, method):
    custom = False
    for i in doc.items:
        custom_item_group = frappe.get_value("Item", i.item_code, "item_group")
        if custom_item_group == "Custom":
            custom = True
            break
    doc.has_custom_item = custom


@frappe.whitelist()
def generate_dn(doc):
    doc = json.loads(doc)
    if doc['customer'] != "Cobb Promotions Inc":
        dn_obj = {
            "doctype": "Delivery Note",
            "customer": doc['customer'],
            "company": doc['company'],
            "posting_date": doc['transaction_date'],
            "po_no": doc['po_no'],
            "po_date": doc['po_date'] if 'po_date' in doc else "",
            "items": get_items(doc),
            "currency": doc['currency'],
            "selling_price_list": doc['selling_price_list'],
            "ignore_pricing_rule": doc['ignore_pricing_rule'],
            "campaign": None,

            "shipping_address_name": doc['shipping_address_name'],
            "shipping_address": doc['shipping_address'],
            "contact_person": doc['contact_person'],
            "contact_display": doc['contact_display'],

            "customer_address": doc['customer_address'],
            "address_display": doc['contact_display'],
        }
        dn = frappe.get_doc(dn_obj).insert()
        generate_ps(dn.name, doc)


def get_items(doc):
    fields = ["item_code", "item_name",
              "thumbnail", "description",
              "qty", "stock_uom", "uom",
              "conversion_factor", "stock_qty",
              "price_list_rate", "margin_type",
              "discount_percentage", "discount_amount",
              "rate", "amount",
              "is_free_item", "item_tax_template",
              "billed_amt", "weight_per_unit",
              "weight_uom", "warehouse",
              "actual_qty"
              ]
    items = []

    for i in doc['items']:
        item_obj = {"against_sales_order": doc['name'], 'so_detail': i['name']}
        for ii in fields:
            if ii in i:
                item_obj[ii] = i[ii]

        items.append(item_obj)

    return items

def generate_ps(dn, so):
    doc = frappe.get_doc("Delivery Note", dn)
    shipping_service = frappe.get_doc("Shipping Service", so['shipping_service'])
    shipping_carrier = "USPS" if so['usps_shipment'] or "USPS" in so['shipping_service'] or "Priority Mail" in so['shipping_service'] else "UPS"
    ps_obj = {
        "doctype": "Packing Slip",
        "delivery_note": doc.name,
        "purchase_order": doc.po_no,
        "shipping_carrier": shipping_carrier,
        "shipping_service": so['shipping_service'],
        "service_code": shipping_service.service_code,
        "third_party_shipping": so['contact_display'] if so['third_party_shipping'] else "",
        "inhouse_insurance": 0 if shipping_carrier == "UPS" else 1,
        "ship_to": doc.shipping_address,
        "from_case_no": 1,
        "to_case_no": 1,
        "items": get_items_ps(doc),
    }
    print(ps_obj)
    frappe.get_doc(ps_obj).insert()

def get_items_ps(doc):
    fields = ["item_code", "item_name",
              "thumbnail", "description",
              "qty", "stock_uom",
              "rate",
              "billed_amt", "weight_uom",
              ]
    items = []

    for i in doc.items:
        item_obj = {}
        for ii in fields:
            item_obj[ii] = i.__dict__[ii]

        items.append(item_obj)

    return items
