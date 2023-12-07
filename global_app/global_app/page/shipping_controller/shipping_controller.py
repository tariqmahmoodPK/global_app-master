from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import cint, cstr, date_diff, add_months, flt, add_days, formatdate, today, getdate, get_link_to_form, \
    comma_or, get_fullname
from datetime import datetime
import requests
import json
import os
import csv
import base64
from PIL import Image
import uuid


# from erpnext.erpnext_integrations.utils import MP_shipment, cancel_shipment_cc

@frappe.whitelist()
def get_shipping_data(from_date, to_date, po_no, so_no, carrier, status, page_count=0):
    # frappe.msgprint(str(date)+"   "+po_no)
    page_count = int(page_count) + 20
    filter_flag = False
    condition = ""

    if from_date and to_date:
        condition += " and  transaction_date BETWEEN '{0}' and '{1}' ".format(from_date, to_date)

    if po_no:
        condition += " and  po_no LIKE '%{0}%' ".format(po_no)

    if so_no:
        condition += " and name LIKE '%{0}%' ".format(so_no)

    query = """ SELECT * FROM `tabSales Order` WHERE docstatus = 1 {0} LIMIT 30""".format(condition)
    so = frappe.db.sql(query, as_dict=1)

    data_list = []
    total_ups = processed_ups = pending_ups = total_usps = processed_usps = pending_usps = 0
    # if len(so)==0:
    #     frappe.msgprint("Order does not exists","Message")

    showing_count = 0

    for data in so:

        temp = frappe.get_doc("Sales Order", data.name)

        if temp.usps_shipment == 1:
            total_usps = total_usps + 1
            if temp.shipment_cost:
                processed_usps = processed_usps + 1
        else:
            total_ups = total_ups + 1
            if temp.shipment_cost:
                processed_ups = processed_ups + 1

        if showing_count >= page_count:
            continue

        if status == "Processed":
            if temp.shipment_cost:
                pass
            else:
                continue
        elif status == "Pending":
            if temp.shipment_cost:
                continue
            else:
                pass

        boxes = []
        so_name = data.name
        po_num = data.po_no

        try:
            DN = frappe.get_all("Delivery Note", filters={'po_no': data.po_no})[0]
            dn = DN.name
        except:
            dn = '''<b style="color:red"> Not exists</b>'''

        PS = None

        try:
            filter_carrier = ""
            if carrier and carrier != "select":
                filtr = {'purchase_order': data.po_no, 'shipping_carrier': carrier}
                filter_carrier = carrier
                # filter_flag=True
            else:
                filtr = {'purchase_order': data.po_no}

            PS = frappe.get_all("Packing Slip", filters=filtr)[0]

            if "2019-" in PS.name:
                ps = PS.name.split("2019-")[1]
            elif "2020-" in PS.name:
                ps = PS.name.split("2020-")[1]
            else:
                ps = PS.name.split("2021-")[1]

            ps_doc = frappe.get_doc("Packing Slip", PS.name)

            PAC = frappe.get_all('Packing Slip', filters={'matching_key': ("like", ps_doc.matching_key),
                                                          'name': ("not in", [ps_doc.name])}, fields=['*'])

            p_packages = ""
            for pkg in PAC:
                if len(frappe.get_doc("Packing Slip", pkg.name).packages_information) > 0:
                    p_packages = pkg
                    break

            try:
                for_weight = frappe.get_doc("Packing Slip", p_packages.name).packages_information
            except:
                # frappe.msgprint("exception")
                for_weight = ""
            for pk in ps_doc.packages_information:
                boxes.append({
                    'pkg_name': pk.name,
                    'box': pk.package,
                    'items': pk.items,
                    'carrier': ps_doc.shipping_carrier,
                    'service': ps_doc.shipping_service,
                    'weight': pk.weight,
                    'image': pk.image,
                    'shipment': ps_doc.shipment,
                    'tracking': pk.shipment_tracking_number,
                    'cancelled': pk.cancelled
                })
        except:
            ps = '''<b style="color:red"> Not exists</b>'''

        count = 0

        if len(boxes) > 0:
            for bx in boxes:
                disabled = ""
                disabled_c = ""
                ps_view = ''
                check = '''style="display:none'''
                view = ""
                # try:
                #     past_weight=for_weight[count].weight
                # except:
                items_temp = ""
                print(bx['items'].split(","))
                for idx, i in enumerate(bx['items'].split(",")):

                    if i != " ":

                        if idx != 0:
                            items_temp += ","
                        items_temp += i
                query = """ SELECT (SUM(weight) / COUNT(*)) as average FROM `tabPacking Slip packages shadow` WHERE items like '{0}' """.format(
                    "%" + items_temp + "%")

                past_weight = float(round(frappe.db.sql(query, as_dict=1)[0].average, 2))
                cancelled_ind = ""
                if bx['cancelled'] == 1:
                    cancelled_ind = '''style="color:red"'''
                if bx['tracking'] and bx['cancelled'] != 1:
                    disabled = '''style="display:none'''
                    disabled_c = '''style="display:none"'''
                    check = '''style="display:inline"'''

                else:
                    view = "disabled=disabled"
                weight_color = '''style="color:green"'''
                if past_weight > 0 and past_weight != bx['weight']:
                    weight_color = '''style="color:red" class="tooltip-w"'''
                if disabled_c == "":
                    if bx['weight'] == 0.000 or bx['weight'] == 0:
                        weight_color = '''style="display:none"'''
                wt_n_cap = ""

                if bx['weight'] == 0.000 or bx['weight'] == 0:
                    if bx['carrier'] != "USPS":
                        wt_n_cap = "disabled=disabled"
                customer = frappe.db.sql(""" SELECT * FROM `tabDelivery Note` WHERE name=%s  """, (dn), as_dict=True)

                data_list.append({
                    'company': customer[0].customer if len(customer) > 0 else "",
                    'po': po_num,
                    'so': so_name,
                    'so_no': so_no,
                    'dn': dn,
                    'ps': ps,
                    'ps_': PS,
                    'box': bx['box'],
                    'items': bx['items'],
                    'carrier': bx['carrier'],
                    'service': bx['service'],
                    'shipment': disabled,
                    'view': view,
                    'check': check,
                    'disabled_c': disabled_c,
                    'weight_color': weight_color,
                    'wt_n_cap': wt_n_cap,
                    'cancelled_ind': cancelled_ind,
                    'weight': bx['weight'],
                    'det_view': '''onclick="detailed_view('{0}')"'''.format(PS.name),
                    'cap_weight': '''onclick="capture_weight('{0}','{1}', '{2}')"'''.format(PS.name, bx['pkg_name'],"main"),
                    'label_print': '''onclick="label_print('{0}','{1}','{2}','{3}','{4}')"'''.format(PS.name,
                                                                                                     bx['pkg_name'],
                                                                                                     bx['carrier'],
                                                                                                     bx['box'],
                                                                                                     bx['weight']),
                    'preview': '''onclick="preview_label('{0}','{1}','{2}','{3}')"'''.format(bx['carrier'],
                                                                                             bx['service'],
                                                                                             bx['pkg_name'],
                                                                                             bx['image']),
                    'cancel_label': '''onclick="cancel_shipment('{0}','{1}','{2}')"'''.format(PS.name, bx['pkg_name'],
                                                                                              bx['carrier']),
                    'email': '''onclick="email()"''',
                    'past_weight': past_weight,
                    'ps_view': ps_view,
                    'id': '''id="{0}"'''.format(PS.name + "," + bx['pkg_name'] + "," + carrier + "," + bx['box'] + "," + str(bx['weight']))
                })
                po_num = "-"
                so_name = "-"
                dn = "-"
                ps = "-"

        else:
            if carrier:
                if temp.usps_shipment == 1 and carrier == "USPS":
                    pass
                elif temp.usps_shipment == 0 and carrier == "UPS":
                    pass
                else:
                    continue

            if temp.usps_shipment == 1:
                _temp_carrier = "USPS"
            else:
                _temp_carrier = "UPS"
            check = '''style="display:none'''
            disabled = '''style="display:none'''
            disabled_c = '''style="display:none"'''

            view = "disabled=disabled"

            wt_n_cap = "disabled=disabled"
            customer = frappe.db.sql(""" SELECT * FROM `tabDelivery Note` WHERE name=%s  """, (dn), as_dict=True)

            data_list.append({
                'company': customer[0].customer if len(customer) > 0 else "",
                'po': po_num,
                'so': so_name,
                'so_no': so_no,
                'dn': dn,
                'ps': ps,
                'ps_': PS,
                'box': '-',
                'items': '-',
                'carrier': _temp_carrier,
                'service': temp.shipping_service,
                'shipment': disabled,
                'view': view,
                'check': check,
                'disabled_c': disabled_c,
                'weight_color': '-',
                'wt_n_cap': wt_n_cap,
                'cancelled_ind': '-',
                'weight': 0.00,
                'det_view': '''onclick="detailed_view('{0}')"'''.format(PS.name if PS else ""),
                'cap_weight': '-',
                'label_print': '-',
                'preview': '-',
                'cancel_label': '-',
                'past_weight': '-',
                'ps_view': 'disabled=disabled',
                'id': '''id="{0}"'''.format(po_num + "do_not_print")
            })
        showing_count = showing_count + 1

    # if len(data_list)==0:
    #     frappe.msgprint("No order found","Message")
    return {'data_list': data_list,
            'total_ups': total_ups,
            'processed_ups': processed_ups,
            'total_usps': total_usps,
            'processed_usps': processed_usps,
            'total': len(so),
            'data_list_length': len(data_list),
            'showing_count': showing_count,
            "from_filter_date": from_date,
            "to_filter_date": to_date,
            "po_no": po_no,
            "so_no": so_no,
            "filter_carrier": carrier,
            "filter_status": status
            }


