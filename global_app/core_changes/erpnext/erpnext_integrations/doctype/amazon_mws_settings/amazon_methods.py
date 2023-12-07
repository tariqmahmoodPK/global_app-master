# -*- coding: utf-8 -*-
# Copyright (c) 2018, Frappe Technologies and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe, time, dateutil, math, csv, json, re

try:
    from StringIO import StringIO
except ImportError:
    from io import StringIO
import erpnext.erpnext_integrations.doctype.amazon_mws_settings.amazon_mws_api as mws
from frappe import _
from erpnext.erpnext_integrations.utils import check_items_availabilty_IN_CA, link_customer_and_address, \
    mp_validate_item, create_mp_orders, validate_ups_Address
import datetime
import xml.etree.ElementTree as ET
from time import strftime, gmtime


# Get and Create Products
def get_products_details():
    products = get_products_instance()
    reports = get_reports_instance()

    mws_settings = frappe.get_doc("Amazon MWS Settings")
    market_place_list = return_as_list(mws_settings.market_place_id)

    for marketplace in market_place_list:
        report_id = request_and_fetch_report_id("_GET_FLAT_FILE_OPEN_LISTINGS_DATA_", None, None, market_place_list)

        if report_id:
            listings_response = reports.get_report(report_id=report_id)

            # Get ASIN Codes
            string_io = StringIO(listings_response.original.decode('utf-8'))
            csv_rows = list(csv.reader(string_io, delimiter=str('\t')))
            asin_list = list(set([row[1] for row in csv_rows[1:]]))
            # break into chunks of 10
            asin_chunked_list = list(chunks(asin_list, 10))

            # Map ASIN Codes to SKUs
            sku_asin = [{"asin": row[1], "sku": row[0]} for row in csv_rows[1:]]

            # Fetch Products List from ASIN
            for asin_list in asin_chunked_list:
                products_response = call_mws_method(products.get_matching_product, marketplaceid=marketplace,
                                                    asins=asin_list)

                matching_products_list = products_response.parsed
                for product in matching_products_list:
                    skus = [row["sku"] for row in sku_asin if row["asin"] == product.ASIN]
                    for sku in skus:
                        if product.status == "Success":
                            create_item_code(product, sku)


def get_products_instance():
    mws_settings = frappe.get_doc("Amazon MWS Settings")
    products = mws.Products(
        account_id=mws_settings.seller_id,
        access_key=mws_settings.aws_access_key_id,
        secret_key=mws_settings.secret_key,
        region=mws_settings.region,
        domain=mws_settings.domain,
        authtoken=mws_settings.mws_auth_token
    )

    return products


def get_fullfilment_instance():
    mws_settings = frappe.get_doc("Amazon MWS Settings")
    outboundshipments = mws.OutboundShipments(
        account_id=mws_settings.seller_id,
        access_key=mws_settings.aws_access_key_id,
        secret_key=mws_settings.secret_key,
        region=mws_settings.region,
        domain=mws_settings.domain,
        authtoken=mws_settings.mws_auth_token
    )

    return outboundshipments


def get_reports_instance():
    mws_settings = frappe.get_doc("Amazon MWS Settings")
    reports = mws.Reports(
        account_id=mws_settings.seller_id,
        access_key=mws_settings.aws_access_key_id,
        secret_key=mws_settings.secret_key,
        region=mws_settings.region,
        domain=mws_settings.domain,
        authtoken=mws_settings.mws_auth_token
    )

    return reports


# returns list as expected by amazon API
def return_as_list(input_value):
    if isinstance(input_value, list):
        return input_value
    else:
        return [input_value]


# function to chunk product data
def chunks(l, n):
    for i in range(0, len(l), n):
        yield l[i:i + n]


def request_and_fetch_report_id(report_type, start_date=None, end_date=None, marketplaceids=None):
    reports = get_reports_instance()
    report_response = reports.request_report(report_type=report_type,
                                             start_date=start_date,
                                             end_date=end_date,
                                             marketplaceids=marketplaceids)

    # add time delay to wait for amazon to generate report
    time.sleep(20)
    report_request_id = report_response.parsed["ReportRequestInfo"]["ReportRequestId"]["value"]
    generated_report_id = None
    # poll to get generated report
    for x in range(1, 10):
        report_request_list_response = reports.get_report_request_list(requestids=[report_request_id])
        report_status = report_request_list_response.parsed["ReportRequestInfo"]["ReportProcessingStatus"]["value"]

        if report_status == "_SUBMITTED_" or report_status == "_IN_PROGRESS_":
            # add time delay to wait for amazon to generate report
            time.sleep(15)
            continue
        elif report_status == "_CANCELLED_":
            break
        elif report_status == "_DONE_NO_DATA_":
            break
        elif report_status == "_DONE_":
            generated_report_id = report_request_list_response.parsed["ReportRequestInfo"]["GeneratedReportId"]["value"]
            break
    return generated_report_id


def call_mws_method(mws_method, *args, **kwargs):
    mws_settings = frappe.get_doc("Amazon MWS Settings")
    max_retries = mws_settings.max_retry_limit
    # frappe.msgprint("ok","ok")
    for x in range(0, max_retries):
        try:
            response = mws_method(*args, **kwargs)
            return response
        except Exception as e:
            delay = math.pow(4, x) * 125
            frappe.msgprint(str(e))
            frappe.log_error(message=e, title=str(mws_method))
            time.sleep(delay)
            continue

    mws_settings.enable_synch = 0
    mws_settings.save()

    frappe.throw(_("Sync has been temporarily disabled because maximum retries have been exceeded"))


def create_item_code(amazon_item_json, sku):
    if frappe.db.get_value("Item", sku):
        return

    item = frappe.new_doc("Item")

    new_manufacturer = create_manufacturer(amazon_item_json)
    new_brand = create_brand(amazon_item_json)

    mws_settings = frappe.get_doc("Amazon MWS Settings")

    item.item_code = sku
    item.amazon_item_code = amazon_item_json.ASIN
    item.item_group = mws_settings.item_group
    item.description = amazon_item_json.Product.AttributeSets.ItemAttributes.Title
    item.brand = new_brand
    item.manufacturer = new_manufacturer
    item.web_long_description = amazon_item_json.Product.AttributeSets.ItemAttributes.Title

    item.image = amazon_item_json.Product.AttributeSets.ItemAttributes.SmallImage.URL

    temp_item_group = amazon_item_json.Product.AttributeSets.ItemAttributes.ProductGroup

    item_group = frappe.db.get_value("Item Group", filters={"item_group_name": temp_item_group})

    if not item_group:
        igroup = frappe.new_doc("Item Group")
        igroup.item_group_name = temp_item_group
        igroup.parent_item_group = mws_settings.item_group
        igroup.insert()

    item.insert(ignore_permissions=True)
    create_item_price(amazon_item_json, item.item_code)

    return item.name


