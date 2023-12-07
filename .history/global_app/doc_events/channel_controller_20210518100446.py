from frappe.frappeclient import FrappeClient
import frappe
import datetime
import json
import requests


def check_items_availabilty_IN_CA(itm):
    items_list = json.loads(itm)
    print(items_list)
    list = []
    item_avai = []
    title = ""
    Status = ""
    res_item = []
    for item in items_list:

        # list1=[]
        # list1=mp_validate_amazon_items(item['item_code'],item['qty'])
        # for x in list1:
        list.append({"item_code": item["item_sku"], "quantity": item["qty"]})

    if list is None:
        return json.dumps([{'title': "SysMsg:ALGO Items not found in inventory", 'Status': "On-Hold"}])
    else:
        for li in list:
            print(li)
            req_qty = int(li.get("quantity"))
            item_name = frappe.db.get_all("Item", filters={"item_code": li.get("item_code")},
                                          fields=["item_name", "is_stock_item"])
            dis_con = frappe.db.get_all("Item", filters={"item_code": li.get("item_code"), "disabled": 1},
                                        fields=["item_code"])
            list_qty = frappe.db.get_all(
                "Bin", filters={"item_code": li.get("item_code")}, fields=["actual_qty"])

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
                    title = "SysMsg:" + \
                        li.get("item_code") + " is discontinued in CA.\n"
                    Status = "On-Hold"
                    avai_qty = ""
                # res_item.append({"item_code":li.get("item_code"),"qty":req_qty,"stock_in_hand":avai_qty})
            else:
                title += "SysMsg: Item not found in CA inventory.\n"
                Status = "On-Hold"
                avai_qty = ""

    return {'title': title, 'Status': Status}


