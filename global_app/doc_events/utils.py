import frappe
import datetime
import requests
from frappe import _
from frappe.utils import cint, flt
import json


@frappe.whitelist()
def MP_shipment(ship_track, so_no):  # ship_track,so_no
    so = frappe.db.get_all("Sales Order", filters={"name": so_no}, fields=["*"])
    # ship_track=[{'track_number':"1Z53F7010396257544","carrier_code":"ups","shipping_service":"UPS-Ground"}]
    # so_no = "SO-00898"
    so = frappe.get_doc("Sales Order", so_no)
    sales_channel = so.get("sales_channel")
    # ship_track=json.loads(str(ship_track))
    switcher = {
        "CO-AM": "amazon_order_id",
        "COBB-EBAY": "ebay_order_id",
        "COBB-WOO": "woocommerce_id",
        "COBB-MAG": "magento_order_id",
        "FFN-AMA": "amazon_order_id",
        "FFN-EBAY": "ebay_order_id",
        "FFN-WOO": "woocommerce_id",
        "FFN-MAG": "magento_order_id",
        "GLO-AMA": "amazon_order_id",
        "GLO-EBAY": "ebay_order_id",
        "GLO-WOO": "woocommerce_id",
        "GLO-MAG": "magento_order_id"
    }
    channel_controller = so.get(switcher.get(sales_channel, "void"))
    channel_controller_name = sales_channel + "_" + channel_controller
    channel_c_doc = frappe.get_doc(
        "Channel Controller", channel_controller_name)
    channel_c_doc.status = "Shipped"
    tracking_id = ""
    for ship in ship_track:
        tracking_id = ship.get("track_number")

    for item in channel_c_doc.ama_order_item:
        channel_c_doc.append("tracking_info", {
            "quantity": item.quantity,
            "mp_item_id": item.mp_item_id,
            "carrier": ship_track[0].get("carrier_code"),
            "method": ship_track[0].get("shipping_service"),
            "tracking_id": tracking_id,
            "shipped_date": datetime.datetime.now().strftime("%Y/%m/%d %l:%M:%S"),
        })
    channel_c_doc.save()
    frappe.db.commit()
    """channel_controller= so.get(switcher.get(sales_channel,"void"))
			# print(channel_controller)
			channel_c_doc = frappe.get_all("Channel Controller", filters={
			                               'order_id':channel_controller},fields=['*'])[0]
			# print(channel_c_doc)
			doc = frappe.get_doc("Channel Controller",channel_c_doc.name)
			tracking_id=''
			for ship in ship_track:
					tracking_id=tracking_id+ship.get("track_number")+","

			doc.update({
				"carrier":ship_track[0].get("carrier_code"),
				"shipped_date":datetime.datetime.now(),
				"method":ship_track[0].get("shipping_service"),
				"tracking_id":tracking_id,
				"status":"Shipped"
			})
			doc.save(ignore_permissions=True)
			frappe.db.commit()"""


@frappe.whitelist()
def cancel_shipment_cc(name):
    try:
        so = frappe.get_doc("Sales Order", name)
        sales_channel = so.get("sales_channel")
        # ship_track=json.loads(str(ship_track))
        switcher = {
            "CO-AM": "amazon_order_id",
            "COBB-EBAY": "ebay_order_id",
            "COBB-WOO": "woocommerce_id",
            "COBB-MAG": "magento_order_id",
            "FFN-AMA": "amazon_order_id",
            "FFN-EBAY": "ebay_order_id",
            "FFN-WOO": "woocommerce_id",
            "FFN-MAG": "magento_order_id",
            "GLO-AMA": "amazon_order_id",
            "GLO-EBAY": "ebay_order_id",
            "GLO-WOO": "woocommerce_id",
            "GLO-MAG": "magento_order_id"
        }
        channel_controller = so.get(switcher.get(sales_channel, "void"))
        channel_controller_name = sales_channel + "_" + channel_controller
        channel_c_doc = frappe.get_doc(
            "Channel Controller", channel_controller_name)
        channel_c_doc.status = "In-Process"

        channel_c_doc.remove("tracking_info")
        channel_c_doc.save()
    except:
        frappe.log_error(frappe.get_traceback(), 'cancel shipment amazon')


@frappe.whitelist(allow_guest=True)
def gaserp_create_packing_slip(dn_id):
    doc = frappe.new_doc("Packing Slip")
    doc.delivery_note = dn_id

    gaserp_get_items(doc)

    doc.insert()
    doc.save()
    frappe.db.commit()
    return "Packing Slip Created!"


@frappe.whitelist(allow_guest=True)
def gaserp_get_items(doc):
    doc.set("items", [])

    custom_fields = frappe.get_meta("Delivery Note Item").get_custom_fields()

    dn_details = doc.get_details_for_packing()[0]
    for item in dn_details:
        if flt(item.qty) > flt(item.packed_qty):
            ch = doc.append('items', {})
            ch.item_code = item.item_code
            ch.item_name = item.item_name
            ch.stock_uom = item.stock_uom
            ch.description = item.description
            ch.batch_no = item.batch_no
            ch.rate = item.rate
            ch.qty = flt(item.qty) - flt(item.packed_qty)

            # copy custom fields
            for d in custom_fields:
                if item.get(d.fieldname):
                    ch.set(d.fieldname, item.get(d.fieldname))

    doc.update_item_details()


@frappe.whitelist(allow_guest=True)
def get_gaserp_amazon_settings():
    doc = frappe.get_doc("Amazon MWS Settings")
    return doc


@frappe.whitelist(allow_guest=True)
def submit_sales_order(so_num):
	doc = frappe.get_doc("Sales Order", so_num)
	doc.docstatus = 1
	doc.insert()
	doc.submit()
	frappe.db.commit


@frappe.whitelist()
def save_ps():
    ps = frappe.db.sql(""" SELECT * FROm `tabPacking Slip` WHERE ship_to is null""", as_dict=1)
    for i in ps:
        try:
            ps_ = frappe.get_doc("Packing Slip", i.name)
            ps_.save()
            print("DONE SAVING " + i.name)
        except:
            print(frappe.get_traceback())


@frappe.whitelist()
def save_customer():
    customers = frappe.db.sql(""" SELECT * FROM tabCustomer WHERE email_id != billing_email OR billing_email IS NULL OR email_id IS NULL""", as_dict=1)
    for i in customers:
        try:
            customer = frappe.get_doc("Customer", i.name)
            customer.save()
            print("DONE SAVING " + i.name)
        except:
            print(frappe.get_traceback())

