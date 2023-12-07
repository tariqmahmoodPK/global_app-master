cur_frm.add_fetch('customer', 'account_on_hold', 'acc_on_hold');
cur_frm.add_fetch('customer_address', 'city', 'city');
cur_frm.add_fetch('customer', 'third_party_shipping', 'third_party_shipping');

var count = 0
cur_frm.cscript.validate = function (){
    cur_frm.clear_table("category_counts")
    	cur_frm.refresh_field("category_counts");
    var category = []

    for(var i=0;i<cur_frm.doc.items.length;i++){
        var add = true
        console.log(category)
        console.log(cur_frm.doc.items)
        for(var x=0;x<category.length;x++){
            if(category[x]['item_group'] == cur_frm.doc.items[i].item_group ){
                category[x]['count'] +=  cur_frm.doc.items[i].qty
                add = false
            }
        }
        if(add){
            category.push({
                "item_group": cur_frm.doc.items[i].item_group,
                "count": cur_frm.doc.items[i].qty
            })
        }

    }
    console.log(category)
    for(var xx=0;xx<category.length;xx++){
        var new_row = cur_frm.add_child("category_counts");
        new_row.category =category[xx]['item_group'];
        new_row.count = category[xx]['count'];
		cur_frm.refresh_field("category_counts");
    }

}
cur_frm.cscript.onload = function () {
    console.log("NAA MAN")
    cur_frm.page.menu.find("a:contains(" + __("Email") + ")").on('click', function (r) {
       setTimeout(() => {
            $('*[data-fieldname="recipients"]').val(cur_frm.doc.contact_email)
        },500)
    });
    cur_frm.page.actions.find("a:contains(" + __("New Email") + ")").on('click', function (r) {

       setTimeout(() => {
            $('*[data-fieldname="recipients"]').val(cur_frm.doc.contact_email)
        },500)

    });
}
cur_frm.cscript.on_submit = function () {

    console.log("NAA MAN")
    cur_frm.page.menu.find("a:contains(" + __("Email") + ")").on('click', function (r) {
       setTimeout(() => {
            $('*[data-fieldname="recipients"]').val(cur_frm.doc.contact_email)
        },500)
    });
    cur_frm.page.actions.find("a:contains(" + __("New Email") + ")").on('click', function (r) {

       setTimeout(() => {
            $('*[data-fieldname="recipients"]').val(cur_frm.doc.contact_email)
        },500)

    });


}



cur_frm.cscript.before_submit = function (frm, cdt, cdn) {
    return new Promise(function(resolve, reject) {
            frappe.confirm(
                'Create DN and PS?',
                function() {
                    var negative = 'frappe.validated = true';

                     frappe.call({
                        method: "global_app.doc_events.sales_order.generate_dn",
                        args: {
                            doc: cur_frm.doc
                        },

                        callback: function () {
                            resolve(negative);
                        }
                    })
                },
                function() {
                    resolve();
                }
            )
        })
}