def mp_get_amazon_items(ama_item_code, req_quantity):
    req_quantity = int(req_quantity)
    result_NSFB = ama_item_code.find('NSFB-')
    result_NSF = ama_item_code.find('NSF-')
    result_312NS = ama_item_code.find('312NS')
    result_NSRE = ama_item_code.find('NSRE')
    result_GD11 = ama_item_code.find('GD-11')
    result_GD12 = ama_item_code.find('GD-12')
    result_NSNB = ama_item_code.find('NS-NB')
    result_NSW = ama_item_code.find('NSW')
    final_order_items = []
    if (result_NSFB != -1):
        item_code_s = ama_item_code.split('-')
        item_code = item_code_s[1] + "-" + item_code_s[2]
        if (item_code_s[3] == '01'):
            final_order_items.append({
                "item_code": item_code,
                "quantity": 1 * req_quantity
            })
            final_order_items.append({
                "item_code": "NSH-730E15",
                "quantity": 1 * req_quantity
            })
            final_order_items.append({
                "item_code": "NSH-739",
                "quantity": 1 * req_quantity
            })
        elif (item_code_s[3] == '00'):
            final_order_items.append({
                "item_code": item_code,
                "quantity": 1 * req_quantity
            })
    elif (result_NSF != -1):
        item_code_s = ama_item_code.split('-')
        item_code = item_code_s[1] + "-" + item_code_s[2]
        if (item_code_s[3] == '01'):
            final_order_items.append({
                "item_code": item_code,
                "quantity": 1 * req_quantity
            })
            final_order_items.append({
                "item_code": "NSH-730E15",
                "quantity": 1 * req_quantity
            })
            final_order_items.append({
                "item_code": "NSH-739",
                "quantity": 1 * req_quantity
            })
        elif (item_code[3] == '00'):
            final_order_items.append({
                "item_code": item_code,
                "quantity": 1 * req_quantity
            })
    elif (result_312NS != -1):
        item_code_s = ama_item_code.split('-')
        item_code = item_code_s[1]
        final_order_items.append({
            "item_code": item_code,
            "quantity": 1 * req_quantity
        })
        final_order_items.append({
            "item_code": "NSH-732E15",
            "quantity": 1 * req_quantity,
        })
        final_order_items.append({
            "item_code": "NSH-702",
            "quantity": 1 * req_quantity,
        })
    elif (result_NSRE != -1):
        item_code_s = ama_item_code.split('-')
        item_code = item_code_s[1] + "-" + item_code_s[2]
        final_order_items.append({
            "item_code": item_code,
            "quantity": 1 * req_quantity,
        })
        final_order_items.append({
            "item_code": "NSH-731",
            "quantity": 1 * req_quantity,
        })
        final_order_items.append({
            "item_code": "NSH-724",
            "quantity": 1 * req_quantity,
        })
        final_order_items.append({
            "item_code": "NSH-720",
            "quantity": 1 * req_quantity,
        })
    elif (result_GD11 != -1):
        item_code_s = ama_item_code.split('-')
        item_code = item_code_s[1] + "-" + item_code_s[2]
        if (item_code_s[3] == '1'):
            final_order_items.append({
                "item_code": item_code,
                "quantity": 1 * req_quantity
            })
            final_order_items.append({
                "item_code": "NSH-758",
                "quantity": 1 * req_quantity
            })
        elif (item_code_s[3] == '0'):
            final_order_items.append({
                "item_code": item_code,
                "quantity": 1 * req_quantity
            })
            print(final_order_items)
    elif (result_GD12 != -1):
        item_code_s = ama_item_code.split('-')
        item_code = item_code_s[1] + "-" + item_code_s[2]
        if (item_code_s[3] == '0'):
            final_order_items.append({
                "item_code": item_code,
                "quantity": 1 * req_quantity
            })
        elif (item_code_s[3] == '1'):
            final_order_items.append({
                "item_code": item_code,
                "quantity": 1 * req_quantity
            })
            final_order_items.append({
                "item_code": "NSH-765",
                "quantity": 1 * req_quantity
            })
    elif (result_NSNB != -1):
        item_code_s = ama_item_code.split('-')
        item_code = item_code_s[1] + "-" + item_code_s[2]
        final_order_items.append({
            "item_code": item_code,
            "quantity": 1 * req_quantity
        })
        final_order_items.append({
            "item_code": "NSH-760L",
            "quantity": 1 * req_quantity
        })
        final_order_items.append({
            "item_code": "NSH-724",
            "quantity": 1 * req_quantity
        })
    elif (result_NSW != -1):
        item_code_s = ama_item_code.split('-')
        item_code = item_code_s[1] + "-" + item_code_s[2]
        final_order_items.append({
            "item_code": item_code,
            "quantity": 1 * req_quantity
        })
    return final_order_items


def channel_controller_generate_items(order):

    final_order_items = []

    for item in order:
        final_order_items.append({
            "item_sku": item['sku'],
            "title": item['title'],
            "qty": item['qty'],
            "mp_item_id": item['item_id']
        })

    return final_order_items


def channel_controller_create_shipping_address(data):

    shipping_data = data['shipping_data']

    phone = data['phone']

    email = data['email']

    existing_address = frappe.db.get_value(
        "Address", filters={"address_title": shipping_data['name']})

    if not existing_address:

        new_address = frappe.new_doc("Address")
        new_address.address_title = shipping_data['name']
        new_address.attention_name = shipping_data['name']
        new_address.phone = phone
        new_address.email_id = email
        new_address.address_line1 = shipping_data['address1']
        new_address.address_line2 = shipping_data['address2']
        new_address.city = shipping_data['city']
        new_address.state = shipping_data["state"]
        new_address.pincode = shipping_data['postalCode']
        new_address.address_type = "Shipping"
        new_address.append("links", {
            "link_doctype": "Customer",
            "link_name": "Walmart (Marketplace)"
        })

        new_address.insert()
        frappe.db.commit()

    return shipping_data


