# -*- coding: utf-8 -*-
# Copyright (c) 2019, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
from frappe.model.document import Document
from frappe import _
from erpnext.erpnext_integrations.doctype.amazon_mws_settings.amazon_methods import controller_set_orders,create_fulfilment_feed,get_feed_result,get_orders,get_one_order,return_as_list
from erpnext.erpnext_integrations.doctype.magento_setting.magento_setting import magento_sync   
import requests, json 
from erpnext.erpnext_integrations.utils import  get_magento_token 
import frappe, time, dateutil, math, csv,json,re   

class ChannelController(Document):
	pass

def test():	
	#apps\erpnext\erpnext\erpnext_integrations\doctype\channel_controller\channel_controller.py
	#bench execute erpnext.erpnext_integrations.doctype.channel_controller.channel_controller.test
	pass
	"""headers= {
			'Access-Control-Allow-Origin': '*',   
			"Access-Control-Allow-Headers": "X-Requested-With"
	} 
	payload = {"XAVRequest": {"AddressKeyFormat":
			{"CountryCode": "US",
			"PostcodePrimaryLow":"91761", 
			"ConsigneeName":"", 
			"AddressLine":"326 E HOLT BLVD STE B ONTARIO", 
			"PoliticalDivision2":"",  
			"PoliticalDivision1":"CA", 
			"BuildingName":None},   
			"Request":{"RequestOption": "3",  
			"TransactionReference": {"CustomerContext": ""}}, 
			"MaximumListSize":"10"}, 
			"UPSSecurity":{"ServiceAccessToken": 
			{"AccessLicenseNumber":"5D503DAFAFF485B5"}, 
			"UsernameToken": {"Username":"cobbpromo","Password":"X%(8BJ68)"}}}	 
	data=json.dumps(payload)   
	#r =requests.post('https://wwwcie.ups.com/rest/XAV', data=data,headers=headers)  
	r=requests.post('https://onlinetools.ups.com/rest/XAV',data=data,headers=headers)
	data_r = r.json()
	#frappe.msgprint(str(data_r))
	address_list=data_r['XAVResponse']['Candidate']
	print(type(address_list)) 
	if(type(address_list)==list):
		desc_address=[]
		for add in address_list:    
			address=add['AddressKeyFormat']
			if isinstance(address['AddressLine'], list): 
					AddressLine=address['AddressLine'][0]
			else:
					AddressLine=address['AddressLine']    			
			f_Add=AddressLine+","+address['PoliticalDivision2']+","+address['PostcodePrimaryLow']+","+address['CountryCode']
			desc_address.append(f_Add)
			#f_Add=f_Add=address['AddressLine']+"," 
		#frappe.msgprint(data_r['XAVResponse']['ValidAddressIndicator'])
		print(desc_address)  
	else:
    		print ("in else") """

@frappe.whitelist()
def set_status(names, status):
		flag_so=False
		flag_fulfil=False
		flag_moveto=False
		if not frappe.has_permission("Channel Controller", "write"):
			frappe.throw(_("Not permitted"), frappe.PermissionError)   
		number=0	
		body=""
		names = json.loads(names)
		AMA_order_id=[]
		data_moveto=[]
		CO_Tracking=[]
		for name in names:
    			#CO-AM_112-1869360-7173823
				cc = frappe.get_doc("Channel Controller", name)  
				order_id=cc.order_id
				channel=cc.channel     
				if (cc.status == 'Received' and status=='In-Process'):
					#ss=cc.items
					ss=controller_set_orders(cc)
					#frappe.msgprint(ss)
					cc.status="In-Process"
					cc.save()
					frappe.db.commit()          
				if(cc.status == 'Received' and status=='Move-To'):
						flag_moveto=True							
						c_order = frappe.get_all("Channel Controller", filters={'name':name},fields=['*'])[0]
						controller_item = frappe.get_all("Controller Item",filters={'parent':c_order.controller_id},fields=['*'])	
						ama_order_item = frappe.get_all("Amazon Order Item",filters={'parent':c_order.controller_id},fields=['*'])	
						data_moveto.append({"orders":c_order,"controller_item":controller_item,"ama_order_item":ama_order_item})
				
						#move_to(name)
						cc.status="Move-To"
						cc.save()
						frappe.db.commit() 
				if(cc.status == 'Shipped' and status=='Confirmed-Shipped'):
						item=cc.tracking_info
						#frappe.msgprint(cc) 
						tracking=[] 
						if (cc.channel=='CO-AM'):
							for i in range(len(item)):		
								shipped_date=str(item[i].shipped_date)
								carrier=item[i].carrier 
								method=item[i].method
								tracking_id=item[i].tracking_id
								mp_item_id=item[i].mp_item_id
								quantity=item[i].quantity
								tracking.append({"shipped_date":shipped_date,"carrier":carrier,"method":method,
								"tracking_id":tracking_id,"mp_item_id":mp_item_id,"quantity":quantity}) 
							CO_Tracking.append({"order_id":order_id,"channel":channel,"tracking":tracking})
							flag_fulfil=True 
							cc.status="Confirmed-Shipped"
							cc.save()
							frappe.db.commit()	 						          						
			  				   				
		"""if(flag_so==True):   
			status="so"      
			get_orders(status) """     
		if(flag_moveto ==True):
				url="http://50.116.11.65:8000/api/method/erpnext.erpnext_integrations.connectors.MP_connector.set_controller_from_controller"
				data=json.dumps(data_moveto, default=str)
				r = requests.post(url,data) 
		if(flag_fulfil==True): 
				if(len(CO_Tracking)>0):
					url="https://cobberp.com/api/method/erpnext.erpnext_integrations.connectors.MP_connector.get_tracking_information"
					payload=json.dumps(CO_Tracking, default=str)
					#frappe.msgprint(CO_Tracking)      
					r = requests.post(url,data=payload) 
					#frappe.msgprint(r) 
					#frappe.msgprint(r.text)                 
				"""xml='<?xml version="1.0" encoding="UTF-8"?><AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd"><Header><DocumentVersion>1.01</DocumentVersion><MerchantIdentifier>My Store</MerchantIdentifier></Header><MessageType>OrderFulfillment</MessageType>'+body+'</AmazonEnvelope>'  				
				res_feed=create_fulfilment_feed(xml) 
				#frappe.msgprint(res_feed) 
				feed_status = res_feed["FeedSubmissionInfo"]["FeedProcessingStatus"]["value"]
				
				if feed_status == "_SUBMITTED_" or feed_status == "_IN_PROGRESS_":
					time.sleep(25)
					orders_response=get_one_order(AMA_order_id)
					orders_list = []

					if "Order" in orders_response:
						orders_list = return_as_list(orders_response.Order)			 					        

					if len(orders_list) > 0:
						for order in orders_list:     					
								
								if(order.OrderStatus=="Shipped"):
												order_id=order.AmazonOrderId					
												cg = frappe.get_all("Channel Controller", filters={'order_id':order_id,'channel':'CO-AM'},fields=['name'])[0]
												cg1 = frappe.get_doc("Channel Controller", cg.name)    
												cg1.status="Confirmed-Shipped"
												cg1.save()
												frappe.db.commit()  """ 
