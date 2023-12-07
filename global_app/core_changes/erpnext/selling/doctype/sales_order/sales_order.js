// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

{% include 'erpnext/selling/sales_common.js' %}

frappe.ui.form.on("Sales Order", {
	setup: function (frm) {
		frm.custom_make_buttons = {
			'Delivery Note': 'Delivery',
			'Pick List': 'Pick List',
			'Sales Invoice': 'Invoice',
			'Material Request': 'Material Request',
			'Purchase Order': 'Purchase Order',
			'Project': 'Project',
			'Payment Entry': "Payment"
		}
		frm.add_fetch('customer', 'tax_id', 'tax_id');

		// formatter for material request item
		frm.set_indicator_formatter('item_code',
			function (doc) { return (doc.stock_qty <= doc.delivered_qty) ? "green" : "orange" })

		frm.set_query('company_address', function (doc) {
			if (!doc.company) {
				frappe.throw(__('Please set Company'));
			}

			return {
				query: 'frappe.contacts.doctype.address.address.address_query',
				filters: {
					link_doctype: 'Company',
					link_name: doc.company
				}
			};
		})
		//updated

		frm.set_query('customer_address', function (doc) {
			return {
				filters: {
					"address_type": "Billing",
					"link_name": doc.customer
				}
			};
		});
	},
	refresh: function (frm) {
		if (frm.doc.docstatus === 1 && frm.doc.status !== 'Closed'
			&& flt(frm.doc.per_delivered, 6) < 100 && flt(frm.doc.per_billed, 6) < 100) {
			frm.add_custom_button(__('Update Items'), () => {
				erpnext.utils.update_child_items({
					frm: frm,
					child_docname: "items",
					child_doctype: "Sales Order Detail",
					cannot_add_row: false,
				})
			});
		}
		//custom code
		$(".grid-download").css('display', 'none');
		$(".grid-upload").css('display', 'none');
		$("button[data-fieldname=add_bundle]").removeClass('btn btn-default btn-xs');
		$("button[data-fieldname=add_bundle]").addClass('btn btn-primary');
		if (frm.doc.do_not_use_billing__address == 1) {
			//alert('ok');
			frappe.model.set_value(frm.doc.doctype, frm.doc.name, "customer_address", null);
			frappe.model.set_value(frm.doc.doctype, frm.doc.name, "address_display", null);
			//cur_frm.refresh_field("customer_address");
		}
		console.log(frm.doc);
		//console.log(frm);
		//console.log("))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))");
		var shipping_service = frm.doc.shipping_service;
		console.log("in refresh " + frm.doc.contact_person);
		console.log(frm.doc);
		if (!shipping_service) {
			if (frm.doc.contact_person) {
				if (!frm.doc.ups_billing_address_for_third_party_shipping && !frm.doc.usps_shipment) {
					frappe.call(
						{
							method: "frappe.client.get",
							args: {
								doctype: "Contact",
								name: frm.doc.contact_person,
							},
							callback(response) {
								console.log(response.message);

								if (response.message.usps_shipping == 0) {
									if (response.message.usps_billing_address) {
										//ups_billing_address_for_third_party_shipping setting
										frm.fields_dict.usps_shipment.$wrapper.hide();
										frappe.model.set_value(frm.doc.doctype, frm.doc.name, "usps_shipment", 0);
										cur_frm.refresh_field("usps_shipment");
										frm.fields_dict.ups_billing_address_for_third_party_shipping.$wrapper.show();
										frm.fields_dict.ups_account_no.$wrapper.show();
										frappe.model.set_value(frm.doc.doctype, frm.doc.name, "ups_account_no", response.message.ups_account_no);
										cur_frm.refresh_field("ups_account_no");
										frappe.call(
											{
												method: "frappe.client.get",
												args: {
													doctype: "Address",
													name: response.message.usps_billing_address,
												},
												callback(address) {
													//console.log(address.message);
													var address = address.message;

													var address_line1 = (address.address_line1 != null) ? address.address_line1 : ". ";
													var address_line2 = (address.address_line1 != null) ? address.address_line2 : ". ";
													var city = (address.city) != null ? address.city : ". ";
													var country = (address.country != null) ? address.country : ". ";
													var state = (address.state != null) ? address.state : ". ";
													var pincode = (address.pincode != null) ? address.pincode : ". ";
													var add_str = "<div style='font-weight:inherit;'>" + address_line1 + "<br>" + address_line2 + "<br>" + city + ", " + state + ", " + pincode + "<br>" + country + "</div>";
													frappe.model.set_value(frm.doc.doctype, frm.doc.name, "ups_billing_address_for_third_party_shipping", add_str);
													cur_frm.refresh_field("ups_billing_address_for_third_party_shipping");


												}
											});
									}
									else {
										frm.fields_dict.ups_billing_address_for_third_party_shipping.$wrapper.hide();
										frm.fields_dict.ups_account_no.$wrapper.hide();
										frm.fields_dict.usps_shipment.$wrapper.show();
										frappe.model.set_value(frm.doc.doctype, frm.doc.name, "usps_shipment", 1);
										cur_frm.refresh_field("usps_shipment");

									}
								}
								else {
									frm.fields_dict.ups_billing_address_for_third_party_shipping.$wrapper.hide();
									frm.fields_dict.ups_account_no.$wrapper.hide();
									frm.fields_dict.usps_shipment.$wrapper.show();
									frappe.model.set_value(frm.doc.doctype, frm.doc.name, "usps_shipment", 1);
									cur_frm.refresh_field("usps_shipment");
								}
							}

						});
				}
			}
		}

		if (frm.doc.billing_validation != "done") {
			if (frm.doc.customer_address) {
				frappe.call(
					{
						method: "frappe.client.get",
						args: {
							doctype: "Address",
							name: frm.doc.customer_address,
						},
						callback(response) {
							console.log(response.message);
							if (response.message.add_validation == 'done') {
								frappe.model.set_value(frm.doc.doctype, frm.doc.name, "billing_address_validation", "<p style='color:green'>Address Validated</p>");
								cur_frm.refresh_field("billing_address_validation");
								frappe.model.set_value(frm.doc.doctype, frm.doc.name, "billing_validation", "done");
								cur_frm.refresh_field("billing_validation");
							}
						}
					});
			}
		}
		if (frm.doc.shipping_validation != "done") {
			if (frm.doc.shipping_address_name) {
				frappe.call(
					{
						method: "frappe.client.get",
						args: {
							doctype: "Address",
							name: frm.doc.shipping_address_name,
						},
						callback(response) {
							console.log(response.message);
							if (response.message.add_validation == 'done') {
								frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipping_address_validation", "<p style='color:green'>Address Validated</p>");
								cur_frm.refresh_field("shipping_address_validation");
								frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipping_validation", "done");
								cur_frm.refresh_field("shipping_validation");
							}
						}
					});
			}
		}
		if (frm.doc.__unsaved) {
			frm.add_custom_button(__('<b class="btn btn-primary">Get Previous Orders</b>'),
				function () {
					var d = new frappe.ui.Dialog({
						title: __("Previous Orders from a customer:"),
						'fields': [
							{ 'fieldname': 'customer', 'fieldtype': 'Link', 'options': "Customer", "label": "Customer<b style='color:red'> *</b>" },
							//{'fieldname': 'clbf1', 'fieldtype': 'Column Break'},
							//{'fieldname': 'filter_cust', 'fieldtype': 'Button',"label":"Apply"},
							//{'fieldname': 'secf1', 'fieldtype': 'Section Break'},
							{ 'fieldname': 'po_no', 'fieldtype': 'Data', "label": "Purchase Order#" },
							//{'fieldname': 'clbf2', 'fieldtype': 'Column Break'},
							{ 'fieldname': 'filter_po', 'fieldtype': 'Button', "label": "Apply" },
							//{'fieldname': 'secf2', 'fieldtype': 'Section Break'},
							{ 'fieldname': 'httt', 'fieldtype': 'HTML' },
						]
					});
					// d.fields_dict.filter_cust.onclick=function(){
					// 	if(!d.get_values().customer){
					// 		return true;
					// 	}
					// 	frappe.call(
					// 		{
					// 			method: "erpnext.selling.doctype.sales_order.sales_order.get_so_history",
					// 			args: {
					// 				customer: d.get_values().customer,
					// 				po_no:""
					// 			},
					// 			freeze: true,
					// 			freeze_message: "Fetching Orders...",
					// 			callback(response) {
					// 		// 		$(frm.fields_dict["order_from_history"].wrapper).html(response.message);
					// 		//    refresh_field("order_from_history");


					// 		d.fields_dict.httt.$wrapper.html(response.message)  


					// 				//
					// 			}
					// 		});

					// }
					d.fields_dict.filter_po.onclick = function () {
						var po_no = d.get_values().po_no ? d.get_values().po_no : "";

						if (!d.get_values().customer) {
							frappe.msgprint("Please select a customer")
							return true;
						}
						d.fields_dict.httt.$wrapper.html("Loading data please wait.....")
						frappe.call(
							{
								method: "erpnext.selling.doctype.sales_order.sales_order.get_so_history",
								args: {
									customer: d.get_values().customer,
									po_no: po_no
								},
								freeze: true,
								callback(response_in) {
									if (response_in.message) {
										d.fields_dict.httt.$wrapper.html(response_in.message)
									}
								}
							});
					}
					d.show()
				});

		}

	},
	onload: function (frm) {
		if (!frm.doc.transaction_date) {
			frm.set_value('transaction_date', frappe.datetime.get_today())
		}
		erpnext.queries.setup_queries(frm, "Warehouse", function () {
			return erpnext.queries.warehouse(frm.doc);
		});

		frm.set_query('project', function (doc, cdt, cdn) {
			return {
				query: "erpnext.controllers.queries.get_project_name",
				filters: {
					'customer': doc.customer
				}
			}
		});

		frm.set_query("blanket_order", "items", function () {
			return {
				filters: {
					"company": frm.doc.company,
					"docstatus": 1
				}
			}
		});

		erpnext.queries.setup_warehouse_query(frm);
	},

	delivery_date: function (frm) {
		$.each(frm.doc.items || [], function (i, d) {
			if (!d.delivery_date) d.delivery_date = frm.doc.delivery_date;
		});
		refresh_field("items");
	},
	third_party_shipping: function (frm) {
		if (cur_frm.doc.third_party_shipping) {
			if (cur_frm.doc.contact_person) {
				frappe.call({
					method: 'frappe.client.get',
					async: false,
					no_spinner: true,
					args: {
						doctype: "Contact",
						name: cur_frm.doc.contact_person
					},
					callback: function (contact) {
						console.log(contact.message)
						if (contact.message.third_party_shipping === "YES") {
							if (!(contact.message.ups_account_no && contact.message.usps_billing_address)) {
								msgprint("Missing UPS account and billing address", "ERROR")
								frappe.model.set_value(frm.doc.doctype, frm.doc.name, "third_party_shipping", 0);
								cur_frm.refresh_field('third_party_shipping');


							}
						}
						else {
							msgprint("Customer have no third party shipping right", "ERROR")
							frappe.model.set_value(frm.doc.doctype, frm.doc.name, "third_party_shipping", 0);
							cur_frm.refresh_field('third_party_shipping');


						}
					}
				});
			}
			else {
				msgprint("Insufficient data for third party shipping", "ERROR")
				frappe.model.set_value(frm.doc.doctype, frm.doc.name, "third_party_shipping", 0);
				cur_frm.refresh_field(third_party_shipping);


			}
		}

	},
	//add_bundle 


	shipping_service: function (frm) {
		var shipping_carrier = ""
		var shipping_service = frm.doc.shipping_service;
		if (shipping_service.search("USPS") != -1 || shipping_service.search("Priority Mail") != -1) {
			shipping_carrier = "USPS";
			frm.fields_dict.ups_billing_address_for_third_party_shipping.$wrapper.hide();
			frm.fields_dict.ups_account_no.$wrapper.hide();
			frm.fields_dict.usps_shipment.$wrapper.show();
			frappe.model.set_value(frm.doc.doctype, frm.doc.name, "usps_shipment", 1);
			cur_frm.refresh_field("usps_shipment");
		}
		else if (shipping_service.search("UPS") != -1) {
			shipping_carrier = "UPS";
			frm.fields_dict.usps_shipment.$wrapper.hide();
			frappe.model.set_value(frm.doc.doctype, frm.doc.name, "usps_shipment", 0);
			cur_frm.refresh_field("usps_shipment");
			frm.fields_dict.ups_billing_address_for_third_party_shipping.$wrapper.show();
			frm.fields_dict.ups_account_no.$wrapper.show();

		}
		else {
			shipping_carrier = "Other";
		}
		if (shipping_service == "Customer Supplied Label") {
			frm.fields_dict.shipment_details.df.read_only = 0;
			frm.fields_dict.shipment_cost.df.read_only = 0;
			frm.fields_dict.shipment_weight.df.read_only = 0;
			cur_frm.refresh_field("shipment_details");
			cur_frm.refresh_field("shipment_cost");
			cur_frm.refresh_field("shipment_weight");
			console.log(frm)
			frm.refresh()
		}
		//check for shipment cost
		console.log(frm.doc)
		if (frm.doc.payment_terms_template == "PBS") {
			console.log("fetching data")

			//get rates
			if (frm.doc.third_party_shipping) {
				return true;
			}
			if (['Customer Supplied Label', 'Local Pick Up'].indexOf(frm.doc.shipping_service) >= 0) {
				return true;
			}
			if (frm.doc.usps_shipment == 1) {
				pack_usps_items(frm)
			}
			else {
				pack_ups_items(frm)
			}
		}
	},
	do_not_use_billing__address: function (frm) {
		console.log('ok')
		frappe.model.set_value(frm.doc.doctype, frm.doc.name, "customer_address", null);
		cur_frm.refresh_field("customer_address");
		frappe.model.set_value(frm.doc.doctype, frm.doc.name, "address_display", null);
		cur_frm.refresh_field("customer_address");
	},
	validate: function (frm) {
		if (cur_frm.doc.third_party_shipping) {
			if (frm.doc.contact_person) {
				frappe.call({
					method: 'frappe.client.get',
					async: false,
					no_spinner: true,
					args: {
						doctype: "Contact",
						name: frm.doc.contact_person
					},
					callback: function (contact) {
						console.log(contact.message)
						if (contact.message.third_party_shipping === "YES") {
							if (!(contact.message.ups_account_no && contact.message.usps_billing_address)) {
								msgprint("Missing UPS account and billing address", "ERROR")
								frappe.model.set_value(frm.doc.doctype, frm.doc.name, "third_party_shipping", 0);
								cur_frm.refresh_field('third_party_shipping');


							}
						}
						else {
							msgprint("Customer have no third party shipping right", "ERROR")
							frappe.model.set_value(frm.doc.doctype, frm.doc.name, "third_party_shipping", 0);
							cur_frm.refresh_field('third_party_shipping');


						}
					}
				});
			}
			else {
				msgprint("Insufficient data for third party shipping", "ERROR")
				frappe.model.set_value(frm.doc.doctype, frm.doc.name, "third_party_shipping", 0);
				cur_frm.refresh_field(third_party_shipping);


			}
		}
		if (frm.doc.payment_terms_template == "PBS") {
			console.log("IN save")
			if (frm.doc.third_party_shipping) {
				return true;
			}
			if (['Customer Supplied Label', 'Local Pick Up'].indexOf(frm.doc.shipping_service) >= 0) {
				return true;
			}
			else if (frm.doc.shipment_cost_pbs < 1) {

				return new Promise(function (resolve, reject) {
					frappe.confirm(
						"<span style='color:red'>Please note that payment must be done before creating delivery note for this order, system can not find shipment cost are you still want to proceed ?</span>",
						function () {
							var negative = 'frappe.validated = false';
							resolve(negative);
						},
						function () {
							reject();
						}
					)
				})
			}
			//frappe.validated = false;
		}
	}
});