def create_manufacturer(amazon_item_json):
    existing_manufacturer = frappe.db.get_value("Manufacturer",
                                                filters={
                                                    "short_name": amazon_item_json.Product.AttributeSets.ItemAttributes.Manufacturer})

    if not existing_manufacturer:
        manufacturer = frappe.new_doc("Manufacturer")
        manufacturer.short_name = amazon_item_json.Product.AttributeSets.ItemAttributes.Manufacturer
        manufacturer.insert()
        return manufacturer.short_name
    else:
        return existing_manufacturer


def create_brand(amazon_item_json):
    existing_brand = frappe.db.get_value("Brand",
                                         filters={"brand": amazon_item_json.Product.AttributeSets.ItemAttributes.Brand})
    if not existing_brand:
        brand = frappe.new_doc("Brand")
        brand.brand = amazon_item_json.Product.AttributeSets.ItemAttributes.Brand
        brand.insert()
        return brand.brand
    else:
        return existing_brand


def create_item_price(amazon_item_json, item_code):
    item_price = frappe.new_doc("Item Price")
    item_price.price_list = frappe.db.get_value("Amazon MWS Settings", "Amazon MWS Settings", "price_list")
    if not ("ListPrice" in amazon_item_json.Product.AttributeSets.ItemAttributes):
        item_price.price_list_rate = 0
    else:
        item_price.price_list_rate = amazon_item_json.Product.AttributeSets.ItemAttributes.ListPrice.Amount

    item_price.item_code = item_code
    item_price.insert()


# Get and create Orders
def create_fulfilment_feed(body):
    fullfilment_feed = get_fullfilment_feed_instance()
    xml_item = ""
    mws_settings = frappe.get_doc("Amazon MWS Settings")
    market_place_list = return_as_list(mws_settings.market_place_id)
    fulfilment_response = call_mws_method(fullfilment_feed.submit_feed,
                                          feed=body,
                                          feed_type='_POST_ORDER_FULFILLMENT_DATA_',
                                          marketplaceids=market_place_list)
    """fulfilment_response = call_mws_method(fullfilment_feed.cancel_feed_submissions,
			feedids=['50067018060'])    """
    return fulfilment_response.parsed

    """fulfilment_response = call_mws_method(fullfilment_feed.get_feed_submission_list) return fulfilment_response.parsed"""


def get_feed_result(feedsubmissionId=None):
    result_feed = get_fullfilment_feed_instance()
    feed_response = call_mws_method(result_feed.get_feed_submission_result, feedsubmissionId)
    return feed_response.parsed


def controller_set_orders(c_order):
    billing_data = ""
    shipping_data = {
        "doctype": "Address",
        "address_title": c_order.ship_to,
        "address_line1": c_order.address_line_1,
        "address_line2": c_order.address_line_2,
        "city": c_order.city,
        "address_type": "Shipping",
        "county": "United States",
        "state": c_order.state,
        "pincode": c_order.pincode,
        "phone": c_order.phone
    }
    cust_title = c_order.customer
    changes = "0"
    ord_id = c_order.order_id
    customer_name, billing_name, shipping_name, status, changes = link_customer_and_address(billing_data, shipping_data,
                                                                                            cust_title, changes, ord_id)
    so_fields = frappe.db.get_all("Sales Order", filters={"amazon_order_id": ord_id}, fields=["name"])
    if len(so_fields) == 0:
        msg = ""
        new_sales_order = frappe.new_doc("Sales Order")
        new_sales_order.customer = customer_name
        new_sales_order.sales_channel = c_order.channel
        updated_db = True
        item_list = []
        items_list = frappe.get_all("Controller Item", filters={'parent': c_order.name}, fields=['*'])
        for item in items_list:
            new_sales_order.append("items", {
                "item_code": item.item_code,
                "qty": item.qty
            })

        delivery_date = dateutil.parser.parse(c_order.latest_deliver).strftime("%Y-%m-%d")
        transaction_date = dateutil.parser.parse(c_order.date_time).strftime("%Y-%m-%d")
        new_sales_order.company = frappe.db.get_value("Amazon MWS Settings", "Amazon MWS Settings", "company")
        new_sales_order.transaction_date = transaction_date
        new_sales_order.po_no = ord_id
        new_sales_order.amazon_order_id = ord_id
        # new_sales_order.po_no="CO-AM_113-2314853-6504203_10"
        # new_sales_order.amazon_order_id ="CO-AM_113-2314853-6504203_10"
        new_sales_order.naming_series = "SO-"
        new_sales_order.status = "Draft"
        new_sales_order.selling_price_list = "Standard Selling"
        new_sales_order.price_list_currency = "USD"
        new_sales_order.conversion_rate = 1
        new_sales_order.ignore_pricing_rule = 1
        new_sales_order.apply_discount_on = "Net Total"
        new_sales_order.shipping_address_name = shipping_name[0]
        new_sales_order.shipping_address_validation = 'Address Validated'
        new_sales_order.delivery_date = delivery_date
        new_sales_order.shipping_service = "UPS-Ground"
    else:
        updated_db = False
        changes.append({"change": "AMAZON Order Already exist", "customer_id": customer_name, "mp_order_id": ord_id})
        msg = "Order Already exist"
        new_sales_order = ""

    create_mp_orders(new_sales_order, updated_db)
    # return  new_sales_order,updated_db,changes,msg
    return "test"


# def set_controller_from_controller(c_order)

def get_one_order(order_id):
    order = get_orders_instance()
    orders_response = call_mws_method(order.get_order, order_id)
    return orders_response.parsed.Orders


