import frappe, json
from datetime import *
from global_app.global_app.doctype.ups_settings.ups_settings import update_sales_order_from_ps
from global_app.doc_events.channel_controller import update_all

from global_app.doc_events.utils import MP_shipment, cancel_shipment_cc
import erpnext.erpnext_integrations.doctype.amazon_mws_settings.amazon_mws_api as mws
from frappe.utils.password import get_decrypted_password
from frappe.frappeclient import FrappeClient
from lxml import etree as et
from global_app.events import change_so_status

@frappe.whitelist()
def get_credentials(doctype):
    single_records = frappe.get_single(doctype).__dict__
    single_records['password'] = get_decrypted_password(doctype, doctype, 'password', False)
    return single_records


def on_trash_ps(doc, method):
    if doc.shipment == "done":
        frappe.msgprint("Please cancel the shipment first")
        frappe.log_error("Please cancel the shipment first", 'Packing Slip')
        frappe.throw("Please cancel the shipment first")

def validate_ps(doc, method):
    apply_new_feature = frappe.get_value("Features", {'feature_id': 1}, "apply")
    set_item_codes(doc)
    set_package_list(doc)
    if apply_new_feature:
        auto_pack_packing_slip(doc, method)
    else:
        old_auto_pack_code(doc)
    ne_packing_logic(doc)
    check_addresses_and_barcode(doc)

def old_auto_pack_code(doc):
    if 'in_insert' in doc.__dict__["flags"] and doc.shipping_carrier == "UPS":
        old_update_pick_items_ups(doc)
    elif 'in_insert' in doc.__dict__["flags"] and doc.shipping_carrier == "USPS":
        old_update_pick_items_usps(doc)

#start for new autpack logic
def auto_pack_packing_slip(doc, method):
    if 'in_insert' in doc.__dict__["flags"]:
        update_pick_items_usps(doc)

def set_item_codes(doc):
    if not doc.item_codes:
        codes = []
        total_qty = 0
        for ii in doc.items:
            codes.append(ii.item_code)
            total_qty += ii.qty
        codes.sort()
        doc.item_codes = ",".join(codes)
        doc.total_item_qty = total_qty

def set_package_list(doc):
    if not doc.packages_list:
        packages = []
        weights = {}
        for iii in doc.packages_information:
            if iii.items and iii.shipment_tracking_number:
                packages.append(iii.package)
                weights[iii.package] = float(iii.weight)
        packages.sort()
        doc.packages_list = ",".join(packages)
        doc.weights = str(weights)

def get_packages(packing_slip,packages,records):
    if len(packing_slip) > 0:
        for i in packing_slip:
            if i.packages_list:
                if i.packages_list in packages:
                     packages[i.packages_list] += 1
                else:
                    records.append(i)
                    packages[i.packages_list] = 1

def get_average_weight(package_used,items,total_item_qty,shipping_carrier):
    query = """ SELECT name, packages_list, weights FROM `tabPacking Slip` 
                    WHERE item_codes='{0}' and total_item_qty={1} and shipping_carrier='{2}' and packages_list='{3}'  
                    ORDER BY name DESC""".format(",".join(items), total_item_qty, shipping_carrier, package_used)
    packing_slip = frappe.db.sql(query, as_dict=1)
    weights = {}
    from collections import Counter
    for ps in packing_slip:
        print(ps.weights)
        print(ps.name)
        if ps.weights != "{}":
            if weights:
                weights = Counter(weights) + Counter(eval(ps.weights))
            else:
                weights = eval(ps.weights)
    print("WEEEEEEEEEEIGHTS")
    print(weights)
    print("PACKAGE USSSSSSSSSSSSEEEd")
    print(package_used)
    if weights and package_used in weights:
        return round(weights[package_used],2) / len(packing_slip)
    return 0

