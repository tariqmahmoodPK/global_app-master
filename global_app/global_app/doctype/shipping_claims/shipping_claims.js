    // Copyright (c) 2020, Jan Lloyd Angeles and contributors
// For license information, please see license.txt
frappe.ui.form.on('Shipping Claims', {
    onload_post_render: function () {
        cur_frm.trigger("trigger_invoices")
    },
    trigger_invoices: function () {
        if(cur_frm.doc.orig_invoice){
                console.log("NAA MAN DIRI")
            frappe.db.get_doc("Sales Invoice", cur_frm.doc.orig_invoice)
                .then(invoice => {
                   frappe.call({
                        method: "global_app.global_app.doctype.returned_items.returned_items.get_so",
                        args: {sales_order: invoice.items[0].sales_order},
                async: false,
                        callback: function (r) {
                            if(r.message[1]){
                                var df = frappe.meta.get_docfield("Shipping Claims Tracking Numbers","tracking_number", cur_frm.doc.name);
                                df.options = r.message[1]
                                cur_frm.refresh_field("orig_tracking_numbers")
                            }

                        }
                    })
                   //
            })
        }
        if(cur_frm.doc.rep_invoice) {
            console.log("NAA MAN DIRI")
            frappe.db.get_doc("Sales Invoice", cur_frm.doc.rep_invoice)
                .then(invoice => {
                    frappe.call({
                        method: "global_app.global_app.doctype.returned_items.returned_items.get_so",
                        args: {sales_order: invoice.items[0].sales_order},
                        async: false,
                        callback: function (r) {
                            if (r.message[1]) {
                                var df = frappe.meta.get_docfield("Replacement Tracking Numbers", "tracking_number", cur_frm.doc.name);
                                df.options = r.message[1]
                                cur_frm.refresh_field("rep_tracking_numbers")
                            }

                        }
                    })
            //
            })
        }
    },
	refresh: function(frm) {
	    cur_frm.fields_dict.orig_invoice.get_query = function () {
            return {
                filters: [
                    ['shipment_name', '=', cur_frm.doc.type],
                    ['docstatus', '=', 1],
                ]

            }
         }
         cur_frm.fields_dict.rep_invoice.get_query = function () {
            return {
                filters: [
                    ['shipment_name', '=', cur_frm.doc.type],
                    ['docstatus', '=', 1],
                ]

            }
         }
        if(cur_frm.doc.docstatus && cur_frm.doc.status === "Pending"){

            cur_frm.add_custom_button(__("Deny"), () => {
                frappe.confirm('Are you sure you want to deny the claim?',
                () => {
                   cur_frm.call({
                                doc: cur_frm.doc,
                                method: 'update_status',
                                  args: {status: "Denied"},
                                 async: false,
                                  freeze: true,
                                  freeze_message: "Denying...",
                                callback: (r) => {
                                    cur_frm.reload_doc()
                             }
                            })
                }, () => {})


          }, "Actions");

             cur_frm.add_custom_button(__("Approve"), () => {
                  frappe.confirm('Are you sure you want to approve the claim?',
                () => {
                   cur_frm.call({
                                doc: cur_frm.doc,
                                method: 'update_status',
                                  args: {status: "Approved"},
                                 async: false,
                                  freeze: true,
                                  freeze_message: "Approving...",
                                callback: (r) => {
                                    cur_frm.reload_doc()
                             }
                            })
                }, () => {})



          }, "Actions");
        }
        refresh_table(cur_frm)
	},
    orig_invoice: function () {

            cur_frm.clear_table("original_invoice_items")
            document.getElementsByClassName("row-index")[2].style.height = "40px";
            document.querySelectorAll("[data-fieldname='item_image']")[0].style.height = "40px";
            document.querySelectorAll("[data-fieldname='item_name']")[0].style.height = "40px";
            document.querySelectorAll("[data-fieldname='item_status']")[0].style.height = "40px";
            cur_frm.refresh_field("original_invoice_items")

        if(cur_frm.doc.orig_invoice){
                console.log("NAA MAN DIRI")
            frappe.db.get_doc("Sales Invoice", cur_frm.doc.orig_invoice)
                .then(invoice => {
                   frappe.call({
                        method: "global_app.global_app.doctype.returned_items.returned_items.get_so",
                        args: {sales_order: invoice.items[0].sales_order},
                async: false,
                        callback: function (r) {
                            if(r.message[1]){
                                var df = frappe.meta.get_docfield("Shipping Claims Tracking Numbers","tracking_number", cur_frm.doc.name);
                                df.options = r.message[1]
                                cur_frm.refresh_field("orig_tracking_numbers")
                            }

                        }
                    })
                   //
            })
            // for(var i=0;i<invoice.items.length;i+=1){
            //        //    cur_frm.add_child("original_invoice_items",{
            //        //          item: invoice.items[i].item_code,
            //        //          item_name: invoice.items[i].item_name,
            //        //      })
            //        //  }
            //        // cur_frm.refresh_field("original_invoice_items")

        }
    },
    rep_invoice: function () {
	    var tracking_numbers_table_length_orig = cur_frm.doc.orig_tracking_numbers.length + 1 + cur_frm.doc.original_invoice_items.length + 1 + cur_frm.doc.rep_tracking_numbers.length + 1


        cur_frm.clear_table("replacement_invoice_items")
        document.getElementsByClassName("row-index")[tracking_numbers_table_length_orig].style.height = "40px";
        document.querySelectorAll("[data-fieldname='item_image']")[1].style.height = "40px";
        document.querySelectorAll("[data-fieldname='item_name']")[1].style.height = "40px";
        document.querySelectorAll("[data-fieldname='tracking_number']")[1].style.height = "40px";
        cur_frm.refresh_field("replacement_invoice_items")

        if(cur_frm.doc.rep_invoice) {
            console.log("NAA MAN DIRI")
            frappe.db.get_doc("Sales Invoice", cur_frm.doc.rep_invoice)
                .then(invoice => {
                    frappe.call({
                        method: "global_app.global_app.doctype.returned_items.returned_items.get_so",
                        args: {sales_order: invoice.items[0].sales_order},
                        async: false,
                        callback: function (r) {
                            if (r.message[1]) {
                                var df = frappe.meta.get_docfield("Replacement Tracking Numbers", "tracking_number", cur_frm.doc.name);
                                df.options = r.message[1]
                                cur_frm.refresh_field("rep_tracking_numbers")
                            }

                        }
                    })
            //
            })
        }
    }

});