def get_orders(api_status=None):  # after_date
    changes = []
    customer_name = ""
    channel = "CO-AM"
    tot_orders = 0
    warning = 0
    errors = 0
    log_dict = {"doctype": "MP Log", "sync_datetime": datetime.datetime.now(), "channel": channel, "log_table": []}
    msgprint_log = []
    try:
        from frappe.utils import cstr, flt, getdate, comma_and, cint, today, add_days
        after_date = add_days(getdate(today()), -10)
        # frappe.msgprint(str(after_date))
        # frappe.msgprint(str(strftime("%Y-%m-%dT%H:%M:%SZ", gmtime())))
        orders = get_orders_instance()
        # statuses = ["PartiallyShipped", "Unshipped", "Shipped", "Canceled"]
        statuses = ["PartiallyShipped", "Unshipped"]
        mws_settings = frappe.get_doc("Amazon MWS Settings")
        market_place_list = return_as_list(mws_settings.market_place_id)
        orders_response = call_mws_method(orders.list_orders, marketplaceids=market_place_list,
                                          fulfillment_channels=["MFN", "AFN"],
                                          lastupdatedafter=after_date,
                                          orderstatus=statuses,
                                          max_results='20')

        # return orders_response.parsed.Orders.Order
        # print("++++++++++++++++++++++++++++++++++++++++++++++++++++")
        while True:
            orders_list = []
            if "Order" in orders_response.parsed.Orders:
                orders_list = return_as_list(orders_response.parsed.Orders.Order)
                print(orders_list)

            if len(orders_list) == 0:
                break

            for order in orders_list:

                if order.OrderStatus == "Unshipped" or order.OrderStatus == "PartiallyShipped":
                    ord_id = order.AmazonOrderId
                    billing_data, shipping_data, cust_title, ship_to = extract_shipping_billing(order)
                    sync = mws_settings.enable_amazon
                    if api_status == "sync":
                        war, err, tt_ord = make_channel_controller(order, ord_id, cust_title, ship_to, shipping_data,
                                                                   channel, sync)
                        # print("###############################")
                        # print("###############################")
                        # print(shipping_data)
                        warning = warning + war
                        errors = errors + err
                        tot_orders = tot_orders + tt_ord
                    elif api_status == "so":
                        co = frappe.db.get_all("Channel Controller", filters={"order_id": ord_id, "channel": channel},
                                               fields=["status"])
                        if len(co) > 0:
                            if co[0]["status"] == "In-Process":
                                customer_name, billing_name, shipping_name, status, changes = link_customer_and_address(
                                    billing_data, shipping_data, cust_title, changes, ord_id)
                                # return shipping_name
                                # print(status)
                                if status == 'success':
                                    new_sales_order, updated_db, changes, or_st = extract_orders(order, customer_name,
                                                                                                 billing_name,
                                                                                                 shipping_name, changes,
                                                                                                 ord_id, channel)
                                    # or_st=extract_orders(order,customer_name,billing_name,shipping_name,changes,ord_id,channel)
                                    # return or_st
                                    if updated_db == False:
                                        msgprint_log.append('AMAZON Order ID: ' + str(ord_id) + ' has  issue' + or_st)
                                    else:
                                        create_mp_orders(new_sales_order, updated_db)
                                        msgprint_log.append(
                                            'AMAZON Order ID: ' + str(ord_id) + ' has successfully added')
                                        changes.append(
                                            {"change": "AMAZON Order successfully added", "customer_id": customer_name,
                                             "mp_order_id": ord_id})

                                else:
                                    msgprint_log.append('AMAZON Order ID: ' + str(ord_id) + ', Address not Valid')
                                # create_sales_order(order, after_date)
                else:
                    msgprint_log.append('AMAZON Order ID: ' + str(ord_id) + ', Canceled')

            if not "NextToken" in orders_response.parsed:
                break

            next_token = orders_response.parsed.NextToken
            orders_response = call_mws_method(orders.list_orders_by_next_token, next_token)
        """orders_list=[{"IsBusinessOrder": {"value": "false"}, "IsReplacementOrder": {"value": "false"}, "AmazonOrderId": {"value": "114-2950557-8397052"}, "ShipServiceLevel": {"value": "Std US D2D Dom"}, "OrderTotal": {"value": "\n ", "CurrencyCode": {"value": "USD"}, "Amount": {"value": "49.99"}}, "BuyerName": {"value": "jacob d carver"}, "LastUpdateDate": {"value": "2019-05-17T15:09:38.694Z"}, "BuyerEmail": {"value": "vxh4w73wvy6s864@marketplace.amazon.com"}, "IsPrime": {"value": "false"}, "ShipmentServiceLevelCategory": {"value": "Standard"}, "NumberOfItemsShipped": {"value": "0"}, "PaymentMethod": {"value": "Other"}, "ShippedByAmazonTFM": {"value": "false"}, "NumberOfItemsUnshipped": {"value": "1"}, "LatestShipDate": {"value": "2019-05-22T06:59:59Z"}, "MarketplaceId": {"value": "ATVPDKIKX0DER"}, "ShippingAddress": {"Phone": {"value": "+1 415-851-9136 ext. 62936"}, "isAddressSharingConfidential": {"value": "false"}, "AddressLine1": {"value": "202 DORAL DR"}, "AddressType": {"value": "Residential"}, "StateOrRegion": {"value": "TX"}, "value": "\n ", "CountryCode": {"value": "US"}, "City": {"value": "PORTLAND"}, "PostalCode": {"value": "78374-4003"}, "Name": {"value": "Shauna carver"}}, "EarliestDeliveryDate": {"value": "2019-05-23T07:00:00Z"}, "OrderStatus": {"value": "Unshipped"}, "LatestDeliveryDate": {"value": "2019-05-30T06:59:59Z"}, "IsPremiumOrder": {"value": "false"}, "value": "\n ", "OrderType": {"value": "StandardOrder"}, "SalesChannel": {"value": "Amazon.com"}, "FulfillmentChannel": {"value": "MFN"}, "PaymentMethodDetails": {"value": "\n ", "PaymentMethodDetail": {"value": "Standard"}}, "EarliestShipDate": {"value": "2019-05-20T07:00:00Z"}, "PurchaseDate": {"value": "2019-05-17T14:40:04.127Z"}}, {"IsBusinessOrder": {"value": "false"}, "IsReplacementOrder": {"value": "false"}, "AmazonOrderId": {"value": "114-3915250-4800256"}, "ShipServiceLevel": {"value": "Std US D2D Dom"}, "OrderTotal": {"value": "\n ", "CurrencyCode": {"value": "USD"}, "Amount": {"value": "49.99"}}, "BuyerName": {"value": "Ernesto Escudero"}, "LastUpdateDate": {"value": "2019-05-17T17:21:10.568Z"}, "BuyerEmail": {"value": "bh7z8nq06sjwzhd@marketplace.amazon.com"}, "IsPrime": {"value": "false"}, "ShipmentServiceLevelCategory": {"value": "Standard"}, "NumberOfItemsShipped": {"value": "1"}, "PaymentMethod": {"value": "Other"}, "ShippedByAmazonTFM": {"value": "false"}, "NumberOfItemsUnshipped": {"value": "0"}, "LatestShipDate": {"value": "2019-05-21T06:59:59Z"}, "MarketplaceId": {"value": "ATVPDKIKX0DER"}, "ShippingAddress": {"Phone": {"value": "+1 415-851-9136 ext. 08626"}, "isAddressSharingConfidential": {"value": "false"}, "AddressLine1": {"value": "35107 ANAQUA DR"}, "AddressType": {"value": "Residential"}, "StateOrRegion": {"value": "TEXAS"}, "value": "\n ", "CountryCode": {"value": "US"}, "City": {"value": "LOS FRESNOS"}, "PostalCode": {"value": "78566-4430"}, "Name": {"value": "Juan Ernesto Escudero"}}, "EarliestDeliveryDate": {"value": "2019-05-22T07:00:00Z"}, "OrderStatus": {"value": "Shipped"}, "LatestDeliveryDate": {"value": "2019-05-29T06:59:59Z"}, "IsPremiumOrder": {"value": "false"}, "value": "\n ", "OrderType": {"value": "StandardOrder"}, "SalesChannel": {"value": "Amazon.com"}, "FulfillmentChannel": {"value": "MFN"}, "PaymentMethodDetails": {"value": "\n ", "PaymentMethodDetail": {"value": "Standard"}}, "EarliestShipDate": {"value": "2019-05-17T07:00:00Z"}, "PurchaseDate": {"value": "2019-05-16T23:50:22.515Z"}}, {"IsBusinessOrder": {"value": "false"}, "IsReplacementOrder": {"value": "false"}, "AmazonOrderId": {"value": "114-3188517-3727464"}, "ShipServiceLevel": {"value": "Std US D2D Dom"}, "OrderTotal": {"value": "\n ", "CurrencyCode": {"value": "USD"}, "Amount": {"value": "49.99"}}, "BuyerName": {"value": "James"}, "LastUpdateDate": {"value": "2019-05-17T17:22:07.892Z"}, "BuyerEmail": {"value": "gbsq9vxfwcfpflb@marketplace.amazon.com"}, "IsPrime": {"value": "false"}, "ShipmentServiceLevelCategory": {"value": "Standard"}, "NumberOfItemsShipped": {"value": "1"}, "PaymentMethod": {"value": "Other"}, "ShippedByAmazonTFM": {"value": "false"}, "NumberOfItemsUnshipped": {"value": "0"}, "LatestShipDate": {"value": "2019-05-21T06:59:59Z"}, "MarketplaceId": {"value": "ATVPDKIKX0DER"}, "ShippingAddress": {"Phone": {"value": "+1 415-851-9136 ext. 54463"}, "isAddressSharingConfidential": {"value": "false"}, "AddressLine1": {"value": "46 FM 2271"}, "AddressType": {"value": "Commercial"}, "StateOrRegion": {"value": "TX"}, "value": "\n ", "CountryCode": {"value": "US"}, "City": {"value": "BELTON"}, "PostalCode": {"value": "76513-6519"}, "Name": {"value": "James Chalmers"}}, "EarliestDeliveryDate": {"value": "2019-05-22T07:00:00Z"}, "OrderStatus": {"value": "Shipped"}, "LatestDeliveryDate": {"value": "2019-05-29T06:59:59Z"}, "IsPremiumOrder": {"value": "false"}, "value": "\n ", "OrderType": {"value": "StandardOrder"}, "SalesChannel": {"value": "Amazon.com"}, "FulfillmentChannel": {"value": "MFN"}, "PaymentMethodDetails": {"value": "\n ", "PaymentMethodDetail": {"value": "Standard"}}, "EarliestShipDate": {"value": "2019-05-17T07:00:00Z"}, "PurchaseDate": {"value": "2019-05-17T02:19:34.552Z"}}, {"IsBusinessOrder": {"value": "false"}, "IsReplacementOrder": {"value": "false"}, "AmazonOrderId": {"value": "113-5631759-6551459"}, "ShipServiceLevel": {"value": "Std US D2D Dom"}, "OrderTotal": {"value": "\n ", "CurrencyCode": {"value": "USD"}, "Amount": {"value": "54.00"}}, "BuyerName": {"value": "Antoine Awaijane"}, "LastUpdateDate": {"value": "2019-05-17T17:28:31.730Z"}, "BuyerEmail": {"value": "rtcrx6zkn2tfywh@marketplace.amazon.com"}, "IsPrime": {"value": "false"}, "ShipmentServiceLevelCategory": {"value": "Standard"}, "NumberOfItemsShipped": {"value": "1"}, "PaymentMethod": {"value": "Other"}, "ShippedByAmazonTFM": {"value": "false"}, "NumberOfItemsUnshipped": {"value": "0"}, "LatestShipDate": {"value": "2019-05-21T06:59:59Z"}, "MarketplaceId": {"value": "ATVPDKIKX0DER"}, "ShippingAddress": {"Phone": {"value": "+1 415-851-9136 ext. 63313"}, "isAddressSharingConfidential": {"value": "false"}, "AddressLine1": {"value": "3319 E 54TH ST"}, "AddressType": {"value": "Commercial"}, "StateOrRegion": {"value": "MN"}, "value": "\n ", "CountryCode": {"value": "US"}, "City": {"value": "MINNEAPOLIS"}, "PostalCode": {"value": "55417-2050"}, "Name": {"value": "Antoine Awaijane"}}, "EarliestDeliveryDate": {"value": "2019-05-22T07:00:00Z"}, "OrderStatus": {"value": "Shipped"}, "LatestDeliveryDate": {"value": "2019-05-29T06:59:59Z"}, "IsPremiumOrder": {"value": "false"}, "value": "\n ", "OrderType": {"value": "StandardOrder"}, "SalesChannel": {"value": "Amazon.com"}, "FulfillmentChannel": {"value": "MFN"}, "PaymentMethodDetails": {"value": "\n ", "PaymentMethodDetail": {"value": "Standard"}}, "EarliestShipDate": {"value": "2019-05-17T07:00:00Z"}, "PurchaseDate": {"value": "2019-05-16T19:46:32.237Z"}}, {"IsBusinessOrder": {"value": "false"}, "IsReplacementOrder": {"value": "false"}, "AmazonOrderId": {"value": "112-3786994-8857068"}, "ShipServiceLevel": {"value": "Std US D2D Dom"}, "OrderTotal": {"value": "\n ", "CurrencyCode": {"value": "USD"}, "Amount": {"value": "49.99"}}, "BuyerName": {"value": "HASSIB"}, "LastUpdateDate": {"value": "2019-05-17T17:33:41.203Z"}, "BuyerEmail": {"value": "3wc3s0yjs8dv6lw@marketplace.amazon.com"}, "IsPrime": {"value": "false"}, "ShipmentServiceLevelCategory": {"value": "Standard"}, "NumberOfItemsShipped": {"value": "1"}, "PaymentMethod": {"value": "Other"}, "ShippedByAmazonTFM": {"value": "false"}, "NumberOfItemsUnshipped": {"value": "0"}, "LatestShipDate": {"value": "2019-05-21T06:59:59Z"}, "MarketplaceId": {"value": "ATVPDKIKX0DER"}, "ShippingAddress": {"Phone": {"value": "+1 415-851-9136 ext. 86984"}, "isAddressSharingConfidential": {"value": "false"}, "AddressLine1": {"value": "88 BRONCO LN"}, "AddressType": {"value": "Residential"}, "StateOrRegion": {"value": "VA"}, "value": "\n ", "CountryCode": {"value": "US"}, "City": {"value": "FREDERICKSBURG"}, "PostalCode": {"value": "22406-4233"}, "Name": {"value": "HASSIB HAMZAOUI"}}, "EarliestDeliveryDate": {"value": "2019-05-22T07:00:00Z"}, "OrderStatus": {"value": "Shipped"}, "LatestDeliveryDate": {"value": "2019-05-29T06:59:59Z"}, "IsPremiumOrder": {"value": "false"}, "value": "\n ", "OrderType": {"value": "StandardOrder"}, "SalesChannel": {"value": "Amazon.com"}, "FulfillmentChannel": {"value": "MFN"}, "PaymentMethodDetails": {"value": "\n ", "PaymentMethodDetail": {"value": "Standard"}}, "EarliestShipDate": {"value": "2019-05-17T07:00:00Z"}, "PurchaseDate": {"value": "2019-05-16T17:47:48.213Z"}}]			
			for order in orders_list:                                   
					ord_id=order['AmazonOrderId']['value']
					billing_data,shipping_data,cust_title=extract_shipping_billing(order) 					
					customer_name,billing_name,shipping_name,status,changes=link_customer_and_address(billing_data,shipping_data,cust_title,changes,ord_id)					
					if status=='success':
							new_sales_order,updated_db,changes,or_st=extract_orders(order,customer_name,billing_name,shipping_name,changes,ord_id,channel)
							#s=json.dumps(new_sales_order.__dict__) 
							#return s
							#new_sales_order.insert()   

							#frappe.db.commit()   
							#or_st=extract_orders(order,customer_name,billing_name,shipping_name,changes,ord_id,channel)
							#return or_st
							#s=json.dumps(new_sales_order.__dict__) 
							if updated_db ==False:
								msgprint_log.append('AMAZON Order ID: '+ str(ord_id)+ ' has '+or_st)         
							else: 
								create_mp_orders(new_sales_order,updated_db)  
								msgprint_log.append('AMAZON Order ID: '+ str(ord_id)+ ' has successfully added')
								changes.append({"change": "AMAZON Order successfully added","customer_id":customer_name,"mp_order_id":ord_id}) 					
					else:
						msgprint_log.append('AMAZON Order ID: '+	str(ord_id)+', Address not Valid')   
						#create_sales_order(order, after_date)"""
    # return msgprint_log
    # frappe.msgprint(msgprint_log)
    except Exception as e:
        print("Exception")
        frappe.msgprint(e)
        frappe.log_error(title="get_orders amazon", message=e)
    finally:
        print(len(changes))
        if len(changes) > 0:
            for change in changes:
                log_dict['log_table'].append(change)
                log = frappe.get_doc(log_dict)
            log.insert()
            frappe.db.commit()
        msgprint_log.append(
            'Orders downloaded: ' + str(tot_orders) + "<br><span style='color:orange'>Warnings: </span>" + str(
                warning) + "<br><span style='color:red'>Errors: </span>" + str(errors))
        frappe.msgprint(msgprint_log)


