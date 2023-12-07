// Copyright (c) 2019, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Channel Controller', {
	onload:function(frm){
		var sugges_arra=[]
		var suggestions_1
		if(frm.doc.suggestions_1){ 
			suggestions_1=frm.doc.suggestions_1
			sugges_arra=suggestions_1.split("??")
			frm.set_df_property('suggestions', 'options', sugges_arra);
			frm.refresh_field('suggestions');
			frm.set_df_property("select_suggestion_", "hidden", false); 
			console.log("box is full")
		}else{
			console.log("box is empty")
			frm.set_df_property("select_suggestion_", "hidden", true);
		} 
	},
	edit_address:function(frm){
		var city=frm.doc.city
		var state=frm.doc.state	
		var ship_to=frm.doc.ship_to
		var pincode=frm.doc.pincode
		var address_line_1=frm.doc.address_line_1	
		var address_line_2=frm.doc.address_line_2
		var shipping_address_validation=frm.doc.shipping_address_validation
		var classification=frm.doc.classification
		var customer=frm.doc.customer
		var dialoge_a = new frappe.ui.Dialog({
			title: __("Address"),
			'fields': [ 		         
				{fieldname: 'ship_to', fieldtype: 'Data',label:'Ship-to (Attn)','default':ship_to}, 
				{fieldname: 'address_line_1',fieldtype: 'Data',label:'Address Line1','default':address_line_1,"reqd": 1}, 
				{fieldname: 'address_line_2',fieldtype: 'Data',label:'Address Line2','default':address_line_2},  			
				{fieldtype: "Section Break" ,fieldname:'sec1'},  
				{fieldname: 'city',fieldtype:'Small Text','label':'City','default':city,'read_only': 1}, 				   
				{fieldname: 'pincode', fieldtype:'Small Text',label:'Zip Code','default':pincode,'read_only': 1}, 	
				{fieldtype: "Column Break"},
				{fieldname: 'state', fieldtype: 'Small Text',label:'State','default':state,'read_only': 1}, 			
				{fieldtype: "Section Break",fieldname:"sec2"},				
				{fieldname: 'validate_address', fieldtype: 'HTML'},  
				{fieldname: 'suggestions',fieldtype: 'Select',label:'Suggestions','onchange': function() {      
					var sugg_val=dialoge_a.get_values().suggestions           
					if(sugg_val!=" "){
						var array_address=sugg_val.split(", ")       
						dialoge_a.set_values({
							'address_line_1':array_address[0].trim()
						});   
					}         		
				}},
				{fieldname: 'customer',fieldtype: 'Data',label:'Customer Name','default':customer}, 
				{fieldtype: "Column Break"},
				{fieldname: 'shipping_address_validation', fieldtype: 'Data', label:'Shipping Address Validation',read_only: 1,'default':shipping_address_validation}, 
				{fieldname: 'classification', fieldtype: 'Data', label:'Classification',read_only: 1,'default':classification},  				 
			],
			primary_action: function(){
				dialoge_a.hide();
				var ship_to=dialoge_a.get_values().ship_to  
				frm.set_value('ship_to',ship_to);
				cur_frm.refresh_field("ship_to"); 
				var address_line_1=dialoge_a.get_values().address_line_1  
				frm.set_value('address_line_1',address_line_1);
				cur_frm.refresh_field("address_line_1"); 
				var customer=dialoge_a.get_values().customer 
				frm.set_value('customer',customer);
				var address_line_2=dialoge_a.get_values().address_line_2  
				frm.set_value('address_line_2',address_line_2);
				cur_frm.refresh_field("address_line_2"); 
				var city=dialoge_a.get_values().city   
				frm.set_value('city',city);
				cur_frm.refresh_field("city"); 
				var state=dialoge_a.get_values().state  
				frm.set_value('state',state); 
				cur_frm.refresh_field("state");  
				var shipping_address_validation=dialoge_a.get_values().shipping_address_validation  
				frm.set_value('shipping_address_validation',shipping_address_validation); 
				cur_frm.refresh_field("shipping_address_validation");  
				var classification=dialoge_a.get_values().classification  
				//frm.set_value('classification',classification); 
				//cur_frm.refresh_field("classification");  	
			}
		});
		dialoge_a.fields_dict.validate_address.$wrapper.html("<input type='button' value='Validate Address' class='btn btn-primary'>")      		  
		dialoge_a.fields_dict.validate_address.$wrapper.click(function(){  
		//dialoge_a.fields_dict.validate_address.$input.click(function() {
			var address=[dialoge_a.get_values().address_line_2,dialoge_a.get_values().address_line_1]
			var data ={"XAVRequest": {"AddressKeyFormat":   
			{"CountryCode": "US",
			"PostcodePrimaryLow":pincode, 
			"ConsigneeName":"", 
			"AddressLine":address, 
			"PoliticalDivision2":"",  
			"PoliticalDivision1":state, 
			"BuildingName":""},   
			"Request":{"RequestOption": "3", 
			"TransactionReference": {"CustomerContext": ""}}, 
			"MaximumListSize":"10"}, 
			"UPSSecurity":{"ServiceAccessToken": 
			{"AccessLicenseNumber":"5D503DAFAFF485B5"}, 
			"UsernameToken": {"Username":"cobbpromo","Password":"X%(8BJ68)"}}} 
			frappe.call({
				method: "erpnext.erpnext_integrations.utils.validate_js_address",       
				args: {"payload":JSON.stringify(data)},   
				callback: function(r) {
					//console.log(r.message.XAVResponse)
					//var sugges = dialoge_a.fields_dict.suggestions.$input;
					//sugges.empty().add_options(aa);
					if(!r.message.XAVResponse.ValidAddressIndicator){
						dialoge_a.set_values({
							'shipping_address_validation': "<p style='color:green;'>Valid Address</p>",
							'classification':r.message.XAVResponse.AddressClassification.Description
						});
					}
					if(!r.message.XAVResponse.NoCandidatesIndicator){
						dialoge_a.set_values({
							'shipping_address_validation': "<P style='color:red'>Invalid Address</p>",
							'classification':""
						});
					}
					if(!r.message.XAVResponse.AmbiguousAddressIndicator){
						dialoge_a.set_values({
							'shipping_address_validation': "<P style='color:orange'>Ambiguous Address</p>",
							'classification':""
						});
						var desc_address=[]
						console.log("NAA MAN")
						//console.log(r.message.XAVResponse.Candidate)
						$.each(r.message.XAVResponse.Candidate || [], function(i, item) {
							//var address= item.AddressKeyFormat;
							var f_Add

							console.log("iii")
							console.log(item)
							desc_address.push("")
							if(item.AddressKeyFormat.AddressLine!=undefined){
							f_Add=item.AddressKeyFormat.AddressLine+", "+
								item.AddressKeyFormat.PoliticalDivision2+", "+
								item.AddressKeyFormat.PostcodePrimaryLow+", "+item.AddressKeyFormat.CountryCode
							desc_address.push(f_Add)
							}
						});
						var sugges = dialoge_a.fields_dict.suggestions.$input;
						sugges.empty().add_options(desc_address);
					}
				},        
				freeze: true,    
				freeze_message: "validating address"
			}); 
		});	
		//dialoge_a.fields_dict.validate_address.$wrapper.removeClass("btn btn-default btn-xs");
		//dialoge_a.fields_dict.sec1.$wrapper.addClass("hidden");
		dialoge_a.show();   
	},  
	select_suggestion_:function(frm){     
		var suggestions_1
		var sugges_arra=[]
		if(frm.doc.suggestions_1){ 
			suggestions_1=frm.doc.suggestions_1
			sugges_arra=suggestions_1.split("??")
		}
		var dialoge_p = new frappe.ui.Dialog({
			title: __("Address Suggestion"),
			'fields': [
				{'fieldname': 'd_suggestions', 'fieldtype': 'Select', 'options': sugges_arra, 'label':'Suggestion'},      
			],
			primary_action: function(){
				dialoge_p.hide();
				//show_alert(dialoge_p.get_values());
				var sugg_val=dialoge_p.get_values().d_suggestions  
				var array_address=sugg_val.split(", ")
				frm.set_value('address_line_1',array_address[0].trim());
				cur_frm.refresh_field("address_line_1"); 
				frm.set_value('city',array_address[1].trim());
				cur_frm.refresh_field("city");
				frm.set_value('pincode',array_address[2].trim());
				cur_frm.refresh_field("pincode");  	  	
			}
		});
		//dialoge_p.fields_dict.ht.$wrapper.html('Hello World');
		dialoge_p.show();
	}, 
	"suggestions": function(frm) {		
		var sugg_val=frm.doc.suggestions
		var array_address=sugg_val.split(",")
		frm.set_value('address_line_1',array_address[0]);
		cur_frm.refresh_field("address_line_1"); 
		frm.set_value('city',array_address[1]); 
		cur_frm.refresh_field("city");
		frm.set_value('pincode',array_address[2]); 
		cur_frm.refresh_field("pincode");
		//frappe.msgprint("Changed description");
    },
	refresh: function(frm) {		
		$(".like-disabled-input").css('font-weight','inherit');
		//document.getElementsByClassName('control-value')[3].style.fontWeight="bold";
		$("div[data-fieldname=order_id]").find('div.control-value').css('font-weight','bold')
		$('.layout-main-section-wrapper').css('width','100%');
		// $('.list-sidebar').hide(); 		
		frappe.call({ 
			method:"erpnext.erpnext_integrations.doctype.channel_controller.channel_controller.get_address_template",			
			args: {
				address_line1:frm.doc.address_line_1,
				address_line2:frm.doc.address_line_2 ? frm.doc.address_line_2:null,
				city:frm.doc.city, 
				state:frm.doc.state,
				pincode:frm.doc.pincode,  
				phone:frm.doc.phone,
				validation_status:frm.doc.shipping_address_validation,
				classification:frm.doc.classification
			},
			callback: function(r){
				//console.log(r.message)
				frappe.model.set_value(frm.doc.doctype, frm.doc.name, "address", r.message);
				cur_frm.refresh_field("address");
			}
			// always: function(){
			// 	frappe.ui.form.is_saving = false;
			// }
		})
		switch(frm.doc.status){
			case 'Received':{
				$("select[data-fieldname=status]").css('background','red')
				$("select[data-fieldname=status]").css('color','White')
				$("select[data-fieldname=status]").css('font-weight','bold')
             break;
			}
			case 'In-Process':{
				$("select[data-fieldname=status]").css('background','yellow')
				$("select[data-fieldname=status]").css('color','green')
				$("select[data-fieldname=status]").css('font-weight','bold')
				break;
			}
			case 'Cancelled':{
				$("select[data-fieldname=status]").css('background','black')
				$("select[data-fieldname=status]").css('color','white')
				$("select[data-fieldname=status]").css('font-weight','bold')
				break;
			}
			case 'On-Hold':{
				$("select[data-fieldname=status]").css('background','grey')
				$("select[data-fieldname=status]").css('color','white')
				$("select[data-fieldname=status]").css('font-weight','bold')
				break;
			}
			case 'Shipped':{
				$("select[data-fieldname=status]").css('background','green')
				$("select[data-fieldname=status]").css('color','white')
				$("select[data-fieldname=status]").css('font-weight','bold')
				break;
			}
			case 'Confirmed-Shipped':{
				$("select[data-fieldname=status]").css('background','green')
				$("select[data-fieldname=status]").css('color','white')
				$("select[data-fieldname=status]").css('font-weight','bold')
				break;
			}
		}
		
	} ,
	status: function(frm){
		switch(frm.doc.status){
			case 'Received':{
				$("select[data-fieldname=status]").css('background','red')
				$("select[data-fieldname=status]").css('color','White')
				$("select[data-fieldname=status]").css('font-weight','bold')
             break;
			}
			case 'In-Process':{
				$("select[data-fieldname=status]").css('background','yellow')
				$("select[data-fieldname=status]").css('color','green')
				$("select[data-fieldname=status]").css('font-weight','bold')
				break;
			}
			case 'Cancelled':{
				$("select[data-fieldname=status]").css('background','black')
				$("select[data-fieldname=status]").css('color','white')
				$("select[data-fieldname=status]").css('font-weight','bold')
				break;
			}
			case 'On-Hold':{
				$("select[data-fieldname=status]").css('background','grey')
				$("select[data-fieldname=status]").css('color','white')
				$("select[data-fieldname=status]").css('font-weight','bold')
				break;
			}
			case 'Shipped':{
				$("select[data-fieldname=status]").css('background','green')
				$("select[data-fieldname=status]").css('color','white')
				$("select[data-fieldname=status]").css('font-weight','bold')
				break;
			}
			case 'Confirmed-Shipped':{
				$("select[data-fieldname=status]").css('background','green')
				$("select[data-fieldname=status]").css('color','white')
				$("select[data-fieldname=status]").css('font-weight','bold')
				break;
			}
		}
  
	}   	
});
frappe.ui.form.on("Controller Item", {
	item_code:function(frm,cdt,cdn){	
		var row = locals[cdt][cdn];
		frappe.call({
			method: "frappe.client.get",
			args: {
				doctype: "Item",
				name: row.item_code,
			},
			callback(dl) {
				//console.log(dl.message);
				if (dl.message.discontinued==1){
					frappe.msgprint("This item is discontinued please select alternative.","Message")
				}
				frappe.model.set_value(row.doctype, row.name,"item_name",dl.message.item_name)
				cur_frm.refresh_field("item_name");
				frappe.model.set_value(row.doctype, row.name,"description",dl.message.description)
				cur_frm.refresh_field("description");  	
			}     
		});	
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Bin",
				filters: [
					["item_code","=", row.item_code]
				],
				fields: ["actual_qty"],
			},
			callback(dl1) {
				if(dl1.message.length>0){
					var v1=dl1.message[0]['actual_qty']
					frappe.model.set_value(row.doctype, row.name,"stock_in_hand",v1)
					cur_frm.refresh_field("stock_in_hand");     
				}else{
					frappe.model.set_value(row.doctype, row.name,"stock_in_hand","<p style='background:red;'>0</p>") 
					cur_frm.refresh_field("stock_in_hand"); 
				}
			}        
		});	
	}
})

