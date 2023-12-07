import frappe
from .utils import get_columns,get_columns_other_system
def get_accounting_data(data):
    tables = [
        {
            "table_name": "SALES ORDER",
            "data": get_sales_order_data(),
            "columns": ['Today', '7D', '30D', '60D', 'Total'],
            "style": 'style="border: 1px solid lightgrey;width: 33.3%;display:block;float: left;margin-top: 10px"'
        },
        {
            "table_name": "RETURNS",
            "data": get_returns_data(),
            "columns": ['Today', '7D', '30D', '60D', 'Total'],
            "style": 'style="border: 1px solid lightgrey;width: 33.4%;display:block;float: right;;margin-top: 10px" '
        },
        {
            "table_name": "SALES INVOICE",
            "data": get_sales_invoice_data(),
            "columns": ['Today', '7D', '30D', '60D', 'Total'],
            "style": 'style="border: 1px solid lightgrey;width: 33.3%;display:block;float: right;;margin-top: 10px"'
        },
        {
            "table_name": "INSURANCE CLAIMS",
            "data": get_insurance_claim_data(),
            "columns": ['Today', '7D', '30D', '60D', 'Total'],
            "style": 'style="border: 1px solid lightgrey;width: 33.3%;display:block;float: left;;margin-top: 10px" '

        },
        {
            "table_name": "CUSTOM DESIGNS",
            "data": get_custom_orders_data(),
            "columns": ['Today', '7D', '30D', '60D', 'Total'],
            "style": 'style="border: 1px solid lightgrey;width: 33.3%;display:block;float: right;;margin-top: 10px" '
        },
        {
            "table_name": "AMAZON ORDERS",
            "data": get_amazon_orders_data(),
            "columns": ['Today', '2D', '3D', '4D', '5+'],
            "style": 'style="border: 1px solid lightgrey;width: 33.4%;display:block;float: right;;margin-top: 10px" '
        },
        {
            "table_name": "WALMART ORDERS",
            "data": get_walmart_orders_data(),
            "columns": ['Today', '2D', '3D', '4D', '5+'],
            "style": 'style="border: 1px solid lightgrey;width: 33.3%;display:block;float: left;;margin-top: 10px" '

        },
        {
            "table_name": "EBAY ORDERS",
            "data": get_ebay_orders_data(),
            "columns": ['Today', '2D', '3D', '4D', '5+'],
            "style": 'style="border: 1px solid lightgrey;width: 33.3%;display:block;float: right;;margin-top: 10px" '
        },
        {
            "table_name": "WEBSITE ORDERS",
            "data": get_website_orders_data(),
            "columns": ['Today', '2D', '3D', '4D', '5+'],
            "style": 'style="border: 1px solid lightgrey;width: 33.4%;display:block;float: right;;margin-top: 10px" '
        }
    ]
    accounting_object = {
        "tab_name":"Accounting",
        "tab_name_data":tables
    }

    data.append(accounting_object)