def make_channel_controller(order, ord_id, cust_title, ship_to, shipping_data, channel, enable_checkbox):
    war = 0
    err = 0
    tt_ord = 0
    co = frappe.db.get_all("Channel Controller", filters={"order_id": ord_id, "channel": channel}, fields=["name"])
    if len(co) == 0:
        now = datetime.datetime.now()
        status = "Received"
        reason = ""
        assigned_to = ""
        latest_ship = order.LatestDeliveryDate.split("T")
        new_cha_cont = frappe.new_doc("Channel Controller")
        new_cha_cont.order_id = ord_id
        new_cha_cont.channel = channel
        new_cha_cont.controller_id = channel + "_" + ord_id

        ups_val = validate_ups_Address(shipping_data)
        # frappe.msgprint(shipping_data)
        # frappe.msgprint(ups_val)
        # frappe.msgprint(str(ups_val.AddressClassification))
        # ups_val=json.loads(ups_val)
        # new_cha_cont.suggestions_1="4870 S ATLANTIC AVE,NEW SMYRNA BEACH,32169,US??4870 S ATLANTIC AVE,NEW SMYRNA BEACH,32169,US??4870 S ATLANTIC AVE,NEW SMYRNA BEACH,32169,US??4870 S ATLANTIC AVE,NEW SMYRNA BEACH,32169,US??"
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

        new_cha_cont.ship_to = ship_to
        new_cha_cont.latest_deliver = latest_ship[0]
        # new_cha_cont.date_time=datetime.datetime.now()
        new_cha_cont.date_time = now.strftime("%Y-%m-%d, %H:%M:%S")
        new_cha_cont.customer = cust_title
        new_cha_cont.priority = order.ShipServiceLevel
        new_cha_cont.address_line_1 = shipping_data["address_line1"]
        new_cha_cont.address_line_2 = shipping_data["address_line2"]
        new_cha_cont.city = shipping_data["city"]
        state = shipping_data["state"]
        new_cha_cont.state = state
        new_cha_cont.phone = shipping_data["phone"]
        new_cha_cont.pincode = shipping_data["pincode"]
        state_channel = frappe.db.get_all("US States", filters={"abb": state}, fields=["mp_channel"])
        if (len(state_channel) > 0):
            region = state_channel[0]["mp_channel"]
        else:
            state_channel_s = frappe.db.get_all("US States", filters={"name": state}, fields=["mp_channel"])
            if (len(state_channel_s) > 0):
                region = state_channel_s[0]["mp_channel"]
            else:
                region = "GA"
        new_cha_cont.region = region
        assigned_to = region

        item_list = []
        items_list = get_order_items_controller(ord_id)
        # frappe.msgprint(items_list)
        missing_item = []
        list_ama = []
        for item in items_list:
            new_cha_cont.append("ama_order_item", {
                "item_sku": item['item_code'],
                "quantity": item['qty'],
                "mp_item_id": item["mp_line_item_id"],
                "title": item["item_name"]
            })
            """new_cha_cont.append("tracking_info",{
					"quantity": item['qty'],
					"mp_item_id":item["mp_line_item_id"],
					"carrier":"UPS",
					"method":"Ground" 
				}) """
            list1 = []
            list1 = mp_get_amazon_items(item['item_code'], item['qty'])
            for x in list1:
                list_ama.append({"item_code": x["item_code"], "quantity": x["quantity"]})
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
                list_qty = frappe.db.get_all("Bin", filters={"item_code": li.get("item_code")}, fields=["actual_qty"])
                if item_name:
                    if item_name[0]["is_stock_item"]:
                        # avai_qty=list_qty[0]['actual_qty']
                        if list_qty:
                            # avai_qty=100
                            avai_qty = list_qty[0]['actual_qty']
                            if int(avai_qty) < req_qty:
                                missing_item.append({"item": li.get("item_code")})
                                avai_qty = 0
                        else:
                            avai_qty = ""
                    else:
                        avai_qty = ""

                    if item_disab:
                        reason += "SysMsg:" + li.get("item_code") + " is discontinued. \n"
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
                    data_r = check_items_availabilty_IN_CA(items_list)
                    if data_r['message']['title'] == "":
                        assigned_to = "CA"
                        m_item = ""
                        for mi in missing_item:
                            m_item += mi.get("item") + ','
                        reason += "SysMsg: Moved to CA due to " + m_item + " is missing at GA. \n"
                    else:
                        reason += data_r['message']['title']
                        status = "On-Hold"
                        reason += "SysMsg: Item Not Found in GA,CA inventory. \n"
                        war = war + 1
            if region == "CA":
                data_r = check_items_availabilty_IN_CA(items_list)
                if data_r['message']['title'] != "":
                    if missing_item:
                        for mi in missing_item:
                            m = " " + mi + ","
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
        if (item_code_s[3] == 1):
            final_order_items.append({
                "item_code": item_code,
                "quantity": 1 * req_quantity
            })
            final_order_items.append({
                "item_code": "NSH-758",
                "quantity": 1 * req_quantity
            })
        elif (item_code_s[3] == 0):
            final_order_items.append({
                "item_code": item_code,
                "quantity": 1 * req_quantity
            })
    elif (result_GD12 != -1):
        item_code_s = ama_item_code.split('-')
        item_code = item_code_s[1] + "-" + item_code_s[2]
        if (item_code_s[3] == 0):
            final_order_items.append({
                "item_code": item_code,
                "quantity": 1 * req_quantity
            })
        elif (item_code_s[3] == 1):
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