def validate_ups_Address(data):
    address = []
    if (data['address2'] != ""):
        address = data['address2']
        address = data['address1']
    else:
        address = data['address1']

    headers = {
        'Access-Control-Allow-Origin': '*',
        "Access-Control-Allow-Headers": "X-Requested-With"
    }
    payload = {"XAVRequest": {"AddressKeyFormat":
                              {"CountryCode": "US",
                               "PostcodePrimaryLow": data['postalCode'],
                               "ConsigneeName": "",
                               "AddressLine": address,
                               "PoliticalDivision2": "",
                               "PoliticalDivision1": data['state'],
                               "BuildingName": ""},
                              "Request": {"RequestOption": "3",
                                          "TransactionReference": {"CustomerContext": ""}},
                              "MaximumListSize": "10"},
               "UPSSecurity": {"ServiceAccessToken":
                               {"AccessLicenseNumber": "5D503DAFAFF485B5"},
                               "UsernameToken": {"Username": "cobbpromo", "Password": "X%(8BJ68)"}}}
    """payload = {"XAVRequest": {"AddressKeyFormat":   
			{"CountryCode": "US",
			"PostcodePrimaryLow":"92507", 
			"ConsigneeName":"", 
			"AddressLine":"6251 Box Springs Blvd", 
			"PoliticalDivision2":"",  
			"PoliticalDivision1":"CA", 
			"BuildingName":None},     
			"Request":{"RequestOption": "3", 
			"TransactionReference": {"CustomerContext": ""}}, 
			"MaximumListSize":"10"}, 
			"UPSSecurity":{"ServiceAccessToken": 
			{"AccessLicenseNumber":"5D503DAFAFF485B5"}, 
			"UsernameToken": {"Username":"cobbpromo","Password":"X%(8BJ68)"}}} """
    data = json.dumps(payload)
    r = requests.post('https://onlinetools.ups.com/rest/XAV',
                      data=data, headers=headers)

    return r.json()


