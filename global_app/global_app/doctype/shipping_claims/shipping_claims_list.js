frappe.listview_settings['Shipping Claims'] = {
	add_fields: ["status"],
	get_indicator: function (doc) {
		if (doc.status === "Pending") {
			// Closed
			return [__(doc.status), "orange", "status,=,Pending"];
		} else if (doc.status === "Denied") {
			// Closed
			return [__(doc.status), "red", "status,=,Denied"];
		} else if (doc.status === "Approved") {
			// Closed
			return [__(doc.status), "green", "status,=,Approved"];
		}

	},
};