def get_fullfilment_feed_instance():
    mws_settings = frappe.get_doc("Amazon MWS Settings")
    fulfilment_feed = mws.Feeds(
        account_id=mws_settings.seller_id,
        access_key=mws_settings.aws_access_key_id,
        secret_key=mws_settings.secret_key,
        region=mws_settings.region,
        domain=mws_settings.domain,
        version="2009-01-01",
        authtoken=mws_settings.mws_auth_token
    )

    return fulfilment_feed


def get_orders_instance():
    mws_settings = frappe.get_doc("Amazon MWS Settings")
    orders = mws.Orders(
        account_id=mws_settings.seller_id,
        access_key=mws_settings.aws_access_key_id,
        secret_key=mws_settings.secret_key,
        region=mws_settings.region,
        domain=mws_settings.domain,
        version="2013-09-01",
        authtoken=mws_settings.mws_auth_token
    )

    return orders


# def extract_orders(ord_id):
def extract_orders(order, customer_name, billing_name, shipping_name, changes, ord_id, channel):
    so_fields = frappe.db.get_all("Sales Order", filters={"amazon_order_id": ord_id}, fields=["name"])
    if len(so_fields) == 0:
        msg = ""
        new_sales_order = frappe.new_doc("Sales Order")
        new_sales_order.customer = customer_name
        new_sales_order.sales_channel = channel
        updated_db = True
        item_list = []
        # items_list = get_order_items(ord_id)
        items_list = get_order_items_controller(ord_id)
        for item in items_list:
            list = mp_validate_item(channel, item['item_code'])
            # list=mp_validate_amazon_items(item['item_code'])
            quantity = int(item['qty'])
            if list is None:
                updated_db = False
                msg = "no item available"
            else:
                for li in list:
                    req_qty1 = li.get("quantity")
                    req_qty = int(req_qty1 * quantity)
                    # list_qty=frappe.db.get_all("Bin",filters={"item_code":li.get("item_code")},fields=["actual_qty"])
                    # avai_qty=list_qty[0]['actual_qty']
                    avai_qty = 100

                    if (int(avai_qty) < req_qty):
                        updated_db = False
                        msg = "item avail=" + avai_qty + ",item req=" + req_qty
                    new_sales_order.append("items", {
                        "item_code": li.get("item_code"),
                        "qty": li.get("quantity") * quantity,
                        "mp_line_item_id": item['mp_line_item_id']
                    })

        delivery_date = dateutil.parser.parse(order.LatestShipDate).strftime("%Y-%m-%d")
        transaction_date = dateutil.parser.parse(order.PurchaseDate).strftime("%Y-%m-%d")
        marketplace_id = order.MarketplaceId
        """so = frappe.get_doc({
				"doctype": "Sales Order",
				"naming_series": "SO-",
				"amazon_order_id": ord_id,
				"marketplace_id": order_json.MarketplaceId,
				"customer": customer_name,
				"delivery_date": delivery_date,
				"transaction_date": transaction_date,
				"items": items,
				"company": frappe.db.get_value("Amazon MWS Settings", "Amazon MWS Settings", "company")
			})"""
        # delivery_date = dateutil.parser.parse(order['LatestShipDate']['value']).strftime("%Y-%m-%d")
        # transaction_date = dateutil.parser.parse(order['PurchaseDate']['value']).strftime("%Y-%m-%d")
        # marketplace_id=order['MarketplaceId']['value']

        new_sales_order.marketplace_id = marketplace_id
        new_sales_order.company = frappe.db.get_value("Amazon MWS Settings", "Amazon MWS Settings", "company")
        new_sales_order.transaction_date = transaction_date
        new_sales_order.po_no = ord_id
        new_sales_order.amazon_order_id = ord_id
        new_sales_order.naming_series = "SO-"
        new_sales_order.status = "Draft"
        new_sales_order.selling_price_list = "Standard Selling"
        new_sales_order.price_list_currency = "USD"
        new_sales_order.conversion_rate = 1
        new_sales_order.ignore_pricing_rule = 1
        new_sales_order.apply_discount_on = "Net Total"
        new_sales_order.shipping_address_name = shipping_name[0]
        new_sales_order.shipping_address_validation = 'Address Validated'
        new_sales_order.delivery_date = delivery_date
        new_sales_order.shipping_service = "USPS Priority Mail - First Class"
    else:
        updated_db = False
        changes.append({"change": "AMAZON Order Already exist", "customer_id": customer_name, "mp_order_id": ord_id})
        msg = "Order Already exist"
        new_sales_order = ""
    return new_sales_order, updated_db, changes, msg


