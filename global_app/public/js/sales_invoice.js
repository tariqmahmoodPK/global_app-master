

cur_frm.cscript.onload = function () {
     if(!cur_frm.doc.reference_so){
        frappe.call({
         method: "global_app.doc_events.sales_invoice.update_si",
         args:{
             name: cur_frm.doc.name,
             so: cur_frm.doc.items[0].sales_order ? cur_frm.doc.items[0].sales_order : ""
         },
         callback: function (r) {
             if(r.message === "Success"){
            cur_frm.reload_doc()

             }
         }
     })
    }
}


cur_frm.cscript.after_save = function(){
    console.log('AFTER SAVE')
    frappe.call({
        method: "global_app.events.change_so_status",
        args: {
            so: cur_frm.doc.items[0].sales_order
        },
        async:false,
        callback: function () {}
    })
}