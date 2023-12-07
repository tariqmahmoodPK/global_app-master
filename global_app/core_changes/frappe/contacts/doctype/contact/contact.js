// Copyright (c) 2016, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on("Contact", {
	onload(frm) {
		frm.email_field = "email_id";
	},
	refresh: function(frm) {
		if(frm.doc.__islocal) {
			const last_doc = frappe.contacts.get_last_doc(frm);
			if(frappe.dynamic_link && frappe.dynamic_link.doc
					&& frappe.dynamic_link.doc.name == last_doc.docname) {
				frm.set_value('links', '');
				frm.add_child('links', {
					link_doctype: frappe.dynamic_link.doctype,
					link_name: frappe.dynamic_link.doc[frappe.dynamic_link.fieldname]
				});
			}
		}

		if(!frm.doc.user && !frm.is_new() && frm.perm[0].write) {
			frm.add_custom_button(__("Invite as User"), function() {
				return frappe.call({
					method: "frappe.contacts.doctype.contact.contact.invite_user",
					args: {
						contact: frm.doc.name
					},
					callback: function(r) {
						frm.set_value("user", r.message);
					}
				});
			});
		}
		frm.set_query('link_doctype', "links", function() {
			return {
				query: "frappe.contacts.address_and_contact.filter_dynamic_link_doctypes",
				filters: {
					fieldtype: "HTML",
					fieldname: "contact_html",
				}
			}
		});
		frm.refresh_field("links");

		if (frm.doc.links.length > 0) {
			frappe.call({
				method: "frappe.contacts.doctype.contact.contact.address_query",
				args: {links: frm.doc.links},
				callback: function(r) {
					if (r && r.message) {
						frm.set_query("address", function () {
							return {
								filters: {
									name: ["in", r.message],
								}
							}
						});
					}
				}
			});
		}
	},
	validate: function(frm) {
		// clear linked customer / supplier / sales partner on saving...
		if(frm.doc.links) {
			frm.doc.links.forEach(function(d) {
				frappe.model.remove_from_locals(d.link_doctype, d.link_name);
			});
		}
		//custom code
		if (frm.doc.third_party_shipping == "YES"){
			if(!(frm.doc.ups_account_no && frm.doc.usps_billing_address)){
               frappe.throw("Must enter UPS account and billing address")
			}
		}
	},

	after_save: function(frm) {
		frappe.run_serially([
			() => frappe.timeout(1),
			() => {
				const last_doc = frappe.contacts.get_last_doc(frm);
				if(frappe.dynamic_link && frappe.dynamic_link.doc
					&& frappe.dynamic_link.doc.name == last_doc.docname){
					frappe.set_route('Form', last_doc.doctype, last_doc.docname);
				}
			}
		]);
	},
	sync_with_google_contacts: function(frm) {
		if (frm.doc.sync_with_google_contacts) {
			frappe.db.get_value("Google Contacts", {"email_id": frappe.session.user}, "name", (r) => {
				if (r && r.name) {
					frm.set_value("google_contacts", r.name);
				}
			})
		}
	},
	third_party_shipping:function(frm){
		if(frm.doc.third_party_shipping =="YES"){
			frappe.model.set_value(frm.doc.doctype, frm.doc.name, "usps_shipping", 0);
			cur_frm.refresh_field("usps_shipping");
		}
		else{
			frappe.model.set_value(frm.doc.doctype, frm.doc.name, "usps_shipping", 1);
			cur_frm.refresh_field("usps_shipping");
		}
	}
});

frappe.ui.form.on("Dynamic Link", {
	link_name:function(frm, cdt, cdn){
		var child = locals[cdt][cdn];
		if(child.link_name) {
			frappe.model.with_doctype(child.link_doctype, function () {
				var title_field = frappe.get_meta(child.link_doctype).title_field || "name"
				frappe.model.get_value(child.link_doctype, child.link_name, title_field, function (r) {
					frappe.model.set_value(cdt, cdn, "link_title", r[title_field])
				})
			})
		}
	}
})
