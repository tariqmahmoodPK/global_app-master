
var shipment_rates = [];
var item_code_list = [];
var scale_att = [];
var ups_credentials = {}
var stamps_credentials = {}

this.frm.get_field("items").grid.only_sortable();
this.frm.get_field("pick_items").grid.only_sortable();
$(".grid-add-row").css('display', 'none');
function get_ups_credentials(doctype){
    var credentials = {}
    frappe.call({
        method: "global_app.doc_events.packing_slip.get_credentials",
        args: {
            "doctype": doctype
        },
        async: false,
        callback: function(r){
            credentials =  r.message
        }
    })
    return credentials
}
cur_frm.cscript.after_save = function(){
    console.log('AFTER SAVE')
    frappe.db.get_doc('Delivery Note', cur_frm.doc.delivery_note)
        .then(doc => {
           frappe.call({
                method: "global_app.events.change_so_status",
                args: {
                    so: doc.items[0].against_sales_order
                },
                async:false,
                callback: function () {}
            })
        })

}
cur_frm.cscript.onload_post_render = function(frm){
     var test_flg = false;
        cur_frm.doc.items.forEach(function (item) {

            if (item.status !== 'packed' || !item.status) {
                test_flg = true;
            }
        });
        if (test_flg) {
            ne_packing_logic(frm);
        }
    if (cur_frm.is_dirty()) {
        cur_frm.save()
    }
}

frappe.ui.form.on("Packing Slip", "onload", function (frm) {
if(cur_frm.doc.delivery_note){
            frappe.db.get_doc('Delivery Note', cur_frm.doc.delivery_note)
                .then(doc => {
                    cur_frm.doc.purchase_order = doc.po_no
                    cur_frm.refresh_field("purchase_order")
                })
        }
    ups_credentials = get_ups_credentials("UPS Settings")
    stamps_credentials = get_ups_credentials("Stamps Settings")
    qz.security.setCertificatePromise(function (resolve, reject) {
        //Preferred method - from saerver
     $.ajax({ url: "https://corsanywhere-jqogydb25a-uc.a.run.app/" + "https://digitalcertificate-jqogydb25a-uc.a.run.app/", cache: false, dataType: "text" }).then(resolve, reject);

        //Alternate method 1 - anonymous
        //        resolve();
 });
    qz.security.setSignaturePromise(function (toSign) {
      //  console.log("okkkk")
        return function (resolve, reject) {
            //Preferred method - from server
          $.ajax("https://corsanywhere-jqogydb25a-uc.a.run.app/" + "https://signature-jqogydb25a-uc.a.run.app/sign?request=" + toSign).then(resolve, reject);

            //Alternate method - unsigned
            //resolve();
        };
    });

    // frappe, msgprint("Please save the Packing Slip First", "Message");
    $(".grid-add-row").css('display', 'none');

    $("button[data-fieldname=add_to_box]").removeClass('btn btn-default btn-xs');
    $("button[data-fieldname=add_to_box]").addClass('btn btn-primary');
    $("button[data-fieldname=verify]").removeClass('btn btn-default btn-xs');
    $("button[data-fieldname=verify]").addClass('btn btn-primary');
    $("button[data-fieldname=capture_weight]").removeClass('btn btn-default btn-xs');
    $("button[data-fieldname=capture_weight]").addClass('btn btn-primary')
    item_code_list = [];
    frm.doc.items.forEach(function (item) {
        item_code_list.push(item.item_code);
    });
    frm.fields_dict.packages.grid.get_field('item').get_query =
        function () {
            return {
                filters: [
                    ['Item', 'item_code', 'in', item_code_list]
                ]

            }
        }

    //update some  fields
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Delivery Note",
            name: frm.doc.delivery_note,
        },
        callback: function(dl) {
            console.log(dl.message);
            dl = dl.message;
            var doctp = "";
            var nm = "";
            if (dl.items[0].against_sales_invoice) {
                doctp = "Sales Invoice";
                nm = dl.items[0].against_sales_invoice;
            } else {
                doctp = "Sales Order";
                nm = dl.items[0].against_sales_order;
            }
            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: doctp,
                    name: nm,
                },
                callback: function(SO) {
                    SO = SO.message;

                    // dESCISION UPON SALES ORDER
                    if (SO.third_party_shipping === 1) {
                        frappe.model.set_value(frm.doc.doctype, frm.doc.name, "third_party_shipping", SO.contact_display);
                        cur_frm.refresh_field("third_party_shipping");
                    }
                    if (SO.status === 'Cancelled') {
                        frappe.msgprint("This Sales Order has been cancelled You will not be able to do shipping", "Message");
                    }
                    if (SO.usps_shipment === 1 || SO.shipping_service.includes("USPS") || SO.shipping_service.includes("Priority Mail")) {

                        frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipping_carrier", "USPS");
                        cur_frm.refresh_field("shipping_carrier");
                        frm.fields_dict.select_box.get_query =
                            function () {
                                return {
                                    filters: [
                                        ['Package', 'carrier', 'not in', 'UPS']
                                    ]

                                }
                            }

                    } else {
                        frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipping_carrier", "UPS");
                        cur_frm.refresh_field("shipping_carrier");
                        frm.fields_dict.select_box.get_query =
                            function () {
                                return {
                                    filters: [
                                        ['Package', 'carrier', 'not in', 'USPS']
                                    ]

                                }
                            }
                    }

                    frappe.call({
                        method: "frappe.client.get",
                        args: {
                            doctype: "Shipping Service",
                            name: SO.shipping_service,
                        },
                        callback: function(S) {
                            S = S.message;
                            frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipping_service", SO.shipping_service);
                            cur_frm.refresh_field("shipping_service");
                            frappe.model.set_value(frm.doc.doctype, frm.doc.name, "service_code", S.service_code);
                            cur_frm.refresh_field("service_code");


                        }
                    })
                }
            });

        }
    });
    //new packaging
    // ne_packing_logic(frm);
    // if (frm.doc.shipping_carrier === "USPS") {
    //     pack_usps_items(frm)
    // }

});

//Shipment process
frappe.ui.form.on("Packing Slip", {
    verify: function (frm) {
        var qty_var = false
        frm.doc.items.forEach(function (item1) {

            if (frm.doc.v_item_code == item1.item_code) {
                if (item1.qty == item1.verified_qty) {
                    frappe.msgprint("Item quantity exceeded", "Caution")
                } else {
                    if (frm.doc.v_item_qty = item1.qty) {
                        frappe.model.set_value(item1.doctype, item1.name, "verified_qty", item1.qty);
                        cur_frm.refresh_field("verified_qty");
                    } else if (frm.doc.v_item_qty > item1.qty) {
                        frappe.msgprint("Item quantity exceeded", "Caution")
                    } else if (!frm.doc.v_item_qty) {
                        frappe.model.set_value(item1.doctype, item1.name, "verified_qty", item1.qty + 1);
                        cur_frm.refresh_field("verified_qty");
                    } else {
                        frappe.model.set_value(item1.doctype, item1.name, "verified_qty", frm.doc.v_item_qty);
                        cur_frm.refresh_field("verified_qty");
                    }
                }

            }
            if (item1.qty !== item1.verified_qty) {
                qty_var = true;
            }
        });
        if (qty_var) {
            frappe.model.set_value(frm.doc.doctype, frm.doc.name, "quantity_verification", '<b style="color:red">Not Completed</b>');
            cur_frm.refresh_field("quantity_verification");
        } else {

            frappe.model.set_value(frm.doc.doctype, frm.doc.name, "quantity_verification", '<b style="color:green">Completed</b>');
            cur_frm.refresh_field("quantity_verification");
            frappe.model.set_value(frm.doc.doctype, frm.doc.name, "q_verification_flag", true);
            cur_frm.refresh_field("q_verification_flag");
            frm.save()
        }

    },
    add_to_box: function (frm) {
        if(cur_frm.doc.pick_items.length > 0 && frm.doc.select_box){
            var boxx = frm.doc.select_box;
            var item_str = '';
            var qty_str = 0;
            var weight_str = 0;
            var price = 0;
            var item_q_str = '';

        frm.doc.pick_items.forEach(function (item) {
            if (item.__checked) {
                if (item_str === '') {
                    item_str = item.item_code;
                    item_q_str = item.item_code + '=' + item.qty;
                } else {
                    item_str += ', ' + item.item_code;
                    item_q_str += ', ' + item.item_code + '=' + item.qty;
                }
                qty_str += parseInt(item.qty);
                frm.doc.items.forEach(function (item1) {
                    if (item.item_code === item1.item_code) {
                        price += parseInt(item.qty) * item1.rate
                        if (item.qty >= item1.qty) {
                            frappe.model.set_value(item1.doctype, item1.name, "status", 'packed');
                            cur_frm.refresh_field("status");
                            $("div[data-fieldname=items]").find('div.grid-row[data-idx=' + item1.idx + ']').css('background-color', '#72bb82');
                        } else if (item.qty < item1.qty) {
                            frappe.model.set_value(item1.doctype, item1.name, "status", 'partial-packed');
                            cur_frm.refresh_field("status");
                            frappe.model.set_value(item1.doctype, item1.name, "qty", item1.qty - item.qty);
                            cur_frm.refresh_field("qty");
                        }
                    }
                });
            }
        });
        frm.refresh_field('pick_items')
        var child2 = cur_frm.add_child("packages_information");
        frappe.model.set_value(child2.doctype, child2.name, "package", boxx);
        frappe.model.set_value(child2.doctype, child2.name, "items", item_str);
        frappe.model.set_value(child2.doctype, child2.name, "items_quantity", item_q_str);
        frappe.model.set_value(child2.doctype, child2.name, "quantity", qty_str);
        frappe.model.set_value(child2.doctype, child2.name, "weight", weight_str);
        frappe.model.set_value(child2.doctype, child2.name, "price", price);
        frappe.model.set_value(child2.doctype, child2.name, "packing_slip_no", frm.doc.name);
        frappe.model.set_value(child2.doctype, child2.name, "matching_key", frm.doc.matching_key);
        cur_frm.refresh_field("packages_information");

        ne_packing_logic(frm);

        }
    },
    validate: function (frm) {
        if (frm.doc.shipping_carrier === "UPS") {
            if (!frm.doc.third_party_shipping) {
                frappe.model.set_value(frm.doc.doctype, frm.doc.name, "inhouse_insurance", 0);
                cur_frm.refresh_field("inhouse_insurance");
                frm.doc.packages_information.forEach(function (pckg) {
                    frappe.db.get_single_value('Shipping Insurance Inhouse', 'max_limit')
                    .then(max_limit => {
                       if (pckg.price <= max_limit) {
                           frappe.call({
                            method: "global_app.doc_events.packing_slip.get_inhouse_insurance",
                            args: {
                                price: pckg.price
                            },
                            async: false,
                            callback:function(resp) {
                                console.log(resp.message)
                                frappe.model.set_value(frm.doc.doctype, frm.doc.name, "inhouse_insurance", frm.doc.inhouse_insurance + resp.message);
                                frappe.model.set_value(pckg.doctype, pckg.name, "ups_insurance", 0);
                                frappe.model.set_value(pckg.doctype, pckg.name, "declared_value", 0);
                                cur_frm.refresh_field("inhouse_insurance");
                                cur_frm.refresh_field("packages_information");
                            }
                        });
                       } else {
                        frappe.model.set_value(pckg.doctype, pckg.name, "ups_insurance", 1);
                        frappe.model.set_value(pckg.doctype, pckg.name, "declared_value", pckg.price);
                        cur_frm.refresh_field("packages_information");
                        }

                    })

                })
            }
            else {
                frm.doc.packages_information.forEach(function (pckg) {
                    frappe.model.set_value(pckg.doctype, pckg.name, "ups_insurance", 1);
                    frappe.model.set_value(pckg.doctype, pckg.name, "declared_value", pckg.price);
                    cur_frm.refresh_field("packages_information");
                })
            }
        }
    },


    refresh: function (frm) {
        window.onerror = function (messageOrEvent, source, lineno, colno, error) {
            frappe.call({
                method: "global_app.doc_events.packing_slip.log_error",
                args: {
                    messageOrEvent: messageOrEvent,
                    source: source,
                    lineno: lineno,
                    error: error,
                    file: "Packing Slip"
                },
                callback: function(resp) {}
            });
        }

        $("button[data-fieldname=add_to_box]").removeClass('btn btn-default btn-xs');
        $("button[data-fieldname=add_to_box]").addClass('btn btn-primary');
        $("button[data-fieldname=verify]").removeClass('btn btn-default btn-xs');
        $("button[data-fieldname=verify]").addClass('btn btn-primary');
        $("button[data-fieldname=verify]").css('margin-top', '12%')
        $("button[data-fieldname=verify]").css('background', 'green')
        $("button[data-fieldname=capture_weight]").removeClass('btn btn-default btn-xs');
        $("button[data-fieldname=capture_weight]").addClass('btn btn-primary')

        var matching_key_comp = {
            'total_qty': 0,
            'flages': [],
            'hardware': [],
        }
        var qty_vr = false;
        $.each(frm.doc.items || [], function (i, item) {

            if (item.qty !== item.verified_qty) {
                qty_vr = true
            }
            if (!item.thumbnail) {
                frappe.call({
                    method: "frappe.client.get",
                    args: {
                        doctype: "Item",
                        name: item.item_code,
                    },
                    callback: function(dl) {
                        frappe.model.set_value(item.doctype, item.name, "thumbnail", "<img src=" + dl.message.image + " style='width:40px;height:auto;margin-top:-9%;position:absolute'></img>");
                        cur_frm.refresh_field("thumbnail");
                        frappe.model.set_value(item.doctype, item.name, "image", dl.message.image);
                        cur_frm.refresh_field("image");
                    }
                });
            }

            matching_key_comp.total_qty = matching_key_comp.total_qty + item.qty;
            if (item.item_code.split('-')[0] !== "NSH") {
                if (matching_key_comp.flages.length === 0) {
                    matching_key_comp.flages.push({ 'item_code_cat': item.item_code.split('-')[0], 'qty': item.qty });
                } else {
                    var sig = true;
                    matching_key_comp.flages.forEach(function (flg) {
                        if (item.item_code.split('-')[0] === flg.item_code_cat) {
                            flg.qty = flg.qty + item.qty;
                            sig = false;
                        }
                    })
                    if (sig)
                        matching_key_comp.flages.push({ 'item_code_cat': item.item_code.split('-')[0], 'qty': item.qty });

                }
            } else {
                matching_key_comp.hardware.push({ 'hardware_code': item.item_code, 'qty': item.qty });
            }
            if (i === (frm.doc.items.length - 1)) {
                if (!frm.doc.matching_key || frm.doc.matching_key === null) {
                    var final_matching_key = '';
                    matching_key_comp.flages.forEach(function (flg) {
                        var temp = flg.item_code_cat + ':';
                        final_matching_key += temp;
                    })
                    final_matching_key += '(H)';
                    var HQ = 0;
                    matching_key_comp.hardware.forEach(function (flg) {
                        HQ = HQ + flg.qty;
                        var temp = flg.hardware_code + ':';
                        final_matching_key += temp;
                    })
                    final_matching_key += '=FQ';
                    matching_key_comp.flages.forEach(function (flg) {
                        var temp = '[' + flg.qty + ']';
                        final_matching_key += temp;
                    })
                    final_matching_key += 'HQ' + HQ;
                    var TQ = matching_key_comp.total_qty;
                    final_matching_key += '=T' + TQ;

                    if (!frm.doc.matching_key) {
                        frappe.model.set_value(frm.doc.doctype, frm.doc.name, "matching_key", final_matching_key);
                        cur_frm.refresh_field("matching_key");
                    }
                }

            }

        });


        if (qty_vr && frm.doc.quantity_verification.indexOf('Not Completed') === -1) {
            frappe.model.set_value(frm.doc.doctype, frm.doc.name, "quantity_verification", '<b style="color:red">Not Completed</b>');
            cur_frm.refresh_field("quantity_verification");
        } else if (!qty_vr && frm.doc.quantity_verification.indexOf('Not Completed') > -1) {
            frappe.model.set_value(frm.doc.doctype, frm.doc.name, "quantity_verification", '<b style="color:green">Completed</b>');
            cur_frm.refresh_field("quantity_verification");
        }

        //check if item note packed and show option to add to box
        // var test_flg = false;
        // frm.doc.items.forEach(function (item) {
        //
        //     if (item.status !== 'packed' || !item.status) {
        //         test_flg = true;
        //     }
        // });
        // if (test_flg) {
        //     ne_packing_logic(frm);
        // }

        $(".grid-add-row").css('display', 'none');

        var item_code_list = [];
        frm.doc.items.forEach(function (item) {
            item_code_list.push(item.item_code);
        });


        frm.add_custom_button(__('Print Shipping Labels'),
            function () {
                batch_shipping_label(frm);
            }, __("Shipment"));

        frm.add_custom_button(__('Print Return Labels'),
            function () {
                batch_return_label(frm);
            }, __("Shipment"));

        frm.add_custom_button(__('Reprint Labels'),
            function () {
                reprint_label(frm);
            }, __("Shipment"));

        frm.add_custom_button(__('Cancel Shipment'),
            function () {
                cancel_shipment(frm);
            }, __("Shipment"));

        if (frm.doc.shipping_carrier === "USPS") {
             frm.fields_dict.select_box.get_query =
                function () {
                    return {
                        filters: [
                            ['Package', 'carrier', 'not in', 'UPS']
                        ]

                    }
                }
                if(cur_frm.doc.packages_information.length === 0){
                    pack_usps_items(frm)
                }
        }
        if (frm.doc.shipping_carrier === "UPS") {
            frm.fields_dict.select_box.get_query =
                function () {
                    return {
                        filters: [
                            ['Package', 'carrier', 'not in', 'USPS']
                        ]

                    }
                }
                if(cur_frm.doc.packages_information.length === 0) {
                    pack_ups_items(frm)
                }
        }


    }
});

