frappe.listview_settings['Custom Design'] = {
	add_fields: ["status"],
	get_indicator: function (doc) {
		if (['Billing', 'Designing', 'Printing', 'Finishing', 'Shipping'].includes(doc.status)) {
			// Closed
			return [__(doc.status), "orange", "status,=," + doc.status];
		} else if (['Shipped', 'Billed and Shipped'].includes(doc.status)) {
			// Closed
			return [__(doc.status), "green", "status,=," + doc.status];
		}

	},
};