#order, ord_id, cust_title, ship_to, shipping_data, channel
@frappe.whitelist()
def make_channel_controller(data):

    # c_order_id = ""
    # c_channel = ""
    # c_customer_id = ""
    # c_address1 = ""
    # c_address2 = ""
    # c_postalCode = ""
    # c_state = ""
    # c_city = ""
    # c_ship_to = ""
    # c_latest_deliver = ""
    # c_phone = ""
    # c_item_sku = ""
    # c_title = ""
    # c_qty = ""
    # c_item_id = ""
    # c_email = ""
    # data = {
    #     "order_id": c_order_id,
    #     "channel": c_channel,
    #     "customerOrderId": c_customer_id,
    #     "email": c_email,
    #     "shipping_data":{
    #         "address1": c_address1,
    #         "address2": c_address2,
    #         "postalCode": c_postalCode,
    #         "state": c_state,
    #         "city": c_city
    #         },
    #     "ship_to": c_ship_to,
    #     "latest_deliver": c_latest_deliver,
    #     "phone": c_phone,
    #     "order": {
    #         "item_sku": c_item_sku,
    #         "title": c_title,
    #         "quantity": c_qty,
    #         "mp_item_id": c_item_id
    #     }

    # }

    data = json.loads(data)

    war = 0
    err = 0
    tt_ord = 0

    co = frappe.db.get_all("Channel Controller", filters={
                           "order_id": data["order_id"], "channel": data['channel']}, fields=["name"])
    if len(co) == 0:
        now = datetime.datetime.now()
        status = "Received"
        reason = ""
        assigned_to = ""
        # latest_ship = order.LatestDeliveryDate.split("T")
        new_cha_cont = frappe.new_doc("Channel Controller")
        new_cha_cont.order_id = data["order_id"]
        new_cha_cont.channel = data['channel']
        new_cha_cont.controller_id = data['channel'] + "_" + data["order_id"]
        new_cha_cont.customer_order_id = data['customerOrderId']

        ups_val = validate_ups_Address(data['shipping_data'])

        if 'ValidAddressIndicator' in ups_val['XAVResponse']:
            new_cha_cont.shipping_address_validation = "<span style='color:green'>Valid Address</span>"
            new_cha_cont.classification = ups_val['XAVResponse']['AddressClassification']['Description']
        if 'NoCandidatesIndicator' in ups_val['XAVResponse']:
            new_cha_cont.shipping_address_validation = "<b style='color:red'>Invalid Address</b>"
            new_cha_cont.classification = ""
            status = "On-Hold"
            reason += "System Msg: Order stopped, invalid address.\n"
            err = err + 1

        if 'AmbiguousAddressIndicator' in ups_val['XAVResponse']:
            new_cha_cont.shipping_address_validation = "<b style='color:orange'>Ambiguous Address</b>"
            new_cha_cont.classification = ""
            status = "On-Hold"
            war = war + 1
            reason += "System Msg: Order stopped, Ambiguous Address.\n"
            address_list = ups_val['XAVResponse']['Candidate']
            # frappe.msgprint(address_list)
            desc_address = ""
            if type(address_list) == list:
                for add in address_list:
                    address = add['AddressKeyFormat']
                    if len(address['AddressLine']) > 0:
                        AddressLine = address['AddressLine'][0]
                    else:
                        AddressLine = address['AddressLine']
                    f_Add = AddressLine + ", " + address['PoliticalDivision2'] + ", " + address[
                        'PostcodePrimaryLow'] + ", " + address['CountryCode']

                    desc_address += f_Add + "??"
                new_cha_cont.suggestions_1 = desc_address
            else:
                address = address_list['AddressKeyFormat']
                if (len(address['AddressLine']) > 0):
                    AddressLine = address['AddressLine'][0]
                else:
                    AddressLine = address['AddressLine']
                f_Add = AddressLine + ", " + address['PoliticalDivision2'] + ", " + address[
                    'PostcodePrimaryLow'] + ", " + address['CountryCode']

                desc_address += f_Add + "??"
                new_cha_cont.suggestions_1 = desc_address

        new_cha_cont.ship_to = data['ship_to']

        latest_date = data['latest_deliver']

        new_cha_cont.latest_deliver = latest_date
        new_cha_cont.date_time = now.strftime("%Y-%m-%d, %H:%M:%S")
        new_cha_cont.customer = "Cobb Promotions Inc"
        new_cha_cont.company = data['ship_to']
        # new_cha_cont.priority = order.ShipServiceLevel
        new_cha_cont.address_line_1 = data['shipping_data']["address1"]
        new_cha_cont.address_line_2 = data['shipping_data']["address2"]
        new_cha_cont.city = data['shipping_data']["city"]
        state = data['shipping_data']["state"]
        new_cha_cont.state = state
        phone = data['phone']
        new_cha_cont.phone = phone
        new_cha_cont.pincode = data['shipping_data']["postalCode"]
        state_channel = frappe.db.get_all(
            "US States", filters={"abb": state}, fields=["mp_channel"])
        if (len(state_channel) > 0):
            region = state_channel[0]["mp_channel"]
        else:
            state_channel_s = frappe.db.get_all(
                "US States", filters={"name": state}, fields=["mp_channel"])
            if (len(state_channel_s) > 0):
                region = state_channel_s[0]["mp_channel"]
            else:
                region = "GA"
        new_cha_cont.region = region
        assigned_to = region
        list_ama = []
        missing_item = []
        if(data["isChannelController"] == "1"):
            items_list = channel_controller_generate_items(data['order'])

            for item in items_list:
                new_cha_cont.append("ama_order_item", {

                    "item_sku": item['item_sku'],
                    "title": item['title'],
                    "quantity": item['qty'],
                    "mp_item_id": item['mp_item_id']
                })

                list1 = []
                list1 = mp_get_amazon_items(item['item_sku'], item['qty'])
                for x in list1:
                    list_ama.append(
                        {"item_code": x["item_code"], "quantity": x["quantity"]})
        else:
            list_ama = data['order']

        if list_ama is None:
            updated_db = False
            reason += "Algo Item Not Found In inventory "
            status = "On-Hold"
        else:
            for li in list_ama:
                req_qty = int(li.get("quantity"))
                item_name = frappe.db.get_all("Item", filters={"item_code": li.get("item_code")},
                                              fields=["item_name", "is_stock_item"])
                item_disab = frappe.db.get_all("Item", filters={"item_code": li.get("item_code"), "disabled": 1},
                                               fields=["item_name"])
                list_qty = frappe.db.get_all(
                    "Bin", filters={"item_code": li.get("item_code")}, fields=["actual_qty"])
                if item_name:
                    if item_name[0]["is_stock_item"]:
                        # avai_qty=list_qty[0]['actual_qty']
                        if list_qty:
                            # avai_qty=100
                            avai_qty = list_qty[0]['actual_qty']
                            if int(avai_qty) < req_qty:
                                missing_item.append(
                                    {"item": li.get("item_code")})
                                avai_qty = 0
                        else:
                            avai_qty = ""
                    else:
                        avai_qty = ""

                    if item_disab:
                        reason += "SysMsg:" + \
                            li.get("item_code") + " is discontinued. \n"
                        status = "On-Hold"
                        err = err + 1

                    new_cha_cont.append("items", {
                        "item_code": li.get("item_code"),
                        "qty": li.get("quantity"),
                        "item_name": item_name[0]["item_name"],
                        "stock_in_hand": avai_qty
                    })
                else:
                    missing_item.append({"item": li.get("item_code")})
            if region == "GA":
                if missing_item:
                    print("REGION GA")
                    itm_list = json.dumps(items_list)
                    data_r = check_items_availabilty_IN_CA(itm_list)
                    if data_r['title'] == "":
                        assigned_to = "CA"
                        m_item = ""
                        for mi in missing_item:
                            print("----GA----")
                            print(mi)
                            m_item += mi.get("item") + ','
                        reason += "SysMsg: Moved to CA due to " + m_item + " is missing at GA. \n"
                    else:
                        reason += data_r['title']
                        status = "On-Hold"
                        reason += "SysMsg: Item Not Found in GA,CA inventory. \n"
                        war = war + 1
            if region == "CA":
                print("REGION CA")
                itm_list = json.dumps(items_list)
                data_r = check_items_availabilty_IN_CA(itm_list)
                print(data_r)
                if data_r['title'] != "":
                    m_item = ""
                    if missing_item:
                        for mi in missing_item:
                            print("----CA----")
                            print(mi)
                            m = " " + mi.get('item') + ","
                            m_item += m
                        Status = "On-Hold"
                        reason += "SysMsg: In-sufficient stock of " + m_item + " in GA.\n"
                        war = war + 1
                    else:
                        assigned_to = "GA"
                        reason += "SysMsg: Moved to GA due to stockouts at CA.\n"

        new_cha_cont.assigned_to = assigned_to
        new_cha_cont.status = status
        new_cha_cont.reasons = reason
        new_cha_cont.insert()
        frappe.db.commit()
        tt_ord = 1
    return war, err, tt_ord