@frappe.whitelist()
def get_ps_for_review(name):
    doc = frappe.get_doc("Packing Slip", name)
    query = """ SELECT 
                            SO.customer AS customer,
                            SO.address_display AS address_display
                        FROM `tabDelivery Note` AS DN 
                        INNER JOIN `tabDelivery Note Item` AS DNI ON DNI.parent = DN.name
                        INNER JOIN `tabSales Order` AS SO ON SO.name = DNI.against_sales_order
                        WHERE DN.name = '{0}' LIMIT 1
                    """.format(doc.delivery_note)
    sales_order = frappe.db.sql(query, as_dict=1)
    item_data = []
    pckg_date = []
    shipment = ""
    for d in doc.items:
        print(d.status)
        row = {
            "Item code": d.item_code,
            "Item name": d.item_name,
            "Image": d.thumbnail,
            "Quantity": d.qty,
            "Status": d.status,
            "idx": d.idx,
            'id': '''id="{0}"'''.format(
                str(d.item_code) + "," + d.item_name + "," + str(d.qty) + "," + str(d.idx))

        }
        item_data.append(row)

    item_columns = [
        'Item code', 'Item name', 'Image', 'Quantity'
    ]
    pack_columns = [
        'Item code', 'Item name'
    ]
    all_weight_captured = True
    all_shipment_done = True

    for pkg in doc.packages_information:
        weight = pkg.weight
        if weight != 1.43:
            weight = '''<i style="color:red">{0}</i>'''.format(weight)
        if pkg.shipment_tracking_number:
            view_label = '''<span onclick="preview_label('{0}','{1}','{2}','{3}')" class="btn btn-small" style="font-size: x-large;">
                            <b><i class="fa fa-eye"></i></b></span>'''.format(doc.shipping_carrier,
                                                                              doc.shipping_service, pkg.name, pkg.image)
            cancel_lbl = '''<span onclick="cancel_shipment('{0}','{1}','{2}')" class="btn btn-small" style="font-size: x-large;">
                            <b><i class="fa fa-ban"></i></b></span>'''.format(doc.name, pkg.name, doc.shipping_carrier)
        else:
            view_label = '''<span class="btn btn-small" style="font-size: x-large;" disabled>
                            <b><i class="fa fa-eye"></i></b></span>'''
            cancel_lbl = '''<span class="btn btn-small" style="font-size: x-large;" disabled >
                            <b><i class="fa fa-ban"></i></b></span>'''
        if True:  # pkg.cancelled ==1 or pkg.weight==0.000 or pkg.weight==0:
            weight_cap = '''<span onclick="capture_weight('{0}','{1}')" class="btn btn-small" style="font-size: x-large;">
                            <b><i class="fa fa-balance-scale"></i></b></span>'''.format(doc.name, pkg.name)
            all_weight_captured = False

        else:
            weight_cap = '''<span class="btn btn-small" style="font-size: x-large;" disabled>
                            <b><i class="fa fa-balance-scale"></i></b></span>'''
        if not pkg.shipment_tracking_number or pkg.cancelled == 1:
            all_shipment_done = False
        if pkg.cancelled == 1:
            cancel_lbl = '''<span onclick="cancel_shipment('{0}','{1}','{2}')" class="btn btn-small" style="font-size: x-large;color:red">
                            <b><i class="fa fa-ban"></i></b></span>'''.format(doc.name, pkg.name, doc.shipping_carrier)
        max_limit = frappe.db.get_single_value("Shipping Insurance Inhouse", "max_limit")
        print("MAX LIMIIIIIIIT")
        print(max_limit)
        row = {
            "idx": str(pkg.idx),
            "checked": "checked" if pkg.price > max_limit else "",
            "Package": pkg.package,
            "Items": pkg.items,
            "Shipped Date": getdate(pkg.modified),
            "Tracking No": pkg.shipment_tracking_number,
            "Actual WT": weight,
            "Logical WT": 1.43,
            "Capture WT": weight_cap,
            "Print Label": '''<span onclick="label_print('{0}','{1}','{2}','{3}','{4}')" class="btn btn-small" style="font-size: x-large;">
                            <b><i class="fa fa-print"></i></b></span>'''.format(doc.name, pkg.name,
                                                                                doc.shipping_carrier, pkg.package,
                                                                                pkg.weight),
            "Cancel Packing": '''<span onclick="cancel_packing('{0}','{1}')" class="btn btn-small" style="font-size: x-large;color: red">
                            <b><i class="fa fa-close"></i></b></span>'''.format(pkg.name, doc.name),
            "View Label": view_label,
            "Cancell": cancel_lbl
        }
        pckg_date.append(row)

    pckg_columns = [
        'Package', 'Items', "Shipped Date", 'Tracking No', "Actual WT", "Logical WT",
        "Capture WT", "Print Label", "View Label", "Cancell"
    ]
    # get attn name
    DN = frappe.get_doc("Delivery Note", doc.delivery_note)
    addrs = frappe.get_doc("Address", DN.shipping_address_name)
    packages = frappe.db.sql(""" SELECT name FROM `tabPackage` """, as_dict=1)
    visibility = False
    for i in item_data:
        if not i['Status'] or i['Status'] != "packed":
            visibility = True
    return frappe.render_template("global_app/global_app/page/shipping_controller/ps_for_review.html",
          {
              "ps": name,
              "item_columns": item_columns,
              "pack_columns": pack_columns,
              "item_data": item_data,
              "packages": packages,
              "visibility": visibility,
              "pckg_columns": pckg_columns,
              "pckg_data": pckg_date,
              "shipment": shipment,
              "name": '''onclick="edit_form('{0}')"'''.format(doc.name),
              "batch_label_print": '''onclick="batch_label_print('{0}')"'''.format(doc.name),
              "ship_to": doc.ship_to,
              "attn": addrs.address_title,
              "bill_to": sales_order[0].customer,
              "bill_to_address": sales_order[0].address_display
          })


