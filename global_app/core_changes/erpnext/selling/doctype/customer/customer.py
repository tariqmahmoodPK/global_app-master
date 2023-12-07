# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.naming import set_name_by_naming_series
from frappe import _, msgprint, throw
import frappe.defaults
from frappe.utils import flt, cint, cstr, today, add_months,add_days,getdate
from frappe.desk.reportview import build_match_conditions, get_filters_cond
from erpnext.utilities.transaction_base import TransactionBase
from erpnext.accounts.party import validate_party_accounts, get_dashboard_info, get_timeline_data # keep this
from frappe.contacts.address_and_contact import load_address_and_contact, delete_contact_and_address
from frappe.model.rename_doc import update_linked_doctypes

class Customer(TransactionBase):
	def get_feed(self):
		return self.customer_name

	def onload(self):
		"""Load address and contacts in `__onload`"""
		load_address_and_contact(self)
		self.load_dashboard_info()

	def load_dashboard_info(self):
		info = get_dashboard_info(self.doctype, self.name, self.loyalty_program)
		self.set_onload('dashboard_info', info)

	def autoname(self):
		cust_master_name = frappe.defaults.get_global_default('cust_master_name')
		if cust_master_name == 'Customer Name':
			self.name = self.get_customer_name()
		else:
			set_name_by_naming_series(self)

	def get_customer_name(self):
		if frappe.db.get_value("Customer", self.customer_name):
			count = frappe.db.sql("""select ifnull(MAX(CAST(SUBSTRING_INDEX(name, ' ', -1) AS UNSIGNED)), 0) from tabCustomer
				 where name like %s""", "%{0} - %".format(self.customer_name), as_list=1)[0][0]
			count = cint(count) + 1
			return "{0} - {1}".format(self.customer_name, cstr(count))

		return self.customer_name

	def after_insert(self):
		'''If customer created from Lead, update customer id in quotations, opportunities'''
		self.update_lead_status()

	def validate(self):
		self.flags.is_new_doc = self.is_new()
		self.flags.old_lead = self.lead_name
		validate_party_accounts(self)
		self.validate_credit_limit_on_change()
		self.set_loyalty_program()
		self.check_customer_group_change()

		# set loyalty program tier
		if frappe.db.exists('Customer', self.name):
			customer = frappe.get_doc('Customer', self.name)
			if self.loyalty_program == customer.loyalty_program and not self.loyalty_program_tier:
				self.loyalty_program_tier = customer.loyalty_program_tier

		if self.sales_team:
			if sum([member.allocated_percentage or 0 for member in self.sales_team]) != 100:
				frappe.throw(_("Total contribution percentage should be equal to 100"))

	def check_customer_group_change(self):
		frappe.flags.customer_group_changed = False

		if not self.get('__islocal'):
			if self.customer_group != frappe.db.get_value('Customer', self.name, 'customer_group'):
				frappe.flags.customer_group_changed = True

	def on_update(self):
		self.validate_name_with_customer_group()
		self.create_primary_contact()
		self.create_primary_address()

		if self.flags.old_lead != self.lead_name:
			self.update_lead_status()

		if self.flags.is_new_doc:
			self.create_lead_address_contact()

		self.update_customer_groups()

	def update_customer_groups(self):
		ignore_doctypes = ["Lead", "Opportunity", "POS Profile", "Tax Rule", "Pricing Rule"]
		if frappe.flags.customer_group_changed:
			update_linked_doctypes('Customer', self.name, 'Customer Group',
				self.customer_group, ignore_doctypes)

	def create_primary_contact(self):
		if not self.customer_primary_contact and not self.lead_name:
			if self.mobile_no or self.email_id:
				contact = make_contact(self)
				self.db_set('customer_primary_contact', contact.name)
				self.db_set('mobile_no', self.mobile_no)
				self.db_set('email_id', self.email_id)

	def create_primary_address(self):
		if self.flags.is_new_doc and self.get('address_line1'):
			make_address(self)

	def update_lead_status(self):
		'''If Customer created from Lead, update lead status to "Converted"
		update Customer link in Quotation, Opportunity'''
		if self.lead_name:
			frappe.db.set_value('Lead', self.lead_name, 'status', 'Converted', update_modified=False)

	def create_lead_address_contact(self):
		if self.lead_name:
			# assign lead address to customer (if already not set)
			address_names = frappe.get_all('Dynamic Link', filters={
								"parenttype":"Address",
								"link_doctype":"Lead",
								"link_name":self.lead_name
							}, fields=["parent as name"])

			for address_name in address_names:
				address = frappe.get_doc('Address', address_name.get('name'))
				if not address.has_link('Customer', self.name):
					address.append('links', dict(link_doctype='Customer', link_name=self.name))
					address.save()

			lead = frappe.db.get_value("Lead", self.lead_name, ["organization_lead", "lead_name", "email_id", "phone", "mobile_no", "gender", "salutation"], as_dict=True)

			if not lead.lead_name:
				frappe.throw(_("Please mention the Lead Name in Lead {0}").format(self.lead_name))

			if lead.organization_lead:
				contact_names = frappe.get_all('Dynamic Link', filters={
									"parenttype":"Contact",
									"link_doctype":"Lead",
									"link_name":self.lead_name
								}, fields=["parent as name"])

				for contact_name in contact_names:
					contact = frappe.get_doc('Contact', contact_name.get('name'))
					if not contact.has_link('Customer', self.name):
						contact.append('links', dict(link_doctype='Customer', link_name=self.name))
						contact.save()

			else:
				lead.lead_name = lead.lead_name.split(" ")
				lead.first_name = lead.lead_name[0]
				lead.last_name = " ".join(lead.lead_name[1:])

				# create contact from lead
				contact = frappe.new_doc('Contact')
				contact.first_name = lead.first_name
				contact.last_name = lead.last_name
				contact.gender = lead.gender
				contact.salutation = lead.salutation
				contact.email_id = lead.email_id
				contact.phone = lead.phone
				contact.mobile_no = lead.mobile_no
				contact.is_primary_contact = 1
				contact.append('links', dict(link_doctype='Customer', link_name=self.name))
				contact.flags.ignore_permissions = self.flags.ignore_permissions
				contact.autoname()
				if not frappe.db.exists("Contact", contact.name):
					contact.insert()

	def validate_name_with_customer_group(self):
		if frappe.db.exists("Customer Group", self.name):
			frappe.throw(_("A Customer Group exists with same name please change the Customer name or rename the Customer Group"), frappe.NameError)

	def validate_credit_limit_on_change(self):
		if self.get("__islocal") or not self.credit_limits:
			return

		company_record = []
		for limit in self.credit_limits:
			if limit.company in company_record:
				frappe.throw(_("Credit limit is already defined for the Company {0}").format(limit.company, self.name))
			else:
				company_record.append(limit.company)

			outstanding_amt = get_customer_outstanding(self.name, limit.company)
			if flt(limit.credit_limit) < outstanding_amt:
				frappe.throw(_("""New credit limit is less than current outstanding amount for the customer. Credit limit has to be atleast {0}""").format(outstanding_amt))

	def on_trash(self):
		if self.customer_primary_contact:
			frappe.db.sql("""update `tabCustomer`
				set customer_primary_contact=null, mobile_no=null, email_id=null
				where name=%s""", self.name)

		delete_contact_and_address('Customer', self.name)
		if self.lead_name:
			frappe.db.sql("update `tabLead` set status='Interested' where name=%s", self.lead_name)

	def after_rename(self, olddn, newdn, merge=False):
		if frappe.defaults.get_global_default('cust_master_name') == 'Customer Name':
			frappe.db.set(self, "customer_name", newdn)

	def set_loyalty_program(self):
		if self.loyalty_program: return
		loyalty_program = get_loyalty_programs(self)
		if not loyalty_program: return
		if len(loyalty_program) == 1:
			self.loyalty_program = loyalty_program[0]
		else:
			frappe.msgprint(_("Multiple Loyalty Program found for the Customer. Please select manually."))

