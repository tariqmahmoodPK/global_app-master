# Copyright (c) 2013, jan and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe

def execute(filters=None):
	columns, data = [], []

	columns = [{"label": "Order ID", 'width': 200, "fieldname": "order_id", 'fieldtype': 'Data'},
			   {"label": "Shipment Date", "fieldname": "shipment_date", 'width': 120, "fieldtype": "Link", "options": "Sales Order"},
			   {"label": "Carrier Name", "fieldname": "carrier_name", 'width': 120, "fieldtype": "Link", "options": "Sales Order"},
			   {"label": "Tracking Number", "fieldname": "tracking_number", 'fieldtype': 'Data', 'width': 180},
			   {"label": "Shipment Method", 'fieldtype': 'Data', "fieldname": "shipment_method", 'width': 250},
			   ]

	from_date = filters.get("from_date")
	to_date = filters.get("to_date")
	company = filters.get("company")

	data = frappe.db.sql(
		""" SELECT 
                 SO.po_no as order_id, 
                 SO.shipping_service as shipment_method,
                 SO.shipment_details as tracking_number,
                 SO.shipment_date as shipment_date,
                 SO.shipping_service
             FROM `tabSales Order` AS SO WHERE SO.shipment_date BETWEEN %s and %s and SO.customer=%s and SO.status!=%s""",
		(from_date, to_date, company, "Cancelled"), as_dict=True)
	for i in data:
		i['carrier_name'] = "UPS" if "UPS" in i.shipping_service.split("-") else "USPS"
	print(data)
	return columns, data