frappe.ui.form.on("Packing Slip Item", {
    add_to_box: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        if (row.qty < row.quantity) {
            alert('Please select a valid qayantity');
        } else {

            var child2 = cur_frm.add_child("packages_information");
            frappe.model.set_value(child2.doctype, child2.name, "package", row.package);
            frappe.model.set_value(child2.doctype, child2.name, "items", row.item_code);
            frappe.model.set_value(child2.doctype, child2.name, "quantity", row.quantity);
            frappe.model.set_value(child2.doctype, child2.name, "weight", row.net_weight);
            frappe.model.set_value(child2.doctype, child2.name, "packing_slip_no", row.parent);
            cur_frm.refresh_field("packages_information");

            // removing record from items grid
            if (row.qty > row.quantity) {
                console.log("here...........");
                frappe.model.set_value(row.doctype, row.name, "qty", row.qty - row.quantity);
                cur_frm.refresh_field("items");
                frappe.model.set_value(row.doctype, row.name, "status", 'partial-packed');
                cur_frm.refresh_field("items");
            } else {
                //change status
                frappe.model.set_value(row.doctype, row.name, "status", 'packed');
                cur_frm.refresh_field("items");

                //change color

                $("div[data-fieldname=items]").find('div.grid-row[data-idx=' + row.idx + ']').css('background-color', '#72bb82');

            }


        }



        console.log(frm.doc);
    }
});


function do_packaging(list, element, frm) {

    if (element.status !== 'packed') {
        var total = 0;
        var final_list = [];
        list.forEach(function (list_item) {
            if (list_item.sublist.length > total) {
                total = list_item.sublist.length;
                final_list = list_item;
            }
        })
        if (final_list.sublist.length > 1) {
            //adding to details box
            var child = cur_frm.add_child("packages");
            frappe.model.set_value(child.doctype, child.name, "package", final_list.data.package);
            frappe.model.set_value(child.doctype, child.name, "item", element.item_code);
            frappe.model.set_value(child.doctype, child.name, "quantity", element.qty);
            frappe.model.set_value(child.doctype, child.name, "weight", element.net_weight);
            frappe.model.set_value(child.doctype, child.name, "packing_slip_no", element.parent);
            cur_frm.refresh_field("packages");
            //adding to summary
            var child2 = cur_frm.add_child("packages_information");
            frappe.model.set_value(child2.doctype, child2.name, "package", final_list.data.package);
            frappe.model.set_value(child2.doctype, child2.name, "items", element.item_code);
            frappe.model.set_value(child2.doctype, child2.name, "quantity", element.quantity);
            frappe.model.set_value(child2.doctype, child2.name, "weight", element.net_weight);
            frappe.model.set_value(child2.doctype, child2.name, "packing_slip_no", element.parent);
            cur_frm.refresh_field("packages_information");
            //change packed status
            frappe.model.set_value(element.doctype, element.name, "status", 'packed');
            cur_frm.refresh_field("items");
            var total_quantity = element.quantity;
            var total_weeight = element.net_weight;
            $.each(final_list.sublist || [], function (j, sub_item) {
                total_quantity = total_quantity + sub_item.sub_data.quantity;
                total_weeight = total_weeight + sub_item.sub_data.weight;
                //adding to details box
                var child = cur_frm.add_child("packages");
                frappe.model.set_value(child.doctype, child.name, "package", final_list.data.package);
                frappe.model.set_value(child.doctype, child.name, "item", sub_item.sub_data.item);
                frappe.model.set_value(child.doctype, child.name, "quantity", sub_item.sub_data.quantity);
                frappe.model.set_value(child.doctype, child.name, "weight", sub_item.sub_data.weight);
                frappe.model.set_value(child.doctype, child.name, "packing_slip_no", element.parent);
                cur_frm.refresh_field("packages");
                //appending to summary
                frappe.model.set_value(child2.doctype, child2.name, "items", child2.items + ", " + sub_item.sub_data.item);
                frappe.model.set_value(child2.doctype, child2.name, "quantity", total_quantity);
                frappe.model.set_value(child2.doctype, child2.name, "weight", total_weeight);
                cur_frm.refresh_field("packages_information");
                //change status
                frm.doc.items.forEach(function (V) {
                    if (sub_item.sub_data.item == V.item_code) {
                        frappe.model.set_value(V.doctype, V.name, "status", 'packed');
                        cur_frm.refresh_field("items");
                    }
                })

            });
            //change color
            $.each(cur_frm.doc.items, function (i, item) {
                if (item.status == 'packed') {
                    $("div[data-fieldname=items]").find('div.grid-row[data-idx=' + item.idx + ']').css('background-color', '#72bb82');
                }
            });
        } else if (final_list.sublist.length == 1) {
            console.log("in  one");
            //adding to details box
            var child = cur_frm.add_child("packages");
            frappe.model.set_value(child.doctype, child.name, "package", final_list.data.package);
            frappe.model.set_value(child.doctype, child.name, "item", element.item_code);
            frappe.model.set_value(child.doctype, child.name, "quantity", element.qty);
            frappe.model.set_value(child.doctype, child.name, "weight", element.net_weight);
            frappe.model.set_value(child.doctype, child.name, "packing_slip_no", element.parent);
            cur_frm.refresh_field("packages");
            //adding to summary
            var child2 = cur_frm.add_child("packages_information");
            frappe.model.set_value(child2.doctype, child2.name, "package", final_list.data.package);
            frappe.model.set_value(child2.doctype, child2.name, "items", element.item_code);
            frappe.model.set_value(child2.doctype, child2.name, "quantity", element.quantity);
            frappe.model.set_value(child2.doctype, child2.name, "weight", element.net_weight);
            frappe.model.set_value(child2.doctype, child2.name, "packing_slip_no", element.parent);
            cur_frm.refresh_field("packages_information");
            //change status
            frappe.model.set_value(element.doctype, element.name, "status", 'packed');
            cur_frm.refresh_field("items");

            //sub items
            console.log(final_list.sublist[0].sub_data);
            //adding to details box
            var child = cur_frm.add_child("packages");
            frappe.model.set_value(child.doctype, child.name, "package", final_list.data.package);
            frappe.model.set_value(child.doctype, child.name, "item", final_list.sublist[0].sub_data.item);
            frappe.model.set_value(child.doctype, child.name, "quantity", final_list.sublist[0].sub_data.quantity);
            frappe.model.set_value(child.doctype, child.name, "weight", final_list.sublist[0].sub_data.weight);
            frappe.model.set_value(child.doctype, child.name, "packing_slip_no", element.parent);
            cur_frm.refresh_field("packages");
            //adding to summary
            frappe.model.set_value(child2.doctype, child2.name, "items", child2.items + ", " + final_list.sublist[0].sub_data.item);
            frappe.model.set_value(child2.doctype, child2.name, "quantity", element.qty + final_list.sublist[0].sub_data.quantity);
            frappe.model.set_value(child2.doctype, child2.name, "weight", element.net_weight + final_list.sublist[0].sub_data.weight);
            cur_frm.refresh_field("packages_information");
            frm.doc.items.forEach(function (V) {
                if (final_list.sublist[0].sub_data.item == V.item_code) {
                    frappe.model.set_value(V.doctype, V.name, "status", 'packed');
                    cur_frm.refresh_field("items");
                }
            });
            //change color
            $.each(cur_frm.doc.items, function (i, item) {
                if (item.status == 'packed') {
                    $("div[data-fieldname=items]").find('div.grid-row[data-idx=' + item.idx + ']').css('background-color', '#72bb82');
                    // console.log($("div[data-fieldname=items]").find('div.grid-row[data-idx='+item.idx+']').css('background-color', '#FF0000 '));
                    // $("div[data-fieldname=items]").find('div.grid-row[data-idx='+item.idx+']').find('.grid-static-col').css({'background-color': '#FF0000 !important'});
                }
            });
        } else {
            console.log("in < one");
            var child = cur_frm.add_child("packages");
            frappe.model.set_value(child.doctype, child.name, "package", final_list.data.package);
            frappe.model.set_value(child.doctype, child.name, "item", element.item_code);
            frappe.model.set_value(child.doctype, child.name, "quantity", element.qty);
            frappe.model.set_value(child.doctype, child.name, "weight", element.net_weight);
            frappe.model.set_value(child.doctype, child.name, "packing_slip_no", element.parent);
            cur_frm.refresh_field("packages");
            //adding to summary
            var child2 = cur_frm.add_child("packages_information");
            frappe.model.set_value(child2.doctype, child2.name, "package", final_list.data.package);
            frappe.model.set_value(child2.doctype, child2.name, "items", element.item_code);
            frappe.model.set_value(child2.doctype, child2.name, "quantity", element.quantity);
            frappe.model.set_value(child2.doctype, child2.name, "weight", element.net_weight);
            frappe.model.set_value(child2.doctype, child2.name, "packing_slip_no", element.parent);
            cur_frm.refresh_field("packages_information");
            frappe.model.set_value(element.doctype, element.name, "status", 'packed');
            cur_frm.refresh_field("items");
            //changing background
            $.each(cur_frm.doc.items, function (i, item) {
                if (item.status == 'packed') {
                    $("div[data-fieldname=items]").find('div.grid-row[data-idx=' + item.idx + ']').css('background-color', '#72bb82');
                    // console.log($("div[data-fieldname=items]").find('div.grid-row[data-idx='+item.idx+']').css('background-color', '#FF0000 '));
                    // $("div[data-fieldname=items]").find('div.grid-row[data-idx='+item.idx+']').find('.grid-static-col').css({'background-color': '#FF0000 !important'});
                }
            });
        }


    }

}
function item_code_pick_items(item_code, cur_frm) {
    for (var xx = 0;xx<cur_frm.doc.pick_items.length;xx +=1) {
        if (cur_frm.doc.pick_items[xx].item_code === item_code) {
            return true
        }
    }
    return false
}
frappe.ui.form.on("Packing Slip packages shadow", {
    shipping_label: function (frm, cdt, cdn) {
       print_shipping_label(frm, cdt, cdn);
    },
    return_shipping: function (frm, cdt, cdn) {
        return_shipping_label(frm, cdt, cdn);
    },
    details: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        var dialog = new frappe.ui.Dialog({
            title: __("Packaging Details"),
            fields: [{
                "fieldtype": "HTML",
                "label": __("BOX:"),
                "fieldname": "package"
            },
            { "fieldtype": "HTML", "label": __("ITEMS:"), "fieldname": "modal_items" },
            { "fieldtype": "HTML", "label": __("TOTAL QUANTITY"), "fieldname": "quantity" },
            { "fieldtype": "HTML", "label": __("TOTAL WEIGHT"), "fieldname": "weight" },


            { "fieldtype": "Column Break", "fieldname": "column_break1" },
            { "fieldtype": "Button", "label": __("Shipping&nbsp Label"), "fieldname": "shipping_label" },

            { "fieldtype": "Button", "label": __("Return Shipping"), "fieldname": "return_label" }

            ]
        });
        dialog.fields_dict.shipping_label.input.onclick = function () {

            print_shipping_label(frm, cdt, cdn);
        }
        dialog.fields_dict.return_label.input.onclick = function () {
            return_shipping_label(frm, cdt, cdn);
        }

        var box_name = $("<div id='box_name'><h2> BOX :" + row.package + "</h2><hr><h3>ITEMS:</h3></div>");
        var items_div = document.getElementById("box_name");
        var order_list = $("<ol></ol>");
        var items_array = row.items.split(',');
        console.log(row.items);

        items_array.forEach(function (item_name) {
            console.log(item_name);
            var list_item = $("<li>" + item_name + "</li>");
            order_list.append(list_item);
        });
        box_name.append(order_list);
        var total_quantity = $("<div id='total_qty'><hr><strong>TOTAL QUANTITY : " + row.quantity + " Units</strong></div>");
        var total_weight = $("<div id='total_wght'><strong>TOTAL WEIGHT  &nbsp;  &nbsp;  : " + row.weight + " lbs</strong></div>");

        dialog.fields_dict.package.$wrapper.html(box_name);
        //dialog.fields_dict.modal_items.$wrapper.html(items_div);
        dialog.fields_dict.quantity.$wrapper.html(total_quantity);
        dialog.fields_dict.weight.$wrapper.html(total_weight);

        // dialog.fields_dict.shipping_label.$wrapper.html("<button class='btn btn-primary btn-small' onClick="+ print_shipping_label(frm,cdt,cdn)+" >Print &nbsp; Shipping&nbsp; Label</button>");
        // dialog.fields_dict.return_label.$wrapper.html("<button class='btn btn-primary brn-small' onClick="+return_shipping_label(frm,cdt,cdn)+" >Return Shipping Label</button>");
        dialog.show();
    },
    before_packages_information_remove: function (frm, cdt, cdn) {
        if(cur_frm.doc.shipping_carrier === "USPS"){
            var row = locals[cdt][cdn];
            var row_items = row.items.split(', ');
            frm.doc.items.forEach(function (item) {
                row_items.forEach(function (r_itm) {
                    if (item.item_code === r_itm) {
                        frappe.model.set_value(item.doctype, item.name, "status", null);
                        cur_frm.refresh_field("items");
                    }
                })
            });
            ne_packing_logic(frm);
        }
        else if (cur_frm.doc.shipping_carrier === "UPS"){
             var row1 = locals[cdt][cdn];
            // var row_items = row.items.split(', ');
            var row_items_quantity = row1.items_quantity.split(', ');
            frm.doc.items.forEach(function (item) {
                row_items_quantity.forEach(function (r_itm) {
                    var row_items_quantity_strings = r_itm.split("=")
                    if (item.item_code === row_items_quantity_strings[0] && item_code_pick_items(row_items_quantity_strings[0], cur_frm)) {
                        frappe.model.set_value(item.doctype, item.name, "status", null);

                        frappe.model.set_value(item.doctype, item.name, "qty", item.qty + parseInt(row_items_quantity_strings[1]));
                        cur_frm.refresh_field("items");
                    } else if (item.item_code === row_items_quantity_strings[0] && !item_code_pick_items(row_items_quantity_strings[0], cur_frm)) {
                         frappe.model.set_value(item.doctype, item.name, "status", null);
                         frappe.model.set_value(item.doctype, item.name, "qty", parseInt(row_items_quantity_strings[1]));

                         cur_frm.refresh_field("items");

                    }
                })
            });

            ne_packing_logic(frm);
        }

    },
    capture_weight: function (frm, cdt, cdn) {
        if (!qz.websocket.isActive()) {
            qz.websocket.connect().then(function () {
                qz.hid.listDevices().then(function (data) {
                    scale_att = [];
                    for (var i = 0; i < data.length; i++) {
                        var device = data[i];
                        console.log(device);
                        if (device.manufacturer) {
                            if (device.manufacturer.toLowerCase() === "mettler toledo") {
                                console.log("found..........");
                                scale_att.push({
                                    'vend': device.vendorId,
                                    'prod': device.productId,
                                    'usage': device.usagePage,
                                    'ser': device.serial
                                });
                                console.log("ddd");
                                read_data(cdt, cdn);
                                console.log("done");
                            }
                        }

                    }

                }).catch(console.log("err"));


            }).catch(console.log("Could not connect to QZ Tray, please check if QZ Tray is active"))
        } else {
            if (scale_att.length === 0) {
                qz.hid.listDevices().then(function (data) {
                    scale_att = [];
                    for (var i = 0; i < data.length; i++) {
                        var device = data[i];
                        console.log(device);
                        if (device.manufacturer) {
                            if (device.manufacturer.toLowerCase() === "mettler toledo") {
                                console.log("found");
                                scale_att.push({
                                    'vend': device.vendorId,
                                    'prod': device.productId,
                                    'usage': device.usagePage,
                                    'ser': device.serial
                                });
                                console.log("ddd");
                                read_data(cdt, cdn);
                                console.log("done");
                            }
                        }

                    }

                }).catch(console.log(""));

            } else {
                read_data(cdt, cdn);
            }

        }
    }
});

