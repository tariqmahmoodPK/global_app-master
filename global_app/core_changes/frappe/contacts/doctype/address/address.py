# -*- coding: utf-8 -*-
# Copyright (c) 2015, Frappe Technologies and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe

from frappe import throw, _
from frappe.utils import cstr

from frappe.model.document import Document
from jinja2 import TemplateSyntaxError
from frappe.utils.user import is_website_user
from frappe.model.naming import make_autoname
from frappe.core.doctype.dynamic_link.dynamic_link import deduplicate_dynamic_links
from six import iteritems, string_types
from past.builtins import cmp
from frappe.contacts.address_and_contact import set_link_title

import functools


class Address(Document):
	def __setup__(self):
		self.flags.linked = False

	def autoname(self):
		if not self.address_title:
			if self.links:
				self.address_title = self.links[0].link_name

		if self.address_title:
			self.name = (cstr(self.address_title).strip() + "-" + cstr(_(self.address_type)).strip())
			if frappe.db.exists("Address", self.name):
				self.name = make_autoname(cstr(self.address_title).strip() + "-" +
					cstr(self.address_type).strip() + "-.#")
		else:
			throw(_("Address Title is mandatory."))

	def validate(self):
		self.link_address()
		self.validate_reference()
		set_link_title(self)
		deduplicate_dynamic_links(self)
		#custom code
		if self.address_type != "Billing":
			doc = frappe.get_all("Sales Order",filters={'shipping_address_name':self.name},fields=['*'])
			if len(doc) > 0:
				for d in doc:
					if d.docstatus == 1:
						frappe.msgprint("could not update address it is linked to submitted order(s)")
						frappe.throw("update failed")
			doc2 = frappe.get_all("Sales Order",filters={'customer_address':self.name},fields=['*'])
			if len(doc2) > 0:
				for d in doc2:
					if d.docstatus == 1:
						frappe.msgprint("could not update address it is linked to submitted order(s)")
						frappe.throw("update failed")
		self.state=self.state.strip()
		self.pincode=self.pincode.strip()
		self.address_title = self.address_title.strip()
		if self.attention_name:
			self.attention_name = self.attention_name.strip()
		self.address_line1=self.address_line1.strip()
		try:
			if frappe.db.exists("US States",self.state):
				pass
			elif self.country_code != "US":
				doc  =frappe.get_doc({
					"doctype":"US States",
					"name1":self.state,
					"abb":self.abb,
					"zip":self.pincode,
					"mp_channel":"CA"
				})
				doc.save(ignore_permissions=True)
			else:
				frappe.throw("Invalid state name please check spellings")
		except:
			frappe.throw("Invalid state name please check spellings")

	def link_address(self):
		"""Link address based on owner"""
		if not self.links and not self.is_your_company_address:
			contact_name = frappe.db.get_value("Contact", {"email_id": self.owner})
			if contact_name:
				contact = frappe.get_cached_doc('Contact', contact_name)
				for link in contact.links:
					self.append('links', dict(link_doctype=link.link_doctype, link_name=link.link_name))
				return True

		return False

	def validate_reference(self):
		if self.is_your_company_address:
			if not [row for row in self.links if row.link_doctype == "Company"]:
				frappe.throw(_("Company is mandatory, as it is your company address"))

			# removing other links
			to_remove = [row for row in self.links if row.link_doctype != "Company"]
			[ self.remove(row) for row in to_remove ]

	def get_display(self):
		return get_address_display(self.as_dict())

	def has_link(self, doctype, name):
		for link in self.links:
			if link.link_doctype==doctype and link.link_name== name:
				return True

	def has_common_link(self, doc):
		reference_links = [(link.link_doctype, link.link_name) for link in doc.links]
		for link in self.links:
			if (link.link_doctype, link.link_name) in reference_links:
				return True

		return False

@frappe.whitelist()
def get_default_address(doctype, name, sort_key='is_primary_address'):
	'''Returns default Address name for the given doctype, name'''
	if sort_key not in ['is_shipping_address', 'is_primary_address']:
		return None

	out = frappe.db.sql(""" SELECT
			addr.name, addr.%s
		FROM
			`tabAddress` addr, `tabDynamic Link` dl
		WHERE
			dl.parent = addr.name and dl.link_doctype = %s and
			dl.link_name = %s and ifnull(addr.disabled, 0) = 0
		""" %(sort_key, '%s', '%s'), (doctype, name))

	if out:
		return sorted(out, key = functools.cmp_to_key(lambda x,y: cmp(y[1], x[1])))[0][0]
	else:
		return None


