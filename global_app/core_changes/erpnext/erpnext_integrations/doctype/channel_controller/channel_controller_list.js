frappe.listview_settings['Channel Controller'] = {
	add_fields: ['channel','order_id','customer','priority','status'], 
	hide_name_column:true,   
	get_indicator: function (doc) {
		if (doc.status === "Received") {
			return [__("Received"), "red", "status,=,Received"];
		}
		else if (doc.status === "In-Process") {
			return [__("In-Process"), "yellow", "status,=,In-Process"];
		}
		else if (doc.status === "Cancelled") {
			return [__("Cancelled"), "black", "status,=,Cancelled"];
		}
		else if (doc.status === "On-Hold") {
			return [__("On-Hold"), "grey", "status,=,On-Hold"];
		}
		else if (doc.status === "Shipped") {
			return [__("Shipped"), "green", "status,=,Shipped"];
		}
		else if (doc.status === "Confirmed-Shipped") {
			return [__("Confirmed-Shipped"), "green", "status,=,Confirmed-Shipped"];
		}    
	} ,                    
	onload: function(listview) {                   
		var method = "erpnext.erpnext_integrations.doctype.channel_controller.channel_controller.set_status";
		var method_ama= "erpnext.erpnext_integrations.doctype.channel_controller.channel_controller.amazon_sync";
		var method_mag="erpnext.erpnext_integrations.doctype.channel_controller.channel_controller.MAG_sync";
		$('.layout-main-section-wrapper').toggleClass('col-md-10 col-md-12');      
		$('.list-sidebar').hide();
		listview.page.add_menu_item(__("MAGENTO SYNC"), function() {
			listview.call_for_selected_items(method_mag);
		});
		listview.page.add_menu_item(__("AMAZON SYNC"), function() {
			listview.call_for_selected_items(method_ama);
		});
		listview.page.add_action_item(__("In-Process"), function() {
			listview.call_for_selected_items(method, {"status": "In-Process"});
		});
		
		listview.page.add_action_item(__("On-Hold"), function() {
			listview.call_for_selected_items(method, {"status": "On-Hold"});
		});		
		listview.page.add_action_item(__("Cancelled"), function() {
			listview.call_for_selected_items(method, {"status": "Cancelled"});
		}); 
		
		listview.page.add_action_item(__("Confirmed-Shipped"), function() {
			listview.call_for_selected_items(method, {"status": "Confirmed-Shipped"});
		}); 
	}
}
     