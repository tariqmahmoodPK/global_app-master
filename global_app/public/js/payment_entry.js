cur_frm.cscript.reference_no = function (frm, cdt, cdn) {
    console.log("TEEEEEEEST")
    if(cur_frm.doc.reference_no){
        console.log("sulod man")

        frappe.call({
            method: "global_app.doc_events.payment_entry.get_pe",
            args: {
                reference_no: cur_frm.doc.reference_no
            },
            callback: function(r){
                if(r.message){
                    var no = cur_frm.doc.reference_no
                   cur_frm.doc.reference_no = ""
                   cur_frm.refresh_field("reference_no")
                   frappe.throw("Reference No " + no + " has already been used")
                }
            }
        })
    }
}

cur_frm.cscript.reference_name = function (frm, cdt, cdn) {
    var d = locals[cdt][cdn]
    var add = 0
    if(d.reference_name){
        for (var i = 0; i < cur_frm.doc.references.length; i += 1 ) {
            if (cur_frm.doc.references[i].reference_name === d.reference_name) {
                add += 1
            }
        }
        if (add > 1) {
            d.reference_name = ""
            d.total_amount = 0
            cur_frm.refresh_field("references")
           frappe.msgprint("Can't Add same invoice twice")
        }
    }

}

cur_frm.cscript.setup = function (frm, cdt, cdn) {
    cur_frm.set_query("reference_name", "references", function (doc, cdt, cdn) {
			const child = locals[cdt][cdn];
			const filters = [
			    ["docstatus", "=", 1],
                ["company", "=", doc.company]
			]
			const party_type_doctypes = ['Sales Invoice', 'Sales Order', 'Purchase Invoice',
				'Purchase Order', 'Expense Claim', 'Fees'];

			if (in_list(party_type_doctypes, child.reference_doctype)) {
				filters.push([doc.party_type.toLowerCase(), "=", doc.party] );
			}

			if (child.reference_doctype === "Expense Claim") {
				filters.push(["is_paid", "=", 0]);
			} else if (child.reference_doctype === "Sales Invoice") {
				filters.push(["status", "not in", ["Cancelled", "Paid"]]);
			}

			return {
				filters: filters
			};
		});
}