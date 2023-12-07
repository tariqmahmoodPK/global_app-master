var stamps_credentials = {}
var ups_credentials = {}

frappe.ui.form.on('UPS Settings', {
    update_missing_shipping_details(){
        get_shipment_empty_ps()
    },
	update_sales_order_from_ps: function(frm) {
        frm.call({
            doc: frm.doc,
            method: 'update_sales_order_from_ps',
            freeze: true,
            freeze_message: "Updating Sales Orders...",
            callback: () => {
                frappe.msgprint("Done Updating")
            }
        })
	}
});



function get_shipment_empty_ps(){
    frappe.call({
        async:false,
        method: 'global_app.doc_events.channel_controller.get_packing_without_cost',
        freeze: true,
        freeze_message: "Updating Missing Shipping Cost...",
        callback: (r) => {
            console.log(r.message.length)
            console.log(r.message[0]['PSP_PARENT'])
            get_packing_slip(r.message[0]['PSP_PARENT'])
        }
    })
}



function get_packing_slip(p){
    try {
        frappe.call({
            async:false,
            method: "frappe.client.get",
            freeze:true,
            args: {
                doctype: "Packing Slip",
                name: p,
            },
            callback(r) {
                if(r.message) {
                    var doc = r.message;
                    print_shipping_cost(doc)
                }
            }
        });
      }
      catch(err) {
        console.log("PACKING SLIP NOT FOUND")
      }
    
}

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

function print_shipping_cost(doc){
    stamps_credentials = get_ups_credentials("Stamps Settings")
    ups_credentials = get_ups_credentials("UPS Settings")
    if ( doc.name.indexOf("New Packing Slip") > -1) {
        frappe.msgprint("Please Save the document first")
        return false;
    }
    var rows = doc.packages_information
    
    for(var x = 0 ; x < rows.length; x++){
        var row = rows[x]
        update_ship_cost(doc,row)
        
    }
}