def update_pick_items_usps(doc):
    items,records = [],[]
    packages = {}
    total_item_qty = 0
    price = 0
    items_qty=""
    for i in doc.items:
        items.append(i.item_code)
        total_item_qty += i.qty
        price += (i.rate) * i.qty
        if items_qty:
            items_qty += ", "
        items_qty += (i.item_code + "=" + str(int(i.qty)))
    items.sort()

    query = """ SELECT name, packages_list FROM `tabPacking Slip` 
                WHERE item_codes='{0}' and total_item_qty={1} and shipping_carrier='{2}' and packages_list != ''
                ORDER BY name DESC""".format(",".join(items),total_item_qty, doc.shipping_carrier)
    packing_slip = frappe.db.sql(query, as_dict=1)
    get_packages(packing_slip,packages,records)
    if packages:
        print("PACKAAAAAAAAAAAAGES +++++++++++++++++++++++++++++++++++++")
        print(packages)
        package_used = max(packages, key = lambda k: packages[k])
        ave_weight = get_average_weight(package_used,items,total_item_qty,doc.shipping_carrier)
        final_ps_query = """ SELECT * FROM `tabPacking Slip` 
                            WHERE packages_list='{0}' and item_codes='{1}' and total_item_qty={2} and shipping_carrier='{3}'""".format(package_used,",".join(items),total_item_qty, doc.shipping_carrier)
        final_ps = frappe.db.sql(final_ps_query,as_dict=1)
        if len(final_ps) > 0:
            final_packages = frappe.db.sql(""" SELECT package, quantity, items as items_qty, price, items_quantity FROM `tabPacking Slip packages shadow` WHERE parent=%s """,final_ps[0].name, as_dict=1)
            if len(final_packages) > 0:
                print("FNAAAAAAAAAAAAAAAAAAAAAAAAL PACKAGES")
                print(final_packages)
                for xx in final_packages:
                    print(xx.package)
                    print(xx.quantity)
                    print(ave_weight)
                    print(xx.items)
                    print(xx.price)
                    print(xx.items_quantity)
                    obj = {
                        "package": xx.package,
                        "quantity": xx.quantity,
                        "weight": ave_weight,
                        "items": xx.items_qty,
                        "price": xx.price,
                        "items_quantity": xx.items_quantity
                    }
                    print(obj)
                    try:
                        doc.append("packages_information", obj)
                    except:
                        print(frappe.get_traceback())
        for i in doc.items:
            i.status = 'packed'
    else:
        # if doc.shipping_carrier == "USPS":
        #     autopack_usps(doc)
        # elif doc.shipping_carrier == "UPS":
        #     update_pick_items_ups(doc)
        old_auto_pack_code(doc)

def get_usps_box(group, qty):
    usps_boxes = frappe.db.sql(""" SELECT * FROM `tabUSPS Flag Box` UFB WHERE UFB.group=%s """, group,as_dict=1)
    for i in usps_boxes:
        if qty == i.lower_limit:
            return i.package

        elif qty == i.upper_limit:
            return i.package

        elif qty > i.lower_limit and qty < i.upper_limit:
            return i.package

def autopack_usps(doc):
    price = 0
    items_qty = ""
    item_groups = {}
    item_groups_with_box = {}
    for xx in doc.items:
        price += (xx.rate) * xx.qty
        if items_qty:
            items_qty += ", "
        items_qty += (xx.item_code + "=" + str(int(xx.qty)))
        xx.status = 'packed'
        item_record = frappe.get_doc("Item", xx.item_code)
        if item_record.item_group in item_groups:
            item_groups[item_record.item_group] += xx.qty
        else:
            item_groups[item_record.item_group] = xx.qty

    for key in item_groups:
        item_group = frappe.get_doc("Item Group", key)
        item_groups_with_box[key] = get_usps_box(item_group.usps_item_group, item_groups[key])

    for ii in item_groups_with_box:
        items = ""
        for item in doc.items:
            if frappe.get_value("Item", item.item_code, "item_group") == ii:
                if items:
                    items += ","
                items += item.item_code

        obj = {
            "package": item_groups_with_box[ii],
            "quantity": item_groups[ii],
            "items": items,
            "price": price,
            "items_quantity": str(items_qty)
        }
        doc.append("packages_information", obj)