@frappe.whitelist()
def saved_channel_controller(name, status):
    doc = frappe.get_doc("Channel Controller", name)
    doc.status = status
    doc.save()

    return "Channel Controller Saved!"


@frappe.whitelist()
def get_sales_order_count(po_no):

    count_no_of_open_so = frappe.db.get_all("Sales Order", filters={
                                            "po_no": po_no, "status": "To Deliver and Bill"}, fields=['*'])

    all_doc = frappe.get_all("Sales Order", filters={
                             'po_no': po_no}, fields=['name'])

    message = {"open_count": len(count_no_of_open_so), "count": len(all_doc)}

    return message


@frappe.whitelist()
def get_delivery_note_count(po_no):

    open_doc = frappe.get_all("Delivery Note", filters={
                              'po_no': po_no}, fields=['name'])

    message = {"open_count": len(open_doc), "count": len(open_doc)}

    return message


@frappe.whitelist()
def get_packing_slip_count(po_no):

    open_doc = frappe.get_all("Packing Slip", filters={
                              "purchase_order": po_no, "docstatus": "0"}, fields=['name'])

    all_doc = frappe.get_all("Packing Slip", filters={
                             'purchase_order': po_no}, fields=['name'])

    message = {"open_count": len(open_doc), "count": len(all_doc)}

    return message