@frappe.whitelist()
def update_weight(ps, doc_name, data):
    frappe.client.set_value("Packing Slip packages shadow", doc_name, "weight", data)
    frappe.client.set_value("Packing Slip packages shadow", doc_name, "w_cap_flag", 1)
    # frappe.db.sql(""" UPDATE `tabPacking Slip packages shadow` set weight=%s,w_cap_flag=%s  where name=%s""",(data,1,doc_name))
    frappe.db.commit()
    return get_ps_for_review(ps)

@frappe.whitelist()
def add_shipment_data_to_packing_slip(ps, shipment_identification_number, tracking, stamps_txid, box, service_fee,
                                      cost=None):
    frappe.db.set_value("Packing Slip packages shadow", box, "shipment_tracking_number", tracking,
                        update_modified=False)
    frappe.db.set_value("Packing Slip packages shadow", box, "cancelled", 0, update_modified=False)
    frappe.db.set_value("Packing Slip packages shadow", box, "shipment_cost", cost, update_modified=False)
    frappe.db.set_value("Packing Slip packages shadow", box, "shipment_identification_number",
                        shipment_identification_number, update_modified=False)
    if stamps_txid != None:
        frappe.db.set_value("Packing Slip packages shadow", box, "stamps_txid", stamps_txid, update_modified=False)
    frappe.db.set_value("Packing Slip", ps, "shipment", "done", update_modified=False)
    frappe.db.set_value("Packing Slip", ps, "service_charges", service_fee, update_modified=False)
    frappe.db.set_value("Packing Slip", ps, "shipment_identification_number", shipment_identification_number,
                        update_modified=False)

    frappe.db.commit()