function update_ship_cost(doc,row){
    if (doc.shipping_carrier === "UPS") {
        if (doc.shipment != "done") {
            frappe.msgprint("You Have already done a shipment against this Order, cancel that and try again", "Warning");
        } else {
            var length, width, height;
            var default_number = ""
            frappe.call({
                async:false,
                method: "global_app.doc_events.packing_slip.get_default_phone_number",
                args: {
                    dn: doc.delivery_note,
                },
                callback: function(r) {
                    default_number = r.message
                }
            })
            frappe.call({
                method: "frappe.client.get",
                async: false,
                args: {
                    doctype: "Package",
                    name: row.package,
                },
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
                async:false,
                args: {
                    doctype: "Delivery Note",
                    name: doc.delivery_note,
                },
                callback:function(dl) {
                    console.log(dl.message);
                    dl = dl.message;
                    var address_info;

                    frappe.call({
                        method: "frappe.client.get",
                        async:false,
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
                                    async:false,
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
                                                        "AttentionName": address_info.address_title,
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

                                                        "FaxNumber": "",
                                                        "Address": {
                                                            "AddressLine": "6251 box springs Blvd",
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
                                                        "Code":  doc.service_code,
                                                        "Description":  doc.shipping_service
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
                                        var url = ups_credentials.test_url

                                        $.ajax({
                                            url:  'https://corsanywhere-jqogydb25a-uc.a.run.app/' + url + "/rest/Ship",
                                            type: "POST",
                                            contentType: "application/json; charset=utf-8",
                                            dataType: "json",
                                            data: JSON.stringify(data),
                                            success: function (data) {
                                            
                                                var wt = data.ShipmentResponse.ShipmentResults.BillingWeight.Weight

                                                var s_c = data.ShipmentResponse.ShipmentResults.ShipmentCharges.TotalCharges.MonetaryValue;
                                                var inh_ins = 0.0;
                                                if ( doc.inhouse_insurance) {
                                                    inh_ins =  doc.inhouse_insurance;
                                                }
                                                var total_s_c = parseFloat(s_c) + parseFloat(inh_ins)
                                                if ( doc.third_party_shipping) {
                                                    s_c = 0.0;
                                                    inh_ins = 0.0;
                                                    total_s_c = 0.0;
                                                }
                                                console.log(doc.name)
                                                console.log("USP COST AND WEIGHT")
                                                console.log("WEIGHT")
                                                console.log(wt)
                                                console.log("COST")
                                                console.log(total_s_c)
                                                console.log(row.name)
                                                frappe.call({
                                                    method: 'global_app.doc_events.channel_controller.update_packing_slip',
                                                    async:false,
                                                    args:{
                                                        "cost": total_s_c,
                                                        "wt": wt,
                                                        "name": row.name
                                                    },
                                                    callback: (r) => {
                                                        console.log(r.message)
                                                        
                                                    }
                                                })

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
            "async": false,
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
            var transactionId =  doc.name.split('PAC-')[1] + row.name + length.toString() + "X" + width.toString() + "X" + height.toString() + "igladsolutions";

            frappe.call({
                method: "frappe.client.get",
                async:false,
                args: {
                    doctype: "Delivery Note",
                    name:  doc.delivery_note,
                },
                callback: function(dl) {
                    console.log(dl.message);
                    dl = dl.message;
                    var address_info;

                    frappe.call({
                        method: "frappe.client.get",
                        async:false,
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
                                    async:false,
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
                                                "<ServiceType>" +  doc.service_code + "</ServiceType>\r\n " +
                                                "<ServiceDescription>" +  doc.shipping_service + "</ServiceDescription>\r\n" +
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
                                                "<ToState>" + state_abb + "</ToState>\r\n         </Rate>\r\n      <From>\r\n        <FullName>Global Avertising Inc</FullName>\r\n        <Address1>6251 Box springs Blvd</Address1>\r\n  <City>riverside</City>\r\n        <State>CA</State>\r\n        <ZIPCode>92507</ZIPCode>\r\n      </From>\r\n" +
                                                "<To>\r\n        <FullName>" + address_info.attention_name + "</FullName>\r\n        <NamePrefix/>\r\n        <FirstName/>\r\n        <MiddleName/>\r\n        <LastName/>\r\n        <NameSuffix/>\r\n        <Title/>\r\n        <Department/>\r\n        <Company>" + address_info.address_title.replace('&', '') + "</Company>\r\n        <Address1>" + address_info.address_line1 + "</Address1>\r\n        <Address2>" + add_line_2 + "</Address2>\r\n        <City>" + address_info.city + "</City>\r\n        <State>" + state_abb + "</State>\r\n        <ZIPCode>" + address_info.pincode + "</ZIPCode>\r\n               <PostalCode/>\r\n        <Country>" + country_code + "</Country>\r\n        <Urbanization/>\r\n        <PhoneNumber/>\r\n        <Extension/>\r\n             </To>\r\n" +
                                                "<memo>Rf No.1 :" + dl.items[0].against_sales_order + "#&#xd;&#xa;Rf No.2 : " + dl.po_no + "</memo></CreateIndicium>\r\n  </soap:Body>\r\n</soap:Envelope>"
                                        }
                                        var create_indiciam_resp = $.ajax(create_indiciam)
                                        create_indiciam_resp.done(function (response) {

                                            var sw = response.getElementsByTagName('Rate')[0].childNodes[8].innerHTML
                                            var sc = response.getElementsByTagName('Rate')[0].childNodes[3].innerHTML
                                            
                                            console.log(doc.name)
                                            console.log("USPS COST AND WEIGHT")
                                            console.log("WEIGHT")
                                            console.log(sw)
                                            console.log("COST")
                                            console.log(sc)

                                            frappe.call({
                                                method: 'global_app.doc_events.channel_controller.update_packing_slip',
                                                async:false,
                                                args:{
                                                    "cost": sc,
                                                    "wt": sw,
                                                    "name": row.name
                                                },
                                                callback: (r) => {
                                                    console.log(r.message)
                                                    
                                                }
                                            })

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