cur_frm.cscript.attach_image = function (frm, cdt, cdn) {
    var d = locals[cdt][cdn]
    if(d.attach_image){
        var product_style  = "width:40px;height:auto;margin-top:-9%"
        d.item_image = "<img src=" + d.attach_image + " width='120'" + "height='100'" + "></img>"
                refresh_table(cur_frm)

        cur_frm.refresh_field("returned_items")
    } else {
        d.item_image = ""
        cur_frm.refresh_field("returned_items")
        refresh_table(cur_frm)
    }

    // <img src="/files/Stock/NSFB/NSFB-5361.jpg" style="width: 40px; height: auto; margin-top: -9%;">
}

function refresh_table(cur_frm) {
    var tracking_numbers_table_length_orig = cur_frm.doc.orig_tracking_numbers.length + 1
        for (var ii = 0; ii < cur_frm.doc.original_invoice_items.length; ii += 1) {
        if (cur_frm.doc.original_invoice_items[ii].attach_image) {
            console.log("NISULOD LAGEH")
            document.getElementsByClassName("row-index")[cur_frm.doc.original_invoice_items[ii].idx + tracking_numbers_table_length_orig].style.height = "110px";
            document.querySelectorAll("[data-fieldname='item_name']")[cur_frm.doc.original_invoice_items[ii].idx].style.height = "110px";
            document.querySelectorAll("[data-fieldname='item_image']")[cur_frm.doc.original_invoice_items[ii].idx].style.height = "110px";
            document.querySelectorAll("[data-fieldname='item_status']")[cur_frm.doc.original_invoice_items[ii].idx].style.height = "110px";
            document.querySelectorAll("[data-fieldname='tracking_number']")[cur_frm.doc.original_invoice_items[ii].idx].style.height = "110px";
        } else {
            document.querySelectorAll("[data-fieldname='item_image']")[cur_frm.doc.original_invoice_items[ii].idx].style.height = "40px";
            document.querySelectorAll("[data-fieldname='item_name']")[cur_frm.doc.original_invoice_items[ii].idx].style.height = "40px";
            document.querySelectorAll("[data-fieldname='item_status']")[cur_frm.doc.original_invoice_items[ii].idx ].style.height = "40px";
            document.querySelectorAll("[data-fieldname='tracking_number']")[cur_frm.doc.original_invoice_items[ii].idx ].style.height = "40px";
        }

    }
        var tracking_numbers_table_length_rep = cur_frm.doc.rep_tracking_numbers.length + 1

    var tracking_numbers_table_length = cur_frm.doc.original_invoice_items.length + 1 + tracking_numbers_table_length_orig + tracking_numbers_table_length_rep
    console.log(tracking_numbers_table_length)
    var tracking_numbers_table_length_1 = cur_frm.doc.original_invoice_items.length + 1
    for (var i = 0; i < cur_frm.doc.replacement_invoice_items.length; i += 1) {

        if (cur_frm.doc.replacement_invoice_items[i].attach_image) {
            console.log(cur_frm.doc.replacement_invoice_items[i].idx + tracking_numbers_table_length)
            document.getElementsByClassName("row-index")[cur_frm.doc.replacement_invoice_items[i].idx + tracking_numbers_table_length].style.height = "110px";
            document.querySelectorAll("[data-fieldname='item_image']")[cur_frm.doc.replacement_invoice_items[i].idx + tracking_numbers_table_length_1].style.height = "110px";
            document.querySelectorAll("[data-fieldname='tracking_number']")[cur_frm.doc.replacement_invoice_items[i].idx + tracking_numbers_table_length_1].style.height = "110px";
            document.querySelectorAll("[data-fieldname='item_name']")[cur_frm.doc.replacement_invoice_items[i].idx + tracking_numbers_table_length_1].style.height = "110px";
        } else {
            document.getElementsByClassName("row-index")[cur_frm.doc.replacement_invoice_items[i].idx + tracking_numbers_table_length_1].style.height = "40px";
            document.querySelectorAll("[data-fieldname='item_image']")[cur_frm.doc.replacement_invoice_items[i].idx + tracking_numbers_table_length_1].style.height = "40px";
            document.querySelectorAll("[data-fieldname='tracking_number']")[cur_frm.doc.replacement_invoice_items[i].idx + tracking_numbers_table_length_1].style.height = "40px";
            document.querySelectorAll("[data-fieldname='item_name']")[cur_frm.doc.replacement_invoice_items[i].idx + tracking_numbers_table_length_1].style.height = "40px";
        }

    }
}
var tracking_numbers = []
cur_frm.cscript.tracking_number = function (frm, cdt, cdn) {
    tracking_numbers = []
    console.log("TEST")
    var d = locals[cdt][cdn]
        var tn_field_name = d.doctype === "Shipping Claims Tracking Numbers" ? "original_invoice_items" : "replacement_invoice_items"
    console.log(tn_field_name)
    var tns = Array.from(cur_frm.doc[tn_field_name], x => "tracking_number" in x ? x.tracking_number:"")
    console.log(d.tracking_number)
    console.log(!tns.includes(d.tracking_number))
    console.log(d.tracking_number && !tns.includes(d.tracking_number))
    if(d.tracking_number && !tns.includes(d.tracking_number)){
        tracking_numbers.push(d.tracking_number)
        console.log("NISULOD GYAPON")
        frappe.call({
            method: "global_app.global_app.doctype.returned_items.returned_items.get_box_items",
            args: {
                tracking_number: d.tracking_number,
            },
            async: false,
            callback: function (r) {
                console.log(r)
                for(var i=0;i< r.message.length;i+=1){
                    if(r.message[i].item){
                        console.log(r.message[i].item)
                    console.log(d.doctype)
                    var doctype = d.parentfield === "orig_tracking_numbers" ? "original_invoice_items" : "replacement_invoice_items"
                    console.log(doctype)
                    console.log({
                        item: r.message[i].item,
                        item_name: r.message[i].item_name,
                        tracking_number: d.tracking_number,
                    })
                    cur_frm.add_child(doctype,{
                        item: r.message[i].item,
                        item_name: r.message[i].item_name,
                        tracking_number: d.tracking_number,
                    })
                    cur_frm.refresh_field(doctype)
                    }

                }
            }
        })
    }
}
cur_frm.cscript.tracking_numbers_remove = function (frm, cdt, cdn) {
    var d = locals[cdt][cdn]
            var tn_field_name = d.doctype === "Shipping Claims Tracking Numbers" ? "original_invoice_items" : "replacement_invoice_items"

    var tns = Array.from(cur_frm.doc[tn_field_name], x => "tracking_number" in x ? x.tracking_number:"")
    if(d.tracking_number && !tns.includes(d.tracking_number)){
        tracking_numbers.push(d.tracking_number)
        frappe.call({
            method: "global_app.global_app.doctype.returned_items.returned_items.get_box_items",
            args: {
                tracking_number: d.tracking_number,
            },
            callback: function (r) {
                console.log(r)
                for(var i=0;i< r.message.length;i+=1){
                    console.log(r.message[i].item)
                    var doctype = d.doctype === "Original Invoice Details" ? "original_invoice_items" : "replacement_invoice_items"
                    cur_frm.add_child(doctype,{
                        item: r.message[i].item,
                        item_name: r.message[i].item_name,
                        tracking_number: d.tracking_number,
                    })
                    cur_frm.refresh_field(doctype)
                }
            }
        })
    }
}

cur_frm.cscript.lost_box = function (frm, cdt, cdn) {
    var d = locals[cdt][cdn]

    for(var i=0;i<cur_frm.doc.original_invoice_items.length;i+=1){
            if(cur_frm.doc.original_invoice_items[i].tracking_number === d.tracking_number){
                cur_frm.doc.original_invoice_items[i].item_status = (d.lost_box ? "Lost" : "")
            }
            cur_frm.refresh_field("original_invoice_items")
    }
}