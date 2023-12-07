// Copyright (c) 2019, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

/*frappe.ui.form.on('Magento Setting', {
	refresh: function(frm) {

	}get_data   
erpnext\erpnext_integrations\doctype\magento_setting\magento_setting.js
});*/         
frappe.ui.form.on('Magento Setting', {
    get_data: function(frm) {
        console.log("sync ordr click 11:14:56")                
        frappe.call({
            method: "erpnext.erpnext_integrations.doctype.magento_setting.magento_setting.magento_sync12",       
            args: {},   
            callback: function(r) {
                console.log(r.message);
            },
            freeze: true,        
            freeze_message: "Syncing eBay customers and orders; this may take some time..."
        });    
    }                        
    /*get_data: function(frm) {
        console.log("sync ordr click 04:05")                
        frappe.call({
            method: "https://eyconsrv.com.apps.erpnext.erpnext.erpnext_integrations.doctype.magento_setting.magento_setting.test_connection",       
            args: {},   
            callback: function(r) {
                console.log(r.message);
            },
            freeze: true,    
            freeze_message: "Syncing eBay customers and orders; this may take some time..."
        });  
    } */   
    /*test_button: function(frm) {
        alert("nbmcnvm bvbbn")
        console.log("sync ordr click 04:05")                
        frappe.call({
            method: "https://eyconsrv.com.apps.erpnext.erpnext.erpnext_integrations.doctype.magento_setting.magento_setting.test_connection",       
            args: {},   
            callback: function(r) {
                console.log(r.message);
            },
            freeze: true,    
            freeze_message: "Syncing eBay customers and orders; this may take some time..."
        });      
    } */
})  