//read weight scale
function read_data(cdt, cdn) {
    console.log(scale_att);
    console.log("Claimeing");
    qz.hid.isClaimed({
        vendorId: scale_att[0].vend,
        productId: scale_att[0].prod
    })
        .then(function (claimed) {
            if (claimed) {
                console.log("calling cap");
                cap_weight(cdt, cdn)
            } else {
                qz.hid.claimDevice({
                    vendorId: scale_att[0].vend,
                    productId: scale_att[0].prod,
                    usagePage: scale_att[0].usage,
                    serial: scale_att[0].ser
                }).then(function () {
                    console.log("Claimeing");
                    console.log("cliamed");

                    cap_weight(cdt, cdn);
                }).catch(console.log("err"));

            }
        }).catch(console.log("err"));

}

function cap_weight(cdt, cdn) {
    console.log(scale_att[0].ser);
    console.log(scale_att);
    qz.hid.readData({
        vendorId: scale_att[0].vend,
        productId: scale_att[0].prod,
        usagePage: scale_att[0].usage,
        serial: scale_att[0].ser,
        responseSize: 8
    }).then(function (data) {
        //console.log("Response:" +  readScaleData(data));
        var row = locals[cdt][cdn];
        frappe.model.set_value(row.doctype, row.name, "weight", readScaleData(data));
        cur_frm.refresh_field('weight');
        //update SHA

        frappe.model.set_value(row.doctype, row.name, "w_cap_flag", true);
        cur_frm.refresh_field('w_cap_flag');
        cur_frm.refresh_field("packages_information");
    }).catch(console.log('"err" in cap weight'));
    console.log("did it");
}
//packages
frappe.ui.form.on('Packing Slip packages', {
    package: function (frm, cdt, cdn) {
        console.log('package');
        update_summary(frm);
    },
    item: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        console.log(row);
        $.each(cur_frm.doc.items, function (i, item) {
            if (item.item_code == row.item) {
                frappe.model.set_value(row.doctype, row.name, "quantity", item.qty);
                frappe.model.set_value(row.doctype, row.name, "weight", item.net_weight);
                frm.refresh_field('packages');

                frappe.model.set_value(item.doctype, item.name, "status", 'packed');
                frm.refresh_field('items');
                $("div[data-fieldname=items]").find('div.grid-row[data-idx=' + item.idx + ']').css('background-color', '#72bb82');
            }
        });

        update_summary(frm);
    },
    quantity: function (frm, cdt, cdn) {
        console.log('quantity');
        update_summary(frm);
    },
    before_packages_remove: function (frm, cdt, cdn) {
        var row = locals[cdt][cdn];
        console.log(row);
        $.each(cur_frm.doc.items, function (i, item) {
            if (item.item_code === row.item) {
                frappe.model.set_value(item.doctype, item.name, "status", '');
                $("div[data-fieldname=items]").find('div.grid-row[data-idx=' + item.idx + ']').css('background-color', '#ffffff');
            }
        });

    },
    packages_remove: function (frm, cdt, cdn) {
        update_summary(frm);
    }
});