# return  new_sales_order

def extract_shipping_billing(amazon_order_item_json):
    billing_address = ""
    shipping_address = ""
    if not ("BuyerName" in amazon_order_item_json):
        order_customer_name = "Buyer - " + amazon_order_item_json.AmazonOrderId
    else:
        order_customer_name = amazon_order_item_json.BuyerName

    existing_customer_name = frappe.db.get_value("Customer", filters={"name": order_customer_name}, fieldname="name")
    if existing_customer_name:
        customer_name = existing_customer_name
    else:
        customer_name = order_customer_name

    if not ("ShippingAddress" in amazon_order_item_json):
        return billing_address, shipping_address, customer_name
    else:
        if "Name" in amazon_order_item_json.ShippingAddress:
            ship_to = amazon_order_item_json.ShippingAddress.Name
        else:
            ship_to = "Not Provided"

        if "AddressLine1" in amazon_order_item_json.ShippingAddress:
            address_line1 = amazon_order_item_json.ShippingAddress.AddressLine1
        else:
            address_line1 = ""
        if "AddressLine2" in amazon_order_item_json.ShippingAddress:
            address_line2 = amazon_order_item_json.ShippingAddress.AddressLine2
        else:
            address_line2 = ""

        if "City" in amazon_order_item_json.ShippingAddress:
            city = amazon_order_item_json.ShippingAddress.City
        else:
            city = ""

        if "StateOrRegion" in amazon_order_item_json.ShippingAddress:
            state = amazon_order_item_json.ShippingAddress.StateOrRegion
            state_name_abb = frappe.db.get_all("US States", filters={"abb": state}, fields=["name"])
            if (len(state_name_abb) > 0):
                state = state_name_abb[0]["name"]
            else:
                state = state
                """if(len(state_channel_s)>0): 
							new_cha_cont.region =state_channel_s[0]["mp_channel"]
							region=state_channel_s[0]["mp_channel"] 
						else:
							region="GA" """
        else:
            state = 0

        if "PostalCode" in amazon_order_item_json.ShippingAddress:
            pincode_s = (amazon_order_item_json.ShippingAddress.PostalCode).split('-')
            pincode = pincode_s[0]
        else:
            pincode = ""
        if "Phone" in amazon_order_item_json.ShippingAddress:
            phone_s = amazon_order_item_json.ShippingAddress.Phone
            if (re.search('[a-zA-Z]+', phone_s)):
                phone_o = (amazon_order_item_json.ShippingAddress.Phone).split(' ')
                phone = phone_o[0] + phone_o[1]
            else:
                phone = phone_s
        else:
            phone = ""

    """if not("BuyerName" in amazon_order_item_json):
    				order_customer_name = "Buyer - " + amazon_order_item_json['AmazonOrderId']['value']
			else:
				order_customer_name = amazon_order_item_json['BuyerName']['value']

			existing_customer_name = frappe.db.get_value("Customer",filters={"name": order_customer_name}, fieldname="name")
			if existing_customer_name:
					customer_name=existing_customer_name
			else:
					customer_name=order_customer_name

			if not("ShippingAddress" in amazon_order_item_json):
    				return billing_address,shipping_address,customer_name				
			else:
				if "AddressLine1" in amazon_order_item_json['ShippingAddress']:
					address_line1 = amazon_order_item_json['ShippingAddress']['AddressLine1']['value']
				else:
					address_line1 = "Not Provided"

				if "City" in amazon_order_item_json['ShippingAddress']:
					city = amazon_order_item_json['ShippingAddress']['City']['value']
				else:
					city = "Not Provided"

				if "StateOrRegion" in amazon_order_item_json['ShippingAddress']:
					state = amazon_order_item_json['ShippingAddress']['StateOrRegion']['value']
				else :
					state=0

				if "PostalCode" in amazon_order_item_json['ShippingAddress']:
					pincode = amazon_order_item_json['ShippingAddress']['PostalCode']['value']
				else:
					pincode=""
				if "Phone" in amazon_order_item_json['ShippingAddress']:
						phone_o = (amazon_order_item_json['ShippingAddress']['Phone']['value']).split(' ')
						phone=phone_o[0]+phone_o[1] 
				else:
						phone=""
				"""
    shipping_address = {
        "doctype": "Address",
        "address_title": customer_name,
        "address_line1": address_line1,
        "address_line2": address_line2,
        "city": city,
        "address_type": "Shipping",
        "county": "United States",
        "state": state,
        "pincode": pincode,
        "phone": phone
    }
    return billing_address, shipping_address, customer_name, ship_to


