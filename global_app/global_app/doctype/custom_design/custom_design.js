// Copyright (c) 2020, jan and contributors
// For license information, please see license.txt

frappe.ui.form.on('Custom Design', {
    setup: function () {
        cur_frm.trigger("sales_order")

    },
	refresh: function(frm) {
         cur_frm.fields_dict.sales_order.get_query = function () {
            return {
                filters: [
                    ['has_custom_item', '=', 1],
                    ['has_custom_design', '=', 0],
                    ['docstatus', '=', 1]
                ]

            }
         }
         cur_frm.set_df_property("pay_later", "read_only",["Finishing", "Shipping", "Printing"].includes(cur_frm.doc.status))

	},
    sales_order: function(frm) {
         if(cur_frm.doc.sales_order){
            frappe.db.get_doc("Sales Order", cur_frm.doc.sales_order)
                .then(so => {
                    cur_frm.set_df_property("pay_later", "hidden",!so.status.includes("Bill"))
                     if(cur_frm.is_new() || cur_frm.docstatus < 1){

                            for(var i=0;i<so.items.length;i+=1){
                                var item_code = so.items[i].item_code
                                frappe.db.get_doc("Item",item_code)
                                    .then(item => {
                                        if(item.item_group === "Custom"){
                                             cur_frm.add_child("custom_design_items",{
                                                item: item_code,
                                                item_name: item.item_name,
                                            })
                                            cur_frm.refresh_field("custom_design_items")
                                        }
                                })


                            }
                     }
            })
         }
	},
    on_submit: function () {
        if(cur_frm.doc.from_controller === "YES"){
            frappe.set_route('custom-design-contro')
        }
    }
});

frappe.ui.form.on('Custom Design Items', {
	attach_image: function(frm,cdt,cdn) {
         cur_frm.refresh_field("custom_design_items")
	}
});