// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

// js inside blog page

// shopping cart
function LeftPadWithZeros(number, length) {
	var str = '' + number;
	while (str.length < length) {
		str = '0' + str;
	}

	return str;
}

frappe.provide("erpnext.shopping_cart");
var shopping_cart = erpnext.shopping_cart;

$.extend(shopping_cart, {
	show_error: function (title, text) {
		$("#cart-container").html('<div class="msg-box"><h4>' +
			title + '</h4><p class="text-muted">' + text + '</p></div>');
	},

	bind_events: function () {
		shopping_cart.bind_address_select();
		shopping_cart.bind_place_order();
		shopping_cart.bind_request_quotation();
		shopping_cart.bind_change_qty();
		shopping_cart.bind_change_notes();
		shopping_cart.bind_dropdown_cart_buttons();
		shopping_cart.bind_coupon_code();
		shopping_cart.bind_calculate_cost();
	},

	bind_address_select: function () {
		$(".cart-addresses").on('click', '.address-card', function (e) {
			const $card = $(e.currentTarget);
			const address_type = $card.closest('[data-address-type]').attr('data-address-type');
			const address_name = $card.closest('[data-address-name]').attr('data-address-name');
			return frappe.call({
				type: "POST",
				method: "erpnext.shopping_cart.cart.update_cart_address",
				freeze: true,
				args: {
					address_type,
					address_name
				},
				callback: function (r) {
					if (!r.exc) {
						$(".cart-tax-items").html(r.message.taxes);
					}
				}
			});
		});
	},

	bind_place_order: function () {
		$(".btn-place-order").on("click", function () {
			shopping_cart.place_order(this);
		});
	},
	bind_calculate_cost: function () {
		$(".btn-calculate-cost").on("click", function () {
			const inputCost = $("#estimate-shipment")
			inputCost.css("color", "red")
			inputCost.val("Please wait!")

			const addressName = $($(".card-body").children("h5")).text()
			const shipping_service = $('#shipping_service').val()

			const isUPS = shipping_service.includes("UPS")
			const shipping_carrier = isUPS ? "UPS" : "USPS"
			const split_shipping_service = shipping_service.split("-")
			const serviceCode = isUPS ? ups_service_code(split_shipping_service[1]): "03" ;
			get_cost(addressName, shipping_service, shipping_carrier,serviceCode);
		});
	},

	bind_request_quotation: function () {
		$('.btn-request-for-quotation').on('click', function () {
			shopping_cart.request_quotation(this);
		});
	},

	bind_change_qty: function () {
		// bind update button
		$(".cart-items").on("change", ".cart-qty", function () {
			var item_code = $(this).attr("data-item-code");
			var newVal = $(this).val();
			shopping_cart.shopping_cart_update({ item_code, qty: newVal });
		});

		$(".cart-items").on('click', '.number-spinner button', function () {
			var btn = $(this),
				input = btn.closest('.number-spinner').find('input'),
				oldValue = input.val().trim(),
				newVal = 0;

			if (btn.attr('data-dir') == 'up') {
				newVal = parseInt(oldValue) + 1;
			} else {
				if (oldValue > 1) {
					newVal = parseInt(oldValue) - 1;
				}
			}
			input.val(newVal);
			var item_code = input.attr("data-item-code");
			shopping_cart.shopping_cart_update({ item_code, qty: newVal });
		});
	},

	bind_change_notes: function () {
		$('.cart-items').on('change', 'textarea', function () {
			const $textarea = $(this);
			const item_code = $textarea.attr('data-item-code');
			const qty = $textarea.closest('tr').find('.cart-qty').val();
			const notes = $textarea.val();
			shopping_cart.shopping_cart_update({
				item_code,
				qty,
				additional_notes: notes
			});
		});
	},

	render_tax_row: function ($cart_taxes, doc, shipping_rules) {
		var shipping_selector;
		if (shipping_rules) {
			shipping_selector = '<select class="form-control">' + $.map(shipping_rules, function (rule) {
				return '<option value="' + rule[0] + '">' + rule[1] + '</option>'
			}).join("\n") +
				'</select>';
		}

		var $tax_row = $(repl('<div class="row">\
			<div class="col-md-9 col-sm-9">\
				<div class="row">\
					<div class="col-md-9 col-md-offset-3">' +
			(shipping_selector || '<p>%(description)s</p>') +
			'</div>\
				</div>\
			</div>\
			<div class="col-md-3 col-sm-3 text-right">\
				<p' + (shipping_selector ? ' style="margin-top: 5px;"' : "") + '>%(formatted_tax_amount)s</p>\
			</div>\
		</div>', doc)).appendTo($cart_taxes);

		if (shipping_selector) {
			$tax_row.find('select option').each(function (i, opt) {
				if ($(opt).html() == doc.description) {
					$(opt).attr("selected", "selected");
				}
			});
			$tax_row.find('select').on("change", function () {
				shopping_cart.apply_shipping_rule($(this).val(), this);
			});
		}
	},

	apply_shipping_rule: function (rule, btn) {
		return frappe.call({
			btn: btn,
			type: "POST",
			method: "erpnext.shopping_cart.cart.apply_shipping_rule",
			args: { shipping_rule: rule },
			callback: function (r) {
				if (!r.exc) {
					shopping_cart.render(r.message);
				}
			}
		});
	},

	place_order: function (btn) {
		const uuid = Math.floor(100 + Math.random() * 900);
		const po_no = uuid + new Date().getTime()
		return frappe.call({
			type: "POST",
			method: "erpnext.shopping_cart.cart.place_order",
			btn: btn,
			args: {
				shipping_service: $('#shipping_service').val(),
				po_no: po_no
			},
			callback: function (r) {
				if (r.exc) {
					var msg = "";
					if (r._server_messages) {
						msg = JSON.parse(r._server_messages || []).join("<br>");
					}

					$("#cart-error")
						.empty()
						.html(msg || frappe._("Something went wrong!"))
						.toggle(true);
				} else {
					$('.cart-container table').hide();
					$(btn).hide();
					window.location.href = '/invoices/' + encodeURIComponent(r.message);
				}
			}
		});
	},

	request_quotation: function (btn) {
		return frappe.call({
			type: "POST",
			method: "erpnext.shopping_cart.cart.request_for_quotation",
			btn: btn,
			callback: function (r) {
				if (r.exc) {
					var msg = "";
					if (r._server_messages) {
						msg = JSON.parse(r._server_messages || []).join("<br>");
					}

					$("#cart-error")
						.empty()
						.html(msg || frappe._("Something went wrong!"))
						.toggle(true);
				} else {
					$('.cart-container table').hide();
					$(btn).hide();
					window.location.href = '/quotations/' + encodeURIComponent(r.message);
				}
			}
		});
	},

	bind_coupon_code: function () {
		$(".bt-coupon").on("click", function () {
			shopping_cart.apply_coupon_code(this);
		});
	},

	apply_coupon_code: function (btn) {
		return frappe.call({
			type: "POST",
			method: "erpnext.shopping_cart.cart.apply_coupon_code",
			btn: btn,
			args: {
				applied_code: $('.txtcoupon').val(),
				applied_referral_sales_partner: $('.txtreferral_sales_partner').val()
			},
			callback: function (r) {
				if (r && r.message) {
					location.reload();
				}
			}
		});
	}
});