function print_shipping_label(frm, cdt, cdn) {
    console.log(frm.doc.shipping_service)
    var ups_address;
    var usps_address;
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "UPS Settings"
        },
        callback: function(r) {
            ups_address = r.message
        }
    });
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "USPS Settings"
        },
        callback: function(r) {
            usps_address = r.message
        }
    });
    
    if (frm.doc.name.indexOf("New Packing Slip") > -1) {
        frappe.msgprint("Please Save the document first")
        return false;
    }
    var row = locals[cdt][cdn];
    if (frm.doc.shipping_carrier === "UPS") {
        if (frm.doc.shipment === "done") {
            frappe.msgprint("You Have already done a shipment against this Order, cancel that and try again", "Warning");
        } else {
            var length, width, height;
            var default_number = ""
            frappe.call({
                method: "global_app.doc_events.packing_slip.get_default_phone_number",
                args: {
                    dn: frm.doc.delivery_note,
                },
                async: false,
                callback: function(r) {
                    default_number = r.message
                }
            })
            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Package",
                    name: row.package,
                },
                async: false,
                callback: function(pkg) {
                    length = pkg.message.length;
                    width = pkg.message.width;
                    height = pkg.message.hight;
                }
            })
            var ins_money_value = "100";
            var package_cost = 0
            package_cost = row.price;
            if (row.ups_insurance) {
                if (row.declared_value) {
                    ins_money_value = row.declared_value;
                }
            }
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

            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Delivery Note",
                    name: frm.doc.delivery_note,
                },
                callback:function(dl) {
                    console.log(dl.message);
                    dl = dl.message;
                    var address_info;

                    frappe.call({
                        method: "frappe.client.get",
                        args: {
                            doctype: "Address",
                            name: dl.shipping_address_name,
                        },
                        callback: function(r) {
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
                                if (frm.doc.third_party_shipping) {
                                    frappe.call({
                                        method: 'frappe.client.get',
                                        async: false,
                                        no_spinner: true,
                                        args: {
                                            doctype: "Contact",
                                            name: dl.contact_person
                                        },
                                        callback: function (contact) {
                                            contact = contact.message;
                                            console.log("***********************  FIRST ****************************")
                                            // fetch billing address
                                            frappe.call({
                                                method: 'frappe.client.get',
                                                async: false,
                                                no_spinner: true,
                                                args: {
                                                    doctype: "Address",
                                                    name: contact.usps_billing_address
                                                },
                                                callback: function (b_add) {
                                                    console.log("***********************  SECOND ****************************")
                                                    b_add = b_add.message;
                                                    console.log(b_add)
                                                    console.log(b_add.state)
                                                    frappe.call({
                                                        method: "frappe.client.get",
                                                        async: false,
                                                        args: {
                                                            doctype: "US States",
                                                            name: b_add.state,
                                                        },
                                                        callback: function(cnt_s) {
                                                            //console.log(r2.message);
                                                            console.log("***********************  THIRD ****************************")
                                                            console.log(cnt_s.message)
                                                            var state_c = cnt_s.message.abb;
                                                            paymentinfo = "";
                                                            var b_address_lines = [];
                                                            var country_code = "US";
                                                            if (b_add.country_code) {
                                                                country_code = b_add.country_code;

                                                            }
                                                            else {
                                                                frappe.call({
                                                                    method: "frappe.client.get",
                                                                    async: false,
                                                                    args: {
                                                                        doctype: "Country",
                                                                        name: b_add.country,
                                                                    },
                                                                    callback: function(cntry) {
                                                                        country_code = cntry.message.code

                                                                    }
                                                                });

                                                            }

                                                            if (b_add.address_line2) {
                                                                b_address_lines.push(b_add.address_line2)
                                                            }
                                                            b_address_lines.push(b_add.address_line1)
                                                            paymentinfo = {
                                                                "ShipmentCharge": {
                                                                    "Type": "01",
                                                                    "BillThirdParty": {
                                                                        "AccountNumber": contact.ups_account_no,
                                                                        "Address": {
                                                                            "AddressLine": b_address_lines,
                                                                            "City": b_add.city,
                                                                            "StateProvinceCode": state_c,
                                                                            "PostalCode": b_add.pincode,
                                                                            "CountryCode": country_code
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                                console.log("***********************  FOURTH ****************************")
                                address_info = r.message;
                                var country_code = "US";
                                if (address_info.country_code) {
                                    country_code = address_info.country_code;

                                }
                                else {
                                    frappe.call({
                                        method: "frappe.client.get",
                                        async: false,
                                        args: {
                                            doctype: "Country",
                                            name: address_info.country,
                                        },
                                        callback: function(cntry) {
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
                                    method: "frappe.client.get",
                                    args: {
                                        doctype: "US States",
                                        name: address_info.state,
                                    },
                                    callback: function(r2) {
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
                                                    "Username": ups_credentials.username,
                                                    "Password": ups_credentials.password
                                                },
                                                "ServiceAccessToken": { "AccessLicenseNumber": "5D2E60A4DB1D2598" }

                                            },
                                            "ShipmentRequest": {
                                                "Request": {
                                                    "RequestOption": "nonvalidate",
                                                    "TransactionReference": {
                                                        "CustomerContext": dl.customer_name
                                                    }
                                                },
                                                "Shipment": {
                                                    "Description": "SO#: " + dl.items[0].against_sales_order + " | PO#: " + dl.po_no,

                                                    "ShipTo": {
                                                        "Name": address_info.address_title,
                                                        "AttentionName": address_info.attention_name,
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
                                                        "Name": ups_address.name1,
                                                        "AttentionName": ups_address.attention_name,

                                                        "FaxNumber": "",
                                                        "Address": {
                                                            "AddressLine": ups_address.addressline,
                                                            "City": ups_address.city,
                                                            "StateProvinceCode": ups_address.state_province_code,
                                                            "PostalCode": ups_address.postal_code,
                                                            "CountryCode": ups_address.country_code
                                                        }

                                                    },
                                                    "Shipper": {
                                                        "Name": ups_address.name1,
                                                        "AttentionName": ups_address.attention_name,
                                                        "TaxIdentificationNumber": "46-1868081",
                                                        // "Phone": {
                                                        //     "Number": ups_address.phone_no,
                                                        //     "Extension": "1"
                                                        // },
                                                        "ShipperNumber": "E00A49",
                                                        "FaxNumber": "1234567890",

                                                        "Address": {
                                                            "AddressLine": ups_address.addressline,
                                                            "City":  ups_address.city,
                                                            "StateProvinceCode": ups_address.state_province_code,
                                                            "PostalCode": ups_address.postal_code,
                                                            "CountryCode": ups_address.country_code
                                                        }

                                                    },
                                                    "InvoiceLineTotal": {
                                                        "CurrencyCode": "USD",
                                                        "MonetaryValue": package_cost.toString()
                                                    },
                                                    "PaymentInformation": paymentinfo,
                                                    "Service": {
                                                        "Code": frm.doc.service_code,
                                                        "Description": frm.doc.shipping_service
                                                    },
                                                    "Package": {
                                                        "PackageServiceOptions": insurance,
                                                        "ReferenceNumber": [{
                                                            "Value": dl.items[0].against_sales_order
                                                        },
                                                        {
                                                            "Value": dl.po_no
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
                                                            "Weight": row.weight.toString()
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

                                        var dataInt = {
                                            "UPSSecurity": {
                                                "UsernameToken": {
                                                    "Username": ups_credentials.username,
                                                    "Password": ups_credentials.password
                                                },
                                                "ServiceAccessToken": { "AccessLicenseNumber": "5D2E60A4DB1D2598" }

                                            },
                                            "ShipmentRequest": {
                                                "Request": {
                                                    "RequestOption": "nonvalidate",
                                                    "TransactionReference": {
                                                        "CustomerContext": dl.customer_name
                                                    }
                                                },
                                                "Shipment": {
                                                    "Description": "SO#: " + dl.items[0].against_sales_order + " | PO#: " + dl.po_no,

                                                    "ShipTo": {
                                                        "Name": address_info.address_title,
                                                        "AttentionName": address_info.attention_name,
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
                                                        "Name": ups_address.name1,
                                                        "AttentionName": ups_address.attention_name,

                                                        "FaxNumber": "",
                                                        "Address": {
                                                            "AddressLine": ups_address.addressline,
                                                            "City": ups_address.city,
                                                            "StateProvinceCode": ups_address.state_province_code,
                                                            "PostalCode": ups_address.postal_code,
                                                            "CountryCode": ups_address.country_code
                                                        }

                                                    },
                                                    "Shipper": {
                                                        "Name": ups_address.name1,
                                                        "AttentionName": ups_address.attention_name,
                                                        "TaxIdentificationNumber": "46-1868081",
                                                        "Phone": {
                                                            "Number": ups_address.phone_no,
                                                            "Extension": "1"
                                                        },
                                                        "ShipperNumber": "E00A49",
                                                        "FaxNumber": "1234567890",

                                                        "Address": {
                                                            "AddressLine": ups_address.addressline,
                                                            "City":  ups_address.city,
                                                            "StateProvinceCode": ups_address.state_province_code,
                                                            "PostalCode": ups_address.postal_code,
                                                            "CountryCode": ups_address.country_code
                                                        }

                                                    },
                                                    "InvoiceLineTotal": {
                                                        "CurrencyCode": "USD",
                                                        "MonetaryValue": package_cost.toString()
                                                    },
                                                    "PaymentInformation": paymentinfo,
                                                    "Service": {
                                                        "Code": frm.doc.service_code,
                                                        "Description": frm.doc.shipping_service
                                                    },
                                                    "Package": {
                                                        "PackageServiceOptions": insurance,
                                                        "ReferenceNumber": [{
                                                            "Value": dl.items[0].against_sales_order
                                                        },
                                                        {
                                                            "Value": dl.po_no
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
                                                            "Weight": row.weight.toString()
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
                                        console.log(data);
                                        var url = ups_credentials.production ? ups_credentials.production_url : ups_credentials.test_url

                                        $.ajax({
                                            url:  'https://corsanywhere-jqogydb25a-uc.a.run.app/' + url + "/rest/Ship",
                                            type: "POST",
                                            contentType: "application/json; charset=utf-8",
                                            dataType: "json",
                                            data: frm.doc.shipping_service !== "UPS -Standard 'intl" ? JSON.stringify(data) : JSON.stringify(dataInt),
                                            success: function (data) {
                                                row = locals[cdt][cdn];
                                                handle_success_response_single(frm, data, dl, row);
                                            }
                                        });
                                    }
                                });

                            }
                        }
                    });
                }
            });
        }
    } else {

        var settings = {
            "async": true,
            "crossDomain": true,
            "url": "https://corsanywhere-jqogydb25a-uc.a.run.app/" + stamps_credentials.url,
            "method": "POST",
            "headers": {
                "content-type": "text/xml; charset=utf-8",
                "soapaction": "http://stamps.com/xml/namespace/2018/03/swsim/swsimv71/AuthenticateUser",
                "cache-control": "no-cache",
            },
            "data": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"\r\n               " +
            "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\r\n               " +
            "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"\r\n               " +
            "xmlns:tns=\"http://stamps.com/xml/namespace/2018/03/swsim/swsimv71\">\r\n  " +
            "<soap:Body>\r\n     <tns:AuthenticateUser>      \r\n\t     " +
            "<tns:Credentials>         \r\n\t\t     " +
            "<tns:IntegrationID>"+ stamps_credentials.integration_id +"</tns:IntegrationID>       \r\n\t\t     " +
            "<tns:Username>"+ stamps_credentials.username +"</tns:Username>       \r\n\t\t     " +
            "<tns:Password>"+ stamps_credentials.password +"</tns:Password>      \r\n\t     " +
            "</tns:Credentials>    \r\n     </tns:AuthenticateUser> \r\n  </soap:Body>\r\n</soap:Envelope>"
        }
        var usps_success_flag = false;
        $.ajax(settings).done(function (response) {

            var auth_token = response.getElementsByTagName("Authenticator")[0].innerHTML;

            var length, width, height;
            var package_name = "Package"
            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Package",
                    name: row.package,
                },
                async: false,
                callback: function(pkg) {
                    console.log(pkg.message)
                    length = pkg.message.length;
                    width = pkg.message.width;
                    height = pkg.message.hight;
                    if (pkg.message.usps_flat_box) {
                        package_name = row.package
                    }

                }
            })
            var transactionId = frm.doc.name.split('PAC-')[1] + row.name + length.toString() + "X" + width.toString() + "X" + height.toString() + "igladsolutions";

            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Delivery Note",
                    name: frm.doc.delivery_note,
                },
                callback: function(dl) {
                    console.log(dl.message);
                    dl = dl.message;
                    var address_info;

                    frappe.call({
                        method: "frappe.client.get",
                        args: {
                            doctype: "Address",
                            name: dl.shipping_address_name,
                        },
                        callback: function(r) {
                            if (r.message) {
                                address_info = r.message;
                                var country_code = "US";
                                if (address_info.country_code) {
                                    country_code = address_info.country_code;

                                }
                                else {
                                    frappe.call({
                                        method: "frappe.client.get",
                                        async: false,
                                        args: {
                                            doctype: "Country",
                                            name: address_info.country,
                                        },
                                        callback: function(cntry) {
                                            country_code = cntry.message.code

                                        }
                                    });

                                }
                                var state_abb;

                                frappe.call({
                                    method: "frappe.client.get",
                                    args: {
                                        doctype: "US States",
                                        name: address_info.state,
                                    },
                                    callback: function(r2) {
                                        console.log(r2.message);
                                        state_abb = r2.message.abb;
                                        var add_line_2 = "";
                                        if (address_info.address_line2) {
                                            add_line_2 = address_info.address_line2;

                                        }
                                        var date = frappe.datetime.now_date().toString();

                                        var create_indiciam = {
                                            "url": "https://corsanywhere-jqogydb25a-uc.a.run.app/" + stamps_credentials.url,
                                            "method": "POST",
                                            "headers": {
                                                "content-type": "text/xml; charset=utf-8",
                                                "soapaction": "http://stamps.com/xml/namespace/2018/03/swsim/swsimv71/CreateIndicium"
                                            },
                                            "data": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"\r\n" +
                                                "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\r\n" +
                                                "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"\r\n" +
                                                "xmlns:tns=\"http://stamps.com/xml/namespace/2018/03/swsim/swsimv71\">\r\n" +
                                                "<soap:Body>\r\n    <CreateIndicium  xmlns=\"http://stamps.com/xml/namespace/2018/03/swsim/swsimv71\">\r\n" +
                                                "<Authenticator>" + auth_token.toString() + "</Authenticator>\r\n" +
                                                "<IntegratorTxID>" + transactionId + "</IntegratorTxID>\r\n     \r\n      <TrackingNumber/>\r\n" +
                                                "<Rate>\r\n                    <FromZIPCode>92507</FromZIPCode>\r\n" +
                                                "<ToZIPCode>" + address_info.pincode + "</ToZIPCode>\r\n" +
                                                "<ServiceType>" + frm.doc.service_code + "</ServiceType>\r\n " +
                                                "<ServiceDescription>" + frm.doc.shipping_service + "</ServiceDescription>\r\n" +
                                                "<WeightLb>" + row.weight.toString() + "</WeightLb>\r\n" +
                                                "<PackageType>" + package_name + "</PackageType>\r\n<ShipDate>" + date + "</ShipDate>\r\n" +
                                                "<DeliveryDate>" + date + "</DeliveryDate>\r\n " +
                                                "<DimWeighting>N</DimWeighting>\r\n" +
                                                "<AddOns>\r\n" +
                                                "<AddOnV12>\r\n" +
                                                "<AddOnType>US-A-DC</AddOnType>\r\n" +
                                                "<AddOnDescription>Tracking</AddOnDescription>\r\n" +
                                                "<ProhibitedWithAnyOf>\r\n" +
                                                "<AddOnTypeV12>US-A-SC</AddOnTypeV12>\r\n" +
                                                "<AddOnTypeV12>US-A-CM</AddOnTypeV12>\r\n" +
                                                "<AddOnTypeV12>US-A-ASR</AddOnTypeV12>\r\n" +
                                                "<AddOnTypeV12>US-A-ASRD</AddOnTypeV12>\r\n" +
                                                "</ProhibitedWithAnyOf>\r\n " +
                                                "</AddOnV12>\r\n " +
                                                "<AddOnV12>" +
                                                "<AddOnType>SC-A-HP</AddOnType>" +
                                                "<AddOnDescription>Hidden Postage</AddOnDescription>" +
                                                "<ProhibitedWithAnyOf>" +
                                                "<AddOnTypeV12>US-A-RRM</AddOnTypeV12>" +
                                                "<AddOnTypeV12>US-A-REG</AddOnTypeV12>" +
                                                "<AddOnTypeV12>US-A-RD</AddOnTypeV12>" +
                                                "<AddOnTypeV12>US-A-COD</AddOnTypeV12>" +
                                                "<AddOnTypeV12>US-A-CM</AddOnTypeV12>" +
                                                "<AddOnTypeV12>US-A-RR</AddOnTypeV12>" +
                                                "<AddOnTypeV12>US-A-LAWS</AddOnTypeV12>" +
                                                "</ProhibitedWithAnyOf>" +
                                                "</AddOnV12>" +
                                                "<AddOnV12>\r\n  " +
                                                "<AddOnType>US-A-PR</AddOnType>\r\n  " +
                                                "<AddOnDescription>Perishable</AddOnDescription>\r\n  </AddOnV12>\r\n   \r\n    </AddOns>\r\n" +
                                                "<Surcharges />\r\n  <EffectiveWeightInOunces>" + Math.round((row.weight * 16).toString()) + "</EffectiveWeightInOunces>\r\n" +
                                                "<Zone>1</Zone>\r\n                    <RateCategory>1000</RateCategory>\r\n" +
                                                "<ToState>" + state_abb + "</ToState>\r\n         </Rate>\r\n      <From>\r\n        <FullName>"+usps_address.name1+"</FullName>\r\n        <Address1>"+usps_address.address_line+"</Address1>\r\n  <City>"+usps_address.city+"</City>\r\n        <State>"+usps_address.state_province_code+"</State>\r\n        <ZIPCode>"+usps_address.postal_code+"</ZIPCode>\r\n      </From>\r\n" +
                                                "<To>\r\n        <FullName>" + (address_info.attention_name == null ? "" : address_info.attention_name)  + "</FullName>\r\n        <NamePrefix/>\r\n        <FirstName/>\r\n        <MiddleName/>\r\n        <LastName/>\r\n        <NameSuffix/>\r\n        <Title/>\r\n        <Department/>\r\n        <Company>" + address_info.address_title.replace('&', '') + "</Company>\r\n        <Address1>" + address_info.address_line1 + "</Address1>\r\n        <Address2>" + add_line_2 + "</Address2>\r\n        <City>" + address_info.city + "</City>\r\n        <State>" + state_abb + "</State>\r\n        <ZIPCode>" + address_info.pincode + "</ZIPCode>\r\n               <PostalCode/>\r\n        <Country>" + country_code + "</Country>\r\n        <Urbanization/>\r\n        <PhoneNumber/>\r\n        <Extension/>\r\n             </To>\r\n" +
                                                "<memo>Rf No.1 :" + dl.items[0].against_sales_order + "#&#xd;&#xa;Rf No.2 : " + dl.po_no + "</memo></CreateIndicium>\r\n  </soap:Body>\r\n</soap:Envelope>"
                                        }
                                        var create_indiciam_resp = $.ajax(create_indiciam)
                                        create_indiciam_resp.done(function (response) {
                                            handle_success_response_single_usps(frm, response, dl, row)
                                            usps_success_flag = true;
                                        });
                                        create_indiciam_resp.error(function (response) {
                                            if (!usps_success_flag) {
                                                frappe.msgprint("Print Label " + response.responseText.split('<faultstring>')[1].split('</faultstring>')[0], "err");
                                            }
                                        });
                                    }
                                });

                            }
                        }
                    });
                }
            });
        });

    }
}

function return_shipping_label(frm, cdt, cdn) {
    console.log(frm.doc);
    var row = locals[cdt][cdn];
    if (frm.doc.shipping_carrier === "UPS") {

        var length, width, height;
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Package",
                name: row.package,
            },
            async: false,
            callback: function(pkg) {
                console.log(pkg.message)
                length = pkg.message.length;
                width = pkg.message.width;
                height = pkg.message.hight;
            }
        })

        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Delivery Note",
                name: frm.doc.delivery_note,
            },
            callback: function(dl) {
                console.log(dl.message);
                dl = dl.message;
                var address_info;

                frappe.call({
                    method: "frappe.client.get",
                    args: {
                        doctype: "Address",
                        name: dl.shipping_address_name,
                    },
                    callback: function(r) {
                        if (r.message) {
                            address_info = r.message;
                            var country_code = "US";
                            if (address_info.country_code) {
                                country_code = address_info.country_code;

                            }
                            else {
                                frappe.call({
                                    method: "frappe.client.get",
                                    async: false,
                                    args: {
                                        doctype: "Country",
                                        name: address_info.country,
                                    },
                                    callback: function(cntry) {
                                        country_code = cntry.message.code

                                    }
                                });

                            }
                            var state_abb;
                            console.log(address_info);
                            console.log(address_info.address_line1);
                            frappe.call({
                                method: "frappe.client.get",
                                args: {
                                    doctype: "US States",
                                    name: address_info.state,
                                },
                                callback: function(r2) {
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
                                                "Username": ups_credentials.username,
                                                "Password": ups_credentials.password
                                            },
                                            "ServiceAccessToken": { "AccessLicenseNumber": "5D2E60A4DB1D2598" }
                                        },

                                        "ShipmentRequest": {
                                            "Request": {
                                                "RequestOption": "validate",
                                                "TransactionReference": {
                                                    "CustomerContext": dl.customer_name
                                                }
                                            },
                                            "Shipment": {
                                                "Description": "SO#: " + dl.items[0].against_sales_order + " | PO#: " + dl.po_no,
                                                "ReturnService": {
                                                    "Code": "9",
                                                    "Description": "This is return shipment",
                                                },

                                                "ShipTo": {
                                                    "Name": address_info.address_title,
                                                    "AttentionName": address_info.attention_name,
                                                    "Phone": {
                                                        "Number": address_info.phone
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

                                                    "Address": {
                                                        "AddressLine": ["3380 Florence Rd", "Suite#200"],
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
                                                    //    "Phone": {
                                                    //    "Number": "1234567890",
                                                    //    "Extension": "1"
                                                    //    },
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

                                                "PaymentInformation": {
                                                    "ShipmentCharge": {
                                                        "Type": "01",
                                                        "BillShipper": {
                                                            "AccountNumber": "E00A49"
                                                        }
                                                    }
                                                },
                                                "Service": {
                                                    "Code": frm.doc.service_code,
                                                    "Description": frm.doc.shipping_service
                                                },
                                                "Package": {
                                                    "ReferenceNumber": [{
                                                        "Value": dl.items[0].against_sales_order
                                                    },
                                                    {
                                                        "Value": dl.po_no
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
                                                        "Weight": row.weight.toString()
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

                                    var url = ups_credentials.production ? ups_credentials.production_url : ups_credentials.test_url
                                    $.ajax({
                                        url: "https://corsanywhere-jqogydb25a-uc.a.run.app/" + url + "/rest/Ship",
                                        type: "POST",
                                        contentType: "application/json; charset=utf-8",
                                        dataType: "json",
                                        data: JSON.stringify(data),
                                        success: function (data) {
                                            //data = JSON.parse(data);
                                            console.log(data);
                                            try {
                                                //saving data to file
                                                frm.call({
                                                    method: "global_app.doc_events..packing_slip.save_data",
                                                    args: {
                                                        file_name: frm.doc.name + "_" + row.package + "_return.JSON",
                                                        data: JSON.stringify(data)
                                                    },
                                                    callback: function(r2) { }
                                                });
                                                var image_data = data.ShipmentResponse.ShipmentResults.PackageResults.ShippingLabel.GraphicImage;
                                                var image = new Image();
                                                image.src = 'data:image/png;base64,' + image_data;
                                                //document.body.appendChild(image);
                                                console.log(data.ShipmentResponse.ShipmentResults.PackageResults.ShippingLabel.GraphicImage);
                                                image.style.transform = "rotate(90deg)";
                                                image.style.marginTop = '20%';
                                                rotate90('data:image/png;base64,' + image_data, function (res) {
                                                    qz.websocket.connect().then(function () {
                                                        //alert("Connected!");
                                                        var printer = "";
                                                        qz.printers.getDefault().then(function (data) {
                                                            console.log(data);
                                                            var config = qz.configs.create(data);
                                                            var data = [{
                                                                type: 'image',
                                                                format: 'base64',
                                                                data: res.split(',')[1]
                                                            }];
                                                            qz.print(config, data).catch(function (e) { console.error(e); });
                                                        }).catch(console.log("err"));

                                                    });

                                                })
                                                qz.websocket.disconnect();

                                            } catch (err) {
                                                frappe.msgprint(data.Fault.detail.Errors.ErrorDetail.PrimaryErrorCode.Description, 'Error');
                                            }


                                        }
                                    });
                                }
                            });

                        }
                    }
                });
            }
        });
    } else {

        var settings = {
            "async": true,
            "crossDomain": true,
            "url": "https://corsanywhere-jqogydb25a-uc.a.run.app/" + stamps_credentials.url,
            "method": "POST",
            "headers": {
                "content-type": "text/xml; charset=utf-8",
                "soapaction": "http://stamps.com/xml/namespace/2018/03/swsim/swsimv71/AuthenticateUser",
                "cache-control": "no-cache",
            },
            "data": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"\r\n               " +
            "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\r\n               " +
            "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"\r\n               " +
            "xmlns:tns=\"http://stamps.com/xml/namespace/2018/03/swsim/swsimv71\">\r\n  " +
            "<soap:Body>\r\n     <tns:AuthenticateUser>      \r\n\t     " +
            "<tns:Credentials>         \r\n\t\t     " +
            "<tns:IntegrationID>"+ stamps_credentials.integration_id +"</tns:IntegrationID>       \r\n\t\t     " +
            "<tns:Username>"+ stamps_credentials.username +"</tns:Username>       \r\n\t\t     " +
            "<tns:Password>"+ stamps_credentials.password +"</tns:Password>      \r\n\t     </tns:Credentials>    \r\n     </tns:AuthenticateUser> \r\n  </soap:Body>\r\n</soap:Envelope>"
        }

        $.ajax(settings).done(function (response) {

            console.log(response.getElementsByTagName("Authenticator"));
            var auth_token = response.getElementsByTagName("Authenticator")[0].innerHTML;

            var length, width, height;
            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Package",
                    name: row.package,
                },
                async: false,
                callback: function(pkg) {
                    console.log(pkg.message)
                    length = pkg.message.length;
                    width = pkg.message.width;
                    height = pkg.message.hight;
                }
            })

            var transactionId = frm.doc.name + length.toString() + "X" + width.toString() + "X" + height.toString() + "RET";
            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Delivery Note",
                    name: frm.doc.delivery_note,
                },
                callback: function(dl) {
                    console.log(dl.message);
                    dl = dl.message;
                    var address_info;

                    frappe.call({
                        method: "frappe.client.get",
                        args: {
                            doctype: "Address",
                            name: dl.shipping_address_name,
                        },
                        callback: function(r) {
                            if (r.message) {
                                address_info = r.message;
                                var country_code = "US";
                                if (address_info.country_code) {
                                    country_code = address_info.country_code;

                                }
                                else {
                                    frappe.call({
                                        method: "frappe.client.get",
                                        async: false,
                                        args: {
                                            doctype: "Country",
                                            name: address_info.country,
                                        },
                                        callback: function(cntry) {
                                            country_code = cntry.message.code

                                        }
                                    });

                                }
                                var state_abb;
                                console.log(address_info);
                                console.log(address_info.address_line1);
                                frappe.call({
                                    method: "frappe.client.get",
                                    args: {
                                        doctype: "US States",
                                        name: address_info.state,
                                    },
                                    callback: function(r2) {
                                        console.log(r2.message);
                                        state_abb = r2.message.abb;
                                        var add_line_2 = "";
                                        if (address_info.address_line2) {
                                            add_line_2 = address_info.address_line2;

                                        }
                                        //request for label now
                                        // var today = new Date();
                                        // var formattedNumber = ("0" + (today.getMonth()+1)).slice(-2);
                                        // var date = today.getFullYear()+'-'+(formattedNumber)+'-'+today.getDate();
                                        var date = frappe.datetime.now_date().toString();
                                        //date=date.toString();
                                        var create_indiciam = {
                                            "url": "https://corsanywhere-jqogydb25a-uc.a.run.app/" + stamps_credentials.url,
                                            "method": "POST",
                                            "headers": {
                                                "content-type": "text/xml; charset=utf-8",
                                                "soapaction": "http://stamps.com/xml/namespace/2018/03/swsim/swsimv71/CreateIndicium"
                                            },
                                            "data": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"\r\n" +
                                                "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\r\n" +
                                                "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"\r\n" +
                                                "xmlns:tns=\"http://stamps.com/xml/namespace/2018/03/swsim/swsimv71\">\r\n" +
                                                "<soap:Body>\r\n    <CreateIndicium  xmlns=\"http://stamps.com/xml/namespace/2018/03/swsim/swsimv71\">\r\n" +
                                                "<Authenticator>" + auth_token.toString() + "</Authenticator>\r\n" +
                                                "<IntegratorTxID>" + transactionId + "</IntegratorTxID>\r\n     \r\n      <TrackingNumber/>\r\n" +
                                                "<Rate>\r\n                    <FromZIPCode>60506</FromZIPCode>\r\n" +
                                                "<ToZIPCode>" + address_info.pincode + "</ToZIPCode>\r\n" +
                                                "<ServiceType>" + frm.doc.service_code + "</ServiceType>\r\n <ServiceDescription>" + frm.doc.shipping_service + "</ServiceDescription>\r\n<PrintLayout>Return</PrintLayout>" +
                                                "<DeliverDays>1</DeliverDays>\r\n <WeightLb>" + row.weight.toString() + "</WeightLb>\r\n" +
                                                "<PackageType>" + row.package + "</PackageType>\r\n<ShipDate>" + date + "</ShipDate>\r\n" +
                                                "<DeliveryDate>" + date + "</DeliveryDate>\r\n" +
                                                "<DimWeighting>N</DimWeighting>\r\n" +
                                                "<AddOns>\r\n" +
                                                "<AddOnV12>" +
                                                "<AddOnType>SC-A-HP</AddOnType>" +
                                                "<AddOnDescription>Hidden Postage</AddOnDescription>" +
                                                "<ProhibitedWithAnyOf>" +
                                                "<AddOnTypeV12>US-A-RRM</AddOnTypeV12>" +
                                                "<AddOnTypeV12>US-A-REG</AddOnTypeV12>" +
                                                "<AddOnTypeV12>US-A-RD</AddOnTypeV12>" +
                                                "<AddOnTypeV12>US-A-COD</AddOnTypeV12>" +
                                                "<AddOnTypeV12>US-A-CM</AddOnTypeV12>" +
                                                "<AddOnTypeV12>US-A-RR</AddOnTypeV12>" +
                                                "<AddOnTypeV12>US-A-LAWS</AddOnTypeV12>" +
                                                "</ProhibitedWithAnyOf>" +
                                                "</AddOnV12>" +
                                                "<AddOnV12>\r\n" +
                                                "<AddOnType>US-A-DC</AddOnType>\r\n <AddOnDescription>Tracking</AddOnDescription>\r\n <ProhibitedWithAnyOf>\r\n     <AddOnTypeV12>US-A-SC</AddOnTypeV12>\r\n     <AddOnTypeV12>US-A-CM</AddOnTypeV12>\r\n     <AddOnTypeV12>US-A-ASR</AddOnTypeV12>\r\n     <AddOnTypeV12>US-A-ASRD</AddOnTypeV12>\r\n </ProhibitedWithAnyOf>\r\n </AddOnV12>\r\n" +
                                                " \r\n  <AddOnV12>\r\n <AddOnType>US-A-PR</AddOnType>\r\n <AddOnDescription>Perishable</AddOnDescription>\r\n  </AddOnV12>\r\n                       \r\n                    </AddOns>\r\n" +
                                                "<Surcharges />\r\n  <EffectiveWeightInOunces>" + Math.round((row.weight * 16).toString()) + "</EffectiveWeightInOunces>\r\n" +
                                                "<Zone>1</Zone>\r\n                    <RateCategory>1000</RateCategory>\r\n" +
                                                "<ToState>" + state_abb + "</ToState>\r\n         </Rate>\r\n      <From>\r\n        <FullName>Global Avertising Inc</FullName>\r\n        <Address1>6251 box springs Blvd</Address1>\r\n        <Address2>NA</Address2>\r\n        <City>riverside</City>\r\n        <State>CA</State>\r\n        <ZIPCode>92507</ZIPCode>\r\n      </From>\r\n      <To>\r\n        <FullName>" +  (address_info.attention_name == null ? "" : address_info.attention_name)  + "</FullName>\r\n        <NamePrefix/>\r\n        <FirstName/>\r\n        <MiddleName/>\r\n        <LastName/>\r\n        <NameSuffix/>\r\n        <Title/>\r\n        <Department/>\r\n        <Company>" + address_info.address_title.replace('&', '') + "</Company>\r\n        <Address1>" + address_info.address_line1 + "</Address1>\r\n        <Address2>" + add_line_2 + "</Address2>\r\n        <City>" + address_info.city + "</City>\r\n        <State>" + state_abb + "</State>\r\n        <ZIPCode>" + address_info.pincode + "</ZIPCode>\r\n               <PostalCode/>\r\n        <Country>" + country_code + "</Country>\r\n        <Urbanization/>\r\n        <PhoneNumber/>\r\n        <Extension/>\r\n             </To>\r\n" +
                                                "<memo>Rf No.1 :" + dl.items[0].against_sales_order + "#&#xd;&#xa;Rf No.2 : " + dl.po_no + "</memo><PayOnPrint>false</PayOnPrint><ReturnLabelExpirationDays>25</ReturnLabelExpirationDays></CreateIndicium>\r\n  </soap:Body>\r\n</soap:Envelope>"
                                        }
                                        console.log(create_indiciam);
                                        $.ajax(create_indiciam).done(function (response) {
                                            console.log(response);
                                            var data = response;
                                            handle_success_response_single_usps(frm, data, dl, row)
                                        });
                                    }
                                });

                            }
                        }
                    });
                }
            });
        });

    }
}

function update_summary(frm) {
    //list available only
    console.log(item_code_list);
    frm.doc.items.forEach(function (item) {
        item_code_list.push(item.item_code);
    });
    console.log('-----------------------------');
    for (var i = 0; i < item_code_list.length; i++) {
        $.each(frm.doc.packages || [], function (i, v_outer) {
            console.log(item_code_list.indexOf(v_outer.item))
            if (item_code_list.indexOf(v_outer.item) !== -1) {
                item_code_list.splice(item_code_list.indexOf(v_outer.item), 1);
            }
            ///item_code_list.splice( item_code_list.indexOf(v_outer.item), 1 );
        });
    }
    console.log(item_code_list);
    frm.fields_dict.packages.grid.get_field('item').get_query =
        function () {
            return {
                filters: [
                    ['Item', 'item_code', 'in', item_code_list]
                ]

            }
        }
    //set shipment as undone
    frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipment", "");
    cur_frm.refresh_field("shipment");
    frappe.model.clear_table(frm.doc, "packages_information");
    $.each(frm.doc.packages || [], function (i, v_outer) {
        var added = false;
        console.log('ffffffffffffffffffffffff');
        console.log(frm.doc.packages_information);
        $.each(frm.doc.packages_information || [], function (i, v) {
            // if table already contain the same box with same order nmbr
            if (v.package === v_outer.package) {
                frappe.model.set_value(v.doctype, v.name, "items", v.items + ", " + v_outer.item);
                frappe.model.set_value(v.doctype, v.name, "quantity", v.quantity + v_outer.quantity);
                frappe.model.set_value(v.doctype, v.name, "weight", v.weight + v_outer.weight);
                cur_frm.refresh_field("packages_information");
                added = true;
            }
        });
        if (!added) {
            console.log('adding');
            var child2 = cur_frm.add_child("packages_information");
            frappe.model.set_value(child2.doctype, child2.name, "package", v_outer.package);
            frappe.model.set_value(child2.doctype, child2.name, "items", v_outer.item);
            frappe.model.set_value(child2.doctype, child2.name, "quantity", v_outer.quantity);
            frappe.model.set_value(child2.doctype, child2.name, "weight", v_outer.weight);
            frappe.model.set_value(child2.doctype, child2.name, "packing_slip_no", v_outer.parent);
            cur_frm.refresh_field("packages_information");
        }

    });
}

function batch_shipping_label(frm) {
    if (frm.doc.name.indexOf("New Packing Slip") > -1) {
        frappe.msgprint("Please Save the document first")
        return false;
    }
    //request_for_batch_ship(frm);
    if (frm.doc.shipment === "done") {
        frappe.msgprint("You Have already done a shipment against this Order, cancel that and try again", "Warning");

    } else {
        request_for_batch_ship(frm);
    }

}

function batch_return_label(frm) {
    console.log(frm.doc);
    var image_list = [];
    var packages_list = [];
    $.each(frm.doc.packages_information || [], function (i, v_outer) {
        var row = locals[v_outer.doctype][v_outer.name];

        var length, width, height;
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Package",
                name: row.package,
            },
            async: false,
            callback: function(pkg) {
                console.log(pkg.message)
                length = pkg.message.length;
                width = pkg.message.width;
                height = pkg.message.hight;
            }
        })
        var weight = row.weight;
        if (weight === 0 || !weight) { weight = 1; }
        packages_list.push({
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
                "Weight": weight.toString()
            }
        });

    });
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Delivery Note",
            name: frm.doc.delivery_note,
        },
        callback: function(dl) {
            console.log(dl.message);
            dl = dl.message;
            var address_info;

            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Address",
                    name: dl.shipping_address_name,
                },
                callback: function(r) {
                    if (r.message) {
                        address_info = r.message;
                        var country_code = "US";
                        if (address_info.country_code) {
                            country_code = address_info.country_code;

                        }
                        else {
                            frappe.call({
                                method: "frappe.client.get",
                                async: false,
                                args: {
                                    doctype: "Country",
                                    name: address_info.country,
                                },
                                callback: function(cntry) {
                                    country_code = cntry.message.code

                                }
                            });

                        }
                        var state_abb;
                        console.log(address_info);
                        console.log(address_info.address_line1);
                        frappe.call({
                            method: "frappe.client.get",
                            args: {
                                doctype: "US States",
                                name: address_info.state,
                            },
                            callback: function(r2) {
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
                                            "Username": ups_credentials.username,
                                            "Password": ups_credentials.password
                                        },
                                        "ServiceAccessToken": { "AccessLicenseNumber": "5D2E60A4DB1D2598" }
                                    },

                                    "ShipmentRequest": {
                                        "Request": {
                                            "RequestOption": "validate",
                                            "TransactionReference": {
                                                "CustomerContext": dl.customer_name
                                            }
                                        },
                                        "Shipment": {
                                            "Description": "SO#:SO111 | PO#:PU234",
                                            "ReturnService": {
                                                "Code": "9",
                                                "Description": "This is return shipment",
                                            },
                                            "ShipTo": {
                                                "Name": address_info.address_title,
                                                "AttentionName": address_info.attention_name,
                                                "Phone": {
                                                    "Number": address_info.phone
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

                                                "Address": {
                                                    "AddressLine": ["3380 Florence Rd", "Suite#200"],
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
                                                // "Phone": {
                                                // "Number": "1234567890",
                                                // "Extension": "1"
                                                // },
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

                                            "PaymentInformation": {
                                                "ShipmentCharge": {
                                                    "Type": "01",
                                                    "BillShipper": {
                                                        "AccountNumber": "E00A49"
                                                    }
                                                }
                                            },
                                            "Service": {
                                                "Code": frm.doc.service_code,
                                                "Description": frm.doc.shipping_service
                                            },
                                            "Package": packages_list
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

                                var url = ups_credentials.production ? ups_credentials.production_url : ups_credentials.test_url
                                $.ajax({
                                    url: "https://corsanywhere-jqogydb25a-uc.a.run.app/" + url +"/rest/Ship",
                                    type: "POST",
                                    contentType: "application/json; charset=utf-8",
                                    dataType: "json",
                                    data: JSON.stringify(data),
                                    success: function (data) {
                                        //data = JSON.parse(data);
                                        console.log(data);

                                        if (frm.doc.packages_information.length > 1) {
                                            frappe.msgprint("Only One Package Allowed in this Movement", 'Error');
                                        } else {
                                            //saving data to file
                                            frm.call({
                                                method: "global_app.doc_events..packing_slip.save_data",
                                                args: {
                                                    file_name: frm.doc.name + "_" + frm.doc.packages_information[0].package + "_return.JSON",
                                                    data: JSON.stringify(data)
                                                },
                                                callback: function(r2) { }
                                            });
                                            var image_data = data.ShipmentResponse.ShipmentResults.PackageResults.ShippingLabel.GraphicImage;
                                            var image = new Image();
                                            image.src = 'data:image/png;base64,' + image_data;
                                            //document.body.appendChild(image);
                                            console.log(data.ShipmentResponse.ShipmentResults.PackageResults.ShippingLabel.GraphicImage);
                                            image.style.transform = "rotate(90deg)";
                                            image.style.marginTop = '20%';
                                            rotate90('data:image/png;base64,' + image_data, function (res) {
                                                qz.websocket.connect().then(function () {
                                                    //alert("Connected!");
                                                    var printer = "";
                                                    qz.printers.getDefault().then(function (data) {
                                                        console.log(data);
                                                        var config = qz.configs.create(data);
                                                        var data = [{
                                                            type: 'image',
                                                            format: 'base64',
                                                            data: res.split(',')[1]
                                                        }];
                                                        qz.print(config, data).catch(function (e) { console.error(e); });
                                                    }).catch(console.log("err"));

                                                });

                                            })
                                            qz.websocket.disconnect();

                                        }

                                    }
                                });
                            }
                        });

                    }
                }
            });
        }
    });

}