frappe.ui.form.on("Sales Order Item", {
	item_code: function (frm, cdt, cdn) {
		// 	var row = locals[cdt][cdn];
		// 	if (frm.doc.delivery_date) {
		// 		row.delivery_date = frm.doc.delivery_date;
		// 		refresh_field("delivery_date", cdn, "items");
		// 	} else {
		// 		frm.script_manager.copy_from_first_row("items", row, ["delivery_date"]);
		// 	}
		// },
		// delivery_date: function(frm, cdt, cdn) {
		// 	if(!frm.doc.delivery_date) {
		// 		erpnext.utils.copy_value_in_all_rows(frm.doc, cdt, cdn, "items", "delivery_date");
		// 	}
	}
});

erpnext.selling.SalesOrderController = erpnext.selling.SellingController.extend({
	onload: function (doc, dt, dn) {
		this._super();
	},

	refresh: function (doc, dt, dn) {
		var me = this;
		this._super();
		let allow_delivery = false;

		if (doc.docstatus == 1) {
			this.frm.add_custom_button(__('Pick List'), () => this.create_pick_list(), __('Create'));

			if (this.frm.has_perm("submit")) {
				if (doc.status === 'On Hold') {
					// un-hold
					this.frm.add_custom_button(__('Resume'), function () {
						me.frm.cscript.update_status('Resume', 'Draft')
					}, __("Status"));

					if (flt(doc.per_delivered, 6) < 100 || flt(doc.per_billed) < 100) {
						// close
						this.frm.add_custom_button(__('Close'), () => this.close_sales_order(), __("Status"))
					}
				}
				else if (doc.status === 'Closed') {
					// un-close
					this.frm.add_custom_button(__('Re-open'), function () {
						me.frm.cscript.update_status('Re-open', 'Draft	')
					}, __("Status"));
				}
			}
			if (doc.status !== 'Closed') {
				if (doc.status !== 'On Hold') {

					allow_delivery = this.frm.doc.items.some(item => item.delivered_by_supplier === 0 && item.qty > flt(item.delivered_qty))

					if (this.frm.has_perm("submit")) {
						if (flt(doc.per_delivered, 6) < 100 || flt(doc.per_billed) < 100) {
							// hold
							this.frm.add_custom_button(__('Hold'), () => this.hold_sales_order(), __("Status"))
							// close
							this.frm.add_custom_button(__('Close'), () => this.close_sales_order(), __("Status"))
						}
					}

					// delivery note
					if (flt(doc.per_delivered, 6) < 100 && ["Sales", "Shopping Cart"].indexOf(doc.order_type) !== -1 && allow_delivery) {
						this.frm.add_custom_button(__('Delivery'), () => {
							var me = this
							if (cur_frm.doc.payment_terms_template == "PBS") {
								console.log("IN save")
								if (cur_frm.doc.third_party_shipping) {
									me.make_delivery_note_based_on_delivery_date()
								}
								if (['Customer Supplied Label', 'Local Pick Up'].indexOf(cur_frm.doc.shipping_service) >= 0) {
									me.make_delivery_note_based_on_delivery_date()
								}
								else if (cur_frm.doc.shipment_cost_pbs > 1) {
									cur_frm.call({
										method: "check_for_payment_PBS",
										args: {
											"po_no": cur_frm.doc.po_no,
											"customer": cur_frm.doc.customer
										},
										freeze: true,
										async: false,
										callback: function (r) {
											if (!r.message) {
												var dialog_main = new frappe.ui.Dialog({
													title: __("Warning Payment Before Shipment"),
													fields: [{ fieldtype: "HTML", fieldname: "msg" }]
												});
												dialog_main.set_primary_action(__("YES"), function () {
													me.make_delivery_note_based_on_delivery_date()
												});
												var wrapper = dialog_main.fields_dict.msg.$wrapper;
												wrapper.html("Payment must be processed before delivery note, do you still want to proceed?");
												dialog_main.show()
											}
											else if (r.message) {
												me.make_delivery_note_based_on_delivery_date()
											}
										}

									});

								}
								else {
									me.make_delivery_note_based_on_delivery_date()
								}
								//frappe.validated = false;
							}
							else {
								this.make_delivery_note_based_on_delivery_date()
							}
						});
						this.frm.add_custom_button(__('Work Order'), () => this.make_work_order(), __('Create'));
					}

					// sales invoice
					if (flt(doc.per_billed, 6) < 100) {
						this.frm.add_custom_button(__('Invoice'), () => me.make_sales_invoice(), __('Create'));
					}

					// material request
					if (!doc.order_type || ["Sales", "Shopping Cart"].indexOf(doc.order_type) !== -1
						&& flt(doc.per_delivered, 6) < 100) {
						this.frm.add_custom_button(__('Material Request'), () => this.make_material_request(), __('Create'));
						this.frm.add_custom_button(__('Request for Raw Materials'), () => this.make_raw_material_request(), __('Create'));
					}

					// make purchase order
					this.frm.add_custom_button(__('Purchase Order'), () => this.make_purchase_order(), __('Create'));

					// maintenance
					if (flt(doc.per_delivered, 2) < 100 &&
						["Sales", "Shopping Cart"].indexOf(doc.order_type) === -1) {
						this.frm.add_custom_button(__('Maintenance Visit'), () => this.make_maintenance_visit(), __('Create'));
						this.frm.add_custom_button(__('Maintenance Schedule'), () => this.make_maintenance_schedule(), __('Create'));
					}

					// project
					if (flt(doc.per_delivered, 2) < 100 && ["Sales", "Shopping Cart"].indexOf(doc.order_type) !== -1 && allow_delivery) {
						this.frm.add_custom_button(__('Project'), () => this.make_project(), __('Create'));
					}

					if (!doc.auto_repeat) {
						this.frm.add_custom_button(__('Subscription'), function () {
							erpnext.utils.make_subscription(doc.doctype, doc.name)
						}, __('Create'))
					}

					// if (doc.docstatus === 1 && !doc.inter_company_order_reference) {
					// 	let me = this;
					// 	frappe.model.with_doc("Customer", me.frm.doc.customer, () => {
					// 		let customer = frappe.model.get_doc("Customer", me.frm.doc.customer);
					// 		let internal = customer.is_internal_customer;
					// 		let disabled = customer.disabled;
					// 		if (internal === 1 && disabled === 0) {
					// 			me.frm.add_custom_button("Inter Company Order", function() {
					// 				me.make_inter_company_order();
					// 			}, __('Create'));
					// 		}
					// 	});
					// }
				}
				// payment request
				if (flt(doc.per_billed) == 0) {
					this.frm.add_custom_button(__('Payment Request'), () => this.make_payment_request(), __('Create'));
					this.frm.add_custom_button(__('Payment'), () => this.make_payment_entry(), __('Create'));
				}
				this.frm.page.set_inner_btn_group_as_primary(__('Create'));
			}
		}

		if (this.frm.doc.docstatus === 0) {
			this.frm.add_custom_button(__('Quotation'),
				function () {
					erpnext.utils.map_current_doc({
						method: "erpnext.selling.doctype.quotation.quotation.make_sales_order",
						source_doctype: "Quotation",
						target: me.frm,
						setters: [
							{
								label: "Customer",
								fieldname: "party_name",
								fieldtype: "Link",
								options: "Customer",
								default: me.frm.doc.customer || undefined
							}
						],
						get_query_filters: {
							company: me.frm.doc.company,
							docstatus: 1,
							status: ["!=", "Lost"]
						}
					})
				}, __("Get items from"));
		}

		this.order_type(doc);
	},

	create_pick_list() {
		frappe.model.open_mapped_doc({
			method: "erpnext.selling.doctype.sales_order.sales_order.create_pick_list",
			frm: this.frm
		})
	},

	make_work_order() {
		var me = this;
		this.frm.call({
			doc: this.frm.doc,
			method: 'get_work_order_items',
			callback: function (r) {
				if (!r.message) {
					frappe.msgprint({
						title: __('Work Order not created'),
						message: __('No Items with Bill of Materials to Manufacture'),
						indicator: 'orange'
					});
					return;
				}
				else if (!r.message) {
					frappe.msgprint({
						title: __('Work Order not created'),
						message: __('Work Order already created for all items with BOM'),
						indicator: 'orange'
					});
					return;
				} else {
					const fields = [{
						label: 'Items',
						fieldtype: 'Table',
						fieldname: 'items',
						description: __('Select BOM and Qty for Production'),
						fields: [{
							fieldtype: 'Read Only',
							fieldname: 'item_code',
							label: __('Item Code'),
							in_list_view: 1
						}, {
							fieldtype: 'Link',
							fieldname: 'bom',
							options: 'BOM',
							reqd: 1,
							label: __('Select BOM'),
							in_list_view: 1,
							get_query: function (doc) {
								return { filters: { item: doc.item_code } };
							}
						}, {
							fieldtype: 'Float',
							fieldname: 'pending_qty',
							reqd: 1,
							label: __('Qty'),
							in_list_view: 1
						}, {
							fieldtype: 'Data',
							fieldname: 'sales_order_item',
							reqd: 1,
							label: __('Sales Order Item'),
							hidden: 1
						}],
						data: r.message,
						get_data: () => {
							return r.message
						}
					}]
					var d = new frappe.ui.Dialog({
						title: __('Select Items to Manufacture'),
						fields: fields,
						primary_action: function () {
							var data = d.get_values();
							me.frm.call({
								method: 'make_work_orders',
								args: {
									items: data,
									company: me.frm.doc.company,
									sales_order: me.frm.docname,
									project: me.frm.project
								},
								freeze: true,
								callback: function (r) {
									if (r.message) {
										frappe.msgprint({
											message: __('Work Orders Created: {0}',
												[r.message.map(function (d) {
													return repl('<a href="#Form/Work Order/%(name)s">%(name)s</a>', { name: d })
												}).join(', ')]),
											indicator: 'green'
										})
									}
									d.hide();
								}
							});
						},
						primary_action_label: __('Create')
					});
					d.show();
				}
			}
		});
	},

	order_type: function () {
		//this.frm.fields_dict.items.grid.toggle_reqd("delivery_date", this.frm.doc.order_type == "Sales");
	},

	tc_name: function () {
		this.get_terms();
	},

	make_material_request: function () {
		frappe.model.open_mapped_doc({
			method: "erpnext.selling.doctype.sales_order.sales_order.make_material_request",
			frm: this.frm
		})
	},

	make_raw_material_request: function () {
		var me = this;
		this.frm.call({
			doc: this.frm.doc,
			method: 'get_work_order_items',
			args: {
				for_raw_material_request: 1
			},
			callback: function (r) {
				if (!r.message) {
					frappe.msgprint({
						message: __('No Items with Bill of Materials.'),
						indicator: 'orange'
					});
					return;
				}
				else {
					me.make_raw_material_request_dialog(r);
				}
			}
		});
	},

	make_raw_material_request_dialog: function (r) {
		var fields = [
			{
				fieldtype: 'Check', fieldname: 'include_exploded_items',
				label: __('Include Exploded Items')
			},
			{
				fieldtype: 'Check', fieldname: 'ignore_existing_ordered_qty',
				label: __('Ignore Existing Ordered Qty')
			},
			{
				fieldtype: 'Table', fieldname: 'items',
				description: __('Select BOM, Qty and For Warehouse'),
				fields: [
					{
						fieldtype: 'Read Only', fieldname: 'item_code',
						label: __('Item Code'), in_list_view: 1
					},
					{
						fieldtype: 'Link', fieldname: 'warehouse', options: 'Warehouse',
						label: __('For Warehouse'), in_list_view: 1
					},
					{
						fieldtype: 'Link', fieldname: 'bom', options: 'BOM', reqd: 1,
						label: __('BOM'), in_list_view: 1, get_query: function (doc) {
							return { filters: { item: doc.item_code } };
						}
					},
					{
						fieldtype: 'Float', fieldname: 'required_qty', reqd: 1,
						label: __('Qty'), in_list_view: 1
					},
				],
				data: r.message,
				get_data: function () {
					return r.message
				}
			}
		]
		var d = new frappe.ui.Dialog({
			title: __("Items for Raw Material Request"),
			fields: fields,
			primary_action: function () {
				var data = d.get_values();
				me.frm.call({
					method: 'erpnext.selling.doctype.sales_order.sales_order.make_raw_material_request',
					args: {
						items: data,
						company: me.frm.doc.company,
						sales_order: me.frm.docname,
						project: me.frm.project
					},
					freeze: true,
					callback: function (r) {
						if (r.message) {
							frappe.msgprint(__('Material Request {0} submitted.',
								['<a href="#Form/Material Request/' + r.message.name + '">' + r.message.name + '</a>']));
						}
						d.hide();
						me.frm.reload_doc();
					}
				});
			},
			primary_action_label: __('Create')
		});
		d.show();
	},

	make_delivery_note_based_on_delivery_date: function () {
		var me = this;

		var delivery_dates = [];
		$.each(this.frm.doc.items || [], function (i, d) {
			if (!delivery_dates.includes(d.delivery_date)) {
				delivery_dates.push(d.delivery_date);
			}
		});

		var item_grid = this.frm.fields_dict["items"].grid;
		if (!item_grid.get_selected().length && delivery_dates.length > 1) {
			var dialog = new frappe.ui.Dialog({
				title: __("Select Items based on Delivery Date"),
				fields: [{ fieldtype: "HTML", fieldname: "dates_html" }]
			});

			var html = $(`
				<div style="border: 1px solid #d1d8dd">
					<div class="list-item list-item--head">
						<div class="list-item__content list-item__content--flex-2">
							${__('Delivery Date')}
						</div>
					</div>
					${delivery_dates.map(date => `
						<div class="list-item">
							<div class="list-item__content list-item__content--flex-2">
								<label>
								<input type="checkbox" data-date="${date}" checked="checked"/>
								${frappe.datetime.str_to_user(date)}
								</label>
							</div>
						</div>
					`).join("")}
				</div>
			`);

			var wrapper = dialog.fields_dict.dates_html.$wrapper;
			wrapper.html(html);

			dialog.set_primary_action(__("Select"), function () {
				var dates = wrapper.find('input[type=checkbox]:checked')
					.map((i, el) => $(el).attr('data-date')).toArray();

				if (!dates) return;

				$.each(dates, function (i, d) {
					$.each(item_grid.grid_rows || [], function (j, row) {
						if (row.doc.delivery_date == d) {
							row.doc.__checked = 1;
						}
					});
				})
				me.make_delivery_note();
				dialog.hide();
			});
			dialog.show();
		} else {
			this.make_delivery_note();
		}
	},

	make_delivery_note: function () {
		frappe.model.open_mapped_doc({
			method: "erpnext.selling.doctype.sales_order.sales_order.make_delivery_note",
			frm: me.frm
		})
	},

	make_sales_invoice: function () {
		frappe.model.open_mapped_doc({
			method: "erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice",
			frm: this.frm
		})
	},

	make_maintenance_schedule: function () {
		frappe.model.open_mapped_doc({
			method: "erpnext.selling.doctype.sales_order.sales_order.make_maintenance_schedule",
			frm: this.frm
		})
	},

	make_project: function () {
		frappe.model.open_mapped_doc({
			method: "erpnext.selling.doctype.sales_order.sales_order.make_project",
			frm: this.frm
		})
	},

	make_inter_company_order: function () {
		frappe.model.open_mapped_doc({
			method: "erpnext.selling.doctype.sales_order.sales_order.make_inter_company_purchase_order",
			frm: this.frm
		});
	},

	make_maintenance_visit: function () {
		frappe.model.open_mapped_doc({
			method: "erpnext.selling.doctype.sales_order.sales_order.make_maintenance_visit",
			frm: this.frm
		})
	},

	make_purchase_order: function () {
		var me = this;
		var dialog = new frappe.ui.Dialog({
			title: __("For Supplier"),
			fields: [
				{
					"fieldtype": "Link", "label": __("Supplier"), "fieldname": "supplier", "options": "Supplier",
					"description": __("Leave the field empty to make purchase orders for all suppliers"),
					"get_query": function () {
						return {
							query: "erpnext.selling.doctype.sales_order.sales_order.get_supplier",
							filters: { 'parent': me.frm.doc.name }
						}
					}
				},
				{
					fieldname: 'items_for_po', fieldtype: 'Table', label: 'Select Items',
					fields: [
						{
							fieldtype: 'Data',
							fieldname: 'item_code',
							label: __('Item'),
							read_only: 1,
							in_list_view: 1
						},
						{
							fieldtype: 'Data',
							fieldname: 'item_name',
							label: __('Item name'),
							read_only: 1,
							in_list_view: 1
						},
						{
							fieldtype: 'Float',
							fieldname: 'qty',
							label: __('Quantity'),
							read_only: 1,
							in_list_view: 1
						},
						{
							fieldtype: 'Link',
							read_only: 1,
							fieldname: 'uom',
							label: __('UOM'),
							in_list_view: 1
						}
					],
					data: cur_frm.doc.items,
					get_data: function () {
						return cur_frm.doc.items
					}
				},

				{ "fieldtype": "Button", "label": __('Create Purchase Order'), "fieldname": "make_purchase_order", "cssClass": "btn-primary" },
			]
		});

		dialog.fields_dict.make_purchase_order.$input.click(function () {
			var args = dialog.get_values();
			let selected_items = dialog.fields_dict.items_for_po.grid.get_selected_children()
			if (selected_items.length == 0) {
				frappe.throw({ message: 'Please select Item form Table', title: __('Message'), indicator: 'blue' })
			}
			let selected_items_list = []
			for (let i in selected_items) {
				selected_items_list.push(selected_items[i].item_code)
			}
			dialog.hide();
			return frappe.call({
				type: "GET",
				method: "erpnext.selling.doctype.sales_order.sales_order.make_purchase_order",
				args: {
					"source_name": me.frm.doc.name,
					"for_supplier": args.supplier,
					"selected_items": selected_items_list
				},
				freeze: true,
				callback: function (r) {
					if (!r.exc) {
						// var args = dialog.get_values();
						if (args.supplier) {
							var doc = frappe.model.sync(r.message);
							frappe.set_route("Form", r.message.doctype, r.message.name);
						}
						else {
							frappe.route_options = {
								"sales_order": me.frm.doc.name
							}
							frappe.set_route("List", "Purchase Order");
						}
					}
				}
			})
		});
		dialog.get_field("items_for_po").grid.only_sortable()
		dialog.get_field("items_for_po").refresh()
		dialog.show();
	},
	hold_sales_order: function () {
		var me = this;
		var d = new frappe.ui.Dialog({
			title: __('Reason for Hold'),
			fields: [
				{
					"fieldname": "reason_for_hold",
					"fieldtype": "Text",
					"reqd": 1,
				}
			],
			primary_action: function () {
				var data = d.get_values();
				frappe.call({
					method: "frappe.desk.form.utils.add_comment",
					args: {
						reference_doctype: me.frm.doctype,
						reference_name: me.frm.docname,
						content: __('Reason for hold: ') + data.reason_for_hold,
						comment_email: frappe.session.user
					},
					callback: function (r) {
						if (!r.exc) {
							me.update_status('Hold', 'On Hold')
							d.hide();
						}
					}
				});
			}
		});
		d.show();
	},
	close_sales_order: function () {
		this.frm.cscript.update_status("Close", "Closed")
	},
	update_status: function (label, status) {
		var doc = this.frm.doc;
		var me = this;
		frappe.ui.form.is_saving = true;
		frappe.call({
			method: "erpnext.selling.doctype.sales_order.sales_order.update_status",
			args: { status: status, name: doc.name },
			callback: function (r) {
				me.frm.reload_doc();
			},
			always: function () {
				frappe.ui.form.is_saving = false;
			}
		});
	}
});
$.extend(cur_frm.cscript, new erpnext.selling.SalesOrderController({ frm: cur_frm }));
frappe.ui.form.on("Sales Order Item", {
	item_code: function (frm, cdt, cdn) {

		var row = locals[cdt][cdn];
		frappe.call(
			{
				method: "frappe.client.get",
				args: {
					doctype: "Item",
					name: row.item_code,
				},
				callback(dl) {
					console.log(dl.message);
					if (dl.message.discontinued == 1) {
						frappe.msgprint("This item is discontinued please select alternative.", "Message")
					}
					frappe.model.set_value(row.doctype, row.name, "thumbnail", "<img src=" + dl.message.image + " style='width:40px;height:auto;margin-top: -9%;'></img>");
					cur_frm.refresh_field("thumbnail");

				}
			});

		// frappe.call(  
		// 	{
		// 		method: "erpnext.selling.doctype.sales_order.sales_order.get_stock_balance",
		// 		args: {
		// 			item_code: row.item_code,
		// 		},
		// 		callback(dl) {
		// 			console.log(dl.message);
		// 			if(dl.message==0){
		// 				frappe.msgprint("Item out of stock")
		// 			}
		// 		}
		// 	});



	}
})


