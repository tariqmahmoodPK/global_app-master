# -*- coding: utf-8 -*-
# Copyright (c) 2020, Jan Lloyd Angeles and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import timeit
import frappe
from frappe.model.document import Document

class UPSSettings(Document):

	def update_sales_order_from_ps(self):
		print("UPDATING")
		sales_orders = frappe.db.sql(
			"""SELECT * FROM `tabSales Order` WHERE ((shipment_date is null or shipment_date = "") or (shipment_cost is null or shipment_cost = "") or (shipment_details is null or shipment_details = "")) and docstatus=1 and transaction_date > '2020-08-12'""",
			as_dict=1)
		for so in sales_orders:
			try:
				dn = frappe.db.sql(""" SELECT parent FROM `tabDelivery Note Item` WHERE against_sales_order=%s LIMIT 1""",
								so.name, as_dict=1)
				if len(dn) > 0:
					ps = frappe.db.sql(""" SELECT * FROM `tabPacking Slip` WHERE delivery_note=%s """, dn[0].parent,
									as_dict=1)
					if len(ps) > 0:
						packages = frappe.db.sql(""" SELECT * FROM `tabPacking Slip packages shadow` WHERE parent=%s""",
												ps[0].name, as_dict=1)
						tracking_number = ""
						shipment_weight = 0.0
						shipment_cost = 0.0
						so_doc = frappe.get_doc("Sales Order", so.name)
						for i in packages:
							print("UPDATING")
							if i.shipment_tracking_number:
								
								tracking_number += i.shipment_tracking_number + " "
								
								shipment_weight += float(i.weight)
								
								shipment_cost += float(i.shipment_cost)

								
								for so_items in so_doc.shipment_items:
									so_doc.remove(so_items)

								so_doc.append("shipment_items", {
									"package": i.package,
									"items":i['items'],
									"tracking": i.shipment_tracking_number,
									"quantity": float(i.quantity),
									"weight": float(i.weight)
								})

								so_doc.save()
								

						frappe.db.sql(
							""" UPDATE `tabSales Order` SET shipment_details=%s, shipment_date=%s,shipment_cost=%s,shipment_weight=%s WHERE name=%s""",
							(tracking_number, ps[0].creation.date(),shipment_cost,shipment_weight,so.name))
						frappe.db.commit()
						print("DONE FOR " + so.name + ", " + ps[0].name)
			except:
				pass


@frappe.whitelist()
def 	update_sales_order_from_ps():
		print("UPDATING")
		sales_orders = frappe.db.sql(
			"""SELECT * FROM `tabSales Order` WHERE ((shipment_date is null or shipment_date = "") or (shipment_cost is null or shipment_cost = "") or (shipment_details is null or shipment_details = "")) and docstatus=1 and transaction_date > '2020-08-12'""",
			as_dict=1)
		for so in sales_orders:
			try:
				dn = frappe.db.sql(""" SELECT parent FROM `tabDelivery Note Item` WHERE against_sales_order=%s LIMIT 1""",
								so.name, as_dict=1)
				if len(dn) > 0:
					ps = frappe.db.sql(""" SELECT * FROM `tabPacking Slip` WHERE delivery_note=%s """, dn[0].parent,
									as_dict=1)
					if len(ps) > 0:
						packages = frappe.db.sql(""" SELECT * FROM `tabPacking Slip packages shadow` WHERE parent=%s""",
												ps[0].name, as_dict=1)
						tracking_number = ""
						shipment_weight = 0.0
						shipment_cost = 0.0
						so_doc = frappe.get_doc("Sales Order", so.name)
						for i in packages:
							print("UPDATING")
							if i.shipment_tracking_number:
								
								tracking_number += i.shipment_tracking_number + " "
								
								shipment_weight += float(i.weight)
								
								shipment_cost += float(i.shipment_cost)

								
								for so_items in so_doc.shipment_items:
									so_doc.remove(so_items)

								so_doc.append("shipment_items", {
									"package": i.package,
									"items":i['items'],
									"tracking": i.shipment_tracking_number,
									"quantity": float(i.quantity),
									"weight": float(i.weight)
								})

								so_doc.save()
								

						frappe.db.sql(
							""" UPDATE `tabSales Order` SET shipment_details=%s, shipment_date=%s,shipment_cost=%s,shipment_weight=%s WHERE name=%s""",
							(tracking_number, ps[0].creation.date(),shipment_cost,shipment_weight,so.name))
						frappe.db.commit()
						print("DONE FOR " + so.name + ", " + ps[0].name)
			except:
				pass