function forward_label_printer(image_list) {
    var d = new frappe.ui.Dialog({
        title: __('Shipment Successful'),
        static: true,
        'fields': [
            { 'fieldname': 'ht', 'fieldtype': 'HTML' }
        ]
    });
    d.fields_dict.ht.$wrapper.html("<b>Labels are ready to print</b>")
    d.show();
    //$('.modal-backdrop').unbind('click');
    console.log('In printing');
    d.set_primary_action(__("Print"), function () {
        d.hide();

        var base_64 = [];
        var config = "";
        if (!qz.websocket.isActive()) {
            qz.websocket.connect().then(function () {
                //alert("Connected!");
                var printer = "";
                qz.printers.getDefault().then(function (data) {
                    console.log("jkjkjkjkjkkkkjkjkjkjkjkj");
                    console.log(data);
                    config = qz.configs.create(data);
                }).then(function () {
                    //config = qz.configs.create("NPIA0425B (HP LaserJet Professional P 1102w)");
                    image_list.forEach(function (list_item) {

                        rotate90('data:image/png;base64,' + list_item.image_data, function (res) {
                            base_64.push(res.split(',')[1]);



                            //alert("Connected!");

                            var data = [{
                                type: 'image',
                                format: 'base64',
                                data: res.split(',')[1]
                            }];
                            qz.print(config, data).catch(function (e) { console.error(e); });



                            base_64 = [];


                        })
                    })

                }).
                    catch(console.log("err"));

            });
        } else {
            var printer = "";
            qz.printers.getDefault().then(function (data) {
                console.log("jkjkjkjkjkkkkjkjkjkjkjkj");
                console.log(data);
                config = qz.configs.create(data);
            }).then(function () {
                //config = qz.configs.create("NPIA0425B (HP LaserJet Professional P 1102w)");
                image_list.forEach(function (list_item) {

                    rotate90('data:image/png;base64,' + list_item.image_data, function (res) {
                        base_64.push(res.split(',')[1]);



                        //alert("Connected!");

                        var data = [{
                            type: 'image',
                            format: 'base64',
                            data: res.split(',')[1]
                        }];
                        qz.print(config, data).catch(function (e) { console.error(e); });



                        base_64 = [];


                    })
                })

            }).
                catch(console.log("err"));
        }

    });

}

