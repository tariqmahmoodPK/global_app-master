// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

frappe.ui.form.on("Customer", {
	setup: function(frm) {

		frm.make_methods = {
			'Quotation': () => erpnext.utils.create_new_doc('Quotation', {
				'quotation_to': frm.doc.doctype,
				'party_name': frm.doc.name
			}),
			'Opportunity': () => erpnext.utils.create_new_doc('Opportunity', {
				'opportunity_from': frm.doc.doctype,
				'party_name': frm.doc.name
			})
		}

		frm.add_fetch('lead_name', 'company_name', 'customer_name');
		frm.add_fetch('default_sales_partner','commission_rate','default_commission_rate');
		frm.set_query('customer_group', {'is_group': 0});
		frm.set_query('default_price_list', { 'selling': 1});
		frm.set_query('account', 'accounts', function(doc, cdt, cdn) {
			var d  = locals[cdt][cdn];
			var filters = {
				'account_type': 'Receivable',
				'company': d.company,
				"is_group": 0
			};

			if(doc.party_account_currency) {
				$.extend(filters, {"account_currency": doc.party_account_currency});
			}
			return {
				filters: filters
			}
		});

		if (frm.doc.__islocal == 1) {
			frm.set_value("represents_company", "");
		}

		frm.set_query('customer_primary_contact', function(doc) {
			return {
				query: "erpnext.selling.doctype.customer.customer.get_customer_primary_contact",
				filters: {
					'customer': doc.name
				}
			}
		})
		frm.set_query('customer_primary_address', function(doc) {
			return {
				query: "erpnext.selling.doctype.customer.customer.get_customer_primary_address",
				filters: {
					'customer': doc.name
				}
			}
		})
	},
	customer_primary_address: function(frm){
		if(frm.doc.customer_primary_address){
			frappe.call({
				method: 'frappe.contacts.doctype.address.address.get_address_display',
				args: {
					"address_dict": frm.doc.customer_primary_address
				},
				callback: function(r) {
					frm.set_value("primary_address", r.message);
				}
			});
		}
		if(!frm.doc.customer_primary_address){
			frm.set_value("primary_address", "");
		}
	},

	is_internal_customer: function(frm) {
		if (frm.doc.is_internal_customer == 1) {
			frm.toggle_reqd("represents_company", true);
		}
		else {
			frm.toggle_reqd("represents_company", false);
		}
	},

	customer_primary_contact: function(frm){
		if(!frm.doc.customer_primary_contact){
			frm.set_value("mobile_no", "");
			frm.set_value("email_id", "");
		}
	},

	loyalty_program: function(frm) {
		if(frm.doc.loyalty_program) {
			frm.set_value('loyalty_program_tier', null);
		}
	},

	refresh: function(frm) {
		if(frappe.defaults.get_default("cust_master_name")!="Naming Series") {
			frm.toggle_display("naming_series", false);
		} else {
			erpnext.toggle_naming_series();
		}

		frappe.dynamic_link = {doc: frm.doc, fieldname: 'name', doctype: 'Customer'}
		frm.toggle_display(['address_html','contact_html','primary_address_and_contact_detail'], !frm.doc.__islocal);

		if(!frm.doc.__islocal) {
			frappe.contacts.render_address_and_contact(frm);

			// custom buttons
			frm.add_custom_button(__('Accounting Ledger'), function() {
				frappe.set_route('query-report', 'General Ledger',
					{party_type:'Customer', party:frm.doc.name});
			});

			frm.add_custom_button(__('Accounts Receivable'), function() {
				frappe.set_route('query-report', 'Accounts Receivable', {customer:frm.doc.name});
			});

			frm.add_custom_button(__('Pricing Rule'), function () {
				erpnext.utils.make_pricing_rule(frm.doc.doctype, frm.doc.name);
			}, __('Create'));

			// indicator
			erpnext.utils.set_party_dashboard_indicators(frm);

		} else {
			frappe.contacts.clear_address_and_contact(frm);
		}

		var grid = cur_frm.get_field("sales_team").grid;
		grid.set_column_disp("allocated_amount", false);
		grid.set_column_disp("incentives", false);
	},
	validate: function(frm) {
		if(frm.doc.lead_name) frappe.model.clear_doc("Lead", frm.doc.lead_name);
		//for autherize net payment
		frappe.call({
			method: "authorizenet.authorizenet.doctype.authorizenet_users.authorizenet_users.test_user",
			freeze: 1,
			freeze_message: "Creating Authorize User. Please Wait...",
			args:{"customer_detail":frm.doc},
		}).done(function(data, textStatus, xhr) {
			if(typeof data === "string") data = JSON.parse(data);
			var status = xhr.statusCode().status;
			var result = data;
			if ( result.message.status === "Completed" ) {
				if(result.message.customer_id)	{

cur_frm.set_value("customer_id",result.message.customer_id);
				}
				if(result.message.payment_id!=="0")	{
					cur_frm.set_value("payment_id",result.message.payment_id);
				}
				if(result.message.shipping_id!=="0")	{
					cur_frm.set_value("shipping_id",result.message.shipping_id);
				}
			} else {
				var errors = [];
				if ( result.message.error!== Array ) {
					errors.push(result.message.error_msg);
				}else {errors = result.message.error_msg;}
				frappe.msgprint(errors.join("\n"));
			}                
		})//end done fucnion
		.fail(function(xhr, textStatus) {
			if(typeof data === "string") data = JSON.parse(data);
			var status = xhr.statusCode().status;
			var errors = [];
			var _server_messages = null;
			if (xhr.responseJSON && xhr.responseJSON._server_messages) {
				try {
					_server_messages = JSON.parse(xhr.responseJSON._server_messages);
				} catch(ex) {
					errors.push(ex)
					_server_messages = [xhr.responseJSON._server_messages];
				}
			}
			var errors = [];
			if ( _server_messages && _server_messages.constructor == Array ) {
				try {
					for(var i = 0; i < _server_messages.length; i++) {
						var msg;
						try {
							msg = JSON.parse(_server_messages[i]);
							if ( msg.message ) {
								msg = msg.message;
							}
						} catch(ex) {
							msg = ex
						}
						errors.push("Server Error: " + msg);
					}
				} catch(ex) {
					errors.push(_server_messages);
					errors.push(ex);
				}
			}else if ( _server_messages && _server_messages.exc ) {
				errors.push(_server_messages.exc);
			}
			frappe.msgprint(errors.join("\n"));	
		});  

	},
});