"""def create_sales_order(order_json,after_date):
	customer_name = create_customer(order_json)
	create_address(order_json, customer_name)

	market_place_order_id = order_json.AmazonOrderId

	so = frappe.db.get_value("Sales Order",
			filters={"amazon_order_id": market_place_order_id},
			fieldname="name")

	taxes_and_charges = frappe.db.get_value("Amazon MWS Settings", "Amazon MWS Settings", "taxes_charges")

	if so:
		return

	if not so:
		items = get_order_items(market_place_order_id)
		delivery_date = dateutil.parser.parse(order_json.LatestShipDate).strftime("%Y-%m-%d")
		transaction_date = dateutil.parser.parse(order_json.PurchaseDate).strftime("%Y-%m-%d")

		so = frappe.get_doc({
				"doctype": "Sales Order",
				"naming_series": "SO-",
				"amazon_order_id": market_place_order_id,
				"marketplace_id": order_json.MarketplaceId,
				"customer": customer_name,
				"delivery_date": delivery_date,
				"transaction_date": transaction_date,
				"items": items,
				"company": frappe.db.get_value("Amazon MWS Settings", "Amazon MWS Settings", "company")
			})

		try:
			if taxes_and_charges:
				charges_and_fees = get_charges_and_fees(market_place_order_id)
				for charge in charges_and_fees.get("charges"):
					so.append('taxes', charge)

				for fee in charges_and_fees.get("fees"):
					so.append('taxes', fee)

			so.insert(ignore_permissions=True)
			so.submit()

		except Exception as e:
			frappe.log_error(message=e, title="Create Sales Order")"""


def get_order_items_controller(market_place_order_id):
    final_order_items = []
    mws_orders = get_orders_instance()
    order_items_response = call_mws_method(mws_orders.list_order_items, amazon_order_id=market_place_order_id)
    order_items_list = return_as_list(order_items_response.parsed.OrderItems.OrderItem)

    # order_items_list=[{"IsGift": {"value": "false"}, "GiftWrapPrice": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "PromotionDiscountTax": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "ProductInfo": {"NumberOfItems": {"value": "1"}, "value": "\n "}, "SellerSKU": {"value": "CB-NSFB-5040-01"}, "Title": {"value": "Cobb Promo Boat Sale (Green) Feather Flag with Complete 15ft Pole kit and Ground Spike"}, "ItemTax": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "ShippingPrice": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "PromotionDiscount": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "value": "\n ", "ConditionId": {"value": "New"}, "ItemPrice": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "49.99"}}, "ASIN": {"value": "B07QM9V7TG"}, "ShippingDiscountTax": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "ShippingDiscount": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "QuantityShipped": {"value": "0"}, "ShippingTax": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "OrderItemId": {"value": "19217942591746"}, "IsTransparency": {"value": "false"}, "QuantityOrdered": {"value": "1"}, "GiftWrapTax": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "ConditionSubtypeId": {"value": "New"}}]
    # warehouse = frappe.db.get_value("Amazon MWS Settings", "Amazon MWS Settings", "warehouse")
    while True:
        for order_item in order_items_list:
            final_order_items.append({
                "item_code": order_item.SellerSKU,
                "qty": order_item.QuantityOrdered,
                "mp_line_item_id": order_item.OrderItemId,
                "item_name": order_item.Title
            })
        if not "NextToken" in order_items_response.parsed:
            break

        next_token = order_items_response.parsed.NextToken
        order_items_response = call_mws_method(mws_orders.list_order_items_by_next_token, next_token)
        order_items_list = return_as_list(order_items_response.parsed.OrderItems.OrderItem)

    return final_order_items


def get_order_items(market_place_order_id):
    final_order_items = []
    mws_orders = get_orders_instance()
    order_items_response = call_mws_method(mws_orders.list_order_items, amazon_order_id=market_place_order_id)
    order_items_list = return_as_list(order_items_response.parsed.OrderItems.OrderItem)

    # order_items_list=[{"IsGift": {"value": "false"}, "GiftWrapPrice": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "PromotionDiscountTax": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "ProductInfo": {"NumberOfItems": {"value": "1"}, "value": "\n "}, "SellerSKU": {"value": "CB-NSFB-5040-01"}, "Title": {"value": "Cobb Promo Boat Sale (Green) Feather Flag with Complete 15ft Pole kit and Ground Spike"}, "ItemTax": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "ShippingPrice": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "PromotionDiscount": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "value": "\n ", "ConditionId": {"value": "New"}, "ItemPrice": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "49.99"}}, "ASIN": {"value": "B07QM9V7TG"}, "ShippingDiscountTax": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "ShippingDiscount": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "QuantityShipped": {"value": "0"}, "ShippingTax": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "OrderItemId": {"value": "19217942591746"}, "IsTransparency": {"value": "false"}, "QuantityOrdered": {"value": "1"}, "GiftWrapTax": {"CurrencyCode": {"value": "USD"}, "value": "\n ", "Amount": {"value": "0.00"}}, "ConditionSubtypeId": {"value": "New"}}]
    # warehouse = frappe.db.get_value("Amazon MWS Settings", "Amazon MWS Settings", "warehouse")
    while True:
        for order_item in order_items_list:
            """if not "ItemPrice" in order_item:
					price = 0
				else:
					price = order_item.ItemPrice.Amount

				final_order_items.append({
					"item_code": get_item_code(order_item),
					"item_name": order_item.SellerSKU,
					"description": order_item.Title,
					"rate": price,
					"qty": order_item.QuantityOrdered,
					"stock_uom": "Nos",
					"mp_line_item_id":order_item.OrderItemId,
					"conversion_factor": "1.0"
				})"""

            final_order_items.append({
                "item_code": 'CB-NSFB-5040-01',
                "qty": order_item.QuantityOrdered,
                "mp_line_item_id": order_item.OrderItemId,
                "item_name": order_item.Title
            })
            """final_order_items.append({
					"item_code": order_item['SellerSKU']['value'],		
					"qty": order_item['QuantityOrdered']['value'],				
					"mp_line_item_id":order_item['OrderItemId']['value']
				})  """

        if not "NextToken" in order_items_response.parsed:
            break

        next_token = order_items_response.parsed.NextToken
        order_items_response = call_mws_method(mws_orders.list_order_items_by_next_token, next_token)
        order_items_list = return_as_list(order_items_response.parsed.OrderItems.OrderItem)

    return final_order_items


