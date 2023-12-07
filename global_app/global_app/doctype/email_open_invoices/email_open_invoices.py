# -*- coding: utf-8 -*-
# Copyright (c) 2020, jan and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe, json
from frappe.model.document import Document

class EmailOpenInvoices(Document):
	def onload(self):
		if not self.customers:
			query = """ 
					SELECT 
						SI.customer as customer, 
						C.billing_email as billing_email FROM `tabSales Invoice` as SI
					INNER JOIN `tabCustomer` AS C ON C.name = SI.customer
					WHERE SI.status='{0}'
					""".format("Unpaid")
			customers = frappe.db.sql(query, as_dict=True)
			for i in customers:
				append = True
				for ii in self.customers:
					if ii.__dict__['customer'] == i.customer:
						append = False
				if append:
					self.append("customers",{
						"customer": i.customer,
						"email": i.billing_email
					})


@frappe.whitelist()
def customer_invoices(customers):
	data = json.loads(customers)
	for customer in data:
		invoices = frappe.db.sql(""" SELECT * FROM `tabSales Invoice` WHERE status=%s and customer=%s """, ("Unpaid", customer["customer"]), as_dict=True)
		for invoice in invoices:
			try:
				frappe.sendmail(
					recipients=customer['email'],
					subject="Unpaid Invoice",
					message = get_html(invoice.name,invoice.po_no,invoice.outstanding_amount,invoice.outstanding_amount)
				)
			except:
				print(frappe.get_traceback())
	return "Success"

#, tracking_number
def get_html(invoice_number,purchase_order_no,total_due,running_total):
	description = ""
	if invoice_number:
		description += str(invoice_number)

	if purchase_order_no:
		if description:
			description += " | "

		description += str(purchase_order_no)

	if total_due:
		if description:
			description += " | "

		description += str(total_due)

	if running_total:
		if description:
			description += " | "

		description += str(running_total)

	return frappe.render_template('global_app/templates/emails/send_email.html', {
		'title': "Unpaid Invoice",
		'description': description,
	})