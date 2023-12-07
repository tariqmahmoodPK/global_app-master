var global_flag = true;
var order_dict = []
var ups_credentials = {}
var stamps_credentials = {}
var batch_dialg;
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
function print_all(){
   // var checked_list = [];
   //      order_dict = []
   //      var carrier_var = ""
   //      var print_all_please = true
   //      $('.checkbox').each(function () {
   //          if (this.checked) {
   //              var input = this;
   //              checked_list = [];
   //              checked_list = input.id.split(',');
   //              carrier_var = checked_list[2]
   //              if (carrier_var && carrier_var !== checked_list[2]) {
   //                  frappe.msgprint("Please select either USPS or UPS orders, mix shipping is not allowed ")
   //                  print_all_please = false
   //                  return false;
   //              }
   //
   //              order_dict.push({
   //                  'printed': false,
   //                  'ps': checked_list[0],
   //                  'box': checked_list[1],
   //                  'carrier': checked_list[2],
   //                  'package': checked_list[3],
   //                  'weight': checked_list[4]
   //              });
   //
   //          }
   //      });
   //      if(print_all_please){
   //          for(var x=0;x<order_dict.length;x += 1) {
   //              if (order_dict[x].carrier === "USPS") {
   //                  global_flag = false;
   //                  batch_dialg = new frappe.ui.Dialog({
   //                      title: __("Printing labels:"),
   //                      "fields": [
   //                          { "fieldname": "overview", "fieldtype": "HTML" },
   //                      ]
   //                  });
   //                  batch_dialg.fields_dict.overview.$wrapper.html('<b> Please wait....</b>');
   //                  batch_dialg.show()
   //                  print_usps_label(order_dict[x].ps, order_dict[x].box, order_dict[x].carrier, order_dict[x].package, order_dict[x].weight)
   //
   //              } else if (order_dict[x].carrier === "UPS") {
   //                  global_flag = false;
   //                  batch_dialg = new frappe.ui.Dialog({
   //                      title: __("Printing labels:"),
   //                      "fields": [
   //                          { "fieldname": "overview", "fieldtype": "HTML" },
   //                      ]
   //                  });
   //                  batch_dialg.fields_dict.overview.$wrapper.html('<b> Please wait....</b>');
   //                  batch_dialg.show()
   //                  print_ups_label(order_dict[x].ps, order_dict[x].box, order_dict[x].carrier, order_dict[x].package, order_dict[x].weight)
   //
   //              } else {
   //                  frappe.msgprint("No order selected", "Message")
   //              }
   //          }
   //      }
var checked_list = [];
        order_dict = []
        var carrier_var = ""
        $('.checkbox').each(function () {
            if (this.checked == true) {
                var input = this;
                checked_list = [];
                checked_list = input.id.split(',');
                carrier_var = checked_list[2]
                if (carrier_var && carrier_var !== checked_list[2]) {
                    frappe.msgprint("Please select either USPS or UPS orders, mix shipping is not allowed ")
                    return false;
                }

                order_dict.push({
                    'printed': false,
                    'ps': checked_list[0],
                    'box': checked_list[1],
                    'carrier': checked_list[2],
                    'package': checked_list[3],
                    'weight': checked_list[4]
                });

            }
        });

        if (order_dict.length > 0 && carrier_var === "USPS") {
            global_flag = false;
            print_usps_label(order_dict[0].ps, order_dict[0].box, order_dict[0].carrier, order_dict[0].package, order_dict[0].weight)
            batch_dialg = new frappe.ui.Dialog({
                title: __("Printing labels:"),
                "fields": [
                    { "fieldname": "overview", "fieldtype": "HTML" },
                ]
            });
            batch_dialg.fields_dict.overview.$wrapper.html('<b> Please wait....</b>');
            batch_dialg.show()

        }
        else if (order_dict.length > 0 && carrier_var === "UPS") {
            global_flag = false;
            print_ups_label(order_dict[0].ps, order_dict[0].box, order_dict[0].carrier, order_dict[0].package, order_dict[0].weight)
            batch_dialg = new frappe.ui.Dialog({
                title: __("Printing labels:"),
                "fields": [
                    { "fieldname": "overview", "fieldtype": "HTML" },
                ]
            });
            batch_dialg.fields_dict.overview.$wrapper.html('<b> Please wait....</b>');
            batch_dialg.show()

        }

        else {
            frappe.msgprint("No order selected", "Message")
        }
}
function get_default() {
    return "06/28/2020"
}
function refresh() {
    var from_date = $('input[data-fieldname="from_date"]').val();
        var to_date = $('input[data-fieldname="to_date"]').val();
        var po_no = $('input[data-fieldname="po"]').val();
        var so_no = $('input[data-fieldname="so"]').val();
        var carrier = $('input[data-fieldname="carrier"]').val();
        var status = $('input[data-fieldname="status"]').val();

        if (carrier === "select") {
            carrier = null;
        }
        if (status === "select") {
            status = null;
        }
        if(!from_date || !to_date){
                from_date = null
                to_date = null
            }
        frappe.call({
                method: "global_app.global_app.page.shipping_controller.shipping_controller.get_shipping_data",
            args: {
                from_date: from_date ? from_date : null,
                to_date: to_date ? to_date : null,
                po_no: po_no ? po_no : null,
                so_no: so_no ? so_no : null,
                carrier: carrier ? carrier : null,
                status: status ? status : null,
            },
            freeze: true,
            freeze_message: "Fetching data please wait...",
            callback: function(resp) {
               page.sidebar.html(frappe.render_template("shipping_controller", { 'doc': resp.message }));
                // add_data_to_side_bar(page, resp.message)

            }
        });
}
var data_object = {}
var data_list = []
var page = ""
frappe.pages['shipping-controller'].on_page_load = function (wrapper) {
    ups_credentials = get_ups_credentials("UPS Settings")
    stamps_credentials = get_ups_credentials("Stamps Settings")

    page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'SHIPPING CONTROLLER',
        single_column: false
    });
    page.set_primary_action('Print All', () => print_all(), 'octicon octicon-plus');
    page.set_secondary_action('Refresh', () => refresh(), 'octicon octicon-sync')
    var fields = [
        {label: "From Date", fieldtype: "Date",fieldname: "from_date"},
        {label: "To Date", fieldtype: "Date",fieldname: "to_date"},
        {label: "SO#", fieldtype: "Data",fieldname: "so"},
        {label: "PO#", fieldtype: "Data",fieldname: "po"},
        {label: "Carrier", fieldtype: "Select",fieldname: "carrier", options: ["","UPS","USPS"]},
        {label: "Status", fieldtype: "Select",fieldname: "status", options: ["","Processed","Pending"]}]
    for (var i = 0; i<fields.length;i += 1) {

        var field = page.add_field(fields[i]);
        field.df['onchange'] = function(){
            data_object[this.input.dataset.fieldname] = this.get_value()
            var from_date = data_object["from_date"]
            var to_date =  data_object["to_date"]
            var po_no =  data_object["po"]
            var so_no =  data_object["so"]
            var carrier =  data_object["carrier"]
            var status =  data_object["status"]

            if (carrier === "select") {
                carrier = null;
            }
            if (status === "select") {
                status = null;
            }
            if(!from_date || !to_date){
                from_date = null
                to_date = null
            }
            frappe.call({
                method: "global_app.global_app.page.shipping_controller.shipping_controller.get_shipping_data",
                args: {
                    from_date: from_date ? from_date : null,
                    to_date: to_date ? to_date : null,
                    po_no: po_no ? po_no : null,
                    so_no: so_no ? so_no : null,
                    carrier: carrier ? carrier : null,
                    status: status ? status : null
                },
                freeze: true,
                freeze_message: "Fetching data please wait...",
                callback: function(resp) {
                    // data_list = resp.message.data_list
                    page.sidebar.html(frappe.render_template("shipping_controller", { 'doc': resp.message }));

                    // add_data_to_side_bar(page, resp.message)

                }
            });
        }
        // fields[i]["onchange"] = function(){console.log(field.get_value())}
    }

    qz.security.setCertificatePromise(function (resolve, reject) {
        $.ajax({ url: 'https://corsanywhere-jqogydb25a-uc.a.run.app/' + "https://digitalcertificate-jqogydb25a-uc.a.run.app/", cache: false, dataType: "text" }).then(resolve, reject);
    });
    qz.security.setSignaturePromise(function (toSign) {
        return function (resolve, reject) {
            $.ajax('https://corsanywhere-jqogydb25a-uc.a.run.app/' + "https://signature-jqogydb25a-uc.a.run.app/sign?request=" + toSign).then(resolve, reject);
        };
    });
    page.main.on("click", '.checkbox', function () {
        console.log("CLICK !")
        if ($('.checkbox:checked').length === $('.checkbox').length) {
            $('#select_all').prop('checked', true);
            $("#print_all_btn").attr("disabled", false);
        } else {
            $('#select_all').prop('checked', false);
        }
        var flg = false
        $('.checkbox').each(function () {
            if (this.checked === true) {
                $("#print_all_btn").attr("disabled", false);
                flg = true;
            }
        });
        if (!flg) {
            $("#print_all_btn").attr("disabled", true);
        }
    });

    window.onerror = function (messageOrEvent, source, lineno, colno, error) {
        frappe.call({
            method: "global_app.global_app.page.shipping_controller.shipping_controller.log_error",
            args: {
                messageOrEvent: messageOrEvent,
                source: source,
                lineno: lineno,
                error: error,
                file: "Shipping Controller"
            },
            callback: function(resp) {}
        });
    }
    frappe.call({
        method: "global_app.global_app.page.shipping_controller.shipping_controller.get_shipping_data",
        args: {
            from_date: null,
            to_date: null,
            po_no: null,
            so_no: null,
            carrier: null,
            status: null
        },
        freeze: true,
        freeze_message: "Fetching data please wait...",
        callback: function(resp) {
            console.log(resp.message)
            page.sidebar.html(frappe.render_template("shipping_controller", { 'doc': resp.message }));
            // add_data_to_side_bar(page, resp.message)
        }
    });

}
function pagination() {
        var from_date = $('input[data-fieldname="from_date"]').val();
        var to_date = $('input[data-fieldname="to_date"]').val();
        var po_no = $('input[data-fieldname="po"]').val();
        var so_no = $('input[data-fieldname="so"]').val();
        var carrier = $('input[data-fieldname="carrier"]').val();
        var status = $('input[data-fieldname="status"]').val();
        var pg_count = $('#page_count').val();

        if (carrier === "select") {
            carrier = null;
        }
        if (status === "select") {
            status = null;
        }
        if(!from_date || !to_date){
                from_date = null
                to_date = null
            }
        frappe.call({
            method: "global_app.global_app.page.shipping_controller.shipping_controller.get_shipping_data",
            args: {
                from_date: from_date ? from_date : null,
                to_date: to_date ? to_date : null,
                po_no: po_no ? po_no : null,
                so_no: so_no ? so_no : null,
                carrier: carrier ? carrier : null,
                status: status ? status : null,
                page_count: pg_count ? pg_count : 20
            },
            freeze: true,
            freeze_message: "Fetching data please wait...",
            callback: function(resp) {
               page.sidebar.html(frappe.render_template("shipping_controller", { 'doc': resp.message }));
                // add_data_to_side_bar(page, resp.message)

            }
        });
}
frappe.pages['shipping-controller'].refresh = function (wrapper) {
    //getDate()
}
var dialog_preview = ""
var boxes_name = ""
function detailed_view(ps) {
    frappe.call({
        method: "global_app.global_app.page.shipping_controller.shipping_controller.get_ps_for_review",
        args: {
            name: ps
        },
        freeze: true,
        callback: function(response_in) {
            if (response_in.message) {
              if(page.dialog){
                    console.log("NAA MAN")
                    page.dialog.fields_dict.overview.$wrapper.html(response_in.message)
                    page.dialog.show()
                } else {
                    console.log("NAG CREATE UG NEW")
                    page.dialog = new frappe.ui.Dialog({
                        title: __("Packing Slip Details:"),
                        "fields": [
                            { "fieldname": "overview", "fieldtype": "HTML" },
                        ]
                    });
                    page.dialog.fields_dict.overview.$wrapper.html(response_in.message);

                    page.dialog.show()
                }

            }
        }
    });
}