@frappe.whitelist()   
def MAG_sync():
		status="sync"
		ss=magento_sync(status)    
		frappe.msgprint(str(ss))   

@frappe.whitelist()   
def amazon_sync():        
	#cc = frappe.get_doc("Channel Controller", "9721a4fcb6")
	#ss=create_ama_fullfilment(cc)
	#frappe.msgprint(ss) 
	status="sync"
	get_orders(status)      
	#get_test_orders()   
	#frappe.msgprint(strftime("%Y-%m-%dT%H:%M:%SZ", gmtime()))                  
	"""headers= {
			'Access-Control-Allow-Origin': '*',   
			"Access-Control-Allow-Headers": "X-Requested-With"
	} 
	payload = {"XAVRequest": {"AddressKeyFormat":
			{"CountryCode": "US",
			"PostcodePrimaryLow":"92507", 
			"ConsigneeName":"", 
			"AddressLine":" Box Springs Blvd", 
			"PoliticalDivision2":"",  
			"PoliticalDivision1":"CA", 
			"BuildingName":None},   
			"Request":{"RequestOption": "3",  
			"TransactionReference": {"CustomerContext": ""}}, 
			"MaximumListSize":"10"}, 
			"UPSSecurity":{"ServiceAccessToken": 
			{"AccessLicenseNumber":"5D503DAFAFF485B5"}, 
			"UsernameToken": {"Username":"cobbpromo","Password":"X%(8BJ68)"}}}  
	data=json.dumps(payload)   
	r =requests.post('https://wwwcie.ups.com/rest/XAV', data=data,headers=headers)  
	#r=requests.post('https://onlinetools.ups.com/rest/XAV',data=data,headers=headers)
	data_r = r.json()
	#frappe.msgprint(str(data_r))
	address_list=data_r['XAVResponse']['Candidate'] 
	desc_address=[]
	for add in address_list:    
		address=add['AddressKeyFormat'] 
		if isinstance(address['AddressLine'], list): 
    			AddressLine=address['AddressLine'][0]
		else:
    			AddressLine=address['AddressLine']    			
		f_Add=AddressLine+","+address['PoliticalDivision2']+","+address['PostcodePrimaryLow']+","+address['CountryCode']
		desc_address.append(f_Add)
		#f_Add=f_Add=address['AddressLine']+"," 
	frappe.msgprint(desc_address) 
	#frappe.msgprint(data_r['XAVResponse']['ValidAddressIndicator']) 
	"""
	
	"""if 'ValidAddressIndicator' in data_r['XAVResponse']:   
				frappe.msgprint("valid address")  
				#frappe.msgprint(data_r['XAVResponse']['AddressClassification']['Description'])  
	elif 'NoCandidatesIndicator' in data_r['XAVResponse']:
    			frappe.msgprint("Invalid address") 
	elif 'AmbiguousAddressIndicator' in data_r['XAVResponse']:
				frappe.msgprint("Ambiguouse address")
	
	"""
	#return data_r
	"""item_list=[{  
			"item_code":'CB-NSFB-5040-01',		
			"qty": '3',				
			"mp_line_item_id":'19217942591746',
			"item_name": 'Cobb Promo Boat Sale (Green) Feather Flag with Complete 15ft Pole kit and Ground Spike'
		}]
	url="http://50.116.11.65:8000/api/method/erpnext.erpnext_integrations.connectors.MP_connector.check_items_availabilty_IN_CA"
	#data=json.dumps(item_list)
	data=json.dumps(item_list, default=str)
	r = requests.post(url,data)
	data_r = r.json() 
	return data_r
	#frappe.msgprint(data_r['message']['title']) """
    	