@frappe.whitelist()
def get_packing_without_cost():

    ps_no_cost = frappe.db.sql("""SELECT  psp.creation,so.name as SO_NAME ,so.shipment_cost as SO_COST,pslip.name as PSLIP_NAME, psp.parent as PSP_PARENT,psp.shipment_tracking_number , psp.shipment_cost as PSP_SHIPMENT_COST, psp.weight FROM `tabPacking Slip packages shadow` as psp
        inner join `tabPacking Slip` as pslip ON psp.parent = pslip.name
        inner join `tabSales Order` as so ON so.po_no = pslip.purchase_order
        WHERE (psp.shipment_tracking_number is NOT NULL or psp.shipment_tracking_number != "") AND (psp.shipment_cost is NULL or psp.shipment_cost = "" or psp.shipment_cost = 0 or psp.shipment_cost = "0" )
        AND ((so.shipment_cost is NULL or so.shipment_cost = "" or psp.shipment_cost = "0" or psp.shipment_cost = 0))AND so.docstatus = 1 AND psp.creation > '2020-08-12' ORDER BY psp.creation DESC""", as_dict=1)

    return ps_no_cost


@frappe.whitelist()
def update_packing_slip(cost, wt, name):
    frappe.db.sql(
        """ UPDATE `tabPacking Slip packages shadow` SET shipment_cost=%s, weight=%s WHERE name=%s""", (cost, wt, name))
    x = frappe.db.sql(
        """SELECT shipment_cost,weight FROM `tabPacking Slip packages shadow` WHERE name = %s""", name, as_dict=1)
    frappe.db.commit()
    return x


# INTEGRATION


# UPDATE CHANNEL CONTROLLER IF IT HAS TRACKING NUMBER
@frappe.whitelist()
def generate_shipping_details_if_updated():

    print("GENERATING BACKGROUND")

    channel_controller_list = check_cc_query("null")

    for cc_list in channel_controller_list:

        print(cc_list.cc_name)

        channel_controller_doc = frappe.get_doc(
            "Channel Controller", cc_list.cc_name)

        ps = frappe.db.get_all("Packing Slip", filters={
            "purchase_order": cc_list.order_id}, fields=['*'])

        if len(ps) >= 1:
            pslip = frappe.get_doc("Packing Slip", ps[0].name)
            if len(pslip.packages_information) >= 1:
                if pslip.packages_information[0].shipment_tracking_number:

                    tracking_id = pslip.packages_information[0].shipment_tracking_number
                    shipment_cost = pslip.packages_information[0].shipment_cost
                    shipment_weight = pslip.packages_information[0].weight
                    shipping_carrier = pslip.shipping_carrier
                    so_name = cc_list.so_name
                    date = pslip.modified

                    so = frappe.get_doc("Sales Order", so_name)

                    channel_controller_list.status = "Shipped"
                    for item in channel_controller_doc.ama_order_item:
                        channel_controller_doc.append("tracking_info", {
                            "quantity": item.quantity,
                            "mp_item_id": item.mp_item_id,
                            "carrier": shipping_carrier,
                            "method": so.shipping_service,
                            "tracking_id": tracking_id,
                            "shipped_date": date.strftime("%Y/%m/%d %l:%M:%S"),
                        })

                    channel_controller_doc.save()

                    # remote_update_channel_controller_amazon(so.po_no,shipping_carrier,so.shipping_service,tracking_id,date)
                    # remote_update_sales_order(tracking_id, shipment_cost, so.po_no, shipment_weight)
                    # Add script

        # END AMAZON CUSTOMER

    return "SUCCESS"


