// Copyright (c) 2020, jan and contributors
// For license information, please see license.txt

frappe.ui.form.on('Staff Mistakes and Errors', {
	attach_mistake_image: function(frm) {
        cur_frm.refresh_field("mistake_image")
	}
});