@frappe.whitelist()
def get_loyalty_programs(doc):
	''' returns applicable loyalty programs for a customer '''
	from frappe.desk.treeview import get_children

	lp_details = []
	loyalty_programs = frappe.get_all("Loyalty Program",
		fields=["name", "customer_group", "customer_territory"],
		filters={"auto_opt_in": 1, "from_date": ["<=", today()],
			"ifnull(to_date, '2500-01-01')": [">=", today()]})

	for loyalty_program in loyalty_programs:
		customer_groups = [d.value for d in get_children("Customer Group", loyalty_program.customer_group)] + [loyalty_program.customer_group]
		customer_territories = [d.value for d in get_children("Territory", loyalty_program.customer_territory)] + [loyalty_program.customer_territory]

		if (not loyalty_program.customer_group or doc.customer_group in customer_groups)\
			and (not loyalty_program.customer_territory or doc.territory in customer_territories):
			lp_details.append(loyalty_program.name)

	return lp_details

def get_customer_list(doctype, txt, searchfield, start, page_len, filters=None):
	if frappe.db.get_default("cust_master_name") == "Customer Name":
		fields = ["name", "customer_group", "territory"]
	else:
		fields = ["name", "customer_name", "customer_group", "territory"]

	match_conditions = build_match_conditions("Customer")
	match_conditions = "and {}".format(match_conditions) if match_conditions else ""

	if filters:
		filter_conditions = get_filters_cond(doctype, filters, [])
		match_conditions += "{}".format(filter_conditions)

	return frappe.db.sql("""select %s from `tabCustomer` where docstatus < 2
		and (%s like %s or customer_name like %s)
		{match_conditions}
		order by
		case when name like %s then 0 else 1 end,
		case when customer_name like %s then 0 else 1 end,
		name, customer_name limit %s, %s""".format(match_conditions=match_conditions) %
		(", ".join(fields), searchfield, "%s", "%s", "%s", "%s", "%s", "%s"),
		("%%%s%%" % txt, "%%%s%%" % txt, "%%%s%%" % txt, "%%%s%%" % txt, start, page_len))