def update_pick_items_ups(doc):
    list_item_code = []
    target_qty = 0
    total_qty = 0
    temp_total_weight = 0
    items_ = []
    for i in doc.items:
        items_.append({
            "item_code": i.item_code,
            "status": i.status,
            "qty": i.qty,
        })
        if i.status != "packed":
            list_item_code.append(i.item_code)
            if i.item_code.split("-")[0] == "NSH":
                target_qty = i.qty
            total_qty += i.qty
            temp_total_weight += (i.net_weight if i.net_weight else 0)

    if len(list_item_code) > 0:
        result = get_getups_box(list_item_code, target_qty, doc.items)
        if result:
            items_qty = ""
            item_str = ''
            price = 0
            for xx in doc.items:
                print("XXXXXX")
                print(xx)
                if xx.status != 'packed':
                    print(xx.status)

                    price += xx.rate * xx.qty
                    item_str += xx.item_code + ", "
                    if items_qty:
                        items_qty += ", "
                    items_qty += xx.item_code + "=" + str(int(xx.qty))
                    xx.status = 'packed'
                    print(xx.status)
            doc.append("packages_information", {
                "package": result['box'],
                "quantity": total_qty,
                "items": item_str,
                "price": price,
                "items_quantity": items_qty,
            })

#old auto pack logic
def old_update_pick_items_ups(doc):

    list_item_code = []
    target_qty = 0
    total_qty = 0
    temp_total_weight = 0
    for i in doc.items:
        list_item_code.append(i.item_code)
        if i.item_code.split("-")[0] == "NSH":
            target_qty = i.qty
        total_qty += i.qty
        temp_total_weight += (i.net_weight if i.net_weight else 0)

    if len(list_item_code) > 0:
        result = get_getups_box(list_item_code, target_qty, doc.items)
        if result:
            items_qty = ""
            item_str = ''
            price = 0
            for xx in doc.items:
                price += xx.rate * xx.qty
                item_str += xx.item_code + ", "
                if items_qty:
                    items_qty += ", "
                items_qty += xx.item_code + "=" + str(int(xx.qty))
                xx.status = 'packed'

            doc.append("packages_information", {
                "package": result['box'],
                "quantity": total_qty,
                "items": item_str,
                "price": price,
                "items_quantity": items_qty,
            })

def old_update_pick_items_usps(doc):
    temp_total_qty = 0
    temp_total_qty1 = ""
    temp_total_weight = 0

    flag_type_check = False
    flag_group = ""
    for i in doc.items:
        if i.status != 'packed':
            if not flag_type_check:
                if i.item_code.split('-')[0] == 'NSFB' or i.item_code.split('-')[0] == 'NSF':
                    flag_group = "NSF/NSFB"
                    flag_type_check = True
                elif "312NS" in i.item_code and i.item_code.index("312NS") > -1:
                    flag_group = "312NS"
                    flag_type_check = True
                elif i.item_code.split('-')[0] == 'NSRE':
                    flag_group = "NSRE"
                    flag_type_check = True
                elif "NS-NB" in i.item_code and i.item_code.index("NS-NB") > -1:
                    flag_group = "NS-NB"
                    flag_type_check = True
                elif i.item_code.split('-')[0] == 'NSW':
                    flag_group = "NSW"
                    flag_type_check = True
                elif i.item_code.split('-')[0] == 'NS35':
                    flag_group = "NS35"
                    flag_type_check = True
                elif i.item_code.split('-')[0] == 'GD':
                    if "18" in i.item_name and i.item_name.index("18") > -1:
                        flag_group = "GD18"
                    else:
                        flag_group = "GD10"
                    flag_type_check = True

            temp_total_qty += i.qty
            if temp_total_qty1:
                temp_total_qty1 += ", "

            temp_total_qty1 += i.item_code + "=" + str(int(i.qty))

    data = get_getusps_box(temp_total_qty, flag_group)
    if data:
        item_str = ''
        price = 0
        for i in doc.items:
            if i.status != 'packed':
                price += (i.rate) * i.qty
                item_str += i.item_code + ", "
                i.status = 'packed'

        doc.append("packages_information", {
            "package": data['box'],
            "quantity": temp_total_qty,
            "items": item_str,
            "price": price,
            "items_quantity": temp_total_qty1
        })