function reprint_label(frm) {
    if (frm.doc.shipment === "done") {
        if (frm.doc.packages_information.length > 1) {
            var form_fields = [];
            form_fields.push({ "fieldtype": "HTML", "label": __("Package &nbsp"), "fieldname": "rep_package", "read_only": 1 })
            form_fields.push({ "fieldtype": "Column Break", "fieldname": "column_breaksss" });
            form_fields.push({ "fieldtype": "HTML", "label": __("Tracking Number "), "fieldname": "tracking_no", "read_only": 1 });
            form_fields.push({ "fieldtype": "Column Break", "fieldname": "column_breaks2" });
            form_fields.push({ "fieldtype": "Section Break", "fieldname": "section_breakss" });
            $.each(frm.doc.packages_information || [], function (i, v_outer) {
                form_fields.push({ "fieldtype": "HTML", "label": __("Package &nbsp" + i), "fieldname": "rep_package" + i })
                form_fields.push({ "fieldtype": "Column Break", "fieldname": "column_break" + i });
                form_fields.push({ "fieldtype": "HTML", "label": __("Tracking Number " + i), "fieldname": "tracking_no" + i });
                form_fields.push({ "fieldtype": "Column Break", "fieldname": "column_break" + i * (-1) });
                form_fields.push({ "fieldtype": "Button", "label": __("Reprint&nbsp Label"), "fieldname": "reprint_label" + i })
                form_fields.push({ "fieldtype": "Section Break", "fieldname": "section_break" + i });
            });
            var dialog = new frappe.ui.Dialog({
                title: __("You Have Multiple Packages"),
                fields: form_fields
            });
            console.log(dialog.fields_dict)
            dialog.fields_dict.rep_package.$wrapper.html("<b>Package</>");
            dialog.fields_dict.tracking_no.$wrapper.html("<b>Tracking Number</>");
            var reprint_label = "";
            var rep_package = "";
            var tracking_no = "";
            $.each(frm.doc.packages_information || [], function (i, v_outer) {
                reprint_label = "reprint_label" + i;
                rep_package = "rep_package" + i;
                tracking_no = "tracking_no" + i;
                dialog.fields_dict[rep_package].$wrapper.html(v_outer.package);
                dialog.fields_dict[tracking_no].$wrapper.html(v_outer.shipment_tracking_number);
                dialog.fields_dict[reprint_label].input.onclick = function () {
                    if (frm.doc.shipping_carrier === "UPS") {


                        var data = {
                            "UPSSecurity": {
                                "UsernameToken": {
                                    "Username": ups_credentials.username,
                                    "Password": ups_credentials.password
                                },
                                "ServiceAccessToken": { "AccessLicenseNumber": "5D2E60A4DB1D2598" }
                            },
                            "LabelRecoveryRequest": {
                                "LabelSpecification": {
                                    "LabelImageFormat": {
                                        "Code": "GIF"
                                    },
                                    "HTTPUserAgent": "Mozilla/4.5"
                                },
                                "Translate": {
                                    "LanguageCode": "eng",
                                    "DialectCode": "GB",
                                    "Code": "01"
                                },
                                "TrackingNumber": v_outer.shipment_tracking_number
                            }
                        }
                        var url = ups_credentials.production ? ups_credentials.production_url : ups_credentials.test_url

                        $.ajax({
                            url: "https://corsanywhere-jqogydb25a-uc.a.run.app/" + url +"/rest/LBRecovery",
                            type: "POST",
                            contentType: "application/json; charset=utf-8",
                            dataType: "json",
                            data: JSON.stringify(data),
                            success: function (data) {
                                console.log(data);
                                frappe.msgprint(data.Fault.detail.Errors.ErrorDetail.PrimaryErrorCode.Description, "Reprint Label")
                            }
                        });
                    } else {
                        console.log("re-print");
                        print_shipping_label(frm, v_outer.doctype, v_outer.name);
                    }
                }
            });
            dialog.show();
        } else {
            if (frm.doc.shipping_carrier === "UPS") {
                var data = {
                    "UPSSecurity": {
                        "UsernameToken": {
                            "Username": ups_credentials.username,
                            "Password": ups_credentials.password
                        },
                        "ServiceAccessToken": { "AccessLicenseNumber": "5D2E60A4DB1D2598" }
                    },
                    "LabelRecoveryRequest": {
                        "LabelSpecification": {
                            "LabelImageFormat": {
                                "Code": "GIF"
                            },
                            "HTTPUserAgent": "Mozilla/4.5"
                        },
                        "Translate": {
                            "LanguageCode": "eng",
                            "DialectCode": "GB",
                            "Code": "01"
                        },
                        "TrackingNumber": frm.doc.packages_information[0].shipment_tracking_number
                    }
                };
                        var url = ups_credentials.production ? ups_credentials.production_url : ups_credentials.test_url
                $.ajax({
                    url: "https://corsanywhere-jqogydb25a-uc.a.run.app/" + url +"/rest/LBRecovery",
                    type: "POST",
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    data: JSON.stringify(data),
                    success: function (data) {
                        console.log(data);
                        frappe.msgprint(data.Fault.detail.Errors.ErrorDetail.PrimaryErrorCode.Description, "Reprint Label")
                    }
                });
            } else {
                console.log("re-print2");
                print_shipping_label(frm, frm.doc.packages_information[0].doctype, frm.doc.packages_information[0].name);
            }
        }
    } else {
        frappe.msgprint("You have no shipment against this sales order", "Message");
    }
}

function cancel_shipment(frm) {
    console.log(frm.doc);
    if (frm.doc.shipment_identification_number) {
        if (frm.doc.shipping_carrier == "UPS") {
            var data = {
                "UPSSecurity": {
                    "UsernameToken": {
                        "Username": ups_credentials.username,
                        "Password": ups_credentials.password
                    },
                    "ServiceAccessToken": { "AccessLicenseNumber": "5D2E60A4DB1D2598" }
                },
                "VoidShipmentRequest": {
                    "Request": {
                        "TransactionReference": {
                            "CustomerContext": "Your Customer Context"
                        }
                    },
                    "VoidShipment": {
                        "ShipmentIdentificationNumber": frm.doc.shipment_identification_number
                    }
                }
            };
                                                    var url = ups_credentials.production ? ups_credentials.production_url : ups_credentials.test_url

            $.ajax({
                url: "https://corsanywhere-jqogydb25a-uc.a.run.app/" + url +"/rest/Void",
                type: "POST",
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                data: JSON.stringify(data),
                success: function (data) {
                    try {
                        console.log(data);
                        if (data.VoidShipmentResponse.SummaryResult.Status.Description) {
                            frappe.msgprint(data.VoidShipmentResponse.SummaryResult.Status.Description, "Void Shipment")
                            frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipment", "");
                            cur_frm.refresh_field("shipment");
                            frm.save()
                            update_so_for_cancel_shipment(frm)
                        } else {
                            frappe.msgprint("Problem in label cancellation", "Void Shipment")
                        }

                    } catch (err) {

                        frappe.msgprint(data.Fault.detail.Errors.ErrorDetail.PrimaryErrorCode.Description, "Void Shipment")
                        frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipment", "");
                        cur_frm.refresh_field("shipment");
                        frm.save()
                        update_so_for_cancel_shipment(frm)

                    }


                }
            });

        } else {
            cancel_shipment_usps(frm);
        }
    } else {
        frappe.msgprint("You have no shipment against this sales order", "Message");
    }


}