def check_credit_limit(customer, company, ignore_outstanding_sales_order=False, extra_amount=0):
	customer_outstanding = get_customer_outstanding(customer, company, ignore_outstanding_sales_order)
	if extra_amount > 0:
		customer_outstanding += flt(extra_amount)

	credit_limit = get_credit_limit(customer, company)
	if credit_limit > 0 and flt(customer_outstanding) > credit_limit:
		msgprint(_("Credit limit has been crossed for customer {0} ({1}/{2})")
			.format(customer, customer_outstanding, credit_limit))

		# If not authorized person raise exception
		credit_controller = frappe.db.get_value('Accounts Settings', None, 'credit_controller')
		if not credit_controller or credit_controller not in frappe.get_roles():
			throw(_("Please contact to the user who have Sales Master Manager {0} role")
				.format(" / " + credit_controller if credit_controller else ""))

def get_customer_outstanding(customer, company, ignore_outstanding_sales_order=False, cost_center=None):
	# Outstanding based on GL Entries

	cond = ""
	if cost_center:
		lft, rgt = frappe.get_cached_value("Cost Center",
			cost_center, ['lft', 'rgt'])

		cond = """ and cost_center in (select name from `tabCost Center` where
			lft >= {0} and rgt <= {1})""".format(lft, rgt)

	outstanding_based_on_gle = frappe.db.sql("""
		select sum(debit) - sum(credit)
		from `tabGL Entry` where party_type = 'Customer'
		and party = %s and company=%s {0}""".format(cond), (customer, company))

	outstanding_based_on_gle = flt(outstanding_based_on_gle[0][0]) if outstanding_based_on_gle else 0

	# Outstanding based on Sales Order
	outstanding_based_on_so = 0.0

	# if credit limit check is bypassed at sales order level,
	# we should not consider outstanding Sales Orders, when customer credit balance report is run
	if not ignore_outstanding_sales_order:
		outstanding_based_on_so = frappe.db.sql("""
			select sum(base_grand_total*(100 - per_billed)/100)
			from `tabSales Order`
			where customer=%s and docstatus = 1 and company=%s
			and per_billed < 100 and status != 'Closed'""", (customer, company))

		outstanding_based_on_so = flt(outstanding_based_on_so[0][0]) if outstanding_based_on_so else 0.0

	# Outstanding based on Delivery Note, which are not created against Sales Order
	unmarked_delivery_note_items = frappe.db.sql("""select
			dn_item.name, dn_item.amount, dn.base_net_total, dn.base_grand_total
		from `tabDelivery Note` dn, `tabDelivery Note Item` dn_item
		where
			dn.name = dn_item.parent
			and dn.customer=%s and dn.company=%s
			and dn.docstatus = 1 and dn.status not in ('Closed', 'Stopped')
			and ifnull(dn_item.against_sales_order, '') = ''
			and ifnull(dn_item.against_sales_invoice, '') = ''
		""", (customer, company), as_dict=True)

	outstanding_based_on_dn = 0.0

	for dn_item in unmarked_delivery_note_items:
		si_amount = frappe.db.sql("""select sum(amount)
			from `tabSales Invoice Item`
			where dn_detail = %s and docstatus = 1""", dn_item.name)[0][0]

		if flt(dn_item.amount) > flt(si_amount) and dn_item.base_net_total:
			outstanding_based_on_dn += ((flt(dn_item.amount) - flt(si_amount)) \
				/ dn_item.base_net_total) * dn_item.base_grand_total

	return outstanding_based_on_gle + outstanding_based_on_so + outstanding_based_on_dn