def ne_packing_logic(doc):
    doc.pick_items = []
    for i in doc.items:
        if i.status == 'partial-packed' or i.status != 'packed' or not i.status:
            doc.append('pick_items', {
                "item_code": i.item_code,
                "name1": i.item_name,
                "qty": i.qty,
            })

def after_save_ps(doc, method):
    for i in doc.items:
        print("STATUUUUUUUS")
        print(i.status)
    so = frappe.db.get_value('Delivery Note Item', {'parent': doc.delivery_note}, ['against_sales_order'])
    change_so_status(so)


def check_addresses_and_barcode(self):
    USPS_DOC = frappe.get_doc("USPS Settings")
    try:
        import barcode
        import requests
        import base64
        if not self.ship_to:
            self.ship_to = frappe.get_value("Delivery Note", {"name": self.delivery_note}, "shipping_address")
            self.purchase_order = frappe.get_value("Delivery Note", {"name": self.delivery_note}, "po_no")
        if not self.ship_from:
            self.ship_from = "<p>Distribution Center </p><p>6251 Box Springs blvd</p><p>Riverside, CA 92507</p><p>USA</p>"
        if not self.barcode:
            ean = barcode.get('code39', self.name.split('PAC-')[1].replace('-', ""))
            file_path = frappe.get_site_path('public', 'files')
            filename = ean.save(file_path + '/' + self.name.split('PAC-')[1].replace('-', ""))
            self.barcode = '/files/' + self.name.split('PAC-')[1].replace('-', "") + '.svg'
            self.barcode_no = self.name.split('PAC-')[1].replace('-', "")
    except:
        frappe.log_error(frappe.get_traceback(), 'Packing Slip')


@frappe.whitelist()
def get_packing_slip_supplementory_item(item):
    try:
        return frappe.get_all('Packing Slip packages', filters={'item': ("like", item)}, fields=['*'])[0]
    except:
        return "Record Could not Found Please Add Supplementary Items manually"


@frappe.whitelist()
def get_packing_boxes(item, qty, packing_slip):
    try:
        return frappe.get_all('Packing Slip packages', filters={'item': ("like", item), 'quantity': qty}, fields=['*'])
    except:
        return 'False'


@frappe.whitelist()
def get_packing_boxes_again(item, qty, packing_slip_no, box):
    try:
        return frappe.get_all('Packing Slip packages',
                              filters={'item': ("like", item), 'quantity': qty, 'parent': packing_slip_no,
                                       'package': box}, fields=['*'])[0]
    except:
        return 'False'


@frappe.whitelist()
def save_data(file_name, data):
    # file_path = frappe.get_site_path('private', 'files')
    file_path = frappe.get_site_path('private', 'files')

    # create directory (if not exists)
    frappe.create_folder(file_path)
    # write the file
    with open(file_path + "/" + file_name, 'w+') as f:
        f.write(data)
    return file_path + "/" + file_name


@frappe.whitelist()
def read_file(file_name):
    try:

        # file_path = frappe.get_site_path('private', 'files')
        file_path = frappe.get_site_path('private', 'files')

        # create directory (if not exists)
        frappe.create_folder(file_path)
        # write the file
        content = ""
        with open(file_path + "/" + file_name, 'r') as f:
            content = f.read()
        return content
    except:
        return "No file"