def get_sales_order_data():
    sales_order_data = [
        {
            "row_name" : "Pending Customer Response",
            "condition": " WHERE  SO.docstatus = 1 and SO.status='Pending Customer Response'"
        },
        {
            "row_name" : "Shipped",
            "condition": " INNER JOIN `tabDelivery Note Item` AS DNI ON DNI.against_sales_order = SO.name and DNI.idx = 1 "
                         " INNER JOIN `tabPacking Slip` AS PS ON PS.delivery_note = DNI.parent "
                         " WHERE  SO.docstatus = 1 and PS.shipment='done'"
        },
        {
            "row_name" : "Pending Shipping",
            "condition": " WHERE SO.docstatus=1 and SO.shipment_details is null"
        },
        {
            "row_name" : "Cancelled",
            "condition": " WHERE SO.docstatus = 2"
        },
        {"row_name" : "Invoiced",
         "condition": " WHERE SO.docstatus=1 and SO.status NOT LIKE '%Bill%'"
        },
        {"row_name" : "Pending Invoice/Shipped",
         "condition": " WHERE SO.docstatus=1 and SO.shipment_details is not null and SO.status LIKE '%Bill%'"
        },
        {"row_name" : "Paid",
         "condition": " INNER JOIN `tabSales Invoice Item` AS SII on SII.sales_order = SO.name and SII.idx=1"
                      " INNER JOIN `tabSales Invoice` AS SI on SI.name = SII.parent  WHERE SO.docstatus=1 and SI.status= 'Paid'"
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        }
    ]
    columns = get_columns(" SO.transaction_date")

    for sales_order_datum in sales_order_data:
        if sales_order_datum['row_name']:
            total = 0
            counts = []
            for column in columns:
                condition_ = sales_order_datum['condition'] + " and " + column
                query = """ SELECT COUNT(*) as count FROM `tabSales Order` AS SO {0}""".format(condition_)
                sales_orders = frappe.db.sql(query, as_dict=1)
                total += sales_orders[0].count
                counts.append(sales_orders[0].count if sales_orders[0].count > 0 else "-")
            counts.append(total if total > 0 else "-")
            sales_order_datum['counts'] = counts

    return sales_order_data
def get_sales_invoice_data():
    sales_invoice_data = [
        {
            "row_name" : "Draft / Pending Review",
            "condition": " WHERE SI.docstatus < 1 and SI.is_return=0"
        },
        {
            "row_name" : "Approved / Pending Payment",
            "condition": " WHERE SI.docstatus = 1 and SI.status = 'Unpaid'"
        },
        {
            "row_name" : "Paid",
            "condition": " WHERE SI.docstatus = 1 and SI.status = 'Paid'"
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        }
    ]
    columns = get_columns(" SI.posting_date")

    for sales_order_datum in sales_invoice_data:
        if sales_order_datum['row_name']:
            total = 0
            counts = []
            for column in columns:
                condition_ = sales_order_datum['condition'] + " and " + column
                query = """ SELECT COUNT(*) as count FROM `tabSales Invoice` AS SI {0}""".format(condition_)
                sales_orders = frappe.db.sql(query, as_dict=1)
                total += sales_orders[0].count
                counts.append(sales_orders[0].count if sales_orders[0].count > 0 else "-")
            counts.append(total if total > 0 else "-")
            sales_order_datum['counts'] = counts
    print("INVVOOOOOOICE")
    print(sales_invoice_data)
    return sales_invoice_data
def get_returns_data():
    returns_data = [
        {
            "row_name" : "Pending Return Review",
            "condition": " WHERE SI.docstatus < 1 and SI.is_return=1 "
        },
        {
            "row_name" : "Approved Returns / Pending Refund",
            "condition": " WHERE SI.docstatus = 1 and SI.status = 'Return'"
        },
        {
            "row_name" : "Refund Issued",
            "condition": " WHERE SI.docstatus = 1 and SI.status = 'Return'"
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        }
    ]
    columns = get_columns(" SI.posting_date")

    for sales_order_datum in returns_data:
        if sales_order_datum['row_name']:
            total = 0
            counts = []
            for column in columns:
                condition_ = sales_order_datum['condition'] + " and " + column
                query = """ SELECT COUNT(*) as count FROM `tabSales Invoice` AS SI {0}""".format(condition_)
                sales_orders = frappe.db.sql(query, as_dict=1)
                total += sales_orders[0].count
                counts.append(sales_orders[0].count if sales_orders[0].count > 0 else "-")
            counts.append(total if total > 0 else "-")
            sales_order_datum['counts'] = counts

    return returns_data
