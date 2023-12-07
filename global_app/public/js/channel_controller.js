frappe.ui.form.on('Channel Controller', {
    on_load: function(){
        cur_frm.refresh()
    },
    status: function(frm){
        refresh_status(frm)
        
        frappe.call({
               method: '',
               args: {"name": frm.doc.name, status: frm.doc.status},
               callback: function(r){
                console.log(r.message)
                frm.reload_doc()
               }
        })
    },
    refresh: function (frm,cdt,cdn) {

        
       
        $("[data-doctype='Sales Invoice']").hide();
        $("[data-doctype='Purchase Invoice']").hide();
        
        document.getElementsByClassName('col-xs-6')[3].children[0].hidden = true

        var position_left = '[data-doctype="Sales Invoice"]'

        dashboard_link_doctype(frm, "Sales Order", position_left);

        dashboard_link_doctype(frm, "Delivery Note", position_left);
        
        dashboard_link_doctype(frm, "Packing Slip", position_left);

        refresh_shipping_details_status(frm)
        refresh_status(frm)
        
    },
    shipping_details_status: function(frm){
        refresh_shipping_details_status(frm)
    }
    
});

function refresh_shipping_details_status(frm){
    var push_status =$("select[data-fieldname='shipping_details_status']")
  
    push_status.css('font-weight','bold')
    switch(frm.doc.shipping_details_status){
        case 'Pending':{
            push_status.css('background','yellow')
            push_status.css('color','green')
            break;
        }
        case 'Pushed':{
            push_status.css('background','green')
            push_status.css('color','White')
            break;
        }
    }
}

function refresh_status(frm){
    var status = $("select[data-fieldname=status]")
    switch(frm.doc.status){
        case 'In-Process COBB':{
            status.css('background','yellow')
            status.css('color','green')
            status.css('font-weight','bold')
         break;
        }case 'In-Process Split':{
            status.css('background','yellow')
            status.css('color','green')
            status.css('font-weight','bold')
         break;
        }case 'In-Process GAS':{
            status.css('background','yellow')
            status.css('color','green')
            status.css('font-weight','bold')
         break;
        }
    }
}


function dashboard_link_doctype(frm, doctype , position) {

    var parent = $('.form-dashboard-wrapper '+position).closest('div').parent();

    parent.find('[data-doctype="' + doctype + '"]').remove();

    parent.append(frappe.render_template("sales_order_dashboard_link_doctype", { doctype: doctype }));

    var self = parent.find('[data-doctype="' + doctype + '"]');

    set_open_count(frm, doctype);

    // bind links
    self.find(".badge-link").on('click', function () {
        if(doctype != "Packing Slip"){
            frappe.route_options = { "po_no": frm.doc.order_id }
        }
        frappe.set_route("List", doctype);
    });

    // bind open notifications
    self.find('.open-notification').on('click', function () {
        if(doctype!="Packing Slip"){
            frappe.route_options = {
                "po_no": frm.doc.order_id,
                "status": "To Deliver and Bill"
            }
        }
        frappe.set_route("List", doctype);
    });

    // bind new
    if (frappe.model.can_create(doctype)) {
        self.find('.btn-new').removeClass('hidden');
    }
}

function set_open_count(frm, doctype) {

    var method = '';
    var args = {}

    if (doctype == "Sales Order") {
        method = 'global_app.doc_events.channel_controller.get_sales_order_count';
        args = {
            "po_no": frm.doc.order_id
        }
    }else if(doctype=="Delivery Note"){
        method = 'global_app.doc_events.channel_controller.get_delivery_note_count';
        args = {
            "po_no": frm.doc.order_id
        }
    }else if(doctype=="Packing Slip"){
        method = 'global_app.doc_events.channel_controller.get_packing_slip_count';
        args = {
            "po_no": frm.doc.order_id
        }
    }

    if (method != "") {
        frappe.call({
            type: "GET",
            method: method,
            args: args,
            callback: function (r) {
                // update badges
                console.log(r.message)
                frm.dashboard.set_badge_count(doctype, cint(r.message['open_count']), cint(r.message['count']));
            }
        });
    }
}

frappe.templates["sales_order_dashboard_link_doctype"] = ' \
	<div class="document-link" data-doctype="{{ doctype }}"> \
	    <a class="badge-link small">{{ __(doctype) }}</a> \
	    <span class="text-muted small count"></span> \
	    <span class="open-notification hidden" title="{{ __("Open {0}", [__(doctype)])}}"></span> \
    </div>';