@frappe.whitelist()    
def get_address_template(address_line1,address_line2,city,state,pincode,phone,validation_status,classification):
	state_code=frappe.get_doc("US States",state)
	return frappe.render_template("frappe/public/html/channel_controller_address.html",{
				"address_line1":address_line1,
				"address_line2":address_line2,
				"city":city,
				"state":state_code.abb,
				"pincode":pincode,
				"phone":phone,
				"country":"United States",
				"validation_status":validation_status,
				"classification":classification
	})
	"""item=cc.tracking_info
	xml_item_amazon=""
	xml_item_magento=[]
	AMA_order_id.append(cc.order_id) 
	tracking_id=""
	method="" 
	carrier="" 
	shipped_date="" 
	number+= 1
	ii=str(number)
	if(cc.channel=='CO-MA'):    
		token=get_magento_token()
		headers={        
			"Authorization":"Bearer "+json.loads(token),  
			"Content-Type": "application/json"   
		}
		for i in range(len(item)):
			xml_item_magento.append({"order_item_id":item[i].mp_item_id,"qty":item[i].quantity })
		#body_invoice={"items":xml_item_magento}
		url_invoice="https://www.cobbpromo.com/rest/default/V1/order/"+cc.order_id+"/invoice"
		data_invoice=json.dumps({"items":xml_item_magento})    
		response_invoice = requests.post(url_invoice,headers=headers,data=data_invoice) 
		#frappe.msgprint(response_invoice.text)   
		url_ship="https://www.cobbpromo.com/rest/default/V1/order/"+cc.order_id+"/ship"
		body_ship={"items":xml_item_magento,
		"tracks":[{
			"track_number": item[i].tracking_id ,
			"title": "United Parcel Service",
			"carrier_code": item[i].carrier
		}]}
		data_ship=json.dumps(body_ship)    
		response_ship= requests.post(url_ship,headers=headers,data=data_ship) 
		rers_ship= response_ship.json()								
		frappe.msgprint(rers_ship)
		#length_msg= int(len(rers_ship['message']))
		#if(length_msg>5):          
		cc.status="Confirmed-Shipped"
		cc.save()
		frappe.db.commit()  
		    

if(cc.channel=='CO-AM'):
	item=cc.tracking_info
	tracking=[]  
	if(cc.channel=='GA'):
		for i in range(len(item)):		
			shipped_date=str(item[i].shipping_date)
			carrier=item[i].carrier
			method=item[i].method
			tracking_id=item[i].tracking_id
			mp_item_id=item[i].mp_item_id
			quantity=item[i].quantity
			tracking.append({"shipped_date":shipped_date,"carrier":carrier,"method":method,
			"tracking_id":tracking_id,"mp_item_id":mp_item_id,"quantity":quantity}) 
		CO_Tracking.append({"order_id":order_id,"channel":channel,"tracking":tracking})
		flag_fulfil=True
		cc.status="Confirmed-Shipped"
		cc.save()
		frappe.db.commit() """
	"""for i in range(len(item)):								
		xml_item_amazon+="<Item><AmazonOrderItemCode>"+item[i].mp_item_id+"</AmazonOrderItemCode><Quantity>"+item[i].quantity+"</Quantity></Item>"  
		
		shipped_date=str(item[i].shipped_date)
		ss1=shipped_date.split(" ")
		shipped_date=dateutil.parser.parse(ss1[0]).strftime("%Y-%m-%d")
		shipped_date1=shipped_date+"T"+ss1[1]+"-05:00"
		#frappe.msgprint(str(shipped_date1))
		carrier=item[i].carrier
		method=item[i].method
		tracking_id=item[i].tracking_id 
	body+="<Message><MessageID>"+ii+"</MessageID><OperationType>Update</OperationType><OrderFulfillment><AmazonOrderID>"+cc.order_id+"</AmazonOrderID><FulfillmentDate>"+shipped_date1+"</FulfillmentDate><FulfillmentData><CarrierName>"+carrier+"</CarrierName><ShippingMethod>"+method+"</ShippingMethod><ShipperTrackingNumber>"+tracking_id+"</ShipperTrackingNumber></FulfillmentData>"+xml_item_amazon+"</OrderFulfillment></Message>"								
	flag_fulfil=True """  
    