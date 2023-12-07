# -*- coding: utf-8 -*-
# Copyright (c) 2020, jan and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

class CustomDesign(Document):
	def on_update_after_submit(self):
		self.check_so()
		self.set_pay_later()
		self.check_final_design()
		self.check_upload_images()
		self.update_uploaded_image_view()
	def update_uploaded_image_view(self):
		for i in self.upload_images:
			if i.attach_image:
				i.image_view = '<img src="' + i.attach_image +'" style="width: 40px; height: auto; margin-top: -9%;">'
				print('<img src="' + i.attach_image +'" style="width: 40px; height: auto; margin-top: -9%;">')
			else:
				i.image_view = ""
	def on_submit(self):
		self.set_pay_later()
		frappe.db.sql(""" UPDATE `tabSales Order` SET has_custom_design=1 WHERE name=%s""", self.sales_order)
		frappe.db.commit()

	def set_pay_later(self):
		if self.pay_later and len(self.upload_images) == 0 and self.status == "Billing":
			print()
			frappe.db.sql(""" UPDATE `tabCustom Design` SET status='Designing' WHERE name=%s """, self.name)
			frappe.db.commit()
			self.reload()
		elif not self.pay_later and len(self.upload_images) == 0 and self.status == "Designing":
			frappe.db.sql(""" UPDATE `tabCustom Design` SET status='Billing' WHERE name=%s """, self.name)
			frappe.db.commit()
			self.reload()
	def check_so(self):
		so_status = frappe.db.get_value("Sales Order", self.sales_order, "status")
		if "Bill" in so_status and self.status not in ["Printing", "Finishing", "Shipping"]:
			frappe.db.sql(""" UPDATE `tabCustom Design` SET status='Billing' WHERE name=%s """, self.name)
			frappe.db.commit()
			self.reload()
		elif "Bill" not in so_status and self.status not in ["Printing", "Finishing", "Shipping"]:
			frappe.db.sql(""" UPDATE `tabCustom Design` SET status='Designing' WHERE name=%s """, self.name)
			frappe.db.commit()
			self.reload()

	def check_final_design(self):

		has_image = True
		for i in self.custom_design_items:
			if not i.attach_image:
				has_image = False

		if has_image:
			frappe.db.sql(""" UPDATE `tabCustom Design` SET status=%s WHERE name=%s """, ("Printing",self.name))
			frappe.db.commit()
			self.add_status("Printing")
			self.reload()
		elif not has_image and self.pay_later:
			frappe.db.sql(""" UPDATE `tabCustom Design` SET status=%s WHERE name=%s """, ("Designing",self.name))
			frappe.db.commit()
			self.reload()

	def add_status(self, status):
		exist = self.check_status(status)
		if not exist:
			get_idx = frappe.db.sql(""" SELECT idx FROM `tabCustom Design Upload` WHERE parent=%s ORDER BY idx DESC LIMIT 1""", self.name, as_dict=1)
			frappe.get_doc({
				"doctype": "Custom Design Upload",
				"parent": self.name,
				"parenttype": "Custom Design",
				"parentfield": "upload_images",
				"status": status,
				"idx": get_idx[0].idx + 1 if len(get_idx) > 0 else 1
			}).insert()
	def check_status(self, status):
		for i in self.upload_images:
			if i.status == status:
				return True
		return False

	def check_upload_images(self):
		if len(self.upload_images) > 0:
			statuses = []
			has_image_status = ""
			for i in self.upload_images:
				statuses.append(i.status)
				if not i.attach_image:
					has_image_status = i.status

			if has_image_status:
				frappe.db.sql(""" UPDATE `tabCustom Design` SET status=%s WHERE name=%s """, ("Printing",self.name))
				frappe.db.commit()
				self.reload()

			else:
				new_status = ""
				if "Printing" in statuses:
					new_status = "Finishing"

				if "Finishing" in statuses:
					new_status = "Shipping"

				if "Shipping" in statuses and self.pay_later:
					new_status = "Billing"

				frappe.db.sql(""" UPDATE `tabCustom Design` SET status=%s WHERE name=%s """, (new_status, self.name))
				frappe.db.commit()
				if new_status != "Billing":
					self.add_status(new_status)
				self.reload()