@frappe.whitelist()
def add_shipping_label_to_packing_slip(ps, image_data, encoded, box):
    if encoded == "1":
        file_path = frappe.get_site_path('public', 'files')
        imgdata = base64.b64decode(image_data)
        filename = file_path + '/' + box + '.png'
        with open(filename, 'wb') as f:
            f.write(imgdata)
        # doc = frappe.get_doc("Packing Slip packages shadow",box)
        # frappe.client.set_value("Packing Slip packages shadow", doc.name, "image", '/files/'+box+'.png')
        frappe.db.sql(""" UPDATE `tabPacking Slip packages shadow` set image=%s where name=%s""",
                      ('/files/' + box + '.png', box))
        frappe.db.commit()
    else:
        #    doc = frappe.get_doc("Packing Slip packages shadow",box)
        #    frappe.client.set_value("Packing Slip packages shadow", doc.name, "image", image_data)
        frappe.db.sql(""" UPDATE `tabPacking Slip packages shadow` set image=%s where name=%s""", (image_data, box))
        frappe.db.commit()


@frappe.whitelist()
def update_packing_slip_for_cancel_shipment(name, box):
    # frappe.client.set_value("Packing Slip", name, "shipment", "")
    frappe.db.sql(""" UPDATE `tabPacking Slip packages shadow` SET cancelled=1 WHERE name=%s""",box)

    # frappe.client.set_value("Packing Slip packages shadow", box, "cancelled", 1)
    frappe.db.commit()
    pck_slip = frappe.get_doc("Packing Slip", name)
    flg = True
    for ps in pck_slip.packages_information:
        if ps.shipment_tracking_number and ps.cancelled == 0:
            flg = False
            break
    if flg:
        frappe.client.set_value("Packing Slip", name, "shipment", "")

    pckg = frappe.get_doc("Packing Slip packages shadow", box)
    so = frappe.get_all("Sales Order", filters={'po_no': pck_slip.purchase_order}, fields=['*'])[0]
    frappe.db.sql(""" delete from `tabSales Order Shipment` where package=%s and parent=%s and tracking=%s""",
                  (pckg.package, so.name, pckg.shipment_tracking_number))
    frappe.db.commit()
    if pck_slip.shipping_carrier == "USPS":
        pckg_name = frappe.db.get_all("Packing Slip packages shadow", filters={'name': box}, fields=['*'])[0]
        actual_package = frappe.get_doc("Package", pckg_name.package)
        get_shipment_cost = actual_package.shipment_cost
        shipment_cost = float(so.shipment_cost) - float(get_shipment_cost)
    else:
        shipment_cost = float(so.shipment_cost) - float(pckg.shipment_cost)
    shipment_weight = float(so.shipment_weight) - float(pckg.weight)
    frappe.db.sql(""" UPDATE `tabSales Order` set shipment_cost=%s, shipment_weight=%s where name=%s""",
                  (shipment_cost, shipment_weight, so.name))
    frappe.db.commit()