@frappe.whitelist()
def make_salesorder(name, sales_order, shipment_details, shipment_weight,shipment_cost,shipping_service):
    try:
        option_check = frappe.get_doc("Packing Slip", name)
        old = frappe.db.sql(
            """ select * from `tabSales Order` where shipment_details like '%{0}%' """.format(shipment_details),
            as_dict=True)
        if len(old) > 0:
            for ord in old:
                cur = frappe.get_doc("Sales Order", sales_order)
                if cur.usps_shipment == ord.usps_shipment:
                    frappe.msgprint(
                        "Same tracking id repeated in {0} please cancel shipment and contact Admin".format(ord.name))
                    frappe.throw(
                        "duplicate tracking ids in {0} and {1} id = {2}".format(cur.name, ord.name, shipment_details))

        doc = frappe.get_doc("Sales Order", sales_order)
        import json
        existing_data = []
        tracking_num = None
        tot_weight = 0
        for data in json.loads(shipment_details):
            try:
                if not data['tracking']:
                    # frappe.throw("No tracking found")
                    continue
                existing_data.append({
                    "doctype": "Sales Order Shipment",
                    "package": data['package'],
                    "tracking": data['tracking'],
                    "items": data['items'],
                    "quantity": data['qty'],
                    "weight": data['weight'],
                    "carrier": data["carrier"]
                })
                tot_weight += float(data['weight'])
                if tracking_num:
                    tracking_num += ", " + data['tracking']
                else:
                    tracking_num = data['tracking']
            except:
                frappe.log_error(str(shipment_details) + frappe.get_traceback(), 'Packing Slip Tracking Number')

        usps_settings = frappe.db.sql(""" SELECT * FROM `tabUSPS Charges` WHERE parent=%s """, "USPS Settings",
                                      as_dict=1)
        if shipping_service in [i.shipment for i in usps_settings]:
            shipment_cost = [i.charge for i in usps_settings if i.shipment == shipping_service][0]

        elif doc.shipment_cost and float(doc.shipment_cost) > 0:
            try:
                if option_check.inhouse_insurance and float(doc.shipment_cost) > 0:
                    shipment_cost = float(shipment_cost) - float(option_check.inhouse_insurance)
            except:
                frappe.log_error(str(shipment_details), 'Packing Slip ' + name)
            shipment_cost = float(doc.shipment_cost) + float(shipment_cost)

        if doc.shipment_weight:
            shipment_weight = float(doc.shipment_weight) + float(shipment_weight)

        for so_shipment_items in doc.shipment_items:
            doc.remove(so_shipment_items)

        doc.shipment_details = tracking_num
        doc.shipment_weight = tot_weight
        doc.shipment_cost = shipment_cost
        for pack_item in existing_data:
            doc.append("shipment_items", {
            "package": pack_item['package'],
            "items": pack_item['items'],
            "tracking": pack_item['tracking'],
            "quantity": pack_item['quantity'],
            "weight": pack_item['weight']
        })

        doc.save()
        frappe.db.commit()
        if tracking_num:
            frappe.db.sql(""" UPDATE `tabSales Order` SET shipment_date=%s WHERE name=%s""",
                          (datetime.now().date(), doc.name))

            # frappe.db.sql(""" UPDATE `tabCustom Design` SET status='Shipped' WHERE sales_order=%s """, doc.name)
            # frappe.db.commit()


        # return "success"

        try:
            from frappe.utils.background_jobs import enqueue
            so = frappe.get_doc("Sales Order", sales_order)
            contct = frappe.get_doc("Contact", so.contact_person)
            add = frappe.get_doc("Address", so.shipping_address_name)
            add_line2 = ""
            if add.address_line2:
                try:
                    add_line2 = "<b>" + add.address_line2 + "</b><br>"
                except:
                    pass

            recepients = None
            if contct.tracking_email:
                recepients = contct.tracking_email
            else:
                recepients = contct.email_id
            if recepients:
                email_args = {
                    "recipients": recepients,
                    "sender": None,
                    "subject": "Shipment Confirmation " + so.po_no,
                    "message": """  Dear <b>{0}</b>,
												<br><br>
												Your order has been processed and shipped.
												<br>
												Customer Reference: <b>{1}</b>
												<br>
												Sales Order : <b>{2}</b>
												<br>
												Tracking:<b>{3}</b> 
												<br>

												Shipped To:<br> 
												<b>{4}</b><br>
												{5}
												<b>{6}</b><br>
												<b>{7}</b><br>
												<br>
												Thank you for your business,

								""".format(so.customer, so.po_no, so.name, so.shipment_details, add.address_line1,
                                           add_line2, add.city + ", " + add.state + ", " + add.pincode, add.country),
                    "now": True
                }
                enqueue(method=frappe.sendmail, queue='short', timeout=300, is_async=True, **email_args)
            else:
                pass
        except:
            frappe.log_error(frappe.get_traceback(), 'Packing Slip')

        #Update COBB SO then close PO
        so_customer = frappe.get_doc("Sales Order", sales_order)

        if(so_customer.customer == "Cobb Promotions Inc"):
            update_all(so_customer.po_no)

        enqueue(update_sales_order_from_ps,queue='default')
        return "success"
    except:
        frappe.log_error(frappe.get_traceback(), 'Packing Slip')
        frappe.throw("Could not record data to Sales order")
        enqueue(update_sales_order_from_ps,queue='default')