function capture_weight(ps, box, from="preview") {
    capture_weight_handler(ps, box,from)
}

function capture_weight_handler(ps, box,from) {
    var scale_att = [];
    if (!qz.websocket.isActive()) {
        qz.websocket.connect().then(function () {
            qz.hid.listDevices().then(function (data) {
                scale_att = [];
                console.log(data)
                for (var i = 0; i < data.length; i++) {
                    var device = data[i];
                    console.log(device);
                    if (device.manufacturer) {
                        if (device.manufacturer.toLowerCase() == "mettler toledo") {
                            console.log("found..........");
                            scale_att.push({
                                'vend': device.vendorId,
                                'prod': device.productId,
                                'usage': device.usagePage,
                                'ser': device.serial
                            });
                            console.log("ddd");
                            read_data(scale_att, ps, box,from);
                            console.log("done");
                        }
                    }

                }

            }).catch(frappe.call({
                method: "global_app.global_app.page.shipping_controller.shipping_controller.log_error",
                args: {
                    messageOrEvent: "QZ conn list devices",
                    source: "",
                    lineno: "386",
                    error: "Can not list devices",
                    file: "Shipping Controller"
                },
                callback(resp) {
                    //todo
                }
            }));


        }).catch(
            frappe.call({
                method: "global_app.global_app.page.shipping_controller.shipping_controller.log_error",
                args: {
                    messageOrEvent: "QZ connect",
                    source: "",
                    lineno: "402",
                    error: "Could not connect to QZ Tray, please check if QZ Tray is active",
                    file: "Shipping Controller"
                },
                callback(resp) {
                    //todo
                }
            })
        )
    } else {
        if (scale_att.length == 0) {
            qz.hid.listDevices().then(function (data) {
                scale_att = [];
                console.log(data)
                for (var i = 0; i < data.length; i++) {
                    var device = data[i];
                    console.log(device);
                    if (device.manufacturer) {
                        if (device.manufacturer.toLowerCase() == "mettler toledo") {
                            console.log("found");
                            scale_att.push({
                                'vend': device.vendorId,
                                'prod': device.productId,
                                'usage': device.usagePage,
                                'ser': device.serial
                            });
                            console.log("ddd");
                            read_data(scale_att, ps, box,from);
                            console.log("done");
                        }
                    }

                }

            }).catch(frappe.call({
                method: "global_app.global_app.page.shipping_controller.shipping_controller.log_error",
                args: {
                    messageOrEvent: "Device listing",
                    source: "",
                    lineno: "441",
                    error: "Error in device listing",
                    file: "Shipping Controller"
                },
                callback(resp) {
                    //todo
                }
            }));

        } else {
            read_data(scale_att, ps, box,from);
        }

    }
}

function read_data(scale_att, ps, box,from) {
    console.log(scale_att);
    console.log("Claimeing");
    qz.hid.isClaimed({
        vendorId: scale_att[0].vend,
        productId: scale_att[0].prod
    }).then(function (claimed) {
        if (claimed) {
            console.log("calling cap");
            cap_weight(scale_att, ps, box,from)
        } else {
            qz.hid.claimDevice({
                vendorId: scale_att[0].vend,
                productId: scale_att[0].prod,
                usagePage: scale_att[0].usage,
                serial: scale_att[0].ser
            }).then(function () {
                console.log("Claimeing");
                console.log("cliamed");

                cap_weight(scale_att, ps, box,from);
            }).catch(frappe.call({
                method: "global_app.global_app.page.shipping_controller.shipping_controller.log_error",
                args: {
                    messageOrEvent: "Device claiming",
                    source: "",
                    lineno: "484",
                    error: "Error in device claiming",
                    file: "Shipping Controller"
                },
                callback(resp) {
                    //todo
                }
            }));

        }
    }).catch(frappe.call({
        method: "global_app.global_app.page.shipping_controller.shipping_controller.log_error",
        args: {
            messageOrEvent: "can not claim",
            source: "",
            lineno: "494",
            error: "error in claiming",
            file: "Shipping Controller"
        },
        callback(resp) {
            //todo
        }
    }));
    // qz.websocket.disconnect();

}

function cap_weight(scale_att, ps, box,from) {
    console.log(scale_att[0].ser);
    console.log(scale_att);
    qz.hid.readData({
        vendorId: scale_att[0].vend,
        productId: scale_att[0].prod,
        usagePage: scale_att[0].usage,
        serial: scale_att[0].ser,
        responseSize: 8
    }).then(function (data) {
        console.log(data)

        console.log("saving to backend")
        console.log(ps + "   |   " + box)
        var new_weight = readScaleData(data)
        console.log(new_weight)
        frappe.call({
            method: "global_app.global_app.page.shipping_controller.shipping_controller.update_weight",
            args: {
                ps: ps,
                doc_name: box,
                data: new_weight
            },
            freeze: true,
            freeze_message: "Capturing Weight...",
            callback: function(response_in) {
                console.log("FROOOOOOOOOOOOOOM")
                console.log(from)
                if (from === "preview") {
                   $('document').context.forms[2].innerHTML = ""
                    $('document').context.forms[2].innerHTML = response_in.message
                    detailed_view(ps)
                }

                var from_date = $('input[data-fieldname="from_date"]').val();
                var to_date = $('input[data-fieldname="to_date"]').val();
                var po_no = $('input[data-fieldname="po"]').val();
                var so_no = $('input[data-fieldname="so"]').val();
                var carrier = $('input[data-fieldname="carrier"]').val();
                var status = $('input[data-fieldname="status"]').val();

                if (carrier === "select") {
                    carrier = null;
                }
                if (status === "select") {
                    status = null;
                }
                if(!from_date || !to_date){
                        from_date = null
                        to_date = null
                    }
                frappe.call({
                    method: "global_app.global_app.page.shipping_controller.shipping_controller.get_shipping_data",
                    args: {
                        from_date: from_date ? from_date : null,
                        to_date: to_date ? to_date : null,
                        po_no: po_no ? po_no : null,
                        so_no: so_no ? so_no : null,
                        carrier: carrier ? carrier : null,
                        status: status ? status : null,
                    },
                    freeze: true,
                    freeze_message: "Fetching data please wait...",
                    callback: function(resp) {
                       page.sidebar.html(frappe.render_template("shipping_controller", { 'doc': resp.message }));
                        // add_data_to_side_bar(page, resp.message)

                    }
                });
                //page.main.html(frappe.render_template("shipping_controller", {doc:resp.message}));
            }
        });


    }).catch(frappe.call({
        method: "global_app.global_app.page.shipping_controller.shipping_controller.log_error",
        args: {
            messageOrEvent: "Error in reading data",
            source: "",
            lineno: "557",
            error: "Could not read data",
            file: "Shipping Controller"
        },
        callback: function(resp) {
            //todo
        }
    }));
}