@frappe.whitelist()
def get_package_data(box):
    return frappe.get_doc("Packing Slip packages shadow", box)


@frappe.whitelist()
def add_shipment_data_to_packing_slip_m(ps, shipment_identification_number, tracking, stamps_txid, box):
    frappe.db.set_value("Packing Slip packages shadow", box, "shipment_tracking_number", tracking,
                        update_modified=False)
    frappe.db.set_value("Packing Slip packages shadow", box, "cancelled", 0, update_modified=False)
    frappe.db.set_value("Packing Slip packages shadow", box, "manual", 1, update_modified=False)
    # frappe.db.set_value("Packing Slip packages shadow", box, "image", image_data)
    if stamps_txid != None:
        frappe.db.set_value("Packing Slip packages shadow", box, "stamps_txid", stamps_txid, update_modified=False)
    frappe.db.set_value("Packing Slip", ps, "shipment", "done", update_modified=False)
    # frappe.client.set_value("Packing Slip", ps, "shipment_identification_number", shipment_identification_number)

    frappe.db.commit()


@frappe.whitelist()
def add_shipment_data_to_so(ps,carrier,tracking,box):
    pck_slip = frappe.get_doc("Packing Slip",ps)
    dn= frappe.get_doc("Delivery Note",pck_slip.delivery_note)
    sales_order= dn.items[0].against_sales_order
    shipment_weight = frappe.get_doc("Packing Slip packages shadow",box).weight
    frappe.db.set_value("Sales Order", sales_order, "shipment_details", tracking,update_modified=False)
    frappe.db.set_value("Sales Order", sales_order, "shipment_weight", shipment_weight,update_modified=False)
    #frappe.client.set_value("Sales Order", sales_order, "shipment_cost", shipment_cost)
    frappe.db.commit()