@frappe.whitelist()
def get_address_display(address_dict):
	if not address_dict:
		return

	if not isinstance(address_dict, dict):
		address_dict = frappe.db.get_value("Address", address_dict, "*", as_dict=True, cache=True) or {}

	name, template = get_address_templates(address_dict)

	try:
		return frappe.render_template(template, address_dict)
	except TemplateSyntaxError:
		frappe.throw(_("There is an error in your Address Template {0}").format(name))


def get_territory_from_address(address):
	"""Tries to match city, state and country of address to existing territory"""
	if not address:
		return

	if isinstance(address, string_types):
		address = frappe.get_cached_doc("Address", address)

	territory = None
	for fieldname in ("city", "state", "country"):
		if address.get(fieldname):
			territory = frappe.db.get_value("Territory", address.get(fieldname))
			if territory:
				break

	return territory

def get_list_context(context=None):
	return {
		"title": _("Addresses"),
		"get_list": get_address_list,
		"row_template": "templates/includes/address_row.html",
		'no_breadcrumbs': True,
	}

def get_address_list(doctype, txt, filters, limit_start, limit_page_length = 20, order_by = None):
	from frappe.www.list import get_list
	user = frappe.session.user
	ignore_permissions = False
	if is_website_user():
		if not filters: filters = []
		add_name = []
		contact = frappe.db.sql("""
			select
				address.name
			from
				`tabDynamic Link` as link
			join
				`tabAddress` as address on link.parent = address.name
			where
				link.parenttype = 'Address' and
				link_name in(
				   select
					   link.link_name from `tabContact` as contact
				   join
					   `tabDynamic Link` as link on contact.name = link.parent
				   where
					   contact.user = %s)""",(user))
		for c in contact:
			add_name.append(c[0])
		filters.append(("Address", "name", "in", add_name))
		ignore_permissions = True

	return get_list(doctype, txt, filters, limit_start, limit_page_length, ignore_permissions=ignore_permissions)

def has_website_permission(doc, ptype, user, verbose=False):
	"""Returns true if there is a related lead or contact related to this document"""
	contact_name = frappe.db.get_value("Contact", {"email_id": frappe.session.user})
	if contact_name:
		contact = frappe.get_doc('Contact', contact_name)
		return contact.has_common_link(doc)

		lead_name = frappe.db.get_value("Lead", {"email_id": frappe.session.user})
		if lead_name:
			return doc.has_link('Lead', lead_name)

	return False

def get_address_templates(address):
	result = frappe.db.get_value("Address Template", \
		{"country": address.get("country")}, ["name", "template"])

	if not result:
		result = frappe.db.get_value("Address Template", \
			{"is_default": 1}, ["name", "template"])

	if not result:
		frappe.throw(_("No default Address Template found. Please create a new one from Setup > Printing and Branding > Address Template."))
	else:
		return result

@frappe.whitelist()
def get_shipping_address(company, address = None):
	filters = [
		["Dynamic Link", "link_doctype", "=", "Company"],
		["Dynamic Link", "link_name", "=", company],
		["Address", "is_your_company_address", "=", 1]
	]
	fields = ["*"]
	if address and frappe.db.get_value('Dynamic Link',
		{'parent': address, 'link_name': company}):
		filters.append(["Address", "name", "=", address])

	address = frappe.get_all("Address", filters=filters, fields=fields) or {}

	if address:
		address_as_dict = address[0]
		name, address_template = get_address_templates(address_as_dict)
		return address_as_dict.get("name"), frappe.render_template(address_template, address_as_dict)

def get_company_address(company):
	ret = frappe._dict()
	ret.company_address = get_default_address('Company', company)
	ret.company_address_display = get_address_display(ret.company_address)

	return ret