def get_insurance_claim_data():
    insurance_claim_data = [
        {
            "row_name" : "Open Claims",
            "condition": " WHERE SC.docstatus < 1 and SC.status='Pending' "
        },
        {
            "row_name" : "Approved Claims",
            "condition": " WHERE SC.docstatus = 1 and SC.status = 'Approved'"
        },
        {
            "row_name" : "Denied Claims",
            "condition": " WHERE SC.docstatus = 1 and SC.status = 'Denied'"
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        }
    ]
    columns = get_columns(" SC.posting_date")

    for sales_order_datum in insurance_claim_data:
        if sales_order_datum['row_name']:
            total = 0
            counts = []
            for column in columns:
                condition_ = sales_order_datum['condition'] + " and " + column
                query = """ SELECT COUNT(*) as count FROM `tabShipping Claims` AS SC {0}""".format(condition_)
                sales_orders = frappe.db.sql(query, as_dict=1)
                total += sales_orders[0].count
                counts.append(sales_orders[0].count if sales_orders[0].count > 0 else "-")
            counts.append(total if total > 0 else "-")
            sales_order_datum['counts'] = counts

    return insurance_claim_data
def get_custom_orders_data():
    custom_orders_data = [
        {
            "row_name" : "In Design",
            "condition": " WHERE CD.docstatus < 1 and CD.status='Designing' "
        },
        {
            "row_name" : "In Print",
            "condition": " WHERE CD.docstatus = 1 and CD.status = 'Printing'"
        },
        {
            "row_name" : "In Finishing",
            "condition": " WHERE CD.docstatus = 1 and CD.status = 'Finishing'"
        },
        {
            "row_name" : "In Shipping",
            "condition": " WHERE CD.docstatus = 1 and CD.status = 'Shipping'"
        },
        {
            "row_name" : "RUSH Designs",
            "condition": " INNER JOIN `tabCustom Design Items` AS CDI on CDI.parent = CD.name "
                         "WHERE CD.docstatus = 1 and CDI.rush = 1 and CD.status != 'Shipped'"
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        },
        {
            "row_name" : "",
            "counts": ["-","-","-","-","-"]
        }
    ]
    columns = get_columns(" CD.date_submitted")

    for sales_order_datum in custom_orders_data:
        if sales_order_datum['row_name']:
            total = 0
            counts = []
            for column in columns:
                condition_ = sales_order_datum['condition'] + " and " + column
                query = """ SELECT COUNT(*) as count FROM `tabCustom Design` AS CD {0}""".format(condition_)
                sales_orders = frappe.db.sql(query, as_dict=1)
                total += sales_orders[0].count
                counts.append(sales_orders[0].count if sales_orders[0].count > 0 else "-")
            counts.append(total if total > 0 else "-")
            sales_order_datum['counts'] = counts

    return custom_orders_data
def get_amazon_orders_data():
    custom_orders_data = [
        {
            "row_name" : "Received",
            "condition": " WHERE CC.status = 'Received' and CC.channel ='CO-AM' "
        },
        {
            "row_name" : "Pending Customer Response",
            "condition": " WHERE CC.status = 'Received' "
        },
        {
            "row_name" : "Shipping",
            "condition": " WHERE CC.sales_channel = 'CO-AM' and CC.so_type_status='Shipping'"
        },
        {
            "row_name" : "Shipped",
            "condition": " WHERE CC.sales_channel = 'CO-AM' and CC.so_type_status='Shipped'"
        },
        {
            "row_name" : "Split Order",
            "condition": " WHERE CC.sales_channel = 'CO-AM' and CC.so_type='Split Order'"
        },
        {
            "row_name" : "Sent to Vendor",
            "condition": " WHERE CC.sales_channel = 'CO-AM' and CC.so_type='To Vendor'"
        },
        {
            "row_name": "",
            "counts": ["-", "-", "-", "-", "-"]
        },
        {
            "row_name": "",
            "counts": ["-", "-", "-", "-", "-"]
        }
        # ,
        # {
        #     "row_name" : "Tracking Pushed",
        #     "condition": " WHERE CC.sales_channel = 'CO-AM' and CC.so_type='Shipping'"
        # },
        # {
        #     "row_name" : "Error in Tracking Push",
        #     "condition": " WHERE CC.sales_channel = 'CO-AM' "
        # }
    ]
    columns = get_columns_other_system(" DATE(CC.date_time) ")
    columns_ = get_columns_other_system(" CC.transaction_date")

    for sales_order_datum in custom_orders_data:
        if sales_order_datum['row_name']:
            counts = []
            for column in (columns if sales_order_datum['row_name'] == "Received" else columns_):
                condition_ = sales_order_datum['condition'] + " and " + column
                doctype = "Channel Controller" if sales_order_datum['row_name'] == "Received" else "Sales Order"
                query = """ SELECT COUNT(*) as count FROM `tab{0}` AS CC {1}""".format(doctype, condition_)
                sales_orders = frappe.db.sql(query, as_dict=1)
                counts.append(sales_orders[0].count if sales_orders[0].count > 0 else "-")
            sales_order_datum['counts'] = counts

    return custom_orders_data