@frappe.whitelist()
def log_error(messageOrEvent, source, lineno,error,file):
    frappe.log_error(file+","+messageOrEvent+", "+source+", "+str(lineno)+", "+error, 'Front End')

@frappe.whitelist()
def multi_pdf(data):
            from PyPDF2 import PdfFileWriter, PdfFileReader
            output = PdfFileWriter()
            for packing_slip in json.loads(data):
                    output = frappe.get_print('Packing Slip', packing_slip, None, as_pdf = True, output = output)
            #output = frappe.get_print('Packing Slip', "MAT-PAC-2019-00001", None, as_pdf = True, output = output)
            frappe.local.response.filename = "master-pick-list.pdf"
            from frappe.utils.print_format import read_multi_pdf
            file_path = frappe.get_site_path('public', 'files')
            filename = "Global_PS{0}.pdf".format(frappe.generate_hash())
            output.write(open(file_path+"/"+filename,"wb"))
            return "/files/"+filename

@frappe.whitelist()
def save_insurance(pkg_name,value):
    frappe.db.set_value("Packing Slip packages shadow", pkg_name, "ups_insurance", 1,update_modified=False)
    frappe.db.set_value("Packing Slip packages shadow", pkg_name, "declared_value", value,update_modified=False)
    frappe.db.commit()


@frappe.whitelist()
def add_to_box(name, items, box_type):
    items_quantity = ""
    items_str = ""
    price = 0
    qty = 0
    for i in json.loads(items):
        item = frappe.db.sql(""" SELECT * FROM `tabPacking Slip Item` WHERE item_code=%s and parent=%s """,
                             (i["item_code"], name), as_dict=1)

        price += (item[0].rate * int(i["quantity"]))
        if items_quantity:
            items_quantity += ","

        items_quantity += i["item_code"] + "=" + i["quantity"]

        if items_str:
            items_str += ","
        items_str += i["item_code"]

        qty += int(i["quantity"])
    packing_slip = frappe.db.sql(""" SELECT * FROM `tabPacking Slip` WHERE name=%s """, (name), as_dict=1)

    obj = {
        "doctype": "Packing Slip packages shadow",
        "parent": name,
        "parentfield": "packages_information",
        "parenttype": "Packing Slip",
        "package": box_type,
        "items": items_str,
        "quantity": qty,
        "weight": 0.00,
        "price": price,
        "packing_slip_no": name,
        "matching_key": packing_slip[0].matching_key,
        "items_quantity": items_quantity
    }
    doc = frappe.get_doc(obj)
    doc.insert()
    for ii in json.loads(items):
        item1 = frappe.db.sql(""" SELECT * FROM `tabPacking Slip Item` WHERE item_code=%s and parent=%s """,
                              (ii["item_code"], name), as_dict=1)

        if float(ii["quantity"]) >= item1[0].qty:
            frappe.db.sql(""" UPDATE `tabPacking Slip Item` SET status='packed' WHERE item_code=%s and parent=%s """,
                          (ii["item_code"], name))
            frappe.db.commit()
        elif float(ii["quantity"]) < item1[0].qty:
            frappe.db.sql(
                """ UPDATE `tabPacking Slip Item` SET status='partial-packed' WHERE item_code=%s and parent=%s """,
                (ii["item_code"], name))
            frappe.db.sql(""" UPDATE `tabPacking Slip Item` SET qty=%s WHERE item_code=%s and parent=%s """,
                          (item1[0].qty - float(ii["quantity"]), ii["item_code"], name))
            frappe.db.commit()

    frappe.db.sql(""" DELETE FROM `tabTemp_Items` WHERE parent=%s """, name)
    frappe.db.commit()
    ps_for_review = update_temp_items(name)
    print("=========================== GET PS FOR REVIEW ==================================")
    return ps_for_review