/** Attempts to parse scale reading from USB raw output */
function readScaleData(data) {
    // Filter erroneous data
    if (data.length < 4 || data.slice(2, 8).join('') === "000000000000") {
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
    if (precision === -256) { precision = 0; }

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

function label_print(ps, box, carrier, package, weight) {

    var print_lb = new frappe.ui.Dialog({
        title: __("Printing Label"),
        "fields": [
            { "fieldname": "manual_shipment", "fieldtype": "HTML" },
            // { "fieldname": "tracking", "fieldtype": "Data", "label": "Tracking Number" },
            // { "fieldname": "add_data", "fieldtype": "Button", "label": "SAVE" },
        ]
    });
    print_lb.fields_dict.manual_shipment.$wrapper.html('<b2>Printing label please wait ......</b2>');

    print_lb.show()

    if (carrier == "UPS") {
        print_ups_label(ps, box, carrier, package, weight)
    } else if (carrier == "USPS") {
        print_usps_label(ps, box, carrier, package, weight)
    }

}


function print_ups_label(ps, box, carrier, package, weight) {
    
    var ups_address;

    frappe.call({
        method: "frappe.client.get",
        async: false,
        args: {
            doctype: "UPS Settings"
        },
        callback: function (r) {
            ups_address = r.message
        }
    });

    console.log("sending")
    var length, width, height;
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Package",
            name: package,
        },
        async: false,
        callback: function(pkg) {
            console.log(pkg.message)
            length = pkg.message.length;
            width = pkg.message.width;
            height = pkg.message.hight;
        }
    })
    var packing_slip = null;
    var ins_money_value = "100";
    var insurance = ""
    var package_cost = 0
    var default_number = ""

    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Packing Slip",
            name: ps,
        },
        async: false,
        callback: function(pcking) {
            console.log(pcking.message);
            packing_slip = pcking.message;
            $.each(packing_slip.packages_information || [], function (i, v_outer) {
            if (v_outer.name === box) {
                package_cost = v_outer.price;
                if (v_outer.ups_insurance) {
                    if (v_outer.declared_value) {
                        ins_money_value = v_outer.declared_value;
                    }
                }
                insurance = {
                    "DeclaredValue": {
                        "Type": {
                            "Code": "01",
                            "Description": "Insurance",
                        },
                        "CurrencyCode": "USD",
                        "MonetaryValue": ins_money_value
                    }

                }
                //break;
            }
        });
        }
    })
    frappe.call({
            method: "global_app.doc_events.packing_slip.get_default_phone_number",
            args: {
                dn: packing_slip.delivery_note,
            },
            async: false,
            callback: function(r) {
                default_number = r.message
            }
        })
    console.log(insurance)

    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Delivery Note",
            name: packing_slip.delivery_note,
        },
        callback(dl) {
            console.log(dl.message);
            dl = dl.message;
            var address_info;

            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Address",
                    name: dl.shipping_address_name,
                },
                callback(r) {
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
                        if (packing_slip.third_party_shipping) {
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
                                                    callback(cntry) {
                                                        country_code = cntry.message.code

                                                    }
                                                });

                                            }
                                            console.log(b_add.state)
                                            frappe.call({
                                                method: "frappe.client.get",
                                                async: false,
                                                args: {
                                                    doctype: "US States",
                                                    name: b_add.state,
                                                },
                                                callback(cnt_s) {
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
                        var attention_name = "";
                        if (address_info.attention_name) {
                            attention_name = address_info.attention_name
                        }
                        else {
                            attention_name = ""
                        }
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
                                console.log("UPS USERNAME")
                                console.log(ups_credentials.username)
                                console.log("UPS PASSWORD")
                                console.log(ups_credentials.password)
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
                                                "AttentionName": attention_name,
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
                                                    "City": ups_address.city,
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
                                                "Code": packing_slip.service_code,
                                                "Description": packing_slip.shipping_service
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
                                                    "Weight": weight.toString()
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
                                //a=a/0
                                $.ajax({
                                    url: 'https://corsanywhere-jqogydb25a-uc.a.run.app/' + url +"/rest/Ship ",//"https://wwwcie.ups.com/rest/Ship", //
                                    type: "POST",
                                    contentType: "application/json; charset=utf-8",
                                    dataType: "json",
                                    data: JSON.stringify(data),
                                    success: function (data) {
                                        //row = locals[cdt][cdn];
                                        console.log(data);
                                        handle_success_response_single(packing_slip, data, dl, box);
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


function handle_success_response_single(packing_slip, data, dl, box) {
    qz.websocket.disconnect();
    if (data.ShipmentResponse) {
        if (data.ShipmentResponse.Response.ResponseStatus.Code === "1") {
            var ship_cost = data.ShipmentResponse.ShipmentResults.ShipmentCharges.TotalCharges.MonetaryValue;
            if (packing_slip.third_party_shipping) {
                ship_cost = 0.0;
            }
            var service_fee = data.ShipmentResponse.ShipmentResults.ShipmentCharges.ServiceOptionsCharges.MoncaetaryValue
            frappe.call({
                method: "global_app.global_app.page.shipping_controller.shipping_controller.add_shipment_data_to_packing_slip",
                args: {
                    ps: packing_slip.name,
                    shipment_identification_number: data.ShipmentResponse.ShipmentResults.ShipmentIdentificationNumber,
                    tracking: data.ShipmentResponse.ShipmentResults.PackageResults.TrackingNumber,
                    stamps_txid: null,
                    box: box,
                    service_fee: service_fee ? service_fee : 0,
                    cost: ship_cost

                },
                async: false,
                callback: function(resp) {
                    console.log(resp.message)
                    var from_date = $('input[data-fieldname="from_date"]').val();
                    var to_date = $('input[data-fieldname="to_date"]').val();
                    var po_no = $('input[data-fieldname="po"]').val();
                    var so_no = $('input[data-fieldname="so"]').val();
                    var carrier = $('input[data-fieldname="carrier"]').val();
                    var status = $('input[data-fieldname="status"]').val();

                    if (carrier === "select") {
                        carrier = null;
                    }
                    if (status === "select") {
                        status = null;
                    }
                    if(!from_date || !to_date){
                            from_date = null
                            to_date = null
                        }
                    frappe.call({
                        method: "global_app.global_app.page.shipping_controller.shipping_controller.get_shipping_data",
                        args: {
                            from_date: from_date ? from_date : null,
                            to_date: to_date ? to_date : null,
                            po_no: po_no ? po_no : null,
                            so_no: so_no ? so_no : null,
                            carrier: carrier ? carrier : null,
                            status: status ? status : null,
                        },
                        freeze: true,
                        freeze_message: "Fetching data please wait...",
                        callback: function(resp) {
                           page.sidebar.html(frappe.render_template("shipping_controller", { 'doc': resp.message }));
                            // add_data_to_side_bar(page, resp.message)

                        }
                    });

                    //page.main.html(frappe.render_template("shipping_controller", {doc:resp.message}));
                }
            });
            try {

                var image_data = data.ShipmentResponse.ShipmentResults.PackageResults.ShippingLabel.GraphicImage;
                //save image to packing slip
                save_label(packing_slip, box, image_data, "1");
                if (order_dict.length === 0) {
                    var image = new Image();
                    image.src = 'data:image/png;base64,' + image_data;
                    //document.body.appendChild(image);
                    console.log("GRAPHIC IMAGE");
                    console.log(data.ShipmentResponse.ShipmentResults.PackageResults.ShippingLabel.GraphicImage);
                    console.log("GRAPHIC IMAGE");
                    image.style.transform = "rotate(90deg)";
                    image.style.marginTop = '20%';
                    rotate90('data:image/png;base64,' + image_data, function (res) {
                             qz.websocket.connect({ retries: 2, delay: 1 })
                            .then(function () {
                            console.log("Connected to QZ Tray")
                            qz.printers.getDefault()
                                .then(function (data) {
                                    console.log(data);
                                    var config = qz.configs.create(data);
                                    var data_qz = [{
                                        type: 'image',
                                        format: 'base64',
                                        data: res.split(',')[1]
                                    }];
                                    qz.print(config, data_qz)
                                        .then(function () {
                                            console.log("SUCCESSFUL PRINTING")
                                        })
                                        .catch(function (e) {
                                            console.log("ERROR PRINTING....");
                                            console.log(e.message);
                                        });
                                })
                                .catch(function(e){
                                    console.log("Cant get default printer")
                                    console.log(e.message)
                                })
                            })
                            .catch(function(e){
                                console.log("Cant Connect to QZ Tray")
                                console.log(e.message)
                            })

                    })
                    // qz.websocket.disconnect();
                }
                else {
                    frappe.msgprint("Order dict have non zero data: " + order_dict, "warning")
                }
            } catch (err) {
                try {
                    frappe.msgprint(data.Fault.detail.Errors.ErrorDetail.PrimaryErrorCode.Description, 'Error');
                } catch (err) {
                    //todo
                    frappe.msgprint("Error in label printing")
                }

            }

            update_sales_order(packing_slip, data, dl, box);
        }
    } else {
        console.log(data.Fault);
        frappe.msgprint(data.Fault.detail.Errors.ErrorDetail.PrimaryErrorCode.Description, "Error")
    }
}

function update_sales_order(packing_slip, data, dl, box) {
    var sales_order_table = [];
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Packing Slip",
            name: packing_slip.name,
        },
        callback: function(pcking) {
            console.log(pcking.message);
            packing_slip = pcking.message;
            $.each(packing_slip.packages_information || [], function (i, v_outer) {
                sales_order_table.push({
                    "package": v_outer.package,
                    "tracking": v_outer.shipment_tracking_number,
                    "items": v_outer.items,
                    "qty": v_outer.quantity,
                    "weight": v_outer.weight,
                    "carrier": packing_slip.shipping_carrier
                });
            });
            var s_c = packing_slip.third_party_shipping ? 0.00 : data.ShipmentResponse.ShipmentResults.ShipmentCharges.TotalCharges.MonetaryValue;
            var total_s_c = packing_slip.third_party_shipping ? 0.00 : parseFloat(s_c) + parseFloat(packing_slip.inhouse_insurance)
            frappe.call({
                method: "global_app.doc_events.packing_slip.make_salesorder",
                args: {
                    name: packing_slip.name,
                    sales_order: dl.items[0].against_sales_order,
                    shipment_details: sales_order_table,
                    shipment_weight: data.ShipmentResponse.ShipmentResults.BillingWeight.Weight,
                    shipment_cost: total_s_c,
                    box_name: box,
                    shipping_service: packing_slip.shipping_service
                },
                async: false,
                callback: function(r2) {
                    var test = []
                    $.each(order_dict || [], function (i, order) {
                        test.push(order.ps)
                        if (order.ps === packing_slip.name) {
                            order.printed = true;
                            return false;
                        }
                    });
                    if (order_dict.length > 0) { global_flag = true; }
                    $.each(order_dict || [], function (i, order) {
                        if (!order.printed) {
                            global_flag = false
                            print_ups_label(order.ps, order.box, order.carrier, order.package, order.weight)
                            return false;
                        }
                    });
                    if (global_flag) {
                        var from_date = $('input[data-fieldname="from_date"]').val();
                        var to_date = $('input[data-fieldname="to_date"]').val();
                        var po_no = $('input[data-fieldname="po"]').val();
                        var so_no = $('input[data-fieldname="so"]').val();
                        var carrier = $('input[data-fieldname="carrier"]').val();
                        var status = $('input[data-fieldname="status"]').val();

                        if (carrier === "select") {
                            carrier = null;
                        }
                        if (status === "select") {
                            status = null;
                        }
                        if(!from_date || !to_date){
                            from_date = null
                            to_date = null
                        }
                        frappe.call({
                            method: "global_app.global_app.page.shipping_controller.shipping_controller.get_shipping_data",
                            args: {
                                from_date: from_date ? from_date : null,
                                to_date: to_date ? to_date : null,
                                po_no: po_no ? po_no : null,
                                so_no: so_no ? so_no : null,
                                carrier: carrier ? carrier : null,
                                status: status ? status : null,
                            },
                            freeze: true,
                            freeze_message: "Fetching data please wait...",
                            callback: function(resp) {
                               page.sidebar.html(frappe.render_template("shipping_controller", { 'doc': resp.message }));
                                // add_data_to_side_bar(page, resp.message)

                            }
                        });

                        batch_dialg.hide()
                        order_dict = [];
                        frappe.call({
                            method: "global_app.global_app.page.shipping_controller.shipping_controller.multi_pdf",
                            args: {
                                data: test
                            },

                            callback: function(resp) {
                                console.log(resp.message)
                                if (!qz.websocket.isActive()) {
                                    qz.websocket.connect().then(function () {
                                        console.log("Connected!");
                                        var printer = "";
                                        qz.printers.getDefault().then(function (data) {
                                            console.log(data);
                                            var config = qz.configs.create(data);
                                            var data = [{
                                                type: 'pdf',
                                                data: resp.message
                                            }];
                                            qz.print(config, data).catch(function (e) { "culprit1 " + console.error(e); });

                                        }).catch(function (e) { console.error("culprit " + e); });

                                    });
                                } else {
                                    qz.printers.getDefault().then(function (data) {
                                        console.log(data);
                                        var config = qz.configs.create(data);
                                        var data = [{
                                            type: 'pdf',
                                            data: resp.message
                                        }];
                                        qz.print(config, data).catch(function (e) { "culprit1 " + console.error(e); });

                                    }).catch(function (e) { console.error("culprit " + e); });

                                }

                            }
                        });
                    }
                }
            });
        }
    })


}

function print_usps_label(ps, box, carrier, package, weight) {
    var usps_address;
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "USPS Settings"
        },
        callback: function (r) {
            usps_address = r.message
        }
    });
    var settings = {
        "async": true,
        "crossDomain": true,
        "url": 'https://corsanywhere-jqogydb25a-uc.a.run.app/' + stamps_credentials.url,
        "method": "POST",
        "headers": {
            "content-type": "text/xml; charset=utf-8",
            "soapaction": "http://stamps.com/xml/namespace/2018/03/swsim/swsimv71/AuthenticateUser",
            "cache-control": "no-cache",
        },
        "data": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n" +
        "<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"\r\n               " +
        "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\r\n               " +
        "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"\r\n               " +
        "xmlns:tns=\"http://stamps.com/xml/namespace/2018/03/swsim/swsimv71\">\r\n  " +
        "<soap:Body>\r\n     <tns:AuthenticateUser>      \r\n\t     " +
        "<tns:Credentials>         \r\n\t\t     " +
        "<tns:IntegrationID>"+ stamps_credentials.integration_id+"</tns:IntegrationID>       \r\n\t\t     " +
        "<tns:Username>"+stamps_credentials.username+"</tns:Username>       \r\n\t\t     " +
        "<tns:Password>"+stamps_credentials.password+"</tns:Password>      \r\n\t     " +
        "</tns:Credentials>    \r\n     </tns:AuthenticateUser> \r\n  </soap:Body>\r\n</soap:Envelope>"
    }
    var usps_success_flag = false;
    $.ajax(settings).done(function (response) {
        console.log("PPPPPPPPPPPPPPPPPPPPPPPPPPPPPp")
        console.log(response)
        console.log(response.getElementsByTagName("Authenticator"));

        var auth_token = response.getElementsByTagName("Authenticator")[0].innerHTML;
        console.log("Length = " + auth_token.length);
        var length, width, height;
        var package_name = "Package"
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Package",
                name: package,
            },
            async: false,
            callback(pkg) {
                console.log(pkg.message)
                length = pkg.message.length;
                width = pkg.message.width;
                height = pkg.message.hight;
                if (pkg.message.usps_flat_box) {
                    package_name = pkg.message.name
                }
            }
        })
        var packing_slip = null;
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Packing Slip",
                name: ps,
            },
            async: false,
            callback(pcking) {
                console.log(pcking.message);
                packing_slip = pcking.message;
            }
        })
        var transactionId = packing_slip.name.split('PAC-')[1] + box + length.toString() + "X" + width.toString() + "X" + height.toString() + "global";

        console.log(length);
        console.log(width);
        console.log(height);
        console.log(transactionId);

        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Delivery Note",
                name: packing_slip.delivery_note,
            },
            callback(dl) {
                console.log(dl.message);
                dl = dl.message;
                var address_info;

                frappe.call({
                    method: "frappe.client.get",
                    args: {
                        doctype: "Address",
                        name: dl.shipping_address_name,
                    },
                    callback(r) {
                        if (r.message) {
                            address_info = r.message;
                            var country_code = "US";
                            if (address_info.country == "Canada") {
                                country_code = "CA"
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
                                callback(r2) {
                                    console.log(r2.message);
                                    state_abb = r2.message.abb;
                                    //request for label now
                                    // var today = new Date();
                                    // var formattedNumber = ("0" + (today.getMonth()+1)).slice(-2);
                                    // var date = today.getFullYear()+'-'+(formattedNumber)+'-'+today.getDate();
                                    var date = frappe.datetime.now_date().toString();
                                    //date='2019-06-03';
                                    //console.log(date)
                                    console.log(frappe.datetime.now_date())
                                    var attention_name = "";
                                    var add_line_2 = "";
                                    if (address_info.address_line2) {
                                        add_line_2 = address_info.address_line2;

                                    }

                                    if (address_info.attention_name) {
                                        attention_name = address_info.attention_name
                                    }
                                    else {
                                        attention_name = ""
                                    }
                                    var create_indiciam = {
                                        "url": 'https://corsanywhere-jqogydb25a-uc.a.run.app/' + stamps_credentials.url, //"https://swsim.stamps.com/swsim/swsimv71.asmx",
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
                                            "<ServiceType>" + packing_slip.service_code + "</ServiceType>\r\n <ServiceDescription>" + packing_slip.shipping_service + "</ServiceDescription>\r\n" +
                                            "<WeightLb>" + weight.toString() + "</WeightLb>\r\n" +
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
                                            "<AddOnV12>\r\n  <AddOnType>US-A-PR</AddOnType>\r\n  <AddOnDescription>Perishable</AddOnDescription>\r\n  </AddOnV12>\r\n   \r\n    </AddOns>\r\n" +
                                            "<Surcharges />\r\n  <EffectiveWeightInOunces>" + Math.round((weight * 16).toString()) + "</EffectiveWeightInOunces>\r\n" +
                                            "<Zone>1</Zone>\r\n                    <RateCategory>1000</RateCategory>\r\n" +
                                            "<ToState>" + state_abb + "</ToState>\r\n         </Rate>\r\n      <From>\r\n        <FullName>"+usps_address.name1+"</FullName>\r\n        <Address1>" + usps_address.address_line + "</Address1>\r\n  <City>" + usps_address.city + "</City>\r\n        <State>" + usps_address.state_province_code + "</State>\r\n        <ZIPCode>"+usps_address.postal_code+"</ZIPCode>\r\n      </From>\r\n" +
                                            "<To>\r\n        <FullName>" + attention_name + "</FullName>\r\n        <NamePrefix/>\r\n        <FirstName/>\r\n        <MiddleName/>\r\n        <LastName/>\r\n        <NameSuffix/>\r\n        <Title/>\r\n        <Department/>\r\n        <Company>" + address_info.address_title.replace('&', '') + "</Company>\r\n        <Address1>" + address_info.address_line1 + "</Address1>\r\n        <Address2>" + add_line_2 + "</Address2>\r\n        <City>" + address_info.city + "</City>\r\n        <State>" + state_abb + "</State>\r\n        <ZIPCode>" + address_info.pincode + "</ZIPCode>\r\n               <PostalCode/>\r\n        <Country>" + country_code + "</Country>\r\n        <Urbanization/>\r\n        <PhoneNumber/>\r\n        <Extension/>\r\n             </To>\r\n" +
                                            "<memo>Rf No.1 :" + dl.items[0].against_sales_order + "#&#xd;&#xa;Rf No.2 : " + dl.po_no + "</memo></CreateIndicium>\r\n  </soap:Body>\r\n</soap:Envelope>"
                                    }
                                    console.log(create_indiciam);
                                    // "<AddOnV12>\r\n"+
                                    // "<Amount>4.2</Amount>\r\n"+
                                    // "<AddOnType>US-A-RRM</AddOnType>\r\n"
                                    // +"<AddOnDescription>Return Receipt for Merchandise</AddOnDescription>\r\n                           <ProhibitedWithAnyOf>\r\n                                <AddOnTypeV12>SC-A-HP</AddOnTypeV12>\r\n                                <AddOnTypeV12>US-A-REG</AddOnTypeV12>\r\n                                <AddOnTypeV12>US-A-RD</AddOnTypeV12>\r\n                                <AddOnTypeV12>US-A-COD</AddOnTypeV12>\r\n                                <AddOnTypeV12>US-A-SC</AddOnTypeV12>\r\n                                <AddOnTypeV12>US-A-CM</AddOnTypeV12>\r\n                                <AddOnTypeV12>US-A-RR</AddOnTypeV12>\r\n                            </ProhibitedWithAnyOf>\r\n                        </AddOnV12>\r\n                       \r\n
                                    //  a=1/0
                                    //  return true
                                    var create_indiciam_resp = $.ajax(create_indiciam)
                                    create_indiciam_resp.done(function (response) {
                                        console.log("PPPPPPPPPPPPPPPPPPPPPPPPPPPPPpDDDDDDDDDDDDDD")
                                        console.log(response);
                                        var data = response;
                                        handle_success_response_single_usps(packing_slip, data, dl, box)
                                        usps_success_flag = true;
                                    });
                                    create_indiciam_resp.error(function (response) {
                                        console.log("AAAAAAAAAAGGGGGGAIN")
                                        console.log(response.responseText)
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

function handle_success_response_single_usps(packing_slip, data, dl, box) {
    //data = JSON.parse(data);
    console.log("in handler")
    console.log(data);

    if (data.getElementsByTagName("Authenticator")) {
        //adding data to packing slip
        frappe.call({
            method: "global_app.global_app.page.shipping_controller.shipping_controller.add_shipment_data_to_packing_slip",
            args: {
                ps: packing_slip.name,
                shipment_identification_number: data.getElementsByTagName("TrackingNumber")[0].innerHTML,
                tracking: data.getElementsByTagName("TrackingNumber")[0].innerHTML,
                stamps_txid: data.getElementsByTagName("StampsTxID")[0].innerHTML,
                box: box,
                service_fee: 0.0,
                cost: data.getElementsByTagName('Rate')[0].childNodes[3].innerHTML
            },
            async: false,
            callback: function(resp) {}
        });

        try {

            var image = new Image();
            console.log("---------------------------------------------------");
            //console.log(data.getElementsByTagName("URL")[0].innerHTML);
            image.src = data.getElementsByTagName("URL")[0].innerHTML; //'data:image/png;base64,'+image_data;
            //save label to packing slip
            save_label(packing_slip, box, image.src, "0");
            console.log(image.src)
            if (order_dict.length === 0) {
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
                            qz.print(config, data_qz)
                                .catch(function (e) {
                                    "culprit1 " + console.error(e); });

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
            }
                else {
                    frappe.msgprint("Order dict have non zero data: " + order_dict, "warning")
                }
        } catch (err) {
            frappe.msgprint("Error in USPS label printing", 'Error');
        }


        update_sales_order_usps(packing_slip, data, dl, box);

    }

}

function update_sales_order_usps(packing_slip, data, dl, box) {
    //return true;
    var sales_order_table = [];
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Packing Slip",
            name: packing_slip.name,
        },
        callback: function(pcking) {
            console.log(pcking.message);
            packing_slip = pcking.message;

            $.each(packing_slip.packages_information || [], function (i, v_outer) {
                // if (!v_outer.shipment_tracking_number) {
                //     update_sales_order_usps(packing_slip, data, dl,box)
                // }
                sales_order_table.push({
                    "package": v_outer.package,
                    "tracking": v_outer.shipment_tracking_number,
                    "items": v_outer.items,
                    "qty": v_outer.quantity,
                    "weight": v_outer.weight,
                    "carrier": packing_slip.shipping_carrier
                });
            });

            console.log(sales_order_table);
            frappe.call({
                method: "global_app.doc_events.packing_slip.make_salesorder",
                args: {
                    name: packing_slip.name,
                    sales_order: dl.items[0].against_sales_order,
                    shipment_details: sales_order_table,
                    shipment_weight: data.getElementsByTagName('Rate')[0].childNodes[8].innerHTML,
                    shipment_cost: data.getElementsByTagName('Rate')[0].childNodes[3].innerHTML,
                    box_name: box,
                    shipping_service: packing_slip.shipping_service
                },
                callback: function(r2) {
                    console.log(r2.message)
                    var test = []
                    $.each(order_dict || [], function (i, order) {
                        test.push(order.ps);
                        if (order.ps == packing_slip.name) {
                            order.printed = true;
                            return false;
                        }
                    });
                    if (order_dict.length > 0) {
                        global_flag = true;
                        $.each(order_dict || [], function (i, order) {
                            if (!order.printed) {
                                global_flag = false
                                print_usps_label(order.ps, order.box, order.carrier, order.package, order.weight)
                                return false;
                            }
                        });
                    }
                    if (global_flag) {
                        console.log("in global_flag")
                        var from_date = $('input[data-fieldname="from_date"]').val();
        var to_date = $('input[data-fieldname="to_date"]').val();
        var po_no = $('input[data-fieldname="po"]').val();
        var so_no = $('input[data-fieldname="so"]').val();
        var carrier = $('input[data-fieldname="carrier"]').val();
        var status = $('input[data-fieldname="status"]').val();

        if (carrier === "select") {
            carrier = null;
        }
        if (status === "select") {
            status = null;
        }
        if(!from_date || !to_date){
                from_date = null
                to_date = null
            }
        frappe.call({
            method: "global_app.global_app.page.shipping_controller.shipping_controller.get_shipping_data",
            args: {
                from_date: from_date ? from_date : null,
                to_date: to_date ? to_date : null,
                po_no: po_no ? po_no : null,
                so_no: so_no ? so_no : null,
                carrier: carrier ? carrier : null,
                status: status ? status : null,
            },
            freeze: true,
            freeze_message: "Fetching data please wait...",
            callback: function(resp) {
               page.sidebar.html(frappe.render_template("shipping_controller", { 'doc': resp.message }));
                // add_data_to_side_bar(page, resp.message)

            }
        });

                        batch_dialg.hide()
                        order_dict = [];
                        frappe.call({
                            method: "global_app.global_app.page.shipping_controller.shipping_controller.multi_pdf",
                            args: {
                                data: test
                            },

                            callback: function(resp) {
                                console.log(resp.message)
                                if (!qz.websocket.isActive()) {
                                    qz.websocket.connect().then(function () {
                                        console.log("Connected!");
                                        var printer = "";
                                        qz.printers.getDefault().then(function (data) {
                                            console.log(data);
                                            var config = qz.configs.create(data);
                                            var data = [{
                                                type: 'pdf',
                                                data: resp.message
                                            }];
                                            qz.print(config, data).catch(function (e) { "culprit1 " + console.error(e); });

                                        }).catch(function (e) { console.error("culprit " + e); });

                                    });
                                } else {
                                    qz.printers.getDefault().then(function (data) {
                                        console.log(data);
                                        var config = qz.configs.create(data);
                                        var data = [{
                                            type: 'pdf',
                                            data: resp.message
                                        }];
                                        qz.print(config, data).catch(function (e) { "culprit1 " + console.error(e); });

                                    }).catch(function (e) { console.error("culprit " + e); });

                                }

                            }
                        });
                    }
                }
            });
        }
    });

}

function save_label(packing_slip, box, image_data, encoded) {
    console.log("saving labels")
    console.log(image_data)
    frappe.call({
        method: "global_app.global_app.page.shipping_controller.shipping_controller.add_shipping_label_to_packing_slip",
        args: {
            ps: packing_slip.name,
            image_data: image_data,
            encoded: encoded,
            box: box
        },
        callback(resp) {
            console.log(resp.message)
            //$( "#filter_btn" ).trigger("click");
            //page.main.html(frappe.render_template("shipping_controller", {doc:resp.message}));
        }
    });

}

function preview_label(carrier, service, box, image) {
    var package_data = null;
    frappe.call({
        method: "global_app.global_app.page.shipping_controller.shipping_controller.get_package_data",
        args: {
            box: box,
        },
        async: false,
        callback(pcking) {
            console.log(pcking.message);
            package_data = pcking.message;
        }
    })
    if (carrier == 'USPS') {
        var pr = new frappe.ui.Dialog({
            title: __("Preview Label:"),
            "fields": [
                { "fieldname": "first_info", "fieldtype": "HTML" },
                { "fieldname": "preview", "fieldtype": "HTML" },
            ]
        });
        var img = new Image();
        var img_html = '<img id="usps-img" src=' + image + '>';
        var height = 0;
        var width = 0;
        img.src = image;
        img.onload = function () {
            height = img.height;
            width = img.width;

            console.log("Original width=" + width + ", " + "Original height=" + height);
            if (height < 50) {
                img_html = '<b style="color:red;">Label for this shipment has expired</b>';
            }
            pr.fields_dict.preview.$wrapper.html(img_html);
        }

        if (package_data.manual == 0) {
            //if(height > 50){
            pr.set_primary_action(__("Print"), function () {
                //console.log(frappe.base_url+image)
                print_label_from_preview(image, "USPS")
            });
            // }
        }
    } else if (carrier == 'UPS') {
        var pr = new frappe.ui.Dialog({
            title: __("Preview Label:"),
            "fields": [
                { "fieldname": "first_info", "fieldtype": "HTML" },
                { "fieldname": "preview", "fieldtype": "HTML" },
                { "fieldname": "preview2", "fieldtype": "HTML" },
            ]
        });
        pr.fields_dict.preview.$wrapper.html('<img style="transform: rotate(90deg); margin-top: 7%; width: 70%; margin-bottom: 2%;margin-left: 20%;" src=' + image + '>');
        pr.fields_dict.preview2.$wrapper.html('<br><br><br><br><br>')
        if (package_data.manual == 0) {
            pr.set_primary_action(__("Print"), function () {
                console.log("http://45.33.111.140:8000" + image)
                print_label_from_preview(window.location.origin + image, "UPS")
            });
        }
    }
    var manual_ind = "";
    if (package_data.manual == 1) {
        manual_ind = '<b style="color:brown">Shipped Manually</b><br>'
    }
    pr.fields_dict.first_info.$wrapper.html(manual_ind + '<b>Date shipped: </b>' + package_data.modified + '<br><b>Carrier: </b>' + carrier + '<br><b>Service: </b>' + service + '<br><b>Tracking Id: </b>' + package_data.shipment_tracking_number)
    pr.show()



}

function cancel_shipment(ps, box, carrier) {
    var d = new frappe.ui.Dialog({
        title: __('Confirm'),
        'fields': [
            { 'fieldname': 'ht', 'fieldtype': 'HTML' }
        ]
    });
    d.fields_dict.ht.$wrapper.html("<b>Cancel shipment for this box</b>")

    d.set_primary_action(__("Yes"), function () {
        var packing_slip = null;
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Packing Slip",
                name: ps,
            },
            async: false,
            callback: function(pcking) {
                console.log(pcking.message);
                packing_slip = pcking.message;
            }
        })
        var manual = false;
        var shipment_identification_number = packing_slip.shipment_identification_number
        $.each(packing_slip.packages_information || [], function (i, v_outer) {
            if (v_outer.name === box) {

                if (v_outer.manual === 1) {
                    //frappe.msgprint("Shipment was done manually please cancel from carrier side","Message")
                    manual = true;
                }
            }
        });
        if (shipment_identification_number && !manual) {
            if (packing_slip.shipping_carrier === "UPS") {
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
                            "ShipmentIdentificationNumber": shipment_identification_number
                        }
                    }
                };
                var url = ups_credentials.production ? ups_credentials.production_url : ups_credentials.test_url

                $.ajax({
                    url: 'https://corsanywhere-jqogydb25a-uc.a.run.app/' + url +"/rest/Void", //"https://wwwcie.ups.com/rest/Void",
                    type: "POST",
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    data: JSON.stringify(data),
                    success: function (data) {
                        try {
                            console.log(data);
                            if (data.VoidShipmentResponse.SummaryResult.Status.Description) {
                                frappe.msgprint(data.VoidShipmentResponse.SummaryResult.Status.Description, "Void Shipment")
                                //update packing slip for cancel shipment
                                update_packing_slip_for_cancel_shipment(packing_slip.name, box)
                            } else {
                                frappe.msgprint("Problem in label cancellation", "Void Shipment")
                            }

                        } catch (err) {
                            frappe.msgprint(data.Fault.detail.Errors.ErrorDetail.PrimaryErrorCode.Description, "Void Shipment")
                        }


                    }
                });

            } else {
                cancel_shipment_usps(packing_slip, box, carrier);
            }
        } else {
            frappe.msgprint("You have no shipment against this sales order or shipment was done manually", "Message");
        }
    });
    d.show()
}