def get_credit_limit(customer, company):
	credit_limit = None

	if customer:
		credit_limit = frappe.db.get_value("Customer Credit Limit",
			{'parent': customer, 'parenttype': 'Customer', 'company': company}, 'credit_limit')

		if not credit_limit:
			customer_group = frappe.get_cached_value("Customer", customer, 'customer_group')
			credit_limit = frappe.db.get_value("Customer Credit Limit",
				{'parent': customer_group, 'parenttype': 'Customer Group', 'company': company}, 'credit_limit')

	if not credit_limit:
		credit_limit = frappe.get_cached_value('Company',  company,  "credit_limit")

	return flt(credit_limit)

def make_contact(args, is_primary_contact=1):
	contact = frappe.get_doc({
		'doctype': 'Contact',
		'first_name': args.get('name'),
		'is_primary_contact': is_primary_contact,
		'links': [{
			'link_doctype': args.get('doctype'),
			'link_name': args.get('name')
		}]
	})
	if args.get('email_id'):
		contact.add_email(args.get('email_id'), is_primary=True)
	if args.get('mobile_no'):
		contact.add_phone(args.get('mobile_no'), is_primary_mobile_no=True)
	contact.insert()

	return contact

def make_address(args, is_primary_address=1):
	reqd_fields = []
	for field in ['city', 'country']:
		if not args.get(field):
			reqd_fields.append( '<li>' + field.title() + '</li>')

	if reqd_fields:
		msg = _("Following fields are mandatory to create address:")
		frappe.throw("{0} <br><br> <ul>{1}</ul>".format(msg, '\n'.join(reqd_fields)),
			title = _("Missing Values Required"))

	address = frappe.get_doc({
		'doctype': 'Address',
		'address_title': args.get('name'),
		'address_line1': args.get('address_line1'),
		'address_line2': args.get('address_line2'),
		'city': args.get('city'),
		'state': args.get('state'),
		'pincode': args.get('pincode'),
		'country': args.get('country'),
		'links': [{
			'link_doctype': args.get('doctype'),
			'link_name': args.get('name')
		}]
	}).insert()

	return address

def get_customer_primary_contact(doctype, txt, searchfield, start, page_len, filters):
	customer = filters.get('customer')
	return frappe.db.sql("""
		select `tabContact`.name from `tabContact`, `tabDynamic Link`
			where `tabContact`.name = `tabDynamic Link`.parent and `tabDynamic Link`.link_name = %(customer)s
			and `tabDynamic Link`.link_doctype = 'Customer'
			and `tabContact`.name like %(txt)s
		""", {
			'customer': customer,
			'txt': '%%%s%%' % txt
		})

def get_customer_primary_address(doctype, txt, searchfield, start, page_len, filters):
	customer = frappe.db.escape(filters.get('customer'))
	return frappe.db.sql("""
		select `tabAddress`.name from `tabAddress`, `tabDynamic Link`
			where `tabAddress`.name = `tabDynamic Link`.parent and `tabDynamic Link`.link_name = %(customer)s
			and `tabDynamic Link`.link_doctype = 'Customer'
			and `tabAddress`.name like %(txt)s
		""", {
			'customer': customer,
			'txt': '%%%s%%' % txt
		})