# This function check if the packing slip has benn updated
# If the channel controller didnt match from the tracking number in sales order it will update
# the channel controller then push the shiping details
@frappe.whitelist()
def channel_controller_update_shipping_details():

    channel_controller_list = check_cc_query("not null")

    for cc_list in channel_controller_list:

        channel_controller_doc = frappe.get_doc(
            "Channel Controller", cc_list.cc_name)

        ps = frappe.db.get_all("Packing Slip", filters={
            "purchase_order": cc_list.order_id}, fields=['*'])

        if channel_controller_doc.customer == "Cobb Promotions Inc":

            if len(ps) >= 1:
                pslip = frappe.get_doc("Packing Slip", ps[0].name)
                if len(pslip.packages_information) >= 1:
                    if pslip.packages_information[0].shipment_tracking_number != channel_controller_doc.tracking_info[0].tracking_id or channel_controller_doc.tracking_info[0].carrier != pslip.shipping_carrier or channel_controller_doc.tracking_info[0].method != pslip.shipping_service:

                        tracking_id = pslip.packages_information[0].shipment_tracking_number
                        shipment_cost = pslip.packages_information[0].shipment_cost
                        shipment_weight = pslip.packages_information[0].weight
                        shipping_carrier = pslip.shipping_carrier
                        so_name = cc_list.so_name
                        date = pslip.modified

                        so = frappe.get_doc("Sales Order", so_name)

                        channel_controller_list.status = "Shipped"
                        for item in channel_controller_doc.ama_order_item:
                            channel_controller_doc.append("tracking_info", {
                                "quantity": item.quantity,
                                "mp_item_id": item.mp_item_id,
                                "carrier": shipping_carrier,
                                "method": so.shipping_service,
                                "tracking_id": tracking_id,
                                "shipped_date": date.strftime("%Y/%m/%d %l:%M:%S"),
                            })

                        channel_controller_doc.save()

                        # remote_update_channel_controller_amazon(so.po_no,shipping_carrier,so.shipping_service,tracking_id,date)
                        # remote_update_sales_order(tracking_id, shipment_cost, so.po_no, shipment_weight)


def check_cc_query(value):
    sql = frappe.db.sql(
        "SELECT cc.name as 'cc_name',so.name as 'so_name',cc.order_id FROM `tabChannel Controller` as cc LEFT JOIN `tabController Tracking Table` as ctt ON cc.name = ctt.parent LEFT JOIN `tabSales Order` as so ON cc.order_id = so.po_no where so.name is not null and ctt.tracking_id is "+value+" and so.customer='Cobb Promotions Inc' GROUP BY cc.name", as_dict=1)

    return sql


def update_all(order_id):

    try:
        so_list = frappe.get_all("Sales Order", filters={
                                 "po_no": order_id}, fields=['*'])
        cc_list = frappe.get_all("Channel Controller", filters={
                                 "order_id": order_id}, fields=['*'])

        so_doc = frappe.get_doc("Sales Order", so_list[0].name)

        ps_list = frappe.db.get_all("Packing Slip", filters={
                                    "purchase_order": order_id}, fields=['*'])

        pslip = frappe.get_doc("Packing Slip", ps_list[0].name)

        shipping_carrier = pslip.shipping_carrier
        shipping_service = so_doc.shipping_service
        shipping_cost = so_doc.shipment_cost
        shipment_weight = so_doc.shipment_weight
        tracking_number = so_doc.shipment_details

        date = pslip.modified.strftime("%Y/%m/%d %l:%M:%S")

        if len(cc_list) > 0:
            cc_doc = frappe.get_doc("Channel Controller", cc_list[0].name)
            cc_doc.status = "Shipped"
            for item in cc_doc.ama_order_item:
                cc_doc.append("tracking_info", {
                    "quantity": item.quantity,
                    "mp_item_id": item.mp_item_id,
                    "carrier": shipping_carrier,
                    "method": shipping_service,
                    "tracking_id": tracking_number,
                    "shipped_date": date,
                })

            cc_doc.save()

        remote_update_sales_order(
            tracking_number, shipping_cost, order_id, shipment_weight)
        remote_update_channel_controller(
            order_id, shipping_carrier, shipping_service, tracking_number, date)
        frappe.db.sql(""" UPDATE `tabSales Order` SET so_type=%s, so_type_status=%s WHERE name=%s """,
                      ("To Ventor", "TN and SC sent to Cobb", so_list[0].name))
        frappe.db.commit()
    except:
        frappe.log_error(frappe.get_traceback(), "UPDATE ALL")