function cancel_shipment_usps(packing_slip, box, carrier) {
    $.each(packing_slip.packages_information || [], function (i, v_outer) {
        if (v_outer.name === box) {
            var settings = {
                "async": true,
                "crossDomain": true,
                "url": 'https://corsanywhere-jqogydb25a-uc.a.run.app/' + stamps_credentials.url,
                "method": "POST",
                "headers": {
                    "content-type": "text/xml; charset=utf-8",
                    "soapaction": "http://stamps.com/xml/namespace/2018/03/swsim/swsimv71/AuthenticateUser",
                    "cache-control": "no-cache",
                },
                "data": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"\r\n               " +
                "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\r\n               " +
                "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"\r\n               " +
                "xmlns:tns=\"http://stamps.com/xml/namespace/2018/03/swsim/swsimv71\">\r\n  <soap:Body>\r\n     <tns:AuthenticateUser>      \r\n\t     " +
                "<tns:Credentials>         \r\n\t\t     " +
                "<tns:IntegrationID>"+stamps_credentials.integration_id+"</tns:IntegrationID>       \r\n\t\t     " +
                "<tns:Username>"+stamps_credentials.username+"</tns:Username>       \r\n\t\t     " +
                "<tns:Password>"+stamps_credentials.password+"</tns:Password>      \r\n\t     </tns:Credentials>    \r\n     </tns:AuthenticateUser> \r\n  </soap:Body>\r\n</soap:Envelope>"
            }

            $.ajax(settings).done(function (response) {

                console.log(response.getElementsByTagName("Authenticator"));
                var auth_token = response.getElementsByTagName("Authenticator")[0].innerHTML;
                console.log(auth_token)
                var cancelLabel = {
                    "url": 'https://corsanywhere-jqogydb25a-uc.a.run.app/' + stamps_credentials.url,
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
                            //update packing slip for cancel shipment
                            update_packing_slip_for_cancel_shipment(packing_slip.name, box)

                            frappe.msgprint("Shipment Canceled Successfully <br>" + response.getElementsByTagName('faultstring')[0].innerHTML, "Successful");
                        } else {
                            frappe.msgprint("Shipment Canceled Successfully", "Successful");
                            update_packing_slip_for_cancel_shipment(packing_slip.name, box)
                        }

                    } else {
                        frappe.msgprint("Failed to refund label. Refund already in process OR You have Invalid Transaction ID", "err");
                    }
                });
                cancel_label_resp.error(function (response) {

                    frappe.msgprint(response.responseText.split('<faultstring>')[1].split('</faultstring>')[0], "err");
                    if (response.responseText.split('<faultstring>')[1].split('</faultstring>')[0] == "Failed to refund label. Refund already in process") {
                        //update packing slip for cancel shipment
                        update_packing_slip_for_cancel_shipment(packing_slip.name, box)
                    }
                });
            });
        }
    });


}