def get_walmart_orders_data():
    custom_orders_data = [
        {
            "row_name": "Received",
            "condition": " WHERE CC.status = 'Received' and CC.channel ='CO-WAL' "
        },
        {
            "row_name": "Pending Customer Response",
            "condition": " WHERE CC.status = 'Received' "
        },
        {
            "row_name": "Shipping",
            "condition": " WHERE CC.sales_channel = 'CO-WAL' and CC.so_type_status='Shipping'"
        },
        {
            "row_name": "Shipped",
            "condition": " WHERE CC.sales_channel = 'CO-WAL' and CC.so_type_status='Shipped'"
        },
        {
            "row_name": "Split Order",
            "condition": " WHERE CC.sales_channel = 'CO-WAL' and CC.so_type='Split Order'"
        },
        {
            "row_name": "Sent to Vendor",
            "condition": " WHERE CC.sales_channel = 'CO-WAL' and CC.so_type='To Vendor'"
        },
        {
            "row_name": "",
            "counts": ["-", "-", "-", "-", "-"]
        },
        {
            "row_name": "",
            "counts": ["-", "-", "-", "-", "-"]
        }
        # ,
        # {
        #     "row_name" : "Tracking Pushed",
        #     "condition": " WHERE CC.sales_channel = 'CO-AM' and CC.so_type='Shipping'"
        # },
        # {
        #     "row_name" : "Error in Tracking Push",
        #     "condition": " WHERE CC.sales_channel = 'CO-AM' "
        # }
    ]
    columns = get_columns_other_system(" DATE(CC.date_time)")
    columns_ = get_columns_other_system(" CC.transaction_date")
    for sales_order_datum in custom_orders_data:
        if sales_order_datum['row_name']:
            counts = []
            for column in (columns if sales_order_datum['row_name'] == "Received" else columns_):
                condition_ = sales_order_datum['condition'] + " and " + column
                doctype = "Channel Controller" if sales_order_datum['row_name'] == "Received" else "Sales Order"

                query = """ SELECT COUNT(*) as count FROM `tab{0}` AS CC {1}""".format(doctype,condition_)
                sales_orders = frappe.db.sql(query, as_dict=1)
                counts.append(sales_orders[0].count if sales_orders[0].count > 0 else "-")
            sales_order_datum['counts'] = counts

    return custom_orders_data
