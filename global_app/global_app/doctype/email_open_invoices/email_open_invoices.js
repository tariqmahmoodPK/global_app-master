// Copyright (c) 2020, jan and contributors
// For license information, please see license.txt

cur_frm.cscript.email_open_invoices = function () {
    frappe.call({
        method: "global_app.global_app.doctype.email_open_invoices.email_open_invoices.customer_invoices",
        args: {
            "customers": cur_frm.doc.customers
        },
        callback: function (r) {
            frappe.msgprint("Sending Email Queued. Please check Email Queue")
        }
    })
}