function update_packing_slip_for_cancel_shipment(name, box) {
    frappe.call({
        method: "global_app.global_app.page.shipping_controller.shipping_controller.update_packing_slip_for_cancel_shipment",
        args: {
            name: name,
            box: box
        },
        callback: function(resp) {
            console.log(resp.message)
          var from_date = $('input[data-fieldname="from_date"]').val();
        var to_date = $('input[data-fieldname="to_date"]').val();
        var po_no = $('input[data-fieldname="po"]').val();
        var so_no = $('input[data-fieldname="so"]').val();
        var carrier = $('input[data-fieldname="carrier"]').val();
        var status = $('input[data-fieldname="status"]').val();

        if (carrier === "select") {
            carrier = null;
        }
        if (status === "select") {
            status = null;
        }
        if(!from_date || !to_date){
                from_date = null
                to_date = null
            }
        frappe.call({
            method: "global_app.global_app.page.shipping_controller.shipping_controller.get_shipping_data",
            args: {
                from_date: from_date ? from_date : null,
                to_date: to_date ? to_date : null,
                po_no: po_no ? po_no : null,
                so_no: so_no ? so_no : null,
                carrier: carrier ? carrier : null,
                status: status ? status : null,
            },
            freeze: true,
            freeze_message: "Fetching data please wait...",
            callback: function(resp) {
               page.sidebar.html(frappe.render_template("shipping_controller", { 'doc': resp.message }));
                // add_data_to_side_bar(page, resp.message)

            }
        });

            //page.main.html(frappe.render_template("shipping_controller", {doc:resp.message}));
        }
    });
}

