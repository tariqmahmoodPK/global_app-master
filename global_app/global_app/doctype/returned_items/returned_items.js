// Copyright (c) 2020, jan and contributors
// For license information, please see license.txt
frappe.ui.form.on('Returned Items', {
    refresh: function (frm) {
     frm.fields_dict.sales_order.get_query =
        function () {
            return {
                filters: [
                    ['docstatus', '=', 1],
                    ['shipment_details', '!=', '']
                ]

            }
        }
        refresh_table(cur_frm)
    },
	sales_order: function() {
	    if(cur_frm.doc.sales_order){
	        cur_frm.clear_table("returned_items")
	        frappe.call({
                method: "global_app.global_app.doctype.returned_items.returned_items.get_so",
                args: {sales_order: cur_frm.doc.sales_order},
                callback: function (r) {
                    if(r.message[0]){
                        cur_frm.doc.sales_invoice = r.message[0]
                        cur_frm.refresh_field("sales_invoice")
                    }
                    if(r.message[1]){
                        var df = frappe.meta.get_docfield("Returned Items Tracking Numbers","tracking_number", cur_frm.doc.name);
                        df.options = r.message[1]
                        cur_frm.refresh_field("tracking_number")
                    }

                }
            })
        }
	}
});
var tracking_numbers = []
cur_frm.cscript.tracking_number = function (frm, cdt, cdn) {
    var d = locals[cdt][cdn]
    var tns = Array.from(cur_frm.doc.returned_items, x => "tracking_number" in x ? x.tracking_number:"")
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
                    cur_frm.add_child("returned_items",{
                        item: r.message[i].item,
                        item_name: r.message[i].item,
                        tracking_number_1: d.tracking_number,
                    })
                    cur_frm.refresh_field("returned_items")
                }
            }
        })
    }
}
cur_frm.cscript.tracking_numbers_remove = function (frm, cdt, cdn) {
    var d = locals[cdt][cdn]
    var tns = Array.from(cur_frm.doc.tracking_numbers, x => "tracking_number" in x ? x.tracking_number:"")
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
                    cur_frm.add_child("returned_items",{
                        item: r.message[i].item,
                        item_name: r.message[i].item,
                        tracking_number_1: d.tracking_number,
                    })
                    cur_frm.refresh_field("returned_items")
                }
            }
        })
    }
}


cur_frm.cscript.box = function (frm, cdt, cdn) {
    cur_frm.refresh_field("returned_items")
    var d = locals[cdt][cdn]
    if(d.box){
        console.log(cur_frm)
        var product_style  = "width:40px;height:auto;margin-top:-9%"
        d.product_1 = "<img src=" + d.box + " width='120'" + "height='100'" + "></img>"
                refresh_table(d.box)

    cur_frm.refresh_field("returned_items")
    } else {
        d.product_1 = ""
        cur_frm.refresh_field("returned_items")
        refresh_table(cur_frm)
    }

}
cur_frm.cscript.box_content = function (frm, cdt, cdn) {
    cur_frm.refresh_field("returned_items")
    var d = locals[cdt][cdn]
    if(d.box_content){
        console.log(cur_frm)
        var product_style  = "width:40px;height:auto;margin-top:-9%"
        d.product_2 = "<img src=" + d.box_content + " width='120'" + "height='100'" + "></img>"
                refresh_table(cur_frm)

    cur_frm.refresh_field("returned_items")
    } else {
        d.product_2 = ""
        cur_frm.refresh_field("returned_items")
        refresh_table(cur_frm)
    }

    // <img src="/files/Stock/NSFB/NSFB-5361.jpg" style="width: 40px; height: auto; margin-top: -9%;">
}
cur_frm.cscript.label = function (frm, cdt, cdn) {
    cur_frm.refresh_field("returned_items")
    var d = locals[cdt][cdn]
    if(d.label){
        console.log(cur_frm)
        var product_style  = "width:40px;height:auto;margin-top:-9%"
        d.product_3 = "<img src=" + d.label + " width='120'" + "height='100'" + "></img>"
                refresh_table(cur_frm)

    cur_frm.refresh_field("returned_items")
    } else {
        d.product_3 = ""
        cur_frm.refresh_field("returned_items")
        refresh_table(cur_frm)
    }

    // <img src="/files/Stock/NSFB/NSFB-5361.jpg" style="width: 40px; height: auto; margin-top: -9%;">
}
function refresh_table(cur_frm) {
    var tracking_numbers_table_length = cur_frm.doc.tracking_numbers.length + 1
    for (var i = 0; i < cur_frm.doc.returned_items.length; i += 1) {
        if (cur_frm.doc.returned_items[i].box || cur_frm.doc.returned_items[i].box_content) {
            console.log(cur_frm.doc.returned_items[i].idx + tracking_numbers_table_length)
            document.getElementsByClassName("row-index")[cur_frm.doc.returned_items[i].idx + tracking_numbers_table_length].style.height = "110px";
            document.querySelectorAll("[data-fieldname='remarks']")[cur_frm.doc.returned_items[i].idx].style.height = "110px";
            document.querySelectorAll("[data-fieldname='tracking_number_1']")[cur_frm.doc.returned_items[i].idx].style.height = "110px";
            document.querySelectorAll("[data-fieldname='item_name']")[cur_frm.doc.returned_items[i].idx ].style.height = "110px";
            document.querySelectorAll("[data-fieldname='product_1']")[cur_frm.doc.returned_items[i].idx ].style.height = "110px";
            document.querySelectorAll("[data-fieldname='product_2']")[cur_frm.doc.returned_items[i].idx ].style.height = "110px";
        } else {
            document.getElementsByClassName("row-index")[cur_frm.doc.returned_items[i].idx + tracking_numbers_table_length].style.height = "40px";
            document.querySelectorAll("[data-fieldname='remarks']")[cur_frm.doc.returned_items[i].idx ].style.height = "40px";
            document.querySelectorAll("[data-fieldname='tracking_number_1']")[cur_frm.doc.returned_items[i].idx].style.height = "40px";
            document.querySelectorAll("[data-fieldname='item_name']")[cur_frm.doc.returned_items[i].idx ].style.height = "40px";
            document.querySelectorAll("[data-fieldname='product_1']")[cur_frm.doc.returned_items[i].idx ].style.height = "40px";
            document.querySelectorAll("[data-fieldname='product_2']")[cur_frm.doc.returned_items[i].idx].style.height = "40px";
        }

    }
}