def get_website_orders_data():
    custom_orders_data = [
        # {
        #     "row_name": "Received",
        #     "condition": " WHERE CD.docstatus < 1 and CD.status='Designing' "
        # },
        # {
        #     "row_name": "Pending Customer Response",
        #     "condition": " WHERE CD.docstatus = 1 and CD.status = 'Printing'"
        # },
        {
            "row_name": "Shipping",
            "condition": " WHERE SO.docstatus = 1 and SO.so_type_status = 'Shipping' and SO.so_type = 'Shopping Cart'"
        },
        {
            "row_name": "Shipped",
            "condition": " WHERE SO.docstatus = 1 and SO.so_type_status = 'Shipped' and SO.so_type = 'Shopping Cart'"
        },
        {
            "row_name": "Split Order",
            "condition": " WHERE SO.docstatus = 1 and SO.so_type = 'Split Order' and SO.so_type = 'Shopping Cart'"
        },
        {
            "row_name": "Sent to Vendor",
            "condition": " WHERE SO.docstatus = 1 and SO.so_type = 'To Vendor' and SO.so_type = 'Shopping Cart'"

        },
        {
            "row_name": "",
            "counts": ["-", "-", "-", "-", "-"]
        },
        {
            "row_name": "",
            "counts": ["-", "-", "-", "-", "-"]
        },
        {
            "row_name": "",
            "counts": ["-", "-", "-", "-", "-"]
        },
        {
            "row_name": "",
            "counts": ["-", "-", "-", "-", "-"]
        },
        # {
        #     "row_name": "Tracking Pushed",
        #     "condition": " WHERE SO.docstatus = 1 and SO.so_type_status = 'Shipped'"
        #
        # },
        # {
        #     "row_name": "Error in Tracking Push",
        #     "condition": " INNER JOIN `tabCustom Design Items` AS CDI on CDI.parent = CD.name "
        #                  "WHERE CD.docstatus = 1 and CDI.rush = 1"
        # }
    ]
    columns = get_columns_other_system(" SO.transaction_date")

    for sales_order_datum in custom_orders_data:
        if sales_order_datum['row_name']:
            counts = []
            for column in columns:
                condition_ = sales_order_datum['condition'] + " and " + column
                query = """ SELECT COUNT(*) as count FROM `tabSales Order` AS SO {0}""".format(condition_)
                sales_orders = frappe.db.sql(query, as_dict=1)
                counts.append(sales_orders[0].count if sales_orders[0].count > 0 else "-")
            sales_order_datum['counts'] = counts

    return custom_orders_data
def get_ebay_orders_data():
    custom_orders_data = [
        {
            "row_name": "Received",
            "condition": " WHERE CD.docstatus < 1 and CD.status='Designing' "
        },
        {
            "row_name": "Pending Customer Response",
            "condition": " WHERE CD.docstatus = 1 and CD.status = 'Printing'"
        },
        {
            "row_name": "in Shipping",
            "condition": " WHERE CD.docstatus = 1 and CD.status = 'Finishing'"
        },
        {
            "row_name": "Shipped",
            "condition": " WHERE CD.docstatus = 1 and CD.status = 'Shipping'"
        },
        {
            "row_name": "Split Order",
            "condition": " INNER JOIN `tabCustom Design Items` AS CDI on CDI.parent = CD.name "
                         "WHERE CD.docstatus = 1 and CDI.rush = 1"
        },
        {
            "row_name": "Sent to Vendor",
            "condition": " INNER JOIN `tabCustom Design Items` AS CDI on CDI.parent = CD.name "
                         "WHERE CD.docstatus = 1 and CDI.rush = 1"
        },
        {
            "row_name": "Tracking Pushed",
            "condition": " INNER JOIN `tabCustom Design Items` AS CDI on CDI.parent = CD.name "
                         "WHERE CD.docstatus = 1 and CDI.rush = 1"
        },
        {
            "row_name": "Error in Tracking Push",
            "condition": " INNER JOIN `tabCustom Design Items` AS CDI on CDI.parent = CD.name "
                         "WHERE CD.docstatus = 1 and CDI.rush = 1"
        }
    ]
    columns = get_columns_other_system(" CD.date_submitted")

    for sales_order_datum in custom_orders_data:
        if sales_order_datum['row_name']:
            counts = []
            for column in columns:
                condition_ = sales_order_datum['condition'] + " and " + column
                query = """ SELECT COUNT(*) as count FROM `tabCustom Design` AS CD {0}""".format(condition_)
                sales_orders = frappe.db.sql(query, as_dict=1)
                counts.append(sales_orders[0].count if sales_orders[0].count > 0 else "-")
            sales_order_datum['counts'] = counts

    return custom_orders_data