def update_temp_items(name):
    packing_slip = frappe.db.sql(""" SELECT * FROM `tabPacking Slip Item` WHERE parent=%s """, name, as_dict=1)
    for i in packing_slip:
        if i.status != "packed" or not i.status:
            obj = {
                "doctype": "Temp_Items",
                "parent": name,
                "parentfield": "packages_information",
                "parenttype": "Packing Slip",
                "item_code": i.item_code,
                "item_name": i.item_name,
                "quantity": float(i.qty)
            }
            doc = frappe.get_doc(obj)
            doc.insert()

    return get_ps_for_review(name)

@frappe.whitelist()
def cancel_packing(name):
    packing_slip_child = frappe.db.sql(""" SELECT * FROM `tabPacking Slip packages shadow` WHERE name=%s """, (name),
                                       as_dict=1)
    packing_slip = frappe.db.sql(""" SELECT * FROM `tabPacking Slip` WHERE name=%s """, packing_slip_child[0].parent,
                                 as_dict=1)
    packing_slip_items = frappe.db.sql("""  SELECT * FROM `tabPacking Slip Item` WHERE parent=%s """,
                                       packing_slip_child[0].parent, as_dict=1)
    packing_slip_temp_items = frappe.db.sql("""  SELECT * FROM `tabTemp_Items` WHERE parent=%s """,
                                            packing_slip_child[0].parent, as_dict=1)

    # if packing_slip[0].shipping_carrier == "USPS":
    #     print("USPSSSSSSSSSSSSSSSSSSSSSSSS CANCEEEEEEEEEEEEEL")
    #     print(packing_slip_child[0])
    #     print(str(packing_slip_child[0].items))
    #     print("USPSSSSSSSSSSSSSSSSSSSSSSSS CANCEEEEEEEEEEEEEL")
    #     row_items = str(packing_slip_child[0].items).split(",")
    #
    #     for i in packing_slip_items:
    #         for x in row_items:
    #             if i.item_code == x:
    #                 frappe.db.sql(""" UPDATE `tabPacking Slip Item` SET status=NULL WHERE name=%s """, i.name)
    #                 frappe.db.commit()
    # elif packing_slip[0].shipping_carrier == "UPS":
    row_items_ups = (packing_slip_child[0].items_quantity).split(",")
    for i in packing_slip_items:
        for x in row_items_ups:
            row_items_quantity_strings = x.split("=")
            row_items_quantity_strings[0] = row_items_quantity_strings[0].replace(" ", "")
            print("ROOOOOOOOW VALUE")
            print(row_items_quantity_strings[0])
            print("==========")
            if i.item_code == row_items_quantity_strings[0] and check_temp_items(row_items_quantity_strings[0],
                                                                                 packing_slip_temp_items):
                frappe.db.sql(""" UPDATE `tabPacking Slip Item` SET status=NULL WHERE name=%s """, i.name)
                frappe.db.sql(""" UPDATE `tabPacking Slip Item` SET qty=%s WHERE name=%s """,
                              (i.qty + int(row_items_quantity_strings[1]), i.name))
                frappe.db.commit()
            elif i.item_code == row_items_quantity_strings[0] and not check_temp_items(
                    row_items_quantity_strings[0], packing_slip_temp_items):
                frappe.db.sql(""" UPDATE `tabPacking Slip Item` SET status=NULL WHERE name=%s """, i.name)
                frappe.db.sql(""" UPDATE `tabPacking Slip Item` SET qty=%s WHERE name=%s """,
                              (int(row_items_quantity_strings[1]), i.name))
                frappe.db.commit()

    frappe.db.sql(""" DELETE FROM `tabPacking Slip packages shadow` WHERE name=%s """, name)
    frappe.db.commit()

    frappe.db.sql(""" DELETE FROM `tabTemp_Items` WHERE parent=%s """, packing_slip_child[0].parent)
    frappe.db.commit()

    ps_for_review = update_temp_items(packing_slip_child[0].parent)
    print("NAA MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAn")
    return ps_for_review


def check_temp_items(item_code, packing_slip_temp_items):
    for i in packing_slip_temp_items:
        if i.item_code == item_code:
            return True
    return False