@frappe.whitelist()
def add_payment_terms():
	names = ["Flags Mall (Marketing Door to Door)| 15 Days",
		"Golden Gate North| 15 Days",
		"MyDealerSupply.com| 15 Days",
		"AB&C Enterprises| EOW",
		"ADSCO Companies| EOW",
		"Andreas - Minimarket| EOW",
		"Autodealersupplies.com / FeatherFlags.com| EOW",
		"Autodealersupplies.com / Discoutflagoutlet / featherflag.com| EOW"
		"Biz-Image| EOW",
		"Carguys Promotional INC| EOW",
		"Dealer Supply Network| EOW",
		"FlagForest LLC| EOW",
		"FlagPad Corp| EOW",
		"Curry Enterprises| Net 30-CC",
		"G&G Auto Care Supply, INC| Net 30-CC",
		"Sign- Mart| NET15",
		"Accent Printing & Signs| NET30",
		"Access 2 Savings| NET30",
		"Action Advertising| NET30",
		"ADAMM SERVICES INC| NET30",
		"American Detail Supply| NET30",
		"American Sales Company| NET30",
		"Auto Promo, INC| NET30",
		"Auto Tech & Nile, MKT| NET30",
		"Automotive Service Products| NET30",
		"BoatdealerSupply.Com| NET30",
		"Bob Hughes Displays| NET30",
		"BPI Custom Printing - Sacramento| NET30",
		"bpi custom printing san dieg| NET30",
		"Bright Ideas Promotional Products| NET30",
		"Brilliant Image Group (BIG)| NET30",
		"Brite Products DBA Danny's Dealer Supplies| NET30",
		"Car Care Unlimited| NET30",
		"Carlot Promotions| NET30",
		"Cobb Promotions Inc| NET30",
		"Dealers Supply Company| NET30",
		"Direct Auto Dealer Supplies, INC| NET30",
		"Displays2go.com| NET30",
		"Dougherty Automotive & Advertising| NET30",
		"Emissions Depot| NET30",
		"Estampe| NET30",
		"Feather Flag Nation| NET30",
		"Flagcenter.com| NET30",
		"Flags & More| NET30",
		"Flags2020 - Bob Hughes| NET30",
		"Gallagher Promotional Products| NET30",
		"Greater Boston Autoware| NET30",
		"IADA Services, INC| NET30",
		"Jack's Specialties and Advertising| NET30",
		"Karn Automotive Products (TN)| NET30",
		"Micro-tec Supply Hardware| NET30",
		"MISTER PROMOTIONS DBA The CY Prisyon Co| NET30",
		"Motorcycle Dealer Supply| NET30",
		"Oak Advertising| NET30",
		"Park Place Printing Products LLC| NET30",
		"Paw Print Advertising| NET30",
		"Professional Promotion Service| NET30",
		"R&T Enterprises| NET30",
		"Ranch Town Market| NET30",
		"SD - BPI Custom Printing| NET30",
		"Sid Savage Auto Dealer Supply| NET30",
		"SNYADS| NET30",
		"Stats of San Diego INC| NET30",
		"Suncoast Furniture Inc| NET30",
		"Texbrite| NET30",
		"The Holland Company| NET30",
		"Thornhill Worldwide Enterprises Inc| NET30",
		"Topper Autodealer Supplies| NET30",
		"Tucker Industries, INC| NET30",
		"Valley Sign & Banner| NET30",
		"Versa-Tags, INC| NET30",
		"A 50 Star Flag| PBS",
		"A First Impression| PBS",
		"A to Z Auto Dealer Supply| PBS",
		"AAD Ink Design Group| PBS",
		"AAmerican Sales LLC| PBS",
		"ABC Flag & Pennant| PBS",
		"Action Advertising & Flags - RAUL| PBS",
		"ADSCO Canada| PBS",
		"Advertising Ideas Inc| PBS",
		"Agape Promotional Services INC| PBS",
		"AJ'S Promotions| PBS",
		"Alabama Iada| PBS",
		"Alex Herrera| PBS",
		"All-Pro Award & Trophy Co| PBS",
		"Allred Marketing| PBS",
		"Alvarez Flags| PBS",
		"Alvarez Signs| PBS",
		"American Dream Flag and Banner| PBS",
		"American Eagle Trading INC| PBS",
		"Auto & Dealer Acc Inc| PBS",
		"Auto Ad Sales| PBS",
		"Automotive Heroes| PBS",
		"B&E Supply Company| PBS",
		"Banner Man (CA)| PBS",
		"Bayfield Signs| PBS",
		"Blaize Inc| PBS",
		"Blue Sky Printing & promotional| PBS",
		"Boat Coats Unlimited LLC| PBS",
		"Brother Aweis - Platinum Consulting Group| PBS",
		"Budget Business Forms & More| PBS",
		"Buttons & Balloons| PBS",
		"Buy-rite - Charles Newman| PBS",
		"Bwise Marketing| PBS",
		"Central Coast P&S| PBS",
		"Charles Townsend Corp| PBS",
		"Chesters Web INC| PBS",
		"1953, Cindy Vargas| PBS",
		"CMi Signs| PBS",
		"Coast Advertising| PBS",
		"Coastal Dealer Supply| PBS",
		"Compu-Graphix| PBS",
		"Cos Flags| PBS",
		"CVSFlags.com (The Collins Group)| PBS",
		"Daniel's Signs| PBS",
		"DAPI.net Dealer Appearance Products| PBS",
		"De Vries Specialties| PBS",
		"Dealer Store Hawaii, LLC| PBS",
		"Dealer Supplies| PBS",
		"Dealer Supply Of Lexington, INC| PBS",
		"Dealerstockroom.com| PBS",
		"Dechan II Inc.| PBS",
		"Digital Printing F&F| PBS",
		"Discountswooper.com| PBS",
		"Dodson Group| PBS",
		"Dustin Enterprises| PBS",
		"E S T| PBS",
		"East Coast Real Estate| PBS",
		"ELGIN SIGNS| PBS",
		"Engle Tech Supply| PBS",
		"Ensight Grfx Printing| PBS",
		"Epic Print & Promo| PBS",
		"Erick Alonzo Alvarado| PBS",
		"Excellent Printing| PBS",
		"Fereshtah Kadir| PBS",
		"Fidelius Group, LLC| PBS",
		"Flag Store of Nevada| PBS",
		"Flagman Decorating CO INC| PBS",
		"Flags 100 - Advertising Solutions| PBS",
		"Flags and Jewelry, LLC| PBS",
		"Flags and More, TX| PBS",
		"Flags and Silver - That Special Gift| PBS",
		"FLAGS AND SILVER A.K.A.| PBS",
		"Flags Lua| PBS",
		"Flags Promotions| PBS",
		"Flags Supply| PBS",
		"Flags.co - San Diego Sign Company INC| PBS",
		"Flagsmore Ga| PBS",
		"Florida Flag & Pennant| PBS",
		"Folgers Flag & Decorating| PBS",
		"Francois Sales & Service| PBS",
		"Fusion Cellular| PBS",
		"Gemini Advertising Co.| PBS",
		"Go print us/West Coast Event Marketing, INC| PBS",
		"Go Publicidad Digital| PBS",
		"Going Mobile| PBS",
		"Gold Touch Inc| PBS",
		"Gordon Enos| PBS",
		"Grafek Printing| PBS",
		"Graham's Adventures| PBS",
		"Graphiry Printing| PBS",
		"Guard Sales Co| PBS",
		"Heidi Huggins| PBS",
		"Heidi's Flags and Tags| PBS",
		"Hightech Signs| PBS",
		"Hiren-KFC South Shore Office| PBS",
		"Hopz Dealer promotions| PBS",
		"Hunter Distributing| PBS",
		"IC Signs Inc - Cory Hock| PBS",
		"Iconicwear | PBS",
		"Impressions Graphics| PBS",
		"Impressions In Print, INC| PBS",
		"Inflatables Company| PBS",
		"Initech (OMM)| PBS",
		"J.D.O'Neal| PBS",
		"Joe E Drouin| PBS",
		"Johnny Flags| PBS",
		"JP Signs and Graphics| PBS",
		"JPS Signs & Graphics| PBS",
		"JZ AD Specialties| PBS",
		"JZ Dealer Supplies| PBS",
		"K&K  Auto Accessories| PBS",
		"Khan's Signs and Graphics| PBS",
		"la Palabra Invest Enterprises Inc| PBS",
		"Lakeline - Tyren Starr| PBS",
		"Lalos Flags| PBS",
		"Liberty Flag and Banner| PBS",
		"Lion Flags| PBS",
		"LRS Branding Impressions LLC| PBS",
		"Made You Look Advertising LLC| PBS",
		"Mattison Enterprises INC| PBS",
		"Maximum Signs| PBS",
		"MBR Marketing| PBS",
		"MC Graphics LLC| PBS",
		"Meridian Media Group| PBS",
		"Meridian West Specialties| PBS",
		"Michiana Battery & Auto Dealer Supply| PBS",
		"Mickey's Automotive Specialties, INC| PBS",
		"Miedema Enterprises / Giant Promotions| PBS",
		"Minkus Advertising| PBS",
		"MIPSCO| PBS",
		"MSD Goods, INC| PBS",
		"Nationwideflags, LLC| PBS",
		"Netmark Enterprises| PBS",
		"NV Dealer Supply| PBS",
		"Oliveri's Promotional Products| PBS",
		"P&S East Bay| PBS",
		"Paul Flags & Signs INC| PBS",
		"Print Kwik| PBS",
		"PRM - Pat Mirabal| PBS",
		"Promo ARC| PBS",
		"PromoGator| PBS",
		"Quality Flags| PBS",
		"ReproDox| PBS",
		"Retail Merchandising Signs. INC| PBS",
		"Richard Hunnicutt| PBS",
		"Romano Promotions LLC| PBS",
		"RPM Flags and Graphics| PBS",
		"Savannahs Banners| PBS",
		"SeaCoast Imprint| PBS",
		"Serrano Printing| PBS",
		"Sign Factory INC| PBS",
		"Sign Giant| PBS",
		"Sign Lab of Las Vegas| PBS",
		"Signaram Fayetteville| PBS",
		"Signazon East LLC| PBS",
		"Signco| PBS",
		"Signs 4U LLC| PBS",
		"Signs Done Fast Inc| PBS",
		"Signs In 1 Day INC| PBS",
		"Silvester's Flags| PBS",
		"Smart Advertising| PBS",
		"Smart Buy Supplies INC| PBS",
		"Swooper Flags & More| PBS",
		"Sylvester's Flags| PBS",
		"Tellez Production Sales| PBS",
		"Tennesse Management| PBS",
		"Terry Teeters| PBS",
		"The Gorham Flag Center| PBS",
		"The Sign Depot of Texas| PBS",
		"The Sign Shack In Hemet| PBS",
		"Thomson Automotive Systems| PBS",
		"Tony's Flags| PBS",
		"Tony's Printing| PBS",
		"Total Care Service INC| PBS",
		"Ultimate Flags (NextAdz)| PBS",
		"Ultimate Signs & Graphics| PBS",
		"United Flag and Banner| PBS",
		"United Signs CA| PBS",
		"US SIGNS - Nationwideflags, LLC| PBS",
		"USA Supplies| PBS",
		"Vargas Signs| PBS",
		"Wheel's Automotive Dealer Supplies,INC| PBS",
		"White Stone| PBS",
		"Wind Visuals| PBS",
		"Xgraphix| PBS",
		"Modern Wireless Inc| NET30"
		]
	cust_name=[]
	for name in names:
		if frappe.db.exists("Customer",name.split('| ')[0]):
			#print(name)
			val = frappe.db.get_value("Customer",name.split('| ')[0], 'disabled')
			#print(val)
			if val == 1:
				print("______________________________________________")

		else:
			cust_name.append(name.split('| ')[0])
	print(cust_name)
	return
	cust = frappe.db.get_all("Customer",filters={},fields=["*"])
	flase_count =0
	true_count= 0 
	print(len(cust_name))
	for data in cust:
		flg=True
		if data.name in cust_name:
			flg=False
			flase_count+=1
			#print(data.name)
		else:
			true_count+=1
			frappe.db.sql(""" UPDATE tabCustomer set disabled=%s where name=%s""",(1,data.name))
			frappe.db.commit()

	
	print(true_count)
	print(flase_count)

@frappe.whitelist()
def check_for_disabled_customers():
	cust = frappe.get_all("Customer", filters={"disabled":1},fields=["*"])
	for item in cust:
		so = frappe.get_all("Sales Order", filters={"customer":item.name},fields=["*"])
		if len(so) > 0:
			print(item.name)
			print(len(so))
			# frappe.db.sql(""" UPDATE tabCustomer set disabled=%s where name=%s""",(0,item.name))
			# frappe.db.commit()


@frappe.whitelist()
def delink_addresses():
	addresses = frappe.get_all("Address", filters={"address_type":"Shipping","is_shipping_address":0,"is_your_company_address":0},fields=["*"])
	for item in addresses:
		#print(add_months(today(), -1))
		if getdate(item.creation) < getdate(add_months(today(), -1)):
			doc = frappe.get_doc("Address",item.name)
			if len(doc.links) >0:
				try:
					temp = frappe.get_doc({
					"doctype":"Delinked Address",
					"customer":doc.links[0].link_name,
					"address":doc.name,
					"dynamic_link":doc.links[0].name
					})
					temp.save()
					
					doc.update({
						"links":[]
					})
					doc.save()
					frappe.db.commit()
				except:
					pass