@frappe.whitelist()
def update_so_for_cancel_shipment(name, po_no):
    try:
        so = frappe.db.sql(""" SELECT * FROM `tabSales Order` WHERE po_no=%s """,(po_no),as_dict=1)
        if len(so[0].name) > 0:
            frappe.db.sql(""" UPDATE `tabSales Order` set shipment_cost=%s, shipment_weight=%s where name=%s""",
                          (0, 0, so[0].name))
            frappe.db.sql(""" DELETE FROM `tabSales Order Shipment` WHERE parent=%s """, so[0].name)

            frappe.db.commit()
        try:
            if so.amazon_order_id:
                cancel_shipment_cc(so.name)
        except:
            frappe.log_error(frappe.get_traceback(), 'Packing Slip')
    except:
        frappe.log_error(frappe.get_traceback(), 'Packing Slip')


@frappe.whitelist()
def get_packaging_history(matching_key):
    return 'False'


@frappe.whitelist()
def get_ps(barcode_no):
    try:
        return frappe.get_all('Packing Slip', filters={'barcode_no': barcode_no}, fields=['*'])[0]
    except:
        return 'False'


@frappe.whitelist()
def email_test(name):
    try:
        from frappe.utils.background_jobs import enqueue
        so = frappe.get_doc("Sales Order", "SO-02477")
        add = frappe.get_doc("Address", so.shipping_address_name)
        email_args = {
            "recipients": "sajid.eycon@gmail.com",
            "sender": None,
            "subject": "Shipment Confirmation " + so.po_no,
            "message": """  Dear <b>{0}</b> ,
                                        <br>
										Your order has been processed and shipped.
                                         <br>
										Customer Reference : <b>{1}</b>
                                         <br>
										Sales Order : <b>{2}</b>
                                          <br>
										Tracking : {3}
                                         <br>

										<b>Shipped To :</b><br> 
										{4}<br>
										{5}<br>
										{6}<br>
										{7}<br>
                                         <br>
										Thank you for your business,

						""".format(so.customer, so.po_no, so.name, so.shipment_details, add.address_line1,
                                   add.address_line2, add.city + ", " + add.state + ", " + add.pincode, add.country),
            "now": True,
            "attachments": [frappe.attach_print("Packing Slip", name,
                                                file_name=name, print_format="Standard")]}
        enqueue(method=frappe.sendmail, queue='short', timeout=10, is_async=True, **email_args)
        return "email sent"
    except:
        return 'False'


@frappe.whitelist()
def log_error(messageOrEvent, source, lineno, error, file):
    frappe.log_error(file + "," + messageOrEvent + ", " + source + ", " + str(lineno) + ", " + error, 'Front End')