function rotate90(src, callback) {
    var img = new Image();
    img.src = src
    console.log(src)
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

function print_label_from_preview(image, carrier) {
    if (!qz.websocket.isActive()) {
        qz.websocket.connect().then(function () {
            console.log("Connected!");
            var printer = "";
            if (carrier == "UPS") {
                rotate90(image, function (res) {
                    console.log("_____________________________________")
                    //console.log(res.split(',')[1])

                    var printer = "";
                    qz.printers.getDefault().then(function (data1) {
                        console.log(data1);
                        var config = qz.configs.create(data1);
                        var data = [{
                            type: 'image',
                            format: 'base64',
                            data: res.split(',')[1]
                        }];
                        qz.print(config, data).catch(function (e) { console.error(e); });
                    }).catch(function (e) {
                        console.error(e);
                        console.error("ERRR");
                    });



                })

            } else {
                qz.printers.getDefault().then(function (data) {
                    console.log(data);
                    var config = qz.configs.create(data);
                    var data = [{
                        type: 'image',
                        data: image
                    }];
                    qz.print(config, data).catch(function (e) { "culprit1 " + console.error(e); });

                }).catch(function (e) { console.error("culprit " + e); });
            }

        });
    } else {

        if (carrier == "UPS") {
            rotate90(image, function (res) {
                qz.printers.getDefault().then(function (data) {
                    console.log(data);
                    var config = qz.configs.create(data);
                    var data = [{
                        type: 'image',
                        format: 'base64',
                        data: res.split(',')[1]
                    }];
                    qz.print(config, data).catch(function (e) {
                        console.error(e);
                    });
                }).catch(function (e) {
                        console.error(e);
                        console.error("error");
                    });
            })
        } else {
            qz.printers.getDefault().then(function (data) {
                console.log(data);
                var config = qz.configs.create(data);
                var data = [{
                    type: 'image',
                    data: image
                }];
                qz.print(config, data).catch(function (e) { "culprit1 " + console.error(e); });

            }).catch(function (e) { console.error("culprit " + e); });
        }

    }
    //qz.websocket.disconnect();
}

function testing_from_dialog() {
    alert("ok");
}

function batch_label_print(doc) {
    //var b = a/0;

    var ups_address;

    frappe.call({
        method: "frappe.client.get",
        async: false,
        args: {
            doctype: "UPS Settings"
        },
        callback: function (r) {
            ups_address = r.message
        }
    });


    frappe.call({
        method: "frappe.client.get",
        async: false,
        args: {
            doctype: "Packing Slip",
            name: doc,
        },
        callback: function(pcking) {
            console.log(pcking.message);
            doc = pcking.message;
        }
    })

    if (doc.shipping_carrier === "UPS") {
        var w_cap_flag = true;
        $.each(doc.packages_information, function (i, item) {
            if (!item.w_cap_flag || item.w_cap_flag === false) {
                w_cap_flag = false;
            }
        });
        var image_list = [];
        var packages_list = [];
        var default_number = ""
        frappe.call({
            method: "global_app.doc_events.packing_slip.get_default_phone_number",
            args: {
                dn: doc.delivery_note,
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
                name: doc.delivery_note,
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
                            if (doc.third_party_shipping) {
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
                                                        paymentinfo = {
                                                            "ShipmentCharge": {
                                                                "Type": "01",
                                                                "BillThirdParty": {
                                                                    "AccountNumber": contact.ups_account_no,
                                                                    "Address": {
                                                                        "AddressLine": b_add.address_line1,
                                                                        "City": b_add.city,
                                                                        "StateProvinceCode": state_c,
                                                                        "PostalCode": b_add.pincode,
                                                                        "CountryCode": "US"
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
                                    $.each(doc.packages_information || [], function (i, v_outer) {
                                        console.log(v_outer)
                                        frappe.call({
                                            method: "frappe.client.get",
                                            args: {
                                                doctype: "Package",
                                                name: v_outer.package
                                            },
                                            async: false,
                                            callback: function(pkg) {
                                                console.log(pkg.message)
                                                length = pkg.message.length;
                                                width = pkg.message.width;
                                                height = pkg.message.hight;
                                            }
                                        })
                                        var weight = v_outer.weight;
                                        if (weight === 0 || !weight) { weight = 1; }
                                        packages_list.push({
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
                                                        "AddressLine": address_info.address_line1,
                                                        "City": address_info.city,
                                                        "StateProvinceCode": state_abb,
                                                        "PostalCode": address_info.pincode,
                                                        "CountryCode": "US"
                                                    }
                                                },
                                                "ShipFrom": {
                                                    "Name": ups_address.name1,
                                                    "AttentionName": ups_address.attention_name,

                                                    "Address": {
                                                        "AddressLine": ups_address.addressline,
                                                        "City": ups_address.city,
                                                        "StateProvinceCode":  ups_address.state_province_code,
                                                        "PostalCode":  ups_address.postal_code,
                                                        "CountryCode": ups_address.country_code
                                                    }

                                                },
                                                "Shipper": {
                                                    "Name": ups_address.name1,
                                                    "AttentionName":  ups_address.attention_name,
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

                                                "PaymentInformation": paymentinfo,
                                                "Service": {
                                                    "Code": doc.service_code,
                                                    "Description": doc.shipping_service
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
                                    console.log(data);
                                    $.ajax({
                                        url: 'https://corsanywhere-jqogydb25a-uc.a.run.app/' + url + "/rest/Ship",
                                        type: "POST",
                                        contentType: "application/json; charset=utf-8",
                                        dataType: "json",
                                        data: JSON.stringify(data),
                                        success: function (data) {
                                            handle_batch_request_response(doc, data, dl);
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
        label_print(doc.name, doc.packages_information[0].name, doc.shipping_carrier, doc.packages_information[0].package, doc.packages_information[0].weight)
    }

}

function handle_batch_request_response(doc, data, dl) {
    console.log("BATCH DATA")
    console.log(data)
    if (data.ShipmentResponse) {
        if (data.ShipmentResponse.Response.ResponseStatus.Code === "1") {
            //set shipment as done
            var shipment_identification_number = data.ShipmentResponse.ShipmentResults.ShipmentIdentificationNumber;

            var image_list = [];
            if (doc.packages_information.length > 1) {
                var count = 0;
                var tracking_num = [];
                var tracking_and_image_details = [];

                data.ShipmentResponse.ShipmentResults.PackageResults.forEach(function (pack) {
                    tracking_num.push(pack.TrackingNumber);
                    image_list.push({
                        'image_data': pack.ShippingLabel.GraphicImage,
                        'sales_order': dl.items[0].against_sales_order,
                        'purchase_order': dl.po_no,
                        'customer_name': dl.customer_name
                    });

                });
                $.each(doc.packages_information || [], function (i, v_outer) {
                    tracking_and_image_details.push({ 'ps_name': doc.name, 'tracking_num': tracking_num[i], "image": image_list[i].image_data, 'package_name': v_outer.name });
                    //add shipment data to packing slip
                    frappe.call({
                        method: "global_app.global_app.page.shipping_controller.shipping_controller.add_shipment_data_to_packing_slip",
                        async: false,
                        args: {
                            ps: doc.name,
                            shipment_identification_number: shipment_identification_number,
                            tracking: tracking_num[i],
                            stamps_txid: null,
                            box: v_outer.name,
                            service_fee:  0.00,
                        },
                        callback: function(resp) {}
                    });

                    save_label(doc, v_outer.name, image_list[i].image_data, "1");

                });

                forward_label_printer(image_list);

            } else {
                //add shipment data to packing slip
                frappe.call({
                    method: "global_app.global_app.page.shipping_controller.shipping_controller.add_shipment_data_to_packing_slip",
                    args: {
                        ps: doc.name,
                        shipment_identification_number: shipment_identification_number,
                        tracking: data.ShipmentResponse.ShipmentResults.PackageResults.TrackingNumber,
                        stamps_txid: null,
                        box: doc.packages_information[0].name,
                        service_fee:  0.00,
                    },
                    callback: function(resp) {
                        console.log(resp.message)
                        //$( "#filter_btn" ).trigger("click");
                        //page.main.html(frappe.render_template("shipping_controller", {doc:resp.message}));
                    }
                });


                var image_data = data.ShipmentResponse.ShipmentResults.PackageResults.ShippingLabel.GraphicImage;
                save_label(doc, doc.packages_information[0].name, image_data, "1");

                var image = new Image();
                image.src = 'data:image/png;base64,' + image_data;
                //document.body.appendChild(image);
                console.log(data.ShipmentResponse.ShipmentResults.PackageResults.ShippingLabel.GraphicImage);
                // image.style.transform = "rotate(90deg)";
                // image.style.marginTop='20%';
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
            update_sales_order(doc, data, dl)
            console.log("AFTER update SO")
            var from_date = $('input[data-fieldname="from_date"]').val();
        var to_date = $('input[data-fieldname="to_date"]').val();
        var po_no = $('input[data-fieldname="po"]').val();
        var so_no = $('input[data-fieldname="so"]').val();
        var carrier = $('input[data-fieldname="carrier"]').val();
        var status = $('input[data-fieldname="status"]').val();

        if (carrier === "select") {
            carrier = null;
        }
        if (status === "select") {
            status = null;
        }
        if(!from_date || !to_date){
                from_date = null
                to_date = null
            }
        frappe.call({
            method: "global_app.global_app.page.shipping_controller.shipping_controller.get_shipping_data",
            args: {
                from_date: from_date ? from_date : null,
                to_date: to_date ? to_date : null,
                po_no: po_no ? po_no : null,
                so_no: so_no ? so_no : null,
                carrier: carrier ? carrier : null,
                status: status ? status : null,
            },
            freeze: true,
            freeze_message: "Fetching data please wait...",
            callback: function(resp) {
               page.sidebar.html(frappe.render_template("shipping_controller", { 'doc': resp.message }));
                // add_data_to_side_bar(page, resp.message)

            }
        });

            this.cur_dialog.hide()
            detailed_view(doc.name)
            console.log("COMPLETED NOW")

        } else {
            frappe.msgprint("There is some error in shipment request", "err");
        }
    } else {
        console.log(data.Fault);
        frappe.msgprint(data.Fault.detail.Errors.ErrorDetail.PrimaryErrorCode.Description, "Error")
    }

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
        // var width = $(window).width() ;
        // var height = $(window).height() ;
        // var content = '<!DOCTYPE html>' +
        // 			  '<html>' +
        // 			  '<head><title></title></head>'+
        // 			  '<body onload="window.focus(); window.print(); window.close();">' ;

        // var options = "toolbar=no,location=no,directories=no,menubar=no,scrollbars=yes,width=" + width + ",height=" + height;
        // var printWindow = window.open('', 'print', options);
        // printWindow.document.open();
        // //printWindow.document.write(content);
        // var count=1;
        // var margin_top = 20;
        // var sec =57;
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
                        }];
                        qz.print(config, data).catch(function (e) { console.error(e); });



                        base_64 = [];


                    })
                })

            }).
                catch(console.log("err"));
        }

        // content+='</body>' +
        // 				'</html>';

        // printWindow.document.write(content);
        // printWindow.document.close();
        // printWindow.focus();
    });

}

function getDate() {
    var today = new Date();
    console.log(today)
    console.log(document.getElementById("date_filter"))
    document.getElementById("date_filter").value = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);

}

function add_data_to_side_bar(page, data) {
    var pending_ups = data.total_ups - data.processed_ups
    var pending_usps = data.total_usps - data.processed_usps
    page.sidebar.html(`
				<div class="ups" style="border-radius:3%;padding-left:3%;margin-top:28%">
				<h4>UPS</h4>
				<div class="row">
					<div class="col col-md-6">Total:</div> 
					<div class="col col-md-6"><b>` + data.total_ups + ` </b></div>
				</div>
				<hr>
				<div class="row"> 
					<div class="col col-md-6">Processed:</div> 
					<div class="col col-md-6"><b style="color: green">` + data.processed_ups + `</b></div> 
				</div>
				<hr>
				<div class="row">
					<div class="col col-md-6">Pending:</div> 
					<div class="col col-md-6"><b style="color: red">` + pending_ups + `</b></div>
				</div>
				<hr>
				</div>
				<div class="usps" style="border-radius:3%;padding-left:3%">
				<h4>USPS</h4>
				<div class="row">
					<div class="col col-md-6">Total:</div> 
					<div class="col col-md-6"><b>` + data.total_usps + ` </b></div>
				</div>
				<hr>
				<div class="row"> 
					<div class="col col-md-6">Processed:</div> 
					<div class="col col-md-6"><b style="color: green">` + data.processed_usps + `</b></div> 
				</div>
				<hr>
				<div class="row">
					<div class="col col-md-6">Pending:</div> 
					<div class="col col-md-6"><b style="color: red">` + pending_usps + `</b></div>
				</div>
				<hr>
				</div>
			 `);
}

function po_click(e) {
    console.log(e)
    if (e.keyCode == 13) {
        console.log("ENTER")
        $("#filter_btn").trigger("click");
    }

}
function so_click(e) {
    console.log(e)
    if (e.keyCode == 13) {
        console.log("ENTER")
        $("#filter_btn").trigger("click");
    }

}
function handle_insurance(ev) {
    console.log(ev);
    if (ev.checked) {
        $(".declared_value_p").css("display", "inline");
    }
    else {
        $(".declared_value_p").css("display", "none");
    }
}
function handle_items_checkbox(check) {
       console.log("CLICK !!!!")
        if (check.checked) {
            // $("#print_all_btn").attr("disabled", false);
            $('.checkbox').each(function () {
                this.checked = true;
            });
        } else {
            $('.checkbox').each(function () {
                this.checked = false;
            });
            // $("#print_all_btn").attr("disabled", true);
        }
}
function handle_items_ordered_checkbox(check) {
     console.log("AJSHDKASHD")
    console.log(check)
    if (check.checked) {
        $('.checkbox_ordered').each(function () {
            this.checked = true;
        });
    } else {
        $('.checkbox_ordered').each(function () {
            this.checked = false;
        });
    }
}
function save_insurance(pkg) {
    var val = $("#" + pkg).val()
    console.log(val)
    frappe.call({
        method: "global_app.global_app.page.shipping_controller.shipping_controller.save_insurance",
        args: {
            pkg_name: pkg,
            value: val

        },
        callback: function(resp) {
            console.log(resp.message)

        }
    });
}

function add_to_box(ps) {
// function add_to_box(ps,quantity, item_code, index) {
        var items = [];
         $('.checkbox_ordered').each(function () {
            if (this.checked === true) {
                var input = this;
                var checked_list = input.id.split(',');

                items.push({
                    "item_code":checked_list[0],
                    "quantity":document.getElementById(checked_list[checked_list.length - 1]).value,
                })

            }
            this.checked = false
        });


    if(items.length > 0) {
         frappe.call({
        method: "global_app.global_app.page.shipping_controller.shipping_controller.add_to_box",
        args: {
            name: ps,
            items: items,
            box_type: document.getElementById("boxes").value
        },
        freeze_message: "Boxing....",
        freeze: true,
        async: false,
        callback: function(response_in) {
            if (response_in.message) {
                $('document').context.forms[2].innerHTML = ""
               $('document').context.forms[2].innerHTML = response_in.message
                detailed_view(ps)
                var from_date = $('input[data-fieldname="from_date"]').val();
                var to_date = $('input[data-fieldname="to_date"]').val();
                var po_no = $('input[data-fieldname="po"]').val();
                var so_no = $('input[data-fieldname="so"]').val();
                var carrier = $('input[data-fieldname="carrier"]').val();
                var status = $('input[data-fieldname="status"]').val();

                if (carrier === "select") {
                    carrier = null;
                }
                if (status === "select") {
                    status = null;
                }
                if(!from_date || !to_date){
                        from_date = null
                        to_date = null
                    }
                frappe.call({
                    method: "global_app.global_app.page.shipping_controller.shipping_controller.get_shipping_data",
                    args: {
                        from_date: from_date ? from_date : null,
                        to_date: to_date ? to_date : null,
                        po_no: po_no ? po_no : null,
                        so_no: so_no ? so_no : null,
                        carrier: carrier ? carrier : null,
                        status: status ? status : null,
                    },
                    freeze: true,
                    freeze_message: "Fetching data please wait...",
                    callback: function(resp) {
                       page.sidebar.html(frappe.render_template("shipping_controller", { 'doc': resp.message }));

                    }
                });
            }
        }
    });
    }

}

function cancel_packing(name, ps){
    frappe.call({
        method: "global_app.global_app.page.shipping_controller.shipping_controller.cancel_packing",
        args: {
            name: name
        },
        freeze: true,
        freeze_message: "Cancelling Box....",
        async: false,
        callback: function (response_in) {
            console.log(response_in)
            if (response_in.message) {
                $('document').context.forms[2].innerHTML = ""
                $('document').context.forms[2].innerHTML = response_in.message
                detailed_view(ps)
                var from_date = $('input[data-fieldname="from_date"]').val();
                var to_date = $('input[data-fieldname="to_date"]').val();
                var po_no = $('input[data-fieldname="po"]').val();
                var so_no = $('input[data-fieldname="so"]').val();
                var carrier = $('input[data-fieldname="carrier"]').val();
                var status = $('input[data-fieldname="status"]').val();

                if (carrier === "select") {
                    carrier = null;
                }
                if (status === "select") {
                    status = null;
                }
                if(!from_date || !to_date){
                        from_date = null
                        to_date = null
                    }
                frappe.call({
                    method: "global_app.global_app.page.shipping_controller.shipping_controller.get_shipping_data",
                    args: {
                        from_date: from_date ? from_date : null,
                        to_date: to_date ? to_date : null,
                        po_no: po_no ? po_no : null,
                        so_no: so_no ? so_no : null,
                        carrier: carrier ? carrier : null,
                        status: status ? status : null,
                    },
                    freeze: true,
                    freeze_message: "Fetching data please wait...",
                    callback: function(resp) {
                       page.sidebar.html(frappe.render_template("shipping_controller", { 'doc': resp.message }));

                    }
                });
            }
        }
    })
}