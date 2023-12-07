# -*- coding: utf-8 -*-
# Copyright (c) 2020, Jan Lloyd Angeles and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

class ShippingClaims(Document):
	def update_status(self, status):
		frappe.db.sql(""" UPDATE `tabShipping Claims` SET status=%s WHERE name=%s""", (status, self.name))
		frappe.db.commit()