function request_for_batch_ship(frm) {
    //then request the shipping API
    if (frm.doc.shipping_carrier === "UPS") {
        var w_cap_flag = true;
        $.each(cur_frm.doc.packages_information, function (i, item) {
            if (!item.w_cap_flag || item.w_cap_flag === false) {
                w_cap_flag = false;
            }
        });
        if (!w_cap_flag) {
            frappe.msgprint("Weight is not captured for some boxes", "Warning")
            return true;
        }
        var image_list = [];
        var packages_list = [];
        var default_number = ""
        frappe.call({
            method: "global_app.doc_events.packing_slip.get_default_phone_number",
            args: {
                dn: frm.doc.delivery_note,
            },
            async: false,
            callback: function(r) {
                default_number = r.message
            }
        })
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Delivery Note",
                name: frm.doc.delivery_note,
            },
            callback: function(dl) {
                console.log(dl.message);
                dl = dl.message;
                var address_info;

                frappe.call({
                    method: "frappe.client.get",
                    args: {
                        doctype: "Address",
                        name: dl.shipping_address_name,
                    },
                    callback: function(r) {
                        if (r.message) {
                            //address_info = r.message;
                            var state_abb;
                            //console.log(address_info);
                            //console.log(address_info.address_line1);
                            var phone_no = "";
                            //third_party_shipping
                            var paymentinfo = {
                                "ShipmentCharge": {
                                    "Type": "01",
                                    "BillShipper": {
                                        "AccountNumber": "E00A49"
                                    }
                                }
                            }
                            if (frm.doc.third_party_shipping) {
                                frappe.call({
                                    method: 'frappe.client.get',
                                    async: false,
                                    no_spinner: true,
                                    args: {
                                        doctype: "Contact",
                                        name: dl.contact_person
                                    },
                                    callback: function (contact) {
                                        contact = contact.message;
                                        console.log("***********************  FIRST ****************************")
                                        // fetch billing address
                                        frappe.call({
                                            method: 'frappe.client.get',
                                            async: false,
                                            no_spinner: true,
                                            args: {
                                                doctype: "Address",
                                                name: contact.usps_billing_address
                                            },
                                            callback: function (b_add) {
                                                console.log("***********************  SECOND ****************************")
                                                b_add = b_add.message;
                                                console.log(b_add)
                                                console.log(b_add.state)
                                                frappe.call({
                                                    method: "frappe.client.get",
                                                    async: false,
                                                    args: {
                                                        doctype: "US States",
                                                        name: b_add.state,
                                                    },
                                                    callback: function(cnt_s) {
                                                        //console.log(r2.message);
                                                        console.log("***********************  THIRD ****************************")
                                                        console.log(cnt_s.message)
                                                        var state_c = cnt_s.message.abb;
                                                        paymentinfo = "";
                                                        var b_address_lines = [];

                                                        if (b_add.address_line2) {
                                                            b_address_lines.push(b_add.address_line2)
                                                        }
                                                        b_address_lines.push(b_add.address_line1)
                                                        var country_code = "US";
                                                        if (b_add.country_code) {
                                                            country_code = b_add.country_code;

                                                        }
                                                        else {
                                                            frappe.call({
                                                                method: "frappe.client.get",
                                                                async: false,
                                                                args: {
                                                                    doctype: "Country",
                                                                    name: b_add.country,
                                                                },
                                                                callback: function(cntry) {
                                                                    country_code = cntry.message.code

                                                                }
                                                            });

                                                        }
                                                        paymentinfo = {
                                                            "ShipmentCharge": {
                                                                "Type": "01",
                                                                "BillThirdParty": {
                                                                    "AccountNumber": contact.ups_account_no,
                                                                    "Address": {
                                                                        "AddressLine": b_address_lines,
                                                                        "City": b_add.city,
                                                                        "StateProvinceCode": state_c,
                                                                        "PostalCode": b_add.pincode,
                                                                        "CountryCode": country_code
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                            console.log("***********************  FOURTH ****************************")
                            address_info = r.message;
                            var country_code = "US";
                            if (address_info.country_code) {
                                country_code = address_info.country_code;

                            }
                            else {
                                frappe.call({
                                    method: "frappe.client.get",
                                    async: false,
                                    args: {
                                        doctype: "Country",
                                        name: address_info.country,
                                    },
                                    callback: function(cntry) {
                                        country_code = cntry.message.code

                                    }
                                });

                            }

                            //end tps
                            if (address_info.phone) {
                                phone_no = address_info.phone
                            } else {
                                phone_no = default_number;
                            }
                            frappe.call({
                                method: "frappe.client.get",
                                args: {
                                    doctype: "US States",
                                    name: address_info.state,
                                },
                                callback: function(r2) {
                                    console.log(r2.message);
                                    state_abb = r2.message.abb;
                                    var length, width, height;
                                    var package_cost = 0
                                    $.each(frm.doc.packages_information || [], function (i, v_outer) {
                                        var row = locals[v_outer.doctype][v_outer.name];
                                        // var temp1 = row.package.split('(')[1];
                                        // var temp2 = temp1.split(':')[0];
                                        // console.log(temp2);
                                        // var length = temp2.split('X')[0];
                                        // var width = temp2.split('X')[1];
                                        // var height = temp2.split('X')[2];
                                        package_cost += row.price
                                        var ins_money_value = "100";
                                        if (row.ups_insurance) {
                                            if (row.declared_value) {
                                                ins_money_value = row.declared_value;
                                            }
                                        }
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

                                        frappe.call({
                                            method: "frappe.client.get",
                                            args: {
                                                doctype: "Package",
                                                name: row.package,
                                            },
                                            async: false,
                                            callback: function(pkg) {
                                                console.log(pkg.message)
                                                length = pkg.message.length;
                                                width = pkg.message.width;
                                                height = pkg.message.hight;
                                            }
                                        })
                                        var weight = row.weight;
                                        if (weight === 0 || !weight) { weight = 1; }
                                        packages_list.push({
                                            "PackageServiceOptions": insurance,
                                            "ReferenceNumber": [{
                                                "Value": dl.items[0].against_sales_order
                                            },
                                            {
                                                "Value": dl.po_no
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
                                                "Weight": weight.toString()
                                            }
                                        });

                                    });
                                    var address_lines = [];

                                    if (address_info.address_line2) {
                                        address_lines.push(address_info.address_line2)
                                    }
                                    address_lines.push(address_info.address_line1)
                                    var data = {
                                        "UPSSecurity": {
                                            "UsernameToken": {
                                                "Username": ups_credentials.username,
                                                "Password": ups_credentials.password
                                            },
                                            "ServiceAccessToken": { "AccessLicenseNumber": "5D2E60A4DB1D2598" }
                                        },
                                        "ShipmentRequest": {
                                            "Request": {
                                                "RequestOption": "validate",
                                                "TransactionReference": {
                                                    "CustomerContext": dl.customer_name
                                                }
                                            },
                                            "Shipment": {
                                                "Description": "SO#: " + dl.items[0].against_sales_order + " | PO#: " + dl.po_no,

                                                "ShipTo": {
                                                    "Name": address_info.address_title,
                                                    "AttentionName": address_info.attention_name,
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

                                                    "Address": {
                                                        "AddressLine": ["Suite#200", "3380 Florence Rd"],
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
                                                    "Code": frm.doc.service_code,
                                                    "Description": frm.doc.shipping_service
                                                },
                                                "Package": packages_list
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

                                    console.log(data);
                                    var url = ups_credentials.production ? ups_credentials.production_url : ups_credentials.test_url

                                    $.ajax({
                                        url: "https://corsanywhere-jqogydb25a-uc.a.run.app/" + url +"/rest/Ship",
                                        type: "POST",
                                        contentType: "application/json; charset=utf-8",
                                        dataType: "json",
                                        data: JSON.stringify(data),
                                        success: function (data) {
                                            handle_batch_request_response(frm, data, dl);
                                        }
                                    });
                                }
                            });

                        }
                    }
                });
            }
        });
    } else {
        frappe.msgprint("Batch shipment is not Allowed", "Message")
    }

}

function handle_batch_request_response(frm, data, dl) {

    if (data.ShipmentResponse) {
        if (data.ShipmentResponse.Response.ResponseStatus.Code === "1") {
            //set shipment as done
            frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipment", "done");
            cur_frm.refresh_field("shipment");
            //ShipmentResponse.ShipmentResults.ShipmentIdentificationNumber
            frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipment_identification_number", data.ShipmentResponse.ShipmentResults.ShipmentIdentificationNumber);
            cur_frm.refresh_field("shipment_identification_number");

            frm.call({
                method: "global_app.doc_events.packing_slip.save_data",
                args: {
                    file_name: frm.doc.name + ".JSON",
                    data: JSON.stringify(data)
                },
                callback: function(r2) { }
            });

            var image_list = [];
            if (frm.doc.packages_information.length > 1) {
                var count = 0;
                var tracking_num = [];
                data.ShipmentResponse.ShipmentResults.PackageResults.forEach(function (pack) {
                    tracking_num.push(pack.TrackingNumber);
                    image_list.push({ 'image_data': pack.ShippingLabel.GraphicImage, 'sales_order': dl.items[0].against_sales_order, 'purchase_order': dl.po_no, 'customer_name': dl.customer_name });

                });
                $.each(frm.doc.packages_information || [], function (i, v_outer) {
                    frappe.model.set_value(v_outer.doctype, v_outer.name, "shipment_tracking_number", tracking_num[i]);
                    cur_frm.refresh_field("packages_information");
                });
                forward_label_printer(image_list);
            } else {
                $.each(frm.doc.packages_information || [], function (i, v_outer) {
                    frappe.model.set_value(v_outer.doctype, v_outer.name, "shipment_tracking_number", data.ShipmentResponse.ShipmentResults.PackageResults.TrackingNumber);
                    cur_frm.refresh_field("packages_information");
                });
                var image_data = data.ShipmentResponse.ShipmentResults.PackageResults.ShippingLabel.GraphicImage;
                var image = new Image();
                image.src = 'data:image/png;base64,' + image_data;
                console.log(data.ShipmentResponse.ShipmentResults.PackageResults.ShippingLabel.GraphicImage);
                rotate90('data:image/png;base64,' + image_data, function (res) {
                    qz.websocket.connect().then(function () {
                        //alert("Connected!");
                        var printer = "";
                        qz.printers.getDefault().then(function (data) {
                            console.log(data);
                            var config = qz.configs.create(data);
                            var data = [{
                                type: 'image',
                                format: 'base64',
                                data: res.split(',')[1]
                            }];
                            qz.print(config, data).catch(function (e) { console.error(e); });
                        }).catch(console.log("err"));

                    });

                })
                qz.websocket.disconnect();
                            }
            update_sales_order(frm, data, dl)
            if (cur_frm.doc.w_verification_flag === "Shipped") {
                frm.save();
            }
        } else {
            frappe.msgprint("There is some error in shipment request", "err");
        }
    } else {
        console.log(data.Fault);
        frappe.msgprint(data.Fault.detail.Errors.ErrorDetail.PrimaryErrorCode.Description, "Error")
    }

}

function handle_success_response_single(frm, data, dl, row) {
    if (data.ShipmentResponse) {
        if (data.ShipmentResponse.Response.ResponseStatus.Code === "1") {
            //set shipment as done
            frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipment", "done");
            cur_frm.refresh_field("shipment");
            //ShipmentResponse.ShipmentResults.ShipmentIdentificationNumber
            frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipment_identification_number", data.ShipmentResponse.ShipmentResults.ShipmentIdentificationNumber);
            cur_frm.refresh_field("shipment_identification_number");


            try {
                $.each(frm.doc.packages_information || [], function (i, v_outer) {
                    frappe.model.set_value(v_outer.doctype, v_outer.name, "shipment_tracking_number", data.ShipmentResponse.ShipmentResults.PackageResults.TrackingNumber);
                    frappe.model.set_value(v_outer.doctype, v_outer.name, "shipment_cost", data.ShipmentResponse.ShipmentResults.ShipmentCharges.TotalCharges.MonetaryValue)
                    cur_frm.refresh_field("packages_information");
                });
                var image_data = data.ShipmentResponse.ShipmentResults.PackageResults.ShippingLabel.GraphicImage;
                var image = new Image();
                image.src = 'data:image/png;base64,' + image_data;
                //document.body.appendChild(image);
                image.style.transform = "rotate(90deg)";
                image.style.marginTop = '20%';
                rotate90('data:image/png;base64,' + image_data, function (res) {
                    qz.websocket.connect().then(function () {
                        //alert("Connected!");
                        var printer = "";
                        qz.printers.getDefault().then(function (data) {
                            console.log(data);
                            var config = qz.configs.create(data);
                            var data_qz = [{
                                type: 'image',
                                format: 'base64',
                                data: res.split(',')[1]
                            }];
                            qz.print(config, data_qz).catch(function (e) { console.error(e); });
                        }).catch(console.log("err"));

                    });

                })
                qz.websocket.disconnect();

                if (cur_frm.doc.w_verification_flag === "Shipped") {
                    frm.save();
                }
                var df5 = frappe.meta.get_docfield("Packing Slip packages shadow", "shipping_label", frm.doc.name);
                if(data.ShipmentResponse.ShipmentResults.PackageResults.TrackingNumber){

                    df5.hidden = 1
                        cur_frm.refresh_field("packages_information")

                } else {
                    df5.hidden = 0
                        cur_frm.refresh_field("packages_information")

                }
            } catch (err) {
                frappe.msgprint(data.Fault.detail.Errors.ErrorDetail.PrimaryErrorCode.Description, 'Error');
            }

            update_sales_order(frm, data, dl, row.name);
        }
    } else {
        console.log(data.Fault);
        frappe.msgprint(data.Fault.detail.Errors.ErrorDetail.PrimaryErrorCode.Description, "Error")
    }
}

function update_sales_order(frm, data, dl, box) {
    var sales_order_table = [];


    $.each(frm.doc.packages_information || [], function (i, v_outer) {
        sales_order_table.push({
            "package": v_outer.package,
            "tracking": v_outer.shipment_tracking_number,
            "items": v_outer.items,
            "qty": v_outer.quantity,
            "weight": v_outer.weight,
            "carrier": frm.doc.shipping_carrier
        });
    });

    console.log(sales_order_table);

    var s_c = data.ShipmentResponse.ShipmentResults.ShipmentCharges.TotalCharges.MonetaryValue;
    var inh_ins = frm.doc.inhouse_insurance ? parseFloat(frm.doc.inhouse_insurance) : 0.0;
    var total_s_c = parseFloat(s_c) + inh_ins
    if (frm.doc.third_party_shipping) {
        total_s_c = 0.0;
    }
    frm.call({
        method: "global_app.doc_events.packing_slip.make_salesorder",
        async: false,
        args: {
            name: frm.doc.name,
            sales_order: dl.items[0].against_sales_order,
            shipment_details: sales_order_table,
            shipment_weight: data.ShipmentResponse.ShipmentResults.BillingWeight.Weight,
            shipment_cost: total_s_c,
            box_name: box,
            shipping_service: frm.doc.shipping_service
        },
        callback: function(r2) {
            console.log(r2.message)
        }
    });
    var service_chrg = data.ShipmentResponse.ShipmentResults.ShipmentCharges.ServiceOptionsCharges.MonetaryValue
    frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "service_charges", service_chrg);
    cur_frm.refresh_field("service_charges");
    //check for all weights capture
    var w_cap_flag = true;
    $.each(cur_frm.doc.packages_information, function (i, item) {
        if (!item.w_cap_flag || item.w_cap_flag == false) {
            w_cap_flag = false;
        }
    });
    if (w_cap_flag) {
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "w_verification_flag", "Shipped");
        cur_frm.refresh_field("w_verification_flag");
        //cur_frm.save()
    }

    cur_frm.save()
    //end
}

function handle_success_response_single_usps(frm, data, dl, row) {
    if (data.getElementsByTagName("Authenticator")) {
        frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipment", "done");
        cur_frm.refresh_field("shipment");
        frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipment_identification_number", data.getElementsByTagName("TrackingNumber")[0].innerHTML);
        cur_frm.refresh_field("shipment_identification_number");

        try {
            $.each(frm.doc.packages_information || [], function (i, v_outer) {
                frappe.model.set_value(v_outer.doctype, v_outer.name, "shipment_tracking_number", data.getElementsByTagName("TrackingNumber")[0].innerHTML);
                frappe.model.set_value(v_outer.doctype, v_outer.name, "stamps_txid", data.getElementsByTagName("StampsTxID")[0].innerHTML);
                cur_frm.refresh_field("packages_information");
            });

            var image = new Image();
            console.log("---------------------------------------------------");
            //console.log(data.getElementsByTagName("URL")[0].innerHTML);
            image.src = data.getElementsByTagName("URL")[0].innerHTML; //'data:image/png;base64,'+image_data;

            console.log(image.src)
            if (!qz.websocket.isActive()) {
                qz.websocket.connect().then(function () {
                    console.log("Connected!");
                    var printer = "";
                    qz.printers.getDefault().then(function (data) {
                        console.log(data);
                        var config = qz.configs.create(data);
                        var data_qz = [{
                            type: 'image',
                            data: image.src
                        }];
                        qz.print(config, data_qz).catch(function (e) { "culprit1 " + console.error(e); });

                    }).catch(function (e) { console.error("culprit " + e); });

                });
            } else {
                qz.printers.getDefault().then(function (data) {
                    console.log(data);
                    var config = qz.configs.create(data);
                    var data_qz = [{
                        type: 'image',
                        data: image.src
                    }];
                    qz.print(config, data_qz).catch(function (e) { "culprit1 " + console.error(e); });

                }).catch(function (e) { console.error("culprit " + e); });

            }

        } catch (err) {
            frappe.msgprint("We regret for the  error in USPS label printing", 'Error');
        }

        update_sales_order_usps(frm, data, dl, row.name);
        if (cur_frm.doc.w_verification_flag === "Shipped") {
            frm.save();
        }
    }

}

function update_sales_order_usps(frm, data, dl, box) {
    //return true;
    var sales_order_table = [];


    $.each(frm.doc.packages_information || [], function (i, v_outer) {

        sales_order_table.push({
            "package": v_outer.package,
            "tracking": v_outer.shipment_tracking_number,
            "items": v_outer.items,
            "qty": v_outer.quantity,
            "weight": v_outer.weight,
            "carrier": frm.doc.shipping_carrier
        });
    });

    console.log(sales_order_table);
    frm.call({
        method: "global_app.doc_events.packing_slip.make_salesorder",
        args: {
            name: frm.doc.name,
            sales_order: dl.items[0].against_sales_order,
            shipment_details: sales_order_table,
            shipment_weight: data.getElementsByTagName('Rate')[0].childNodes[8].innerHTML,
            shipment_cost: data.getElementsByTagName('Rate')[0].childNodes[3].innerHTML,
            box_name: box,
            shipping_service: frm.doc.shipping_service
        },
        callback: function(r2) {
            console.log(r2.message)
        }
    });

    //check for all weights capture
    var w_cap_flag = true;
    $.each(cur_frm.doc.packages_information, function (i, item) {
        if (!item.w_cap_flag || item.w_cap_flag == false) {
            w_cap_flag = false;
        }
    });
    if (w_cap_flag) {
        frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "w_verification_flag", "Shipped");
        cur_frm.refresh_field("w_verification_flag");
        //cur_frm.save()
    }


    //end
}

function cancel_shipment_usps(frm) {
    if (frm.doc.shipment === "done") {
        var form_fields = [];
        form_fields.push({ "fieldtype": "HTML", "label": __("Package &nbsp"), "fieldname": "rep_package", "read_only": 1 })
        form_fields.push({ "fieldtype": "Column Break", "fieldname": "column_breaksss" });
        form_fields.push({ "fieldtype": "HTML", "label": __("Stamps Transaction ID "), "fieldname": "stamps_trxid", "read_only": 1 });
        form_fields.push({ "fieldtype": "Column Break", "fieldname": "column_breaks2" });
        form_fields.push({ "fieldtype": "Section Break", "fieldname": "section_breakss" });
        $.each(frm.doc.packages_information || [], function (i, v_outer) {
            form_fields.push({ "fieldtype": "HTML", "label": __("Package &nbsp" + i), "fieldname": "rep_package" + i })
            form_fields.push({ "fieldtype": "Column Break", "fieldname": "column_break" + i });
            form_fields.push({ "fieldtype": "HTML", "label": __("Tracking Number " + i), "fieldname": "stamps_trxid" + i });
            form_fields.push({ "fieldtype": "Column Break", "fieldname": "column_break" + i * (-1) });
            form_fields.push({ "fieldtype": "Button", "label": __("Cancel&nbsp Label"), "fieldname": "cancel_label" + i })
            form_fields.push({ "fieldtype": "Section Break", "fieldname": "section_break" + i });
        });
        var dialog = new frappe.ui.Dialog({
            title: __("Shipping Package(s)"),
            fields: form_fields
        });
        console.log(dialog.fields_dict)
        dialog.fields_dict.rep_package.$wrapper.html("<b>Package</>");
        dialog.fields_dict.stamps_trxid.$wrapper.html("<b>Stamps Transaction ID</>");
        var cancel_label = "";
        var rep_package = "";
        var stamps_trxid = "";
        $.each(frm.doc.packages_information || [], function (i, v_outer) {
            cancel_label = "cancel_label" + i;
            rep_package = "rep_package" + i;
            stamps_trxid = "stamps_trxid" + i;
            dialog.fields_dict[rep_package].$wrapper.html(v_outer.package);
            dialog.fields_dict[stamps_trxid].$wrapper.html(v_outer.stamps_txid);
            dialog.fields_dict[cancel_label].input.onclick = function () {
                //stamps_trxid = "MAT-PAC-2019-019352X2X2";
                var settings = {
                    "async": true,
                    "crossDomain": true,
                    "url": "https://corsanywhere-jqogydb25a-uc.a.run.app/" + stamps_credentials.url,
                    "method": "POST",
                    "headers": {
                        "content-type": "text/xml; charset=utf-8",
                        "soapaction": "http://stamps.com/xml/namespace/2018/03/swsim/swsimv71/AuthenticateUser",
                        "cache-control": "no-cache",
                    },
                    "data": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"\r\n               xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\r\n               xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"\r\n               xmlns:tns=\"http://stamps.com/xml/namespace/2018/03/swsim/swsimv71\">\r\n  <soap:Body>\r\n     <tns:AuthenticateUser>      \r\n\t     <tns:Credentials>         \r\n\t\t     <tns:IntegrationID>7b0b4025-cac9-4687-90a6-381086ec3c45</tns:IntegrationID>       \r\n\t\t     <tns:Username>globalads</tns:Username>       \r\n\t\t     <tns:Password>gl0b@lADS881</tns:Password>      \r\n\t     </tns:Credentials>    \r\n     </tns:AuthenticateUser> \r\n  </soap:Body>\r\n</soap:Envelope>"
                }

                $.ajax(settings).done(function (response) {

                    console.log(response.getElementsByTagName("Authenticator"));
                    var auth_token = response.getElementsByTagName("Authenticator")[0].innerHTML;
                    console.log(auth_token)
                    var cancelLabel = {
            		"url": "https://corsanywhere-jqogydb25a-uc.a.run.app/" + stamps_credentials.url,
                        "method": "POST",
                        "headers": {
                            "content-type": "text/xml; charset=utf-8",
                            "soapaction": "http://stamps.com/xml/namespace/2018/03/swsim/swsimv71/CancelIndicium",

                        },
                        "data": "<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"\r\n" +
                            "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\r\n" +
                            "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"\r\n" +
                            "xmlns:tns=\"http://stamps.com/xml/namespace/2018/03/swsim/swsimv71\">\r\n" +
                            "<soap:Body>\r\n<CancelIndicium  xmlns=\"http://stamps.com/xml/namespace/2018/03/swsim/swsimv71\">\r\n" +
                            "<Authenticator>" + auth_token + "</Authenticator>\r\n<StampsTxID>" + v_outer.stamps_txid + "</StampsTxID>\r\n" +
                            "</CancelIndicium>\r\n</soap:Body>\r\n</soap:Envelope>"
                    }
                    console.log(cancelLabel);
                    var cancel_label_resp = $.ajax(cancelLabel);
                    cancel_label_resp.done(function (response) {
                        console.log("RRRRRRRRRRRESPONSE")
                        console.log(response);
                        if (response.getElementsByTagName('Authenticator').length >= 1) {
                            if ((response.getElementsByTagName('faultstring').length >= 1)) {
                                frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipment", "");
                                cur_frm.refresh_field("shipment");
                                frm.save()
                                frappe.msgprint("Shipment Canceled Successfully <br>" + response.getElementsByTagName('faultstring')[0].innerHTML, "Successful");
                            } else {
                                frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipment", "");
                                cur_frm.refresh_field("shipment");
                                frm.save()
                                frappe.msgprint("Shipment Canceled Successfully", "Successful");
                            }
                            update_so_for_cancel_shipment(frm)
                        } else {
                            frappe.msgprint("Failed to refund label. Refund already in process OR You have Invalid Transaction ID", "err");
                        }

                    });
                    cancel_label_resp.error(function (response) {

                        frappe.msgprint(response.responseText.split('<faultstring>')[1].split('</faultstring>')[0], "err");
                        if (response.responseText.split('<faultstring>')[1].split('</faultstring>')[0] == "Failed to refund label. Refund already in process") {
                            frappe.model.set_value(frm.doc.doctype, frm.doc.name, "shipment", "");
                            cur_frm.refresh_field("shipment");
                            frm.save()
                            update_so_for_cancel_shipment(frm)
                        }
                    });
                });
            }
        });
        dialog.show();
    } else {
        frappe.msgprint("You have no shipment against this sales order", "Message");
    }
}

function get_shipping_rates(frm) {
    if (frm.doc.shipping_carrier === "UPS") {
        //
    } else {
        var total_weight = 0;
        $.each(frm.doc.packages_information || [], function (i, v_outer) {
            var row = locals[v_outer.doctype][v_outer.name];
            total_weight += row.weight;
        });
        var settings = {
            "async": true,
            "crossDomain": true,
            "url": "https://corsanywhere-jqogydb25a-uc.a.run.app/" + stamps_credentials.url,
            "method": "POST",
            "headers": {
                "content-type": "text/xml; charset=utf-8",
                "soapaction": "http://stamps.com/xml/namespace/2018/10/swsim/swsimv75/AuthenticateUser",
                "cache-control": "no-cache",
            },
            "data": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"\r\n  " +
            "             xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\r\n    " +
            "           xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"\r\n          " +
            "     xmlns:tns=\"http://stamps.com/xml/namespace/2018/10/swsim/swsimv75\">\r\n " +
            " <soap:Body>\r\n     <tns:AuthenticateUser>      \r\n\t     " +
            "<tns:Credentials>         \r\n\t\t    " +
            " <tns:IntegrationID>"+ stamps_credentials.integration_id +"</tns:IntegrationID> " +
            "      \r\n\t\t     <tns:Username>"+stamps_credentials.username+"</tns:Username>       \r\n\t\t   " +
            "  <tns:Password>"+ stamps_credentials.password+"</tns:Password>      \r\n\t    " +
            " </tns:Credentials>    \r\n     </tns:AuthenticateUser> \r\n  " +
            "</soap:Body>\r\n</soap:Envelope>"
        }

        $.ajax(settings).done(function (response) {

            console.log(response.getElementsByTagName("Authenticator"));
            var auth_token = response.getElementsByTagName("Authenticator")[0].innerHTML;
            //get rate request
            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Delivery Note",
                    name: frm.doc.delivery_note,
                },
                callback: function(dl) {
                    console.log(dl.message);
                    dl = dl.message;
                    var address_info;

                    frappe.call({
                        method: "frappe.client.get",
                        args: {
                            doctype: "Address",
                            name: dl.shipping_address_name,
                        },
                        callback: function(r) {
                            if (r.message) {
                                address_info = r.message;
                                var state_abb;
                                console.log(address_info);
                                console.log(address_info.address_line1);
                                frappe.call({
                                    method: "frappe.client.get",
                                    args: {
                                        doctype: "US States",
                                        name: address_info.state,
                                    },
                                    callback: function(r2) {
                                        console.log(r2.message);
                                        state_abb = r2.message.abb;
                                        // var today = new Date();
                                        // 	var formattedNumber = ("0" + (today.getMonth()+1)).slice(-2);
                                        // 	var date = today.getFullYear()+'-'+(formattedNumber)+'-'+today.getDate();
                                        var date = frappe.datetime.now_date().toString();
                                        var get_rates = {
                                            "async": true,
                                            "crossDomain": true,
                                            "url": "https://corsanywhere-jqogydb25a-uc.a.run.app/" + stamps_credentials.url,
                                            "method": "POST",
                                            "headers": {
                                                "content-type": "text/xml; charset=utf-8",
                                                "soapaction": "http://stamps.com/xml/namespace/2018/10/swsim/swsimv75/GetRates",
                                                "cache-control": "no-cache",
                                                "postman-token": "5195cf4d-1614-b1f1-561d-82d251c64f79"
                                            },
                                            "data": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n" +
                                                "<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"\r\n" +
                                                "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\r\n " +
                                                "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"\r\n " +
                                                " xmlns:tns=\"http://stamps.com/xml/namespace/2018/10/swsim/swsimv75\">\r\n" +
                                                "	<soap:Body>\r\n    <GetRates  xmlns=\"http://stamps.com/xml/namespace/2018/10/swsim/swsimv75\">\r\n " +
                                                " <Authenticator>" + auth_token + "</Authenticator>\r\n      <Rate>\r\n" +
                                                "<FromZIPCode>60506</FromZIPCode>\r\n " +
                                                "<ToZIPCode>" + address_info.pincode + "</ToZIPCode>\r\n" +
                                                "<WeightLb>" + total_weight.toString() + "</WeightLb>\r\n" +
                                                "	<PackageType>Package</PackageType>\r\n" +
                                                "<ShipDate>" + date + "</ShipDate>\r\n " +
                                                "\r\n      </Rate>\r\n    </GetRates>\r\n" +
                                                " </soap:Body>\r\n</soap:Envelope>"
                                        }
                                        console.log(get_rates);
                                        var get_rate_resp = $.ajax(get_rates);
                                        get_rate_resp.done(function (response) {
                                            console.log(response);
                                            var rates = response.getElementsByTagName('Rate');
                                            console.log(rates);
                                            $.each(rates || [], function (i, r) {
                                                console.log(r.getElementsByTagName('Amount')[0].innerHTML);
                                                var temp = [];
                                                temp.push({
                                                    'amount': r.getElementsByTagName('Amount')[0].innerHTML,
                                                    'service': r.getElementsByTagName('ServiceDescription')[0].innerHTML + " (" + r.getElementsByTagName('ServiceType')[0].innerHTML + ")",
                                                    'weight': 2,
                                                }); //r.getElementsByTagName('WeightLb')[0].innerHTML
                                                shipment_rates.push(temp);

                                            });
                                            console.log(shipment_rates);
                                            //show rates selection dialog
                                            var d = new frappe.ui.Dialog({
                                                'fields': [
                                                    { 'fieldname': 'ht', 'fieldtype': 'HTML' },
                                                    { 'fieldname': 'ht1', 'fieldtype': 'HTML' },


                                                    { 'fieldname': 'ht21', 'fieldtype': 'HTML' },

                                                    { 'fieldname': 'ht2', 'fieldtype': 'HTML' },
                                                    { 'fieldname': 'ht3', 'fieldtype': 'HTML' },
                                                ]
                                            });
                                            d.set_primary_action(__("Done"), function () {

                                            });
                                            var content = '<!DOCTYPE html>' +
                                                '<html>' +
                                                '<head><title></title></head>' +
                                                '<body>';
                                            content += '<table style="font-family: arial, sans-serif;border-collapse: collapse;width: 100%; text-align: left;">' +
                                                '<tr><th>Service</th><th>Weight</th><th>Amount(USD)</th></tr>';
                                            shipment_rates.forEach(function (item) {
                                                console.log(item);
                                                content += '<tr><td>' + item[0].service + '</td><td>' + item[0].weight + '</td><td>' + item[0].amount + '</td></tr>';
                                            });
                                            content += '<table>';
                                            content += '<p><br>Select Service:<br></p><select>'
                                            shipment_rates.forEach(function (item) {
                                                //console.log(item);
                                                content += '<option value="' + item[0].service + '">' + item[0].service + '</option>';
                                            });
                                            content += '</select></body></html>';

                                            d.fields_dict.ht.$wrapper.html(content);
                                            d.fields_dict.ht1.$wrapper.html('<br><br>');
                                            d.show();
                                        });

                                        get_rate_resp.error(function (response) {
                                            console.log(response)
                                        })
                                    }
                                });
                            }
                        }
                    });
                }
            });
        });

    }
}

function rotate90(src, callback) {
    var img = new Image();
    img.src = src
    img.onload = function () {
        var canvas = document.createElement('canvas')
        img.width = img.width + 200;
        img.height = img.height + 200;
        canvas.width = img.height + 200
        canvas.height = img.width
        canvas.style.position = "absolute"
        var ctx = canvas.getContext("2d")
        ctx.translate(img.height + 200, img.width / img.height)
        ctx.rotate(Math.PI / 2)
        ctx.drawImage(img, 0, 0, 1800, 1200);
        callback(canvas.toDataURL())

    }
}

/** Attempts to parse scale reading from USB raw output */
function readScaleData(data) {
    // Filter erroneous data
    if (data.length < 4 || data.slice(2, 8).join('') == "000000000000") {
        return null;
    }

    // Get status
    var status = parseInt(data[1], 16);
    switch (status) {
        case 1: // fault
        case 5: // underweight
        case 6: // overweight
        case 7: // calibrate
        case 8: // re-zero
            status = 'Error';
            break;
        case 3: // busy
            status = 'Busy';
            break;
        case 2: // stable at zero
        case 4: // stable non-zero
        default:
            status = 'Stable';
    }

    // Get precision
    var precision = parseInt(data[3], 16);
    precision = precision ^ -256; //unsigned to signed

    // xor on 0 causes issues
    if (precision == -256) { precision = 0; }

    // Get units
    var units = parseInt(data[2], 16);
    switch (units) {
        case 2:
            units = 'g';
            break;
        case 3:
            units = 'kg';
            break;
        case 11:
            units = 'oz';
            break;
        case 12:
        default:
            units = 'lbs';
    }

    // Get weight
    data.splice(0, 4);
    data.reverse();
    var weight = parseInt(data.join(''), 16);

    weight *= Math.pow(10, precision);
    weight = weight.toFixed(Math.abs(precision));

    return weight; //+ units + ' - ' + status;
}

function get_history_data(frm, new_key) {
    frm.call({
        method: "global_app.doc_events.packing_slip.get_packaging_history",
        args: {
            matching_key: new_key
        },
        callback: function(response) {
            console.log(response.message);
            if (response.message == 'False' || response.message.length == 0) {
                //NSFB:<H>NSH-702:NSH-713EB15:=FQ[4]HQ8=T12 we want to create a key like this
                var key_component = frm.doc.matching_key.split('=');
                var flag_count = parseInt(key_component[1].split(']')[0].split('[')[1]);
                var hardware_count = parseInt(key_component[1].split('HQ')[1]);
                var total_Q = parseInt(key_component[2].split('T')[1]);
                if (flag_count > 1) {
                    var new_key = key_component[0] + '=FQ[' + toString(flag_count - 1) + ']HQ' + toString(hardware_count - 2) + '=T' + toString(total_Q - 3);
                    console.log(new_key);
                    get_history_data(frm, new_key);
                } else {
                    frappe.msgprint("No Packaging history found", "Message");
                }
            } else {
                frappe.call({
                    method: "frappe.client.get",
                    args: {
                        doctype: "Packing Slip",
                        name: response.message.name
                    },
                    callback: function(response2) {

                        response2.message.packages_information.forEach(function (his_data) {
                            var pack_flag = false;
                            frm.doc.items.forEach(function (item) {
                                //console.log(item);
                                if (item.status !== 'packed') {
                                    pack_flag = true;
                                }
                            });
                            if (pack_flag) {
                                var child2 = cur_frm.add_child("packages_information");
                                frappe.model.set_value(child2.doctype, child2.name, "package", his_data.package);

                                frappe.model.set_value(child2.doctype, child2.name, "quantity", his_data.quantity);
                                frappe.model.set_value(child2.doctype, child2.name, "weight", his_data.weight);
                                frappe.model.set_value(child2.doctype, child2.name, "packing_slip_no", frm.doc.name);
                                frappe.model.set_value(child2.doctype, child2.name, "matching_key", his_data.matching_key);
                                var item_str = '';
                                var item_q_str = 'NSFB-5009=1, NSH-730E15=1, NSH-739=1' //his_data.items_quantity
                                item_q_str.split(', ').forEach(function (IT) {
                                    console.log(IT);

                                    frm.doc.items.forEach(function (item) {
                                        //console.log(item);
                                        if (item.status !== 'packed') {
                                            if (item.item_code === IT.split('=')[0]) {
                                                //change status
                                                console.log("match");

                                                if (item_str === '') {
                                                    item_str = item.item_code;
                                                } else {
                                                    item_str += ', ' + item.item_code;
                                                }
                                                if (item.qty > parseInt(IT.split('=')[1])) {
                                                    frappe.model.set_value(item.doctype, item.name, "qty", item.qty - parseInt(IT.split('=')[1]));
                                                    cur_frm.refresh_field("qty");
                                                    frappe.model.set_value(item.doctype, item.name, "status", 'partial-packed');
                                                    cur_frm.refresh_field("status");

                                                } else {
                                                    frappe.model.set_value(item.doctype, item.name, "status", 'packed');
                                                    cur_frm.refresh_field("status");
                                                    $("div[data-fieldname=items]").find('div.grid-row[data-idx=' + item.idx + ']').css('background-color', '#72bb82');
                                                }
                                            } else if (item.item_code.split('-')[0] === IT.split('-')[0]) {
                                                item_q_str = item_q_str.replace(IT.split('=')[0], item.item_code);
                                                if (item_str === '') {
                                                    item_str = item.item_code;
                                                } else {
                                                    item_str += ', ' + item.item_code;
                                                }
                                                if (item.qty > parseInt(IT.split('=')[1])) {
                                                    frappe.model.set_value(item.doctype, item.name, "qty", item.qty - parseInt(IT.split('=')[1]));
                                                    cur_frm.refresh_field("qty");
                                                    frappe.model.set_value(item.doctype, item.name, "status", 'partial-packed');
                                                    cur_frm.refresh_field("status");

                                                } else {
                                                    frappe.model.set_value(item.doctype, item.name, "status", 'packed');
                                                    cur_frm.refresh_field("status");
                                                    $("div[data-fieldname=items]").find('div.grid-row[data-idx=' + item.idx + ']').css('background-color', '#72bb82');
                                                }
                                            }
                                        }
                                    });
                                })
                                // add items
                                console.log(item_q_str);
                                frappe.model.set_value(child2.doctype, child2.name, "items", item_str);
                                frappe.model.set_value(child2.doctype, child2.name, "items_quantity", item_q_str);
                                cur_frm.refresh_field("packages_information");
                            }

                        })
                        ne_packing_logic(frm);
                    }
                });
            }
        }
    });
}

function ne_packing_logic(frm) {

    cur_frm.clear_table("pick_items");
    cur_frm.refresh_field("pick_items");
    cur_frm.doc.items.forEach(function (item) {
        console.log(item);
        if (item.status === 'partial-packed') {
            var PK = cur_frm.add_child("pick_items");
            frappe.model.set_value(PK.doctype, PK.name, "item_code", item.item_code);
            frappe.model.set_value(PK.doctype, PK.name, "name1", item.item_name);
            frappe.model.set_value(PK.doctype, PK.name, "qty", item.qty);
            cur_frm.refresh_field("pick_items");
        } else if (item.status !== 'packed' || !item.status) {
            var PK = cur_frm.add_child("pick_items");
            frappe.model.set_value(PK.doctype, PK.name, "item_code", item.item_code);
            frappe.model.set_value(PK.doctype, PK.name, "name1", item.item_name);
            frappe.model.set_value(PK.doctype, PK.name, "qty", item.qty);
            cur_frm.refresh_field("pick_items");
        }

    });
}

function pack_usps_items(frm) {
    var temp_total_qty = 0;
    var temp_total_qty1 = "";
    var temp_total_weight = 0;

    var flag_type_check = false
    var flag_group = "";
    frm.doc.items.forEach(function (item) {
        if (item.status !== 'packed') {
            if (!flag_type_check) {
                if (item.item_code.split('-')[0] === 'NSFB' || item.item_code.split('-')[0] === 'NSF') {
                    flag_group = "NSF/NSFB"
                    flag_type_check = true;
                } else if (item.item_code.indexOf("312NS") > -1) {
                    flag_group = "312NS"
                    flag_type_check = true;
                } else if (item.item_code.split('-')[0] === 'NSRE') {
                    flag_group = "NSRE"
                    flag_type_check = true;
                } else if (item.item_code.indexOf("NS-NB") > -1) {
                    flag_group = "NS-NB"
                    flag_type_check = true;
                } else if (item.item_code.split('-')[0] === 'NSW') {
                    flag_group = "NSW"
                    flag_type_check = true;
                } else if (item.item_code.split('-')[0] === 'NS35') {
                    flag_group = "NS35"
                    flag_type_check = true;
                } else if (item.item_code.split('-')[0] === 'GD') {
                    if (item.item_name.indexOf("18") > -1) {
                        flag_group = "GD18"
                    } else {
                        flag_group = "GD10"
                    }
                    flag_type_check = true;
                }
            }

            temp_total_qty += item.qty;
            if(temp_total_qty1){
                temp_total_qty1 += ", "
            }
            temp_total_qty1 += item.item_code + "="+ item.qty;
            temp_total_weight += item.net_weight

        }
    });
    //var qty_sent = temp_total_qty + ((GD_qty * 4) - (GD_qty));
    frm.call({
        method: "global_app.doc_events.packing_slip.get_getusps_box",
        args: {
            qty: temp_total_qty,
            group: flag_group
        },
        callback: function(response) {
            var data = response.message
            if (data) {
                var item_str = ''
                var price = 0;
                frm.doc.items.forEach(function (item) {
                    if (item.status !== 'packed') {
                        //pack that item
                        price += (item.rate) * item.qty
                        item_str += item.item_code + ", "
                        frappe.model.set_value(item.doctype, item.name, "status", 'packed');
                        cur_frm.refresh_field("status");

                    }

                });

                var pck_inf = cur_frm.add_child("packages_information");
                frappe.model.set_value(pck_inf.doctype, pck_inf.name, "package", data.box);

                frappe.model.set_value(pck_inf.doctype, pck_inf.name, "quantity", temp_total_qty);
                // frappe.model.set_value(pck_inf.doctype, pck_inf.name, "weight", data.weight + temp_total_weight);
                frappe.model.set_value(pck_inf.doctype, pck_inf.name, "items", item_str);
                frappe.model.set_value(pck_inf.doctype, pck_inf.name, "price", price);
                frappe.model.set_value(pck_inf.doctype, pck_inf.name, "items_quantity", temp_total_qty1);

                cur_frm.refresh_field("packages_information");
                ne_packing_logic(frm);
                cur_frm.save()
            }
        }
    });
}

function pack_ups_items(frm) {
    var list_item_code = [];
    var target_qty = 0;
    var total_qty = 0;

    var temp_total_weight = 0;
    frm.doc.items.forEach(function (item) {
        if (item.status !== 'packed') {
            list_item_code.push(item.item_code)
            if (item.item_code.split('-')[0] === 'NSH') {
                target_qty = item.qty;
            }
            total_qty += item.qty;

            temp_total_weight += item.net_weight;
        }
    });
    if (list_item_code.length > 0) {
        frm.call({
            method: "global_app.doc_events.packing_slip.get_getups_box",
            args: {
                items_list: list_item_code,
                qty: target_qty,
                items: frm.doc.items
            },
            callback: function(response) {
                var data = response.message
                if (data) {
                    var items_qty = "";
                    var item_str = ''
                    var price = 0;
                    frm.doc.items.forEach(function (item) {
                        if (item.status !== 'packed') {
                            //pack that item
                            price += (item.rate) * item.qty
                            item_str += item.item_code + ", "
                             if(items_qty){
                                items_qty += ", "
                            }
                            items_qty += item.item_code + "=" + item.qty

                            frappe.model.set_value(item.doctype, item.name, "status", 'packed');
                            cur_frm.refresh_field("items");

                        }

                    });

                    var pck_inf = cur_frm.add_child("packages_information");
                    frappe.model.set_value(pck_inf.doctype, pck_inf.name, "package", data.box);

                    frappe.model.set_value(pck_inf.doctype, pck_inf.name, "quantity", total_qty);
                    frappe.model.set_value(pck_inf.doctype, pck_inf.name, "items", item_str);
                    frappe.model.set_value(pck_inf.doctype, pck_inf.name, "price", price);
                    frappe.model.set_value(pck_inf.doctype, pck_inf.name, "items_quantity", items_qty);
                    cur_frm.refresh_field("packages_information");
                    ne_packing_logic(frm);
                    cur_frm.save()
                }
            }

        });
    }
}

function update_so_for_cancel_shipment(frm) {
    frm.call({
        method: "global_app.doc_events.packing_slip.update_so_for_cancel_shipment",
        args: {
            name: frm.doc.name,
            po_no: frm.doc.purchase_order
        },
        callback: function(response) {

        }
    });

}

