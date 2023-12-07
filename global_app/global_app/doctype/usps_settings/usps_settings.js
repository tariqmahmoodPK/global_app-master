// Copyright (c) 2020, jan and contributors
// For license information, please see license.txt

frappe.ui.form.on('USPS Settings', {
	refresh: function(frm) {

		cur_frm.fields_dict.shipping_charges.grid.get_field("shipment").get_query =
			function() {
				return {
					filters: [
                    	["name", "like", "%USPS%"]
					]
				}
			}
	}
});
