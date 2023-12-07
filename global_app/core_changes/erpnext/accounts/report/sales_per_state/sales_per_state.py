# Copyright (c) 2013, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import msgprint, _
import json

def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	return columns, data
def get_columns():
	columns = [
		_(".") + ":Data:80",
		
		_("Total Sale") + ":Long Text:280",
		_("Total Shipment") + ":Long Text:240",
		_("Grand Total") + ":Long Text:240",
		
	]
	return columns
def get_data(filters):
			data =[]
			total_sale=0
			total_shipment=0
			grand_total=0
			if filters:
				if filters.state and not filters.status:
					doc = frappe.db.sql(""" select s1.posting_date, s1.total,s1.shipment_amount,s1.grand_total,s2.state 
									from `tabSales Invoice` s1, `tabAddress` s2 
									where s1.shipping_address_name = s2.name and s1.shipment_amount > 0 and s2.state=%s and s1.posting_date >=%s and s1.posting_date <=%s""",(filters.state,filters.from_date,filters.to_date),as_dict=True)
					for d in doc:
						total_sale+=d.total
						total_shipment+=d.shipment_amount
						grand_total+=d.grand_total
						row =['',d.total,d.shipment_amount,d.grand_total]
						data.append(row)
				elif not filters.state and filters.status:
					total_sale=0
					total_shipment=0
					grand_total=0
					doc = frappe.db.sql(""" select s1.posting_date, s1.total,s1.shipment_amount,s1.grand_total,s2.state 
									from `tabSales Invoice` s1, `tabAddress` s2 
									where s1.shipping_address_name = s2.name and s1.shipment_amount > 0 and s1.status=%s and s1.posting_date >=%s and s1.posting_date <=%s""",(filters.status,filters.from_date,filters.to_date),as_dict=True)
					for d in doc:
						total_sale+=d.total
						total_shipment+=d.shipment_amount
						grand_total+=d.grand_total
						row =['',d.total,d.shipment_amount,d.grand_total]
						data.append(row)
				elif filters.state and filters.status:
					total_sale=0
					total_shipment=0
					grand_total=0
					doc = frappe.db.sql(""" select s1.posting_date, s1.total,s1.shipment_amount,s1.grand_total,s2.state 
									from `tabSales Invoice` s1, `tabAddress` s2 
									where s1.shipping_address_name = s2.name and s1.shipment_amount > 0 and s1.status=%s and s2.state=%s and s1.posting_date >=%s and s1.posting_date <=%s""",(filters.status,filters.state,filters.from_date,filters.to_date),as_dict=True)
					for d in doc:
						total_sale+=d.total
						total_shipment+=d.shipment_amount
						grand_total+=d.grand_total
						row =['',d.total,d.shipment_amount,d.grand_total]
						data.append(row)
				else:
					total_sale=0
					total_shipment=0
					grand_total=0
					doc = frappe.db.sql(""" select s1.posting_date, s1.total,s1.shipment_amount,s1.grand_total,s2.state 
									from `tabSales Invoice` s1, `tabAddress` s2 
									where s1.shipping_address_name = s2.name and s1.shipment_amount > 0 and s1.posting_date >=%s and s1.posting_date <=%s""",(filters.from_date,filters.to_date),as_dict=True)
					for d in doc:
						total_sale+=d.total
						total_shipment+=d.shipment_amount
						grand_total+=d.grand_total
						row =['',d.total,d.shipment_amount,d.grand_total]
						data.append(row)

				
			else:
				
				doc = frappe.db.sql(""" select s1.posting_date,s1.total,s1.shipment_amount,s1.grand_total,s2.state 
									from `tabSales Invoice` s1, `tabAddress` s2 
									where s1.shipping_address_name = s2.name and s1.shipment_amount > 0 and s2.state is not NULL and s1.posting_date >=%s and s1.posting_date <=%s""",(filters.from_date,filters.to_date),as_dict=True)
				for d in doc:
					total_sale+=d.total
					total_shipment+=d.shipment_amount
					grand_total+=d.grand_total
					row =['',d.total,d.shipment_amount,d.grand_total]
					data.append(row)
			row=["Total",round(total_sale,3),round(total_shipment,3),round(grand_total,3)]
			data.append(row)
			return data