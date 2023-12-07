


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