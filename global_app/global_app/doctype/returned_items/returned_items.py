# -*- coding: utf-8 -*-
# Copyright (c) 2020, jan and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

class ReturnedItems(Document):
	def on_submit(self):
		for i in self.returned_items:
			if i.remarks == "Opened/No Good":
				if not i.box or not i.box_content:
					frappe.throw("2 Images is required for item " + i.item_name)




@frappe.whitelist()
def get_so(sales_order):
	si = frappe.db.sql(""" SELECT * FROM `tabSales Invoice` AS SI INNER JOIN `tabSales Invoice Item` AS SOI ON SOI.parent = SI.name and SOI.sales_order=%s LIMIT 1""", sales_order, as_dict=1)
	so = frappe.db.sql(""" SELECT * FROM `tabSales Order` WHERE name=%s""", sales_order, as_dict=1)

	return si[0].parent if len(si) > 0 else "", ((so[0].shipment_details).replace(" ", "")).split(",") if len(so) > 0 and so[0].shipment_details else []

@frappe.whitelist()
def get_box_items(tracking_number):
	print(tracking_number)
	box_items = frappe.db.sql(""" SELECT * FROM `tabPacking Slip packages shadow` WHERE shipment_tracking_number=%s """, tracking_number, as_dict=1)
	print(box_items)
	items_ = []
	if len(box_items) > 0:
		for x in box_items:
			print(x)
			print(x['items'])
			for i in ((x['items']).replace(" ", "")).split(","):
				item_name = frappe.db.sql(""" SELECT * FROM `tabItem` WHERE item_code=%s""", i, as_dict=1)

				items_.append({
					"item": i,
					"item_name": item_name[0].item_name if len(item_name) > 0 else ""
				})


	return items_