@frappe.whitelist()
def get_getusps_box(qty, group):
    usps_box_doc = frappe.get_all("USPS Flag Box", filters={'group': group}, fields=['*'])
    qty = int(qty)
    for group in usps_box_doc:
        try:
            if group.lower_limit == qty:
                weight = frappe.get_doc("Package", group.package)
                weight = weight.total_weight
                return {'box': group.package, 'qty': qty, 'weight': weight}

            if group.upper_limit == qty:
                weight = frappe.get_doc("Package", group.package)
                weight = weight.total_weight
                return {'box': group.package, 'qty': qty, 'weight': weight}

            if qty >= group.lower_limit and qty <= group.upper_limit:
                weight = frappe.get_doc("Package", group.package)
                weight = weight.total_weight
                return {'box': group.package, 'qty': qty, 'weight': weight}
        except:
            pass


@frappe.whitelist()
def get_getups_box(items_list, qty, items):
    # frappe.msgprint(qty)
    try:
        items = json.loads(items)
        items_list = json.loads(items_list)
    except:
        None

    ups_flag_kit = frappe.get_all("UPS Flag Kit", filters={}, fields=['*'])
    flag_kit = None
    match_flg = False
    qty = int(qty)
    for kit in ups_flag_kit:
        doc = frappe.get_doc("UPS Flag Kit", kit.name)
        for item in items_list:
            for P in doc.poles:
                if P.pole == item:
                    flag_kit = doc.flage_kit
                    match_flg = True
                    break
            if match_flg:
                break
        if match_flg:
            break

    item_cat = frappe.get_all("Item Category", filters={}, fields=['*'])
    items_weight = 0

    for item in items:
        try:
            if 'status' in item.__dict__ or ('status' in item.__dict__ and item.__dict__['status'] != "packed"):
                for cat in item_cat:
                    if "312NS" in item.__dict__['item_code']:
                        if "312NS" in cat.name:
                            items_weight = items_weight + \
                                (cat.unit_weight * item.__dict__['qty'])
                            break
                    if item.__dict__['item_code'].split('-')[0] in cat.name:
                        items_weight = items_weight + \
                            (cat.unit_weight * item.__dict__['qty'])
                        break
        except:
            frappe.log_error(frappe.get_traceback(), "GET UPS BOX")

    box_info = frappe.get_all("UPS Flag Kit Box", filters={
                              'kit_name': flag_kit}, fields=['*'])
    for data in box_info:
        try:
            if data.lower_limit == qty:
                weight = frappe.get_doc("Package", data.package)
                weight = weight.total_weight + items_weight
                return {'box': data.package, 'qty': qty, 'weight': weight}

            if data.upper_limit == qty:
                weight = frappe.get_doc("Package", data.package)
                weight = weight.total_weight + items_weight
                return {'box': data.package, 'qty': qty, 'weight': weight}

            if qty >= data.lower_limit and qty <= data.upper_limit:
                weight = frappe.get_doc("Package", data.package)
                weight = weight.total_weight + items_weight
                return {'box': data.package, 'qty': qty, 'weight': weight}
        except:
            frappe.log_error(frappe.get_traceback(), "GET UPS BOX")

    return None

@frappe.whitelist()
def get_inhouse_insurance(price):
    price = float(price)
    doc = frappe.get_all('Inhouse Insurance', filters={}, fields=["*"])
    for item in doc:
        if price >= item.lower_range and price <= item.upper_range:
            return item.insured_value



def on_cancel_ps(doc, method):
    for i in doc.packages_information:
        if doc.shipment_tracking_number:
            frappe.throw("Cannot Cancel Packing Slip, One of the boxes has Shipment Tracking Number")


@frappe.whitelist()
def get_default_phone_number(dn):
    phone_num = ""
    customer = frappe.db.sql(""" SELECT customer FROM `tabDelivery Note` WHERE name=%s """, dn, as_dict=1)
    query = """ SELECT A.phone FROM `tabAddress` AS A INNER JOIN `tabDynamic Link` AS DL ON DL.parent = A.name and DL.link_doctype='Customer' and DL.link_name = "{0}" WHERE A.is_primary_address = {1}""".format(customer[0].customer,1)
    phone = frappe.db.sql(query, as_dict=1)
    try:
        phone_num = phone[0].phone
    except:
        phone_num = ""
    return phone_num

