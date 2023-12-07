// Copyright (c) 2016, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on("Address", {
	validate_address: function (frm) {
		var data = {
			"UPSSecurity": {
				"UsernameToken": {
					"Username": "cobbpromo",
					"Password": "X%(8BJ68)"
				},
				"ServiceAccessToken":
					{ "AccessLicenseNumber": "5D503DAFAFF485B5" }
			},
			"XAVRequest": {
				"Request": {
					"RequestOption": "3",
					"TransactionReference":
						{ "CustomerContext": "" }
				},
				"MaximumListSize": "20",
				"AddressKeyFormat": {
					"ConsigneeName": "",
					"BuildingName": "",
					"AddressLine": frm.get_field("address_line1").value,
					"PoliticalDivision2": "",
					"PoliticalDivision1": "CA",
					"PostcodePrimaryLow": frm.get_field("pincode").value,
					"CountryCode": "US"
				}
			}
		}
		$.ajax({
			url: 'https://corsanywhere-jqogydb25a-uc.a.run.app/' + "https://onlinetools.ups.com/rest/XAV",
			type: "POST",
			contentType: "application/json; charset=utf-8",
			dataType: "json",
			data: JSON.stringify(data),
			crossDomain: true,
			beforeSend: function (request) {
				request.setRequestHeader('Access-Control-Allow-Origin', '*');
				request.setRequestHeader('Access-Control-Allow-Methods', 'GET, POST');
				request.setRequestHeader("Access-Control-Allow-Headers", "Access-Control-*, Origin, X-Requested-With, Content-Type, Accept");
			},

			success: function (data) {
				console.log(data);
				try {
					if (data.XAVResponse.ValidAddressIndicator == "") {
						frappe.model.set_value(frm.doc.doctype, frm.doc.name, "validation_status", "<p style='color:green;margin:0px'>Valid Address</p>");
						cur_frm.refresh_field("validation_status");
						frappe.model.set_value(frm.doc.doctype, frm.doc.name, "add_validation", "done");
						cur_frm.refresh_field("add_validation");
						frappe.model.set_value(frm.doc.doctype, frm.doc.name, "classification", data.XAVResponse.AddressClassification.Description);
						cur_frm.refresh_field("classification");
						validated = true;
					}
					else {
						console.log("ELSE");
						frappe.model.set_value(frm.doc.doctype, frm.doc.name, "validation_status", "<p style='color:red;margin:0px'>Invalid or Ambiguous Address</p>");
						cur_frm.refresh_field("validation_status");
						frappe.model.set_value(frm.doc.doctype, frm.doc.name, "classification", data.XAVResponse.AddressClassification.Description);
						cur_frm.refresh_field("classification");
						frappe.model.set_value(frm.doc.doctype, frm.doc.name, "add_validation", "not");
						cur_frm.refresh_field("add_validation");


						//sugestions.
						var desc_address = []
						$.each(data.XAVResponse.Candidate || [], function (i, item) {
							//list.push({"value":item.AddressKeyFormat.AddressLine+" "+item.AddressKeyFormat.Region,"data":i});
							var address = item.AddressKeyFormat;
							var f_Add = address.AddressLine + "," + address.PoliticalDivision2 + "," + address.PostcodePrimaryLow + "," + address.CountryCode
							desc_address.push(f_Add)
						});

						frm.set_df_property('suggestions', 'options', desc_address);
						frm.refresh_field('suggestions');
					}

				}
				catch (err) {
					console.log("CATCH");
					frappe.model.set_value(frm.doc.doctype, frm.doc.name, "validation_status", "<p style='color:red'>Invalid or Ambiguous Address</p>");
					cur_frm.refresh_field("validation_status");
					frappe.model.set_value(frm.doc.doctype, frm.doc.name, "classification", "Unknown");
					cur_frm.refresh_field("classification");
					frappe.model.set_value(frm.doc.doctype, frm.doc.name, "add_validation", "not");
					cur_frm.refresh_field("add_validation");

					//sugestions.
					// var desc_address=[]
					// $.each(data.XAVResponse.Candidate || [], function(i, item) {
					// 	//list.push({"value":item.AddressKeyFormat.AddressLine+" "+item.AddressKeyFormat.Region,"data":i});
					// 	var address= item.AddressKeyFormat;
					// 	var f_Add=address.AddressLine+","+address.PoliticalDivision2+","+address.PostcodePrimaryLow+","+address.CountryCode
					// 	desc_address.push(f_Add)
					// });

					// frm.set_df_property('suggestions', 'options', desc_address);
					// frm.refresh_field('suggestions'); 

				}
				//return list;
			}
		});

	},
	suggestions: function (frm) {
		var ss = frm.doc.suggestions;
		var array_address = ss.split(",");
		frm.set_value('address_line1', array_address[0]);
		frm.refresh_field("address_line1");
		frm.set_value('city', array_address[1]);
		frm.refresh_field("city");
		frm.set_value('pincode', array_address[2]);
		frm.refresh_field("pincode");
		frm.set_value('country', array_address[3]);
		frm.refresh_field("country");
		console.log(array)
	},
	refresh: function (frm) {
		//google API 
		$("button[data-fieldname=validate_address]").removeClass('btn btn-default btn-xs');
		$("button[data-fieldname=validate_address]").addClass('btn btn-primary');
		$('input[data-fieldname="address_line1"]').autocomplete({
			source: function (request, response) {
				var g_address = $('input[data-fieldname="address_line1"]').val();
				var desc = []
				$.ajax({
					url: 'https://corsanywhere-jqogydb25a-uc.a.run.app/' + "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=" + g_address + "&key=AIzaSyAFso5WNRELV-7xzSxV5FdHr1BCwqn4hD8",
					type: 'POST',
					dataType: 'json',
					beforeSend: function (request) {
						request.setRequestHeader('Access-Control-Allow-Origin', '*');
						request.setRequestHeader('Access-Control-Allow-Methods', 'GET, POST');
						request.setRequestHeader("Access-Control-Allow-Headers", "Access-Control-*, Origin, X-Requested-With, Content-Type, Accept");
					},
					crossDomain: true,
					success: function (data, textStatus, xhr) {
						//frappe.msgprint(__("Success!!"));
						for (var i = 0; i < data.predictions.length; i++) {
							desc.push(data.predictions[i].description)
						}
						console.log(desc)
						response($.grep(desc, function (item) {
							console.log(item)
							return item;
						}));
						//$('input[data-fieldname="google_address"]').autocomplete({source:desc});          		                     		            		      
					},
					error: function (data, textStatus, xhr) {
						//frappe.msgprint(__("Please make sure you are using recommended browsers(opera & Firefox) with CSR extension"));
						//$('input[data-fieldname="google_address"]').autocomplete("destroy");    
					}
				});
			}, select: function (event, ui) {
				//var g_address=$('input[data-fieldname="address_line1"]').val();
				var g_address = ui.item.value
				var componentForm = {
					street_number: 'short_name',
					route: 'long_name',
					locality: 'long_name',
					administrative_area_level_1: 'long_name',

					country: 'long_name',
					postal_code: 'short_name',

				}; //	
				var componentForm1 = {
					'street_number': 'address_line1',
					'route': 'address_line2',
					'locality': 'city',
					'administrative_area_level_1': 'state',
					'country': 'country',
					'postal_code': 'pincode',

				};
				$.ajax({
					url: 'https://corsanywhere-jqogydb25a-uc.a.run.app/' + "https://maps.googleapis.com/maps/api/geocode/json?address=" + g_address + "&key=AIzaSyAFso5WNRELV-7xzSxV5FdHr1BCwqn4hD8",
					type: 'POST',
					dataType: 'json',

					success: function (data, textStatus, xhr) {
						console.log(data)
						//console.log(data.results[0].address_components.length) 
						var add_compo = data.results[0].address_components
						for (var i = 0; i < add_compo.length; i++) {
							var addressType = add_compo[i].types[0];
							if (componentForm[addressType]) {
								var val = add_compo[i][componentForm[addressType]];
								var temp_val = add_compo[i];
								// console.log(componentForm1[addressType])
								// console.log(temp_val)
								if (componentForm1[addressType] == "state") {
									frappe.model.set_value(frm.doc.doctype, frm.doc.name, "abb", temp_val.short_name);
									cur_frm.refresh_field("abb");
								}
								//		frappe.msgprint(__("addressType="+componentForm1[addressType]+",val="+val));   
								cur_frm.set_value(componentForm1[addressType], val).then(function () {
									frappe.model.set_value(frm.doc.doctype, frm.doc.name, "address_line1", frm.doc.address_line1 + " " + frm.doc.address_line2);
									cur_frm.refresh_field("address_line1");
									frappe.model.set_value(frm.doc.doctype, frm.doc.name, "address_line2", "");
									cur_frm.refresh_field("address_line2");
								})

								//document.getElementById(addressType).value = val;
								//frappe.msgprint(__(val));
							}
						}
						//frappe.msgprint(__("Success!!"));
					},
					error: function (data, textStatus, xhr) {
						frappe.msgprint(__("Failure!!"));
					}
				});
			}
		})


		//end API
		//code added above
		if (frm.doc.__islocal) {
			const last_doc = frappe.contacts.get_last_doc(frm);
			if (frappe.dynamic_link && frappe.dynamic_link.doc
				&& frappe.dynamic_link.doc.name == last_doc.docname) {
				frm.set_value('links', '');
				frm.add_child('links', {
					link_doctype: frappe.dynamic_link.doctype,
					link_name: frappe.dynamic_link.doc[frappe.dynamic_link.fieldname]
				});
			}
		}
		frm.set_query('link_doctype', "links", function () {
			return {
				query: "frappe.contacts.address_and_contact.filter_dynamic_link_doctypes",
				filters: {
					fieldtype: "HTML",
					fieldname: "address_html",
				}
			}
		});
		frm.refresh_field("links");
	},
	validate: function (frm) {
		// clear linked customer / supplier / sales partner on saving...
		if (frm.doc.links) {
			frm.doc.links.forEach(function (d) {
				frappe.model.remove_from_locals(d.link_doctype, d.link_name);
			});
		}
		// frappe.model.set_value(frm.doc.doctype, frm.doc.name, "state", frm.doc.state.trim());
		// cur_frm.refresh_field("state");
		// frappe.model.set_value(frm.doc.doctype, frm.doc.name, "pincode", frm.doc.pincode.trim());
		// cur_frm.refresh_field("pincode");
		// frappe.model.set_value(frm.doc.doctype, frm.doc.name, "address_line1", frm.doc.address_line1.trim());
		// cur_frm.refresh_field("address_line1");
		// frappe.model.set_value(frm.doc.doctype, frm.doc.name, "address_title", frm.doc.address_title.trim());
		// cur_frm.refresh_field("address_title");
	},
	after_save: function (frm) {
		frappe.run_serially([
			() => frappe.timeout(1),
			() => {
				const last_doc = frappe.contacts.get_last_doc(frm);
				if (frappe.dynamic_link && frappe.dynamic_link.doc
					&& frappe.dynamic_link.doc.name == last_doc.docname) {
					frappe.set_route('Form', last_doc.doctype, last_doc.docname);
				}
			}
		]);
	}
});
function jsonp_callback(json) {
	console.log(json);
}