def get_item_code(order_item):
    asin = order_item.ASIN
    item_code = frappe.db.get_value("Item", {"amazon_item_code": asin}, "item_code")
    if item_code:
        return item_code


def get_charges_and_fees(market_place_order_id):
    finances = get_finances_instance()

    charges_fees = {"charges": [], "fees": []}

    response = call_mws_method(finances.list_financial_events, amazon_order_id=market_place_order_id)

    shipment_event_list = return_as_list(response.parsed.FinancialEvents.ShipmentEventList)

    for shipment_event in shipment_event_list:
        if shipment_event:
            shipment_item_list = return_as_list(shipment_event.ShipmentEvent.ShipmentItemList.ShipmentItem)

            for shipment_item in shipment_item_list:
                charges = return_as_list(shipment_item.ItemChargeList.ChargeComponent)
                fees = return_as_list(shipment_item.ItemFeeList.FeeComponent)

                for charge in charges:
                    if (charge.ChargeType != "Principal"):
                        charge_account = get_account(charge.ChargeType)
                        charges_fees.get("charges").append({
                            "charge_type": "Actual",
                            "account_head": charge_account,
                            "tax_amount": charge.ChargeAmount.CurrencyAmount,
                            "description": charge.ChargeType + " for " + shipment_item.SellerSKU
                        })

                for fee in fees:
                    fee_account = get_account(fee.FeeType)
                    charges_fees.get("fees").append({
                        "charge_type": "Actual",
                        "account_head": fee_account,
                        "tax_amount": fee.FeeAmount.CurrencyAmount,
                        "description": fee.FeeType + " for " + shipment_item.SellerSKU
                    })

    return charges_fees


def get_finances_instance():
    mws_settings = frappe.get_doc("Amazon MWS Settings")

    finances = mws.Finances(
        account_id=mws_settings.seller_id,
        access_key=mws_settings.aws_access_key_id,
        secret_key=mws_settings.secret_key,
        region=mws_settings.region,
        domain=mws_settings.domain,
        version="2015-05-01"
    )

    return finances


def get_account(name):
    existing_account = frappe.db.get_value("Account", {"account_name": "Amazon {0}".format(name)})
    account_name = existing_account
    mws_settings = frappe.get_doc("Amazon MWS Settings")

    if not existing_account:
        # try:
        new_account = frappe.new_doc("Account")
        new_account.account_name = "Amazon {0}".format(name)
        new_account.company = mws_settings.company
        new_account.parent_account = mws_settings.market_place_account_group
        new_account.insert(ignore_permissions=True)
        account_name = new_account.name
    # except Exception as e:
    # 	frappe.log_error(message=e, title="Create Account")

    return account_name


def create_customer(order_json):
    order_customer_name = ""

    if not ("BuyerName" in order_json):
        order_customer_name = "Buyer - " + order_json.AmazonOrderId
    else:
        order_customer_name = order_json.BuyerName

    existing_customer_name = frappe.db.get_value("Customer",
                                                 filters={"name": order_customer_name}, fieldname="name")

    if existing_customer_name:
        filters = [
            ["Dynamic Link", "link_doctype", "=", "Customer"],
            ["Dynamic Link", "link_name", "=", existing_customer_name],
            ["Dynamic Link", "parenttype", "=", "Contact"]
        ]

        existing_contacts = frappe.get_list("Contact", filters)

        if existing_contacts:
            pass
        else:
            new_contact = frappe.new_doc("Contact")
            new_contact.first_name = order_customer_name
            new_contact.append('links', {
                "link_doctype": "Customer",
                "link_name": existing_customer_name
            })
            new_contact.insert()

        return existing_customer_name
    else:
        mws_customer_settings = frappe.get_doc("Amazon MWS Settings")
        new_customer = frappe.new_doc("Customer")
        new_customer.customer_name = order_customer_name
        new_customer.customer_group = mws_customer_settings.customer_group
        new_customer.territory = mws_customer_settings.territory
        new_customer.customer_type = mws_customer_settings.customer_type
        new_customer.save()

        new_contact = frappe.new_doc("Contact")
        new_contact.first_name = order_customer_name
        new_contact.append('links', {
            "link_doctype": "Customer",
            "link_name": new_customer.name
        })

        new_contact.insert()

        return new_customer.name


def create_address(amazon_order_item_json, customer_name):
    filters = [
        ["Dynamic Link", "link_doctype", "=", "Customer"],
        ["Dynamic Link", "link_name", "=", customer_name],
        ["Dynamic Link", "parenttype", "=", "Address"]
    ]

    existing_address = frappe.get_list("Address", filters)

    if not ("ShippingAddress" in amazon_order_item_json):
        return None
    else:
        make_address = frappe.new_doc("Address")

        if "AddressLine1" in amazon_order_item_json.ShippingAddress:
            make_address.address_line1 = amazon_order_item_json.ShippingAddress.AddressLine1
        else:
            make_address.address_line1 = ""

        if "City" in amazon_order_item_json.ShippingAddress:
            make_address.city = amazon_order_item_json.ShippingAddress.City
        else:
            make_address.city = ""

        if "StateOrRegion" in amazon_order_item_json.ShippingAddress:
            make_address.state = amazon_order_item_json.ShippingAddress.StateOrRegion

        if "PostalCode" in amazon_order_item_json.ShippingAddress:
            make_address.pincode = amazon_order_item_json.ShippingAddress.PostalCode

        for address in existing_address:
            address_doc = frappe.get_doc("Address", address["name"])
            if (address_doc.address_line1 == make_address.address_line1 and
                    address_doc.pincod050505ake_address.pincode):
                return address

        make_address.append("links", {
            "link_doctype": "Customer",
            "link_name": customer_name
        })
        make_address.address_type = "Shipping"
        make_address.insert()