def address_query(doctype, txt, searchfield, start, page_len, filters):
	from frappe.desk.reportview import get_match_cond

	link_doctype = filters.pop('link_doctype')
	link_name = filters.pop('link_name')

	condition = ""
	for fieldname, value in iteritems(filters):
		condition += " and {field}={value}".format(
			field=fieldname,
			value=value
		)

	meta = frappe.get_meta("Address")
	searchfields = meta.get_search_fields()

	if searchfield:
		searchfields.append(searchfield)

	search_condition = ''
	for field in searchfields:
		if search_condition == '':
			search_condition += '`tabAddress`.`{field}` like %(txt)s'.format(field=field)
		else:
			search_condition += ' or `tabAddress`.`{field}` like %(txt)s'.format(field=field)

	return frappe.db.sql("""select
			`tabAddress`.name, `tabAddress`.city, `tabAddress`.country
		from
			`tabAddress`, `tabDynamic Link`
		where
			`tabDynamic Link`.parent = `tabAddress`.name and
			`tabDynamic Link`.parenttype = 'Address' and
			`tabDynamic Link`.link_doctype = %(link_doctype)s and
			`tabDynamic Link`.link_name = %(link_name)s and
			ifnull(`tabAddress`.disabled, 0) = 0 and
			({search_condition})
			{mcond} {condition}
		order by
			if(locate(%(_txt)s, `tabAddress`.name), locate(%(_txt)s, `tabAddress`.name), 99999),
			`tabAddress`.idx desc, `tabAddress`.name
		limit %(start)s, %(page_len)s """.format(
			mcond=get_match_cond(doctype),
			key=searchfield,
			search_condition = search_condition,
			condition=condition or ""), {
			'txt': '%' + txt + '%',
			'_txt': txt.replace("%", ""),
			'start': start,
			'page_len': page_len,
			'link_name': link_name,
			'link_doctype': link_doctype
		})

def get_condensed_address(doc):
	fields = ["address_title", "address_line1", "address_line2", "city", "county", "state", "country"]
	return ", ".join([doc.get(d) for d in fields if doc.get(d)])

@frappe.whitelist()
def getStateName(code): 
		try:
				return frappe.get_all('US States',filters={'abb': code}, fields=['*'])[0]
		except:
				return code

@frappe.whitelist()
def getCountryName(code):
		try:
				return frappe.get_all('Country',filters={'code': code}, fields=['*'])[0]
		except:
				return code


