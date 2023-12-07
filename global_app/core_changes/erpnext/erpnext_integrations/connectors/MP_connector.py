from __future__ import unicode_literals
import frappe, base64, hashlib, hmac, json
import datetime
from frappe import _
from erpnext.erpnext_integrations.utils import validate_ups_Address, mp_validate_item
from frappe import msgprint, _
from datetime import date
from erpnext.erpnext_integrations.utils import link_customer_and_address, create_mp_orders


# from erpnext.erpnext_integrations.doctype.amazon_mws_settings.amazon_methods import mp_validate_amazon_items


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
    channel_c_doc = frappe.get_doc("Channel Controller", channel_controller_name)
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


@frappe.whitelist(allow_guest=True)
def testing_sync_outside(data=None):
    # fd=json.loads(str(data))
    # return frappe.form_dict
    data = json.dumps({'name': 'eyconsrv', 'description': 'some test repo'})
    return data


@frappe.whitelist(allow_guest=True)
def check_items_availabilty_IN_CA(data=None):
    print(data)
    items_list = json.loads(data.decode('utf-8'))
    """items_list=[{  
			"item_code":'CB-NSFB-5682-01',		
			"qty": '2',				
			"mp_line_item_id":'19217942591746',
			"item_name": 'Cobb Promo Boat Sale (Green) Feather Flag with Complete 15ft Pole kit and Ground Spike'
		}]"""
    list = []
    item_avai = []
    title = ""
    Status = ""
    res_item = []
    for item in items_list:
        # list1=[]
        # list1=mp_validate_amazon_items(item['item_code'],item['qty'])
        # for x in list1:
        list.append({"item_code": item["item_code"], "quantity": item["quantity"]})
    if list is None:
        return json.dumps([{'title': "SysMsg:ALGO Items not found in inventory", 'Status': "On-Hold"}])
    else:
        for li in list:
            req_qty = int(li.get("quantity"))
            item_name = frappe.db.get_all("Item", filters={"item_code": li.get("item_code")},
                                          fields=["item_name", "is_stock_item"])
            dis_con = frappe.db.get_all("Item", filters={"item_code": li.get("item_code"), "disabled": 1},
                                        fields=["item_code"])
            list_qty = frappe.db.get_all("Bin", filters={"item_code": li.get("item_code")}, fields=["actual_qty"])

            item_type = li.get("type")
            if (item_name):
                avai_qty = ""
                if (item_name[0]["is_stock_item"]):
                    # avai_qty=list_qty[0]['actual_qty']
                    avai_qty = 100
                    # if(int(avai_qty) < req_qty):
                    #    title+="SysMsg: Item not found in CA inventory.\n"
                    #    Status="On-Hold"
                    #    avai_qty=0

                if (dis_con):
                    title = "SysMsg:" + li.get("item_code") + " is discontinued in CA.\n"
                    Status = "On-Hold"
                    avai_qty = ""
                    # res_item.append({"item_code":li.get("item_code"),"qty":req_qty,"stock_in_hand":avai_qty})
            else:
                title += "SysMsg: Item not found in CA inventory.\n"
                Status = "On-Hold"
                avai_qty = ""

        return {'title': title, 'Status': Status}
        # return ss


@frappe.whitelist(allow_guest=True)
def set_controller_from_controller():
    # fd=json.loads(data.decode('utf-8'))
    # fd=json.loads(data)
    fd = json.loads(frappe.request.data.decode('utf-8'))
    ord_id = ""
    for key in fd:
        # print(key["orders"])
        ord_id = key["orders"]["order_id"]
        channel = key["orders"]["channel"]
        co = frappe.db.get_all("Channel Controller", filters={"order_id": ord_id, "channel": channel}, fields=["name"])
        # if len(co)==0:
        now = datetime.datetime.now()
        status = "Received"
        reason = ""
        new_cha_cont = frappe.new_doc("Channel Controller")
        new_cha_cont.order_id = ord_id
        new_cha_cont.channel = channel
        new_cha_cont.controller_id = key["orders"]["controller_id"]
        new_cha_cont.ship_to = key["orders"]["ship_to"]
        new_cha_cont.latest_deliver = key["orders"]["latest_deliver"]
        new_cha_cont.date_time = key["orders"]["date_time"]
        new_cha_cont.customer = "Cobb Promotions Inc"
        new_cha_cont.priority = key["orders"]["priority"]
        new_cha_cont.address_line_1 = key["orders"]["address_line_1"]
        new_cha_cont.address_line_2 = key["orders"]["address_line_2"]
        new_cha_cont.city = key["orders"]["city"]
        new_cha_cont.state = key["orders"]["state"]
        new_cha_cont.phone = key["orders"]["phone"]
        new_cha_cont.pincode = key["orders"]["pincode"]
        new_cha_cont.region = key["orders"]["region"]
        new_cha_cont.assigned_to = key["orders"]["assigned_to"]
        new_cha_cont.shipping_address_validation = key["orders"]["shipping_address_validation"]
        new_cha_cont.classification = key["orders"]["classification"]
        new_cha_cont.status = status
        for key1 in key["ama_order_item"]:
            new_cha_cont.append("ama_order_item", {
                "item_sku": key1['item_sku'],
                "title": key1["title"],
                "quantity": key1['quantity'],
                "mp_item_id": key1["mp_item_id"]
            })
            """new_cha_cont.append("tracking_info",{
                    "mp_item_id":key1["mp_item_id"],
                    "quantity": key1['quantity'],
                    "carrier":"UPS",   
                    "method":"Ground"				
                })"""
        for key2 in key["controller_item"]:
            new_cha_cont.append("items", {
                "item_code": key2['item_code'],
                "qty": key2['qty'],
                "item_name": key2['item_name']
            })
        frappe.local.login_manager.user = 'Administrator'
        frappe.local.login_manager.post_login()
        new_cha_cont.insert()
        frappe.db.commit()
    return "success"