frappe.ready(function () {
	$(".cart-icon").hide();
	shopping_cart.bind_events();
});

function show_terms() {
	var html = $(".cart-terms").html();
	frappe.msgprint(html);
}



function get_cost(address, shipping_service, shipping_carrier,serviceCode) {
	var stamps_credentials = {}
	stamps_credentials = get_ups_credentials("Stamps Settings")
	const username = "igladsolutions";
	const password = "iGl@d-88od00";


	if (shipping_carrier === "UPS") {
		var length = 7.5, width = 7.27, height = 7;
		var default_number = ""
		var ins_money_value = "100";
		var package_cost = 10.69


		var insurance = {
			"DeclaredValue": {
				"Type": {
					"Code": "01",
					"Description": "Insurance",
				},
				"CurrencyCode": "USD",
				"MonetaryValue": ins_money_value
			}

		}



		var address_info;

		frappe.call({
			method: "enshop.api.get_doc.get_doc",
			async: false,
			args: {
				doc_type: "Address",
				doc_name: address,
			},
			callback: function (r) {
				console.log(r.message)
				if (r.message) {
					//address_info = r.message;
					var state_abb;
					var phone_no = "";
					//for third party shipping
					var paymentinfo = {
						"ShipmentCharge": {
							"Type": "01",
							"BillShipper": {
								"AccountNumber": "E00A49"
							}
						}
					}

					console.log("***********************  FOURTH ****************************")
					address_info = r.message;
					var country_code = "US";
					if (address_info.country_code) {
						country_code = address_info.country_code;

					}
					else {
						frappe.call({
							method: "enshop.api.get_doc.get_doc",
							async: false,
							args: {
								doc_type: "Country",
								doc_name: address_info.country,
							},
							callback: function (cntry) {
								country_code = cntry.message.code

							}
						});

					}

					//end third_party_shipping
					if (address_info.phone) {
						phone_no = address_info.phone
					} else {
						phone_no = default_number;
					}
					frappe.call({
						method: "enshop.api.get_doc.get_doc",
						async: false,
						args: {
							doc_type: "US States",
							doc_name: address_info.state,
						},
						callback: function (r2) {
							console.log(r2.message);
							state_abb = r2.message.abb;
							var address_lines = [];

							if (address_info.address_line2) {
								address_lines.push(address_info.address_line2)
							}
							address_lines.push(address_info.address_line1)
							var data = {
								"UPSSecurity": {
									"UsernameToken": {
										"Username": username,
										"Password": password
									},
									"ServiceAccessToken": { "AccessLicenseNumber": "5D2E60A4DB1D2598" }

								},
								"ShipmentRequest": {
									"Request": {
										"RequestOption": "nonvalidate",
										"TransactionReference": {
											"CustomerContext": "TEST"
										}
									},
									"Shipment": {
										"Description": "SO#: TEST",

										"ShipTo": {
											"Name": address_info.address_title,
											"AttentionName": address_info.address_title,
											"Phone": {
												"Number": phone_no
											},
											"Address": {
												"AddressLine": address_lines,
												"City": address_info.city,
												"StateProvinceCode": state_abb,
												"PostalCode": address_info.pincode,
												"CountryCode": country_code
											}
										},
										"ShipFrom": {
											"Name": "box springs Blvd",
											"AttentionName": "Shipping Department",

											"FaxNumber": "",
											"Address": {
												"AddressLine": "6251 box springs Blvd",
												"City": "riverside",
												"StateProvinceCode": "CA",
												"PostalCode": "92507",
												"CountryCode": "US"
											}

										},
										"Shipper": {
											"Name": "box springs Blvd",
											"AttentionName": "Shipping Department",
											"TaxIdentificationNumber": "46-1868081",
											"Phone": {
												"Number": "951-902-2590",
												"Extension": "1"
											},
											"ShipperNumber": "E00A49",
											"FaxNumber": "1234567890",

											"Address": {
												"AddressLine": "6251 box springs Blvd",
												"City": "riverside",
												"StateProvinceCode": "CA",
												"PostalCode": "92507",
												"CountryCode": "US"
											}

										},
										"InvoiceLineTotal": {
											"CurrencyCode": "USD",
											"MonetaryValue": package_cost.toString()
										},
										"PaymentInformation": paymentinfo,
										"Service": {
											"Code": serviceCode.toString(),
											"Description": shipping_service
										},
										"Package": {
											"PackageServiceOptions": insurance,
											"ReferenceNumber": [{
												"Value": "TEST"
											},
											{
												"Value": "TEST"
											}
											],
											"Description": "Description",
											"Packaging": {
												"Code": "02",
												"Description": "Description"
											},
											"Dimensions": {
												"UnitOfMeasurement": {
													"Code": "IN",
													"Description": "Inches"
												},
												"Length": length.toString(),
												"Width": width.toString(),
												"Height": height.toString()
											},
											"PackageWeight": {
												"UnitOfMeasurement": {
													"Code": "LBS",
													"Description": "Pounds"
												},
												"Weight": "3"
											}
										}
									},
									"LabelSpecification": {
										"LabelImageFormat": {
											"Code": "GIF",
											"Description": "GIF"
										},
										"HTTPUserAgent": "Mozilla/4.5"
									}
								}
							};
							var url = 'https://wwwcie.ups.com'

							$.ajax({
								url: 'https://corsanywhere-jqogydb25a-uc.a.run.app/' + url + "/rest/Ship",
								type: "POST",
								contentType: "application/json; charset=utf-8",
								dataType: "json",
								data: JSON.stringify(data),
								success: function (data) {

									console.log(data)

									var wt = data.ShipmentResponse.ShipmentResults.BillingWeight.Weight

									var s_c = data.ShipmentResponse.ShipmentResults.ShipmentCharges.TotalCharges.MonetaryValue;
									var inh_ins = 0.0;
									
									var total_s_c = parseFloat(s_c) + parseFloat(inh_ins)
									
									
									
									console.log("COST")
									console.log(total_s_c)
									const inputCost = $("#estimate-shipment")
									inputCost.css("color", "black")
									inputCost.val("$ "+total_s_c)
									
								}
							});
						}
					});

				}
			}
		});
	}

	else {
		const inputCost = $("#estimate-shipment")
		inputCost.css("color", "black")
		inputCost.val("$ "+8.15)
	}
}


function ups_service_code(value) {
	const results = []
	const code = [
		{"01": "Next Day Air"},
		{"02": "2nd Day Air"},
		{"03": "Ground"},
		{"07": "Express"},
		{"08": "Expedited"},
		{"11": "UPS Standard"},
		{"12": "3 Day Select"},
		{"13": "Next Day Air Saver"},
		{"14": "Next Day Air Early AM"},
		{"54": "Express Plus"},
		{"59": "2nd Day Air A.M."},
		{"65": "UPS Saver"},
		{"82": "UPS Today Standard"},
		{"83": "UPS Today Dedicated Courier"},
		{"84": "UPS Today Intercity"},
		{"85": "UPS Today Express"},
		{'86': "UPS Today Express Saver"}
	]

	for(var i=0; i<code.length; i++) {
		for(key in code[i]) {
			
		  if(code[i][key].includes(value)) {
			results.push(code[i]);
		  }
		}
	  }

	return (Object.keys(results[0])[0])

	
}

function get_ups_credentials(doctype){
    var credentials = {url: "https://swsim.stamps.com/swsim/swsimv71.asmx",username: "globalads",password: "gl0b@lADS881"}
    
    return credentials
}