@frappe.whitelist()
def find_missing_emails():
	odoo_emails=['cindy.vargas114@gmail.com',
				'john@3rdpoweroutlet.com',
				'sharifaref24@gmail.com',
				'a1balloonrental@yahoo.com',
				'a50starflags@yahoo.com',
				'h2oandice@aol.com',
				'agarcian711@yahoo.com',
				'aamericansalesco@comcast.net',
				'aandjflags@yahoo.com',
				'artur_signs@hotmail.com',
				'Doreen@abc-ent.com',
				'Pill@abcflags.com',
				'bensufiafamily@yahoo.com',
				'sales@accentprinter.com',
				'ie_alternatesolutions@msn.com',
				'accounting@mydealersupply.com',
				'1flagman@comcast.net',
				'accounting1@actionadvflags.com',
				'frontdesk@actionadvflags.com',
				'raul@actionsdvertising.com',
				'services@adamm.com',
				'mike@adsaz.net',
				'adscocan@gmail.com',
				'payables@adsco.net',
				'troy@unrealvinyl.com',
				'orders@nwstorages.com',
				'orders@nwstorages.com',
				'order@nwstorages.com',
				'printer.rich@gmail.com',
				'printer.rich@gmail.com',
				'advantagegmg@yahoo.com',
				'orders@inflate.net',
				'sales@afivegas.com',
				'bodden1@tampabay.rr.com',
				'airglobaladvertising@gmail.com',
				'ajspromotions@embarqmail.com',
				'randyejones@live.com',
				'alexmoxi@gmail.com',
				'giovanna.flores@aol.com',
				'aboody@wsclou.com',
				'paugustusm@aol.com',
				'allredmarketing@gmail.com',
				'mark@allsignsusa.com',
				'alottasigns@yahoo.com',
				'altaprint@embarqmail.com',
				'alvarezflags2040@yahoo.com',
				'yaraehernandez@gmail.com',
				'adcole@logantele.com',
				'ccwaxman52@aol.com',
				'americandreamflag@msn.com',
				'orders@americaneagletradinginc.com',
				'americansales@centurytel.net',
				'123minimini@gmail.com',
				'loreen@andywholesale.com',
				'lowcostsignss@yahoo.com',
				'mrfroggy1@ymail.com',
				'aglazingsystem@gmail.com',
				'felipedelgado2006@gmail.com',
				'felipedelgado2006@gmail.com',
				'romanv_s@msn.com',
				'customerservice@Azairboutique.com',
				'autodealersupply@yahoo.com',
				'autoadsales@aol.com',
				'ada49inc@aol.com',
				'dick.hurd@comcast.net',
				'segotammy@gmail.com',
				'mark@automotiveheroes.com',
				'invoices@autoserviceproducts.com',
				'jon@autopops.com',
				'autopromo@verizon.net',
				'office@autotechniles.com',
				'aztecasigns@sbcglobal.net',
				'Chris@bangadvertising.com',
				'fiorucci@aol.com',
				'orders@bayfieldsigns.com',
				'richard@bestbanner.com',
				'besupply@yahoo.com',
				'gobigtime@mail.com',
				'beitowing@aol.com',
				'bionicgraphix@aol.com',
				'bcxtavares@gmail.com',
				'abrbarr@biz-image.com',
				'abrbarr@Biz-image.com',
				'sales@blaizeinc.com',
				'doug@blowoutbanners.com',
				'joe@myskyisblue.com',
				'boatcoats@hotmail.com',
				'invoice@dealersupply.com',
				'bobrogley@cox.net',
				'lornas@bpicustomprinting.com',
				'info@brovoprinting.com',
				'kevink@brightideasstore.com',
				'accounting@big-img.com',
				'CCAREY@DDSPRODUCTS.COM',
				'ccarey@briteproductsusa.com',
				'platinumcgroup@yahoo.com',
				'Budget69@yahoo.com',
				'buttonsandballoons@comcast.net',
				'charles-newman@live.com',
				'velezj@bwisemarketing.com',
				'jh5150@gmail.com',
				'luispablo_77@yahoo.com',
				'angelitom@cararoma.com',
				'vpcars@comcast.net',
				'jessica@carguyspromo.com',
				'pamela@carguyspromo.com',
				'matt@carlotstore.com',
				'Matt@carlotstore.com',
				'doleh.m@cellsolutionsllc.com',
				'pamela@centralcoastpolish.com',
				'cervantesprintin@aol.com',
				'kris@charlestownsend.com',
				'chestersweb4105@yahoo.com',
				'cindy.vargas114@gmail.com',
				'solutions@clickex.net',
				'cmisigns@cmiquickcopy.com',
				'jaime@coastadvertising.com',
				'shop@coastaldealersupply.com',
				'usmanawan@gmail.com',
				'sales@compu-graphix.com',
				'cs@coresigns.com',
				'cosflags@hotmail.com',
				'matt@printingorlando.com',
				'niv@cottmansigns.com',
				'courtney@igladsolutions.com',
				'csr1@coxprinters.com',
				'Orders@creativeadproducts.com',
				'creativeandvisual@yahoo.com',
				'cullmansignandbanner@yahoo.com',
				'dcurry@curryenterprises.net',
				'customd@ymail.com',
				'sandy.schmidt@thecollinsgroup.us',
				'agomez@cybersolution2.com',
				'danielssignsny@aol.com',
				'sales@d-a-p-i.net',
				'jmxmedia@lvcoxmail.com',
				'ngross@dealersupply.com',
				'contact@dealerstockroom.com',
				'sales@dealerstorehawaii.com',
				'sarg67@comcast.net',
				'dealersupply@hotmail.com',
				'dealersupplyshop@yahoo.com',
				'dealersupplyshop@yahoo.com',
				'dean@igladsolutions.com',
				'dechaninc@gmail.com',
				'dechaninc@gmail.com',
				'dstudious@gmail.com',
				'stacy@devriesspecialties.com',
				'felipelcruz4517@sbcglobal.net',
				'directautodealersupplies@gmail.com',
				'moemoe101@att.net',
				'costing@displays2go.com',
				'iiglecias6@hotmail.com',
				'E.purvisgallery@verizon.net',
				'ap@dodson-group.com',
				'pill@abcflags.com',
				'info@americaneagletradinginc.com',
				'info@autotechniles.com',
				'AllredMarketing@gmail.com',
				'orders@bayfieldsigns.com',
				'buttonsandballoons@comcast.net',
				'skipgru@comcast.net ',
				'buttonsandballoons.com ',
				'alvarezcesar26@gmail.com',
				'danielssignsny@aol.com',
				'sales@signsdonefast.com',
				'savannahsbannerrs@yahoo.com',
				'ctmotorman@gmail.com',
				'ctmotorman@aol.com',
				'james@ultimateflags.com',
				'budget69@yahoo.com',
				'sandy.schmidt@thecollinsgroup.us',
				'service@minkus.com',
				'jdocrt@verizon.net',
				'car-s4u@hotmail.com',
				'driverofc@wyan.org',
				'naveed@eycon.co',
				'duc@abc-ent.com',
				'organo8@yahoo.com',
				'ellahiusa@hotmail.com',
				'sales@myluxuryfurniture.com',
				'khurramsaleem100@gmail.com',
				'easystickerco@aol.com',
				'mrfanastic@yahoo.com',
				'besupply@yahoo.com',
				'superflags@ehtflags.com',
				'searchmaster101@aol.com',
				'sales@emissionsdepot.com',
				'ziggy7@bellsouth.net',
				'info@ensightgrfx.com',
				'rachael@epicprintandpromo.com',
				'elegantdesign.alvarado@gmail.com',
				'leqbrown@yahoo.com',
				'accounting@estampeinc.com',
				'ollsroyce_222@hotmail.com',
				'billing@excellent-printing.com',
				'fred@extfabrics.com',
				'pakiza@gmail.com',
				'mark@f1labels.com',
				'fairlambproducts@yahoo.com',
				'kitters270@gmail.com',
				'fawan90@yahoo.com',
				'fcpprinting@comcast.net',
				'anya.uk@outlook.com',
				'awan.sule@gmail.com',
				'kadirma2003@yahoo.com',
				'fideliusgroup@gmail.com',
				'mark@f1labels.com',
				'joe@firecrackergraphix.com',
				'gmflagandbanner@yahoo.com',
				'maureen@flagcenter.com',
				'ordersflagster@gmail.com',
				'flaggirl236@gmail.com',
				'flaggirl236@gmail.com',
				'lflagman@aol.com',
				'admin@flagpad.com',
				'flags100@hotmail.com',
				'bob@flags2020.com',
				'andy@flagsandjewelry.com',
				'flagsandmoreflags@hotmail.com',
				'ANDY@FLAGSANDSILVER.COM',
				'andy@flagsandjewelry.com',
				'frankie@flags.co',
				'alvarezcesar26@gmail.com',
				'steven@marketingd2d.com',
				'Steven Song <steventasong@gmail.com>',
				'mayfield5@ymail.com',
				'mayfield5@ymail.com',
				'flagsmore@flagsmore.com',
				'dmflagsandmore@yahoo.com',
				'lilymelita@yahoo.com',
				'flagsart@gmail.com',
				'flagssupply@yahoo.com',
				'flagssupply@yahoo.com',
				'esmith@flagstoreofnevada.com',
				'info@flagsupercenter.com',
				'jamey@floridaflag.us',
				'folgerflags@att.net',
				'jcflags123@yahoo.com',
				'tonyr.ca@foagroup.com',
				'guschavez@gmail.com',
				'suncoastpromo@gmail.com',
				'promotionszone@gmail.com',
				'fusioncel@yahoo.com',
				'fusioncel@yahoo.com',
				'ap@fusionsign.com',
				'info@futechinc.com',
				'jgebhart@gppinc.com',
				'agoofy1ok@yahoo.com',
				'gspreina@yahoo.com',
				'yanks7@comcast.net',
				'accounting@gandgpros.com',
				'estimating@gibeonllc.com',
				'jbglobal1@gmail.com',
				'bcxtavares@gmail.com',
				'Sales@igladsolutions.com',
				'art@igladsolutions.com',
				'cb.goingmobile@gmail.com',
				'ap@goldengatenorth.com ',
				'tracy@goldtouchds.com',
				'rene@westcoasteventmarketing.com',
				'publicidad0303@gmail.com',
				'test@igladsolutions.com',
				'dauclair@gorhamflag.com',
				'tzintzunpedro@gmail.com',
				'grafekprinting@gmail.com',
				'bill_graham@sbcglobal.net',
				'graphiryinfo@optonline.net',
				'greaterbostonautoware@verizon.net',
				'greg@novosigns.com',
				'gs@test.com',
				'guard.sales@gmail.com',
				'henry@h2gmedia.com',
				'roubik@happyjump.com',
				'hawahajjandumrah@yahoo.com',
				'heidisflags@comcast.net',
				'quarry@highimpactdesignz.com',
				'jay@hightech-signs.com',
				'hiren4097@gmail.com',
				'sales@homeydesign.com',
				'jeff@hopzpromo.com',
				'hotwheelsplus@gmail.com',
				'arvioanderson456@gmail.com',
				'neil893@hotmail.com',
				'wingsoverwa@q.com',
				'promoprint@iada.com',
				'Carlos@nmiada.com',
				'alayala1318@gmail.com',
				'iconicwear13 @gmail.com',
				'cory@icsignsinc.com',
				'Kathy@idahoada.org',
				'ffatehali@gmail.com',
				'impressgraph@yahoo.com',
				'account@iipva.com',
				'inboxfiles@live.com',
				'wkhalife@gmail.com',
				'art@inflateco.com',
				'kelsey@initechinfo.com',
				'inkshoppe01@windstream.net',
				'inlineblueprint@verizon.net',
				'james@jackssna.com',
				'jbglobal1@earthlink.net',
				'jdopromo@knology.net',
				'Fiorucci@aol.com',
				'jessica@cgpproducts.com',
				'mrjesusgonzalez@yahoo.com',
				'SALES@MYPAKINSHIP.COM',
				'joel@libertyflagandbanner',
				'johnmarlogos@hotmail.com',
				'vicky@venturagraphix.com',
				'info.jpsigns@gmail.com',
				'thevidals@yahoo.com',
				'juanmpizano@yahoo.com',
				'jessicabarragan07@gmail.com',
				'justflags@hotmail.com',
				'JOE@JZADFL.COM',
				'info@jzdealersupplies.com',
				'info@jzdealersupplies.com',
				'solution77@ymail.com',
				'kabanika62@gmail.com',
				'acct@karnauto.com',
				'acct@karnauto.com',
				'amueez@oemdistributors.com',
				'info@print-kwik.com',
				'deemer77@gmail.com',
				'deemer77@gmail.com',
				'kilokustomz@gmail.com>',
				'kskcarlson@charter.net',
				'keithsherley@gmail.com',
				'info@koscoflags.com',
				'kris@charlestownsend.com',
				'kustom.signs@yahoo.com',
				'tyrenstarr@live.com',
				'torres.flags@yahoo.com',
				'zawan@yahoo.com',
				'lanoticiaprinting@hotmail.com',
				'jose@laceibainc.com',
				'mary@laprensadecolorado.com',
				'lazersolutions@shaw.ca',
				'leighann@meridianignage.com',
				'info@libertyflagandbanner.com',
				'info@libertyflagandbanner.com',
				'jeff@liberty-printing.com',
				'lionflags@bellsouth.net',
				'Monique@livingstonpackaging.com',
				'sales@lrsbranding.com',
				'luckydawglt@yahoo.com',
				'newbills@statsprepress.com',
				'Joe@myladvertising.com',
				'print@pdxmailroomplus.com',
				'myladvertising@yahoo.com',
				'malik.pardesi.usa@gmail.com',
				'ellahiusa@hotmail.com',
				'marcello_contact@hotmail.com',
				'alvarezflags2040@yahoo.com',
				'mrgerardo@canonbaja.com',
				'dzarate@marketingavenue.com.mx',
				'GMatti3758@aol.com',
				'maximumsignco@aol.com',
				'ap@mbrmarketing.com',
				'mcgraphicsllc@juno.com',
				'm_d_auto@sbcglobal.net',
				'sales@compu-graphix.com',
				'ellahiusa@hotmail.com',
				'leighann@meridiansignage.com',
				'micah@meridiansignage.com',
				'meridian408@gmail.com',
				'mexprint@aol.com',
				'info@micalifornia.com',
				'mike@planamediagraphics.com',
				'autoadsales@aol.com',
				'kfyffem@att.net',
				'kfyffem@att.net',
				'mrmickauto@gmail.com',
				'lynng@cynmail.com',
				'kelly@giantpromotions.com',
				'mimasblue@gmail.com',
				'service@minkus.com',
				'service@minkus.com',
				'cs@mmpburbank.com',
				'dbarron11@gmail.com',
				'dbarron@mipsco.com',
				'bwheaton@comcast.net',
				'bruce@MISTERPROMOTION.COM',
				'moonco@comcast.net',
				'sharon@dealersupply.com',
				'mountaineerdealerproducts@gmail.com',
				'regina@mrfoamer.com',
				'sea91755@yahoo.com',
				'msignsrotulos@msn.com',
				'promotionszone@gmail.com',
				'george@mustardseedprinting.com',
				'garyjuarez@gmail.com',
				'support@mydealersupply.com',
				'renee@nsdinfo.com',
				'nationwideflags@gmail.com',
				'nawajidali739@gmail.com',
				'orders@411prints.com',
				'howards1136@gmail.com',
				'derek@nbpackship.com',
				'nhadservices@nhada.com',
				'joem@ncse.org',
				'noxindustries@yahoo.com',
				'pierpont311@gmail.com',
				'tony@nusignsupply.com',
				'nvdealersupply@gmail.com',
				'oak@maine.rr.com',
				'pranav.barot@drcsystems.com',
				'wendy@ohiada.org',
				'admin@oilonitgraphics.com',
				'okscreengraphics@hotmail.COM',
				'jcoliveri@yahoo.com',
				'pdsforms@centurytel.net',
				'pacosgraffix@yahoo.com',
				'pakiza.eycon@gmail.com',
				'accounting@sidsavage.com',
				'sales@pppama.com',
				'ryan@paperandinkprinting.com',
				'paris_printing04@sbcglobal.net',
				'gary@parkplaceprinting.net',
				'pspat45@aol.com',
				'paulsflags@icloud.com',
				'pawprint@midmaine.com',
				'payables@adsco.com',
				'info@pearidge.com',
				'info@perfectsigns.net',
				'stu@4performanceprinting.com',
				'ldecuir@ups.com',
				'pipcolumubus@pipcolumubus.com',
				'platinumcgroup@yahoo.com',
				'ok111@postnet.com',
				'Sales@poundex.com',
				'barotpranav1995@gmail.com',
				'primeapparelandsigns@outlook.com',
				'primeapparelandsigns@outlook.com',
				'info@techgraphx.com',
				'printing4cheap@yahoo.com',
				'cfilek@printingsolutions.tv',
				'info@print-kwik.com',
				'tim@print-n-tees.com',
				'printtechsolutions909@gmail.com',
				'patmirabal@aol.com',
				'sugarman101@msn.com',
				'cesar@pro-flags.com',
				'promoarc@verizon.net',
				'ignaciojbernal@gmail.com',
				'egalick@verizon.net',
				'mike@promorental.com',
				'info@pierreboutin.com',
				'ricky@propelprint.com',
				'Proprintingsigns@gmail.com',
				'bob@propropertysupply.com',
				'prosign1@prosignprinting.com',
				'jeff@prosourceprinting.com',
				'pseastbay@gmail.com',
				'sikkim1985@hotmail.com',
				'lucas@quiagraphics.com',
				'002463@gmail.com',
				'agomez@rapidprintinganddesign.com',
				'002463@gmail.com',
				'rcfwholesale@yahoo.com',
				'info@rddistributing.com',
				'sales@redstickadvertising.com',
				'alayala1318@gmail.com',
				'kevin@reprodox.com',
				'bertha@signs-banners-tags.com',
				'pelaezrazi@gmail.com',
				'richardhunnicutt@insightbb.com',
				'rick@photonovastudios.com',
				'riversideflags@yahoo.com',
				'rubina.eycon@gmail.com',
				'rodarsales@gmail.com',
				'sales@rodonsigns.com',
				'ebuydeals123@gmail.com',
				'megan@romanopromo.com',
				'sales@rpmflags.com',
				'002463@gmail.com',
				'purchasing@rtboxes.com',
				'rick316@att.net',
				'SA@test.com',
				'sales1@igladsolutions.com',
				'sales2@igladsolutions.com',
				'sales3@igladsolutions.com',
				'sales4@igladsolutions.com',
				'cmisigns@cmiquickcopy.com',
				'savannahsbanners@yahoo.com',
				'savannahsbanners@yahoo.com',
				'kabrams@bpicustomprinting.com',
				'Robert Churchman <rchurchman@bpicustomprinting.com>',
				'Signmax1@gmail.com',
				'bwynn@sdwusa.com',
				'seacoastimprint@comcast.net',
				'seatcovercity@gmail.com',
				'segotammy@gmail.com',
				'sylvia@serranoprinting.com',
				'awan_shahbaz786@yahoo.com',
				'shafat@eycon.co',
				'sheila.costa@displays2go.com',
				'sheila.costa@displays2go.com',
				'sheila.costa@displays2go.com',
				'sheila.costa@displays2go.com',
				'sheila.costa@displays2go.com',
				'sheila.costa@displays2go.com',
				'sheila.costa@displays2go.com',
				'sheila.costa@displays2go.com',
				'sheila.costa@displays2go.com',
				'sheila.costa@displays2go.com',
				'sheila.costa@displays2go.com',
				'sheila.costa@displays2go.com',
				'sheila.costa@displays2go.com',
				'sheila.costa@displays2go.com',
				'sheila.costa@displays2go.com',
				'bob@sidsavage.com',
				'fayetteville@signarama.com',
				'jim.y@signazon.com>',
				'shirley@teamsignco.com',
				'mrgerardo@canonbaja.com',
				'info@signgiant.com',
				'sales@sllv.net',
				'carmel@sign-mart.com',
				'signs4-u@hotmail.com',
				'nichole@signsdonefast.com',
				'sales@signsdonefast.com',
				'sales@signsin1day.com',
				'sign2000sa@aol.com',
				'johanna9102@yahoo.com',
				'ivan@skyblueprint.com>',
				'smartad1@live.com',
				'mariel@smartbuypr.com',
				'pattfc@yahoo.com',
				'smgraphicsinc@yahoo.com',
				'lcaraballo@nysada.com',
				'southfieldsigns@gmail.com',
				'drewz@spsdealersource.com',
				'bills@spsdealersource.com',
				'hayes.james3125@yahoo.com',
				'standoutsigns@aol.com',
				'starad@star-ad.net',
				'marcoestrade@mail.com',
				'newbills@statsprepress.com',
				'test@gadv.com',
				'test@test.com',
				'sticker512@yahoo.com',
				'stitchplus@outlook.com',
				'sheila.sugarman@yahoo.com',
				'suleawan@gmail.com',
				'suncoastpromo@gmail.com',
				'Ino@sunfiremedia.net',
				'puppetmasterstudios@yahoo.com',
				'raul@thesigndepot.com',
				'basra@comcast.net',
				'supremesupplies@att.net',
				'info@sweettee.com',
				'Carlos114@sbcglobal.net',
				'johanna9102@yahoo.com',
				'rezaimoe@gmail.com',
				'segotamy@gmail.com',
				'segotammy@gmail.com',
				'tammysego@gmail.com',
				'info@techgraphx.com',
				'martintellezramirez1962@gmail.com',
				'mnoble@tdstn.com',
				'sales@signsin1day.com',
				't.teeters@hotmail.com',
				'sajid.eycon@gmail.com',
				'fayazbardai@yahoo.com',
				'herb@texasflagandbanner.com',
				'acctg@texbrite.com',
				'dauclair@gorhamflag.com',
				'hollandco-dallas@att.net',
				'myihprint@gmail.com',
				'fernando@signdepotatx.com',
				'raul@thesigndepot.com',
				'thesignshackinhemet@gmail.com',
				'ctmotorman@aol.com',
				'ebuydeals123@gmail.com',
				'tiresplus786@gmail.com',
				'bilal@twmwholesale.com',
				'ara3wm@yahoo.com.mx',
				'fonescasilvia519@gmail.com',
				'info@tonysprint.com',
				'TopperAuto@Comcast.net',
				'info@tosigns.com',
				'husky__house@msn.com',
				'info@tradebanner.com',
				'doug@tribuneprint.com',
				'gbarber75@comcast.net',
				'GBARBER75@COMCAST.NET',
				'gbarber75@comcast.net',
				'trueplanmarketing@gmail.com',
				'tuckerindustries@mchsi.com',
				'kate@twicetouchedtreasures.com',
				'sales@ultimateflags.com',
				'info@ultimateshoppingzone.com',
				'freddy741@verizon.net',
				'sheri@unitedflagandbanner.com',
				'sales@unitedflagandbanner.com',
				'lona@unitedsignsca.com',
				'lona@unitedsignsca.com',
				'southcoastprinting@yahoo.com',
				'usasupplies.signs@yahoo.com',
				' usmanawan@gmail.com',
				'ellahiusa@hotmail.com',
				'nationwideflags@gmail.com',
				'valleysignbilling@gmail.com',
				'pete@vargassigns.com',
				'varietyprinting@hotmail.com',
				'Payables@versa-tags.com',
				'mail@vesigns.com',
				'usvetsnetwork@4securemail.com',
				'fineprinter@aol.com',
				'vidal440@gmail.com',
				'amanda@viada.org',
				'cmacsignsanddesigns@yahoo.com',
				'visualizesigns@hotmail.com',
				'tedvic@sbcglobal.net',
				'pitts2002win2002@yahoo.com',
				'apinvoices@wsclou.com',
				'SMontgomery@welderssupplylou.com',
				'smontgomery@wsclou.com',
				'gamerworld@live.com',
				'patricknguyen59@hotmail.com',
				'patricknguyen59@hotmail.com',
				'uppalrama@gmail.com',
				'sales@wheelsauto.com',
				'jameswhipple0@comcast.net',
				'whitestoneorders@gmail.com',
				'wdprinting@bellsouth.net',
				'pete@windvisuals.com',
				'wolfautopromollc@comcast.net',
				'kathy@xgraphix.net',
				'george@xpeedprint.com',
				'simono63@gmail.com',
				'teeess19@gmail.com',
				'ssexton99@gmail.com',
				'tessie@zanewilliams.com',
				'zeeprinting@yahoo.com'
				]
	contact=frappe.get_all("Contact",filters={},fields=['*'])
	
	for doc in contact:
		try:
			if not doc.billing_email:
				frappe.db.set_value("Contact", doc.name, "billing_email", doc.email_id)
				frappe.db.commit()
			if not doc.tracking_email:
				frappe.db.set_value("Contact", doc.name, "tracking_email", doc.email_id)
				frappe.db.commit()
		except:
			print(doc.name)
	 