def remote_update_channel_controller(order_id, carrier_code, shipping_service, tracking_id, date):
    ama_itm_list = []
    ama_itm_dict = {}
    cobb_settings = frappe.get_doc("COBB Settings")
    conn = FrappeClient(cobb_settings.url)
    conn._login(cobb_settings.username,
                cobb_settings.get_password('password'))

    remote_cc = conn.get_list("Channel Controller", filters={
                              "order_id": order_id})

    remote_cc_name = remote_cc[0]['name']

    doc = conn.get_doc("Channel Controller", remote_cc_name)

    for item in doc['ama_order_item']:
        doc['tracking_info'].append({
            "quantity": item['quantity'],
            "mp_item_id": item['mp_item_id'],
            "carrier": carrier_code,
            "method": shipping_service,
            "tracking_id": tracking_id,
            "shipped_date": date
        })

        ama_itm_dict['mp_item_id'] = item['mp_item_id']
        ama_itm_dict['quantity'] = item['quantity']

        ama_itm_list.append(ama_itm_dict)

    conn.update(doc)

    # cobb_amazon_push_details(ama_itm_list,order_id,carrier_code,shipping_service,tracking_id)

    return "Success"


def remote_update_sales_order(shipment_details, shipment_cost, po_no, shipment_weight):
    cobb_settings = frappe.get_doc("COBB Settings")
    conn = FrappeClient(cobb_settings.url)
    conn._login(cobb_settings.username,
                cobb_settings.get_password('password'))

    remote_so = conn.get_list(
        "Sales Order", filters={"po_no": po_no})

    if(len(remote_so) > 0):

        remote_so_name = remote_so[0]['name']

        doc = conn.get_doc("Sales Order", remote_so_name)

        doc['shipment_details'] = shipment_details
        doc['shipment_cost'] = shipment_cost
        doc['shipment_weight'] = shipment_weight
        doc['so_type_status'] = "Received TN and SC from Gas"

        conn.update(doc)

    return "Success"


def update_remote_tracking_number():
    cc_list = frappe.get_all("Channel Controller", filters=[
                             ['Controller Tracking Table', 'tracking_id', '!=', '']], fields=['name', 'order_id'])

    cobb_settings = frappe.get_doc("COBB Settings")
    conn = FrappeClient(cobb_settings.url)
    conn._login(cobb_settings.username,
                cobb_settings.get_password('password'))

    for cc_order_id in cc_list:

        try:
            cc_doc = frappe.get_doc("Channel Controller", cc_order_id.name)

            so_list = frappe.get_list("Sales Order", filters={
                                      "po_no": cc_order_id.order_id})

            so_doc = frappe.get_doc("Sales Order", so_list[0]['name'])

            remote_cc = conn.get_list("Channel Controller", filters={
                "order_id": cc_order_id.order_id})

            remote_cc_name = remote_cc[0]['name']

            doc = conn.get_doc("Channel Controller", remote_cc_name)

            tracking_info_list = doc['tracking_info']

            for tracking_info in tracking_info_list:

                try:
                    x = tracking_info['tracking_id']
                except:
                    tracking_info_list = cc_doc.tracking_info
                    shipment_items = so_doc.shipment_items
                    tracking_id = so_doc.shipment_details
                    shipment_cost = so_doc.shipment_cost
                    shipment_weight = so_doc.shipment_weight

                    remote_update_sales_order(
                        tracking_id, shipment_cost, cc_order_id.order_id, shipment_weight)
                    remote_update_channel_controller(
                        cc_order_id.order_id, tracking_info_list[0].carrier, tracking_info_list[0].method, tracking_info_list[0].tracking_id,  tracking_info_list[0].shipped_date)

                    print("UPDATED")

        except Exception as e:
            print("ERROR")
            print(e)
