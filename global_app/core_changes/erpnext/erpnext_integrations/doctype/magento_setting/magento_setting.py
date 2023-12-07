# -*- coding: utf-8 -*-
# Copyright (c) 2019, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
#import magento 
import datetime
import requests, json 
from six.moves.urllib.parse import urlparse, urlencode  
from frappe import msgprint, _  
import datetime
from datetime import date 
from erpnext.erpnext_integrations.utils import check_items_availabilty_IN_CA,MP_shipment,link_customer_and_address,mp_validate_item,create_mp_orders,get_magento_token,validate_ups_Address
from erpnext.erpnext_integrations.doctype.amazon_mws_settings import xml_utils
from frappe.utils import cstr, flt, getdate, comma_and, cint, today, add_days
import authorize
from frappe.utils.password import get_decrypted_password
 
class MagentoSetting(Document):
	pass

@frappe.whitelist()   
def test_connection():      
	return "test success"  

@frappe.whitelist()   
def sync1(): 	
	token=get_magento_token()
	ship_track=[{
		"track_number": "1Y-9876543210",
		"carrier_code": "ups"
	}]
	so_no="SO-00849"
	S=MP_shipment(ship_track,so_no)
	return S

	#POST <host>/rest/<store_code>/V1/order/3/ship
	#url="http://50.116.37.238:8080/Magento2/rest/1/V1/order/5/ship"
	#url="http://50.116.37.238:8080/Magento2/rest/1/V1//invoice"
	#url="http://50.116.37.238:8080/Magento2/rest/V1/orders"
	
	headers={ 
		"Authorization":"Bearer "+json.loads(token),  
		"Content-Type": "application/json"
	}  
	"""body={"items": [{
      "order_item_id": 5,  
      "qty": 1}],
	"tracks": [{
		"track_number": "1Y-9876543210",
		"title": "United Parcel Service",  
		"carrier_code": "ups"
	}]}"""
	"""body={"orderId":6,"items": [{
      "orderItemId": 5, 
      "qty": 1}]
	}""" 
	"""body={"entity":{
		"entity_id":16,
		"state":"processing",
        "status": "processing"   
		}  
	}"""
	#for Invoice use this call
	url="http://50.116.37.238:8080/Magento2/rest/default/V1/order/18/invoice"
	body={"entity":{
		"entity_id":18,
		"state":"processing",
        "status": "processing"   
		}    
	}
	#for Shipment this call
	"""url="http://50.116.37.238:8080/Magento2/rest/default/V1/order/18/ship"
	body={
		"items": [{
      		"order_item_id": 18,
      		"qty": 1 
    	}],
		"tracks": [{
			"track_number": "1Y-9876543218",
			"title": "United Parcel Service",
			"carrier_code": "ups"
		}]
	}   """
	data=json.dumps(body)    
	response = requests.post(url,headers=headers,data=data)   
	return response.text

@frappe.whitelist()                  
def test_stamp():
	url= "https://swsim.stamps.com/swsim/swsimv71.asmx"
	headers_token = {
		"content-type": "text/xml; charset=utf-8",
		"soapaction":"http://stamps.com/xml/namespace/2018/03/swsim/swsimv71/AuthenticateUser",
		"cache-control": "no-cache",
		"Content-Length": "length"
	}
	body_token='<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><AuthenticateUser xmlns="http://stamps.com/xml/namespace/2018/03/swsim/swsimv71"><Credentials><IntegrationID>7b0b4025-cac9-4687-90a6-381086ec3c45</IntegrationID><Username>cobbpromo</Username><Password>zJrPSAdwSNdi7yS</Password></Credentials></AuthenticateUser></soap:Body></soap:Envelope>'
	r = requests.post(url, headers=headers_token, data=body_token)    
	mydict = xml_utils.xml2dict().fromstring(r.text)  
	token= mydict['Envelope']['Body']['AuthenticateUserResponse']['Authenticator']['value']
	headers_api={
		"Content-Type": "text/xml; charset=utf-8",
		"Content-Length": "length",
		"SOAPAction": "http://stamps.com/xml/namespace/2018/03/swsim/swsimv71/GetRates"
	} 
	
	from xml.sax.saxutils import escape
	token = escape(token)
	body_api='''<?xml version="1.0" encoding="utf-8"?>
				<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
				xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
				xmlns:xsd="http://www.w3.org/2001/XMLSchema"
				xmlns:tns="http://stamps.com/xml/namespace/2018/03/swsim/swsimv71">
				<soap:Body> <GetRates  xmlns="http://stamps.com/xml/namespace/2018/03/swsim/swsimv71">
				<Authenticator>{0}</Authenticator><Rate>
				<FromZIPCode>60506</FromZIPCode>
				<ToZIPCode>{1}</ToZIPCode>  
				<WeightLb>{2}</WeightLb> 
				<PackageType>Package</PackageType> 
				<ShipDate>{3}</ShipDate>
				</Rate></GetRates>  
				</soap:Body></soap:Envelope>'''.format(token,"37217","1.1","2019-08-25")
	r_api = requests.post(url, headers=headers_api, data=body_api) 
	ship_json = xml_utils.xml2dict().fromstring(r_api.text)  
	#ship_data= ship_json['Envelope']['Body']['AuthenticateUserResponse']['Authenticator']['value']
	ss= ship_json['Envelope']['Body']['GetRatesResponse']['Rates']['Rate']	
	ii=0
	kk=[]
	prices=-1 
	shipping_service="" 
	while ii < len(ss):
				amount=ss[ii]['Amount']['value']			
				servicedescription=ss[ii]['ServiceDescription']['value']
				deliverydays=ss[ii]['DeliverDays']['value']
				if(deliverydays.find('-')!=-1):
						dd=deliverydays.split('-')
						deliverydate=str(add_days(ss[ii]['ShipDate']['value'],int(dd[1])))  
				else:
    					deliverydate=ss[ii]['DeliveryDate']['value']          
				if(deliverydate<='2019-08-31'):
						if(prices!=-1 and prices>amount):
								prices=amount
								shipping_service=servicedescription
						elif(prices==-1 ):
								prices=amount
								shipping_service=servicedescription
						kk.append({'amount':amount,'deliverydate':deliverydate,
						'servicedescription':servicedescription,'deliverydays':deliverydays})   
				ii=ii+1 
	return shipping_service        
	#return kk
"""def magento_sync(api_status=None):
			import urllib.request
			import shutil
			import requests
			
			my_url="http://50.116.37.238:8080/Magento2/pub/media/custom_options/quote/2/5/JaWbHNmYqeTQzF5pXXXQdg74kuk13PmS"
			#filename="test1.png"
			#urllib.request.urlretrieve(my_url, filename)			

			#my_url = 'https://www.washingtonian.com/wp-content/uploads/2017/06/6-30-17-goat-yoga-congressional-cemetery-1-994x559.jpg'
			img_data = requests.get(my_url).content
			with open('test1.jpg', 'wb') as handler:
				handler.write(img_data)       
			token=get_magento_token()     
			list=frappe.get_doc("Magento Setting")
			url=list.url
			headers={            
				"Authorization":"Bearer "+json.loads(token),  
				"Content-Type": "application/json"   
			} 
			url_product=url+"/rest/V1/products/custom-NSFB"       
			response = requests.get(url_product,headers=headers)      
			product=json.loads(response.text) 
			url_order_item=url+"/rest/V1/orders/items/33"             
			response = requests.get(url_order_item,headers=headers)      
			order_item=json.loads(response.text)
			order_item=order_item['product_option']['extension_attributes']
			#return order_item['product_option']['extension_attributes']
			#return order_item
			ii_product=0 
			new_cus_ord={"doctype": "Custom Order"}   
		 
			while ii_product < len(product['options']):
				i_c_type=product['options'][ii_product]['type']
				if(i_c_type!='drop_down'):
					ii_ord_itm=0 
					obj=[]
					option_id=""  
					#elif(i_c=='textcolor' or i_c=='bgcolor' or i_c=='designinstruction' or i_c=='logo' or i_c=='fullname' or i_c=='email' or i_c=='phone'):
					if(product['options'][ii_product]['sku']=='textcolor'):
							option_id=product['options'][ii_product]['option_id']
							obj='text_color'
					elif(product['options'][ii_product]['sku']=='bgcolor'):
							option_id=product['options'][ii_product]['option_id']
							obj='background_color'
					elif(product['options'][ii_product]['sku']=='designinstruction'):
							option_id=product['options'][ii_product]['option_id']
							obj='design_instruction'
					elif(product['options'][ii_product]['sku']=='logo'):
							option_id=product['options'][ii_product]['option_id']
							obj='logo'
					elif(product['options'][ii_product]['sku']=='fullname'):
							option_id=product['options'][ii_product]['option_id']
							obj='full_name'
					elif(product['options'][ii_product]['sku']=='email'):
							option_id=product['options'][ii_product]['option_id']
							obj='email'
					elif(product['options'][ii_product]['sku']=='phone'):
							option_id=product['options'][ii_product]['option_id']
							obj='phone'
					while ii_ord_itm < len(order_item['custom_options']):
								itm_value=order_item['custom_options'][ii_ord_itm]['option_id']
								if(int(itm_value)==int(option_id)):
									new_cus_ord.update({obj:order_item['custom_options'][ii_ord_itm]['option_value']})
								if(obj=='logo'):
											#new_cus_ord.update({'image1':'/files/12764ae2103_small.png'}) 
											new_cus_ord.update({'image1':'/files/test1.jpg'})
											 
								ii_ord_itm=ii_ord_itm+1                  

				ii_product=ii_product+1
			#return new_cus_ord
			ss = frappe.get_doc(new_cus_ord)
			ss.insert()                         
			frappe.db.commit()   			       												
			return "success"  
		
def magento_sync_1(api_status=None):               
	try:
		token=get_magento_token()
		headers={        
			"Authorization":"Bearer "+json.loads(token),  
			"Content-Type": "application/json"   
		} 
		#url="https://www.cobbpromo.com/rest/V1/orders?searchCriteria[filter_groups][0][filters][0][field]=created_at&searchCriteria[filter_groups][0][filters][0][condition_type]=from&searchCriteria[filter_groups][0][filters][0][value]=2019-07-12 09:07:47&searchCriteria[filter_groups][1][filters][0][field]=created_at&searchCriteria[filter_groups][1][filters][0][condition_type]=to&searchCriteria[filter_groups][1][filters][0][value]=2019-07-16 20:53:57"   
		after_date=str(add_days(getdate(today()),-10))  
		#url="https://www.cobbpromo.com/rest/V1/orders/items/32" 
		url="https://www.cobbpromo.com/rest/V1/orders?searchCriteria[filter_groups][0][filters][0][field]=created_at&searchCriteria[filter_groups][0][filters][0][condition_type]=from&searchCriteria[filter_groups][0][filters][0][value]="+after_date+"&searchCriteria[filter_groups][0][filters][0][field]=status&searchCriteria[filter_groups][0][filters][0][value]=Processing"                   
		#url="https://www.cobbpromo.com/rest/V1/products/custom-NSFB"
		#url="https://www.cobbpromo.com/rest/V1/orders/30" 
		response = requests.get(url,headers=headers)      
		orders=json.loads(response.text) 
		#frappe.msgprint(orders)      
		ord_id=""     
		changes = [] 
		channel="CO-MA" 
		ss=""
		log_dict = {"doctype": "MP Log","sync_datetime": datetime.datetime.now(),"channel":channel,"log_table": []}
		msgprint_log = [] 
		if orders['total_count']==0:
			msgprint('No order in list')
		else: 
			for fd in orders['items']:
				ord_id=fd.get("items",{})[0].get("order_id",{}) 
				raw_billing_data = fd.get("billing_address")
				#cust_title=raw_billing_data.get('firstname') +" "+raw_billing_data.get('lastname')
				raw_shipping_data=fd.get('extension_attributes', {}).get('shipping_assignments',{})[0].get('shipping',{}).get('address',{})	   
				billing_data,shipping_data,customer_name,ship_to=extract_shipping_billing(raw_billing_data,raw_shipping_data)						
				ss=make_channel_controller(fd,ord_id,customer_name,ship_to,shipping_data,billing_data,channel,sync)
	except Exception as e:
		frappe.msgprint(e)   
		frappe.log_error(title="get_orders_Magneto", message=e)
	#msgprint_log.append(ss)  
	#msgprint_log.append('Finished.')
	#frappe.msgprint(msgprint_log) 

def make_channel_controller(fd,ord_id,cust_title,ship_to,shipping_data,billing_data,channel,sync):
	co=frappe.db.get_all("Channel Controller",filters={"order_id": ord_id,"channel":channel},fields=["name"])
	if len(co)==0:
		new_cha_cont = frappe.new_doc("Channel Controller")
		now = datetime.datetime.now() 
		status="Received"      
		reason="" 
		assigned_to=""
		controller_id=channel+"_"+str(ord_id)
		new_cha_cont.order_id=ord_id
		new_cha_cont.status="Received"
		new_cha_cont.channel=channel
		new_cha_cont.date_time=datetime.datetime.now()		
		new_cha_cont.controller_id= controller_id
		ups_val=validate_ups_Address(shipping_data)
		if 'ValidAddressIndicator' in ups_val['XAVResponse']: 
				new_cha_cont.shipping_address_validation="<span style='color:green'>Valid Address</span>"
				new_cha_cont.classification=ups_val['XAVResponse']['AddressClassification']['Description']
		if 'NoCandidatesIndicator' in ups_val['XAVResponse']: 
				new_cha_cont.shipping_address_validation="<b style='color:red'>Invalid Address</b>"
				new_cha_cont.classification=""
				status="On-Hold" 
				reason+="System Msg: Order stopped, invalid address.\n"        					    
				if 'AmbiguousAddressIndicator' in ups_val['XAVResponse']:
					new_cha_cont.shipping_address_validation="<b style='color:orange'>Ambiguous Address</b>"
					new_cha_cont.classification=""          
					status="On-Hold"
					reason+="System Msg: Order stopped, Ambiguous Address.\n"
					address_list=ups_val['XAVResponse']['Candidate'] 
					#frappe.msgprint(address_list) 
					desc_address="" 
					if(type(address_list)=='list'):       
						for add in address_list:    
							address=add['AddressKeyFormat']
							if  (len(address['AddressLine'])>0):   
									AddressLine=address['AddressLine'][0]
							else:
									AddressLine=address['AddressLine']    			
							f_Add=AddressLine+", "+address['PoliticalDivision2']+", "+address['PostcodePrimaryLow']+", "+address['CountryCode']
							
							desc_address+=f_Add+"??"          						         
						new_cha_cont.suggestions_1=desc_address
					else:
						for add in address_list:    
							address=add['AddressKeyFormat']
							if  (len(address['AddressLine'])>0):   
									AddressLine=address['AddressLine'][0]
							else:
									AddressLine=address['AddressLine']    			
							f_Add=AddressLine+", "+address['PoliticalDivision2']+", "+address['PostcodePrimaryLow']+", "+address['CountryCode']
						
							desc_address+=f_Add+"??"          						         
						new_cha_cont.suggestions_1=desc_address
    						
		new_cha_cont.ship_to= ship_to
		new_cha_cont.customer=cust_title
		#new_cha_cont.latest_deliver=latest_ship[0] 
		#new_cha_cont.date_time=datetime.datetime.now()	
		new_cha_cont.date_time=now.strftime("%Y-%m-%d, %H:%M:%S")	
		new_cha_cont.address_line_1=shipping_data["address_line1"]  
		new_cha_cont.city= shipping_data["city"]
		state=shipping_data["state"] 
		new_cha_cont.state=state
		new_cha_cont.phone=shipping_data["phone"]
		new_cha_cont.pincode =shipping_data["pincode"]
		new_cha_cont.state=state
		state_channel=frappe.db.get_all("US States",filters={"abb":state},fields=["mp_channel"])  	
		if(len(state_channel)>0): 						
				region=state_channel[0]["mp_channel"]  
		else:  
				state_channel_s=frappe.db.get_all("US States",filters={"name":state},fields=["mp_channel"]) 
				if(len(state_channel_s)>0): 							
					region=state_channel_s[0]["mp_channel"] 
				else:
					region="GA" 
		new_cha_cont.region =region
		assigned_to=region 
		items_list = [] 
		items_list_m = fd.get("items")

		for item in items_list_m:
			items_list.append({
				"item_code":item.get("sku"),
				"qty":item.get("qty_ordered"),
				"mp_line_item_id":item.get("item_id"),
				"item_name":item.get("name")
			})
		for item in items_list:
			new_cha_cont.append("ama_order_item",{
				"item_sku":item['item_code'],
				"quantity": item['qty'],
				"mp_item_id":item["mp_line_item_id"],
				"title":item["item_name"] 
			}) 
			new_cha_cont.append("tracking_info",{
				"quantity": item['qty'],
				"mp_item_id":item["mp_line_item_id"],
				"carrier":"UPS",
				"method":"Ground" 
			}) 
			list1=[]
			list=[]
			missing_item=[]
			list1=mp_get_magento_items(item['item_code'],item['qty'],item["mp_line_item_id"],controller_id)
			if_custom=item['item_code'].split("-")
			if(if_custom[0]!='custom'):
				new_cha_cont.order_type="Stock-Item"
				for x in list1:   
					list.append({"item_code":x["item_code"],"quantity":x["quantity"]})
				if list is None:         
						reason+="Algo Item Not Found In inventory "
						status="On-Hold"   
				else:
					for li in list:    
							req_qty=int(li.get("quantity"))
							item_name=frappe.db.get_all("Item",filters={"item_code":li.get("item_code")},fields=["item_name","is_stock_item"])   									
							item_disab=frappe.db.get_all("Item",filters={"item_code":li.get("item_code"),"disabled":1},fields=["item_name"])   									
							list_qty=frappe.db.get_all("Bin",filters={"item_code":li.get("item_code")},fields=["actual_qty"])   									
							if(item_name):
								if(item_name[0]["is_stock_item"]):
										#avai_qty=list_qty[0]['actual_qty']
										avai_qty=100 
										if(int(avai_qty) < req_qty):
											missing_item.append({"item":li.get("item_code")})
											avai_qty=0
								else: 
										avai_qty=""
													
								if(item_disab):
									reason+="SysMsg:"+ li.get("item_code") +" is discontinued. \n"
									status="On-Hold"       

								new_cha_cont.append("items",{
									"item_code": li.get("item_code"),
									"qty": li.get("quantity"),
									"item_name":item_name[0]["item_name"],
									"stock_in_hand":avai_qty
								})
							else:
									missing_item.append({"item":li.get("item_code")})  
							if(region=="GA"):
									if(missing_item):
												reason+="SysMsg: Item Not Found in GA inventory. \n"
												data_r=check_items_availabilty_IN_CA(items_list)
												if(data_r['message']['title']==""):
														assigned_to=="CA"
														m_item="" 
														for mi in missing_item:
															m_item+=mi.get("item")+"," 
														reason+="SysMsg: Moved to CA due to "+ m_item+ " missing at GA. \n"
												else:
														reason+=data_r['message']['title']
														status="On-Hold"
							if(region=="CA"):   							
									data_r=check_items_availabilty_IN_CA(items_list)  
									if(data_r['message']['title']!=""):  										
											if(missing_item):   										
												for mi in missing_item:
													m_item+=mi+","
												status = "On-Hold"
												reason+="SysMsg: In-sufficient stock of "+m_item+" in GA.\n"
											else:
													assigned_to="GA"                      
													reason+="SysMsg: Moved to GA due to stockouts at CA.\n"
		else:
					region="CA"
					new_cha_cont.order_type="Custom"
		new_cha_cont.assigned_to=assigned_to	  		
		new_cha_cont.status=status	
		new_cha_cont.reasons=reason			
		new_cha_cont.insert()                      
		frappe.db.commit()  
		return "success"

def mp_get_magento_items(item_sku,req_quantity,line_itemid,controller_id):
		item_code_s = item_sku.split('-')		
		final_order_items=[]
		flag=False
		if((item_code_s[0].find('custom'))!=-1):
			token=get_magento_token()
			headers={        
				"Authorization":"Bearer "+json.loads(token),  
				"Content-Type": "application/json"   
			} 
			product_code=item_code_s[0]+"-"+item_code_s[1]		
			url_product="https://www.cobbpromo.com/rest/V1/products/"+product_code
			response_product = requests.get(url_product,headers=headers)      
			product_detail=json.loads(response_product.text)

			new_cus_ord = frappe.new_doc("Custom Order")
			flag=False
			final_order_items.append({
				"item_code": item_code_s[2],		
				"quantity":1*req_quantity
			})
			ii=4
			while ii < len(item_code_s):
					i_c=item_code_s[ii]
					if(i_c=='no'):
    						ii=ii+1
					elif(i_c=='textcolor' or i_c=='bgcolor' or i_c=='designinstruction' or i_c=='logo' or i_c=='fullname' or i_c=='email' or i_c=='phone'):
							ii=ii+1
					else:
						code=item_code_s[ii]+"-"+item_code_s[ii+1]
						final_order_items.append({
							"item_code": code,		
							"quantity":1*req_quantity
						})
						ii=ii+2  					
		elif((item_code_s[0].find('NSFB'))!=-1):
				flag=True
				final_order_items.append({
						"item_code": item_code_s[0]+"-"+item_code_s[1],		
						"quantity":1*req_quantity
				})
		elif((item_code_s[0].find('NSF'))!=-1):
				flag=True
				final_order_items.append({
						"item_code": item_code_s[0]+"-"+item_code_s[1],		
						"quantity":1*req_quantity
				})
		elif((item_code_s[0].find('NSRE'))!=-1):
				flag=True
				final_order_items.append({
						"item_code": item_code_s[0]+"-"+item_code_s[1],		
						"quantity":1*req_quantity
				})    
		item_m=item_code_s[0]+"-"+item_code_s[1]
		if((item_m.find('GD-11'))!=-1):
				flag=True
				final_order_items.append({
						"item_code": item_code_s[0]+"-"+item_code_s[1],		
						"quantity":1*req_quantity
				})
		if((item_m.find('GD-12'))!=-1):
			flag=True
			final_order_items.append({
					"item_code": item_code_s[0]+"-"+item_code_s[1],		
					"quantity":1*req_quantity
			})
		if((item_m.find('NS-NB'))!=-1):
			flag=True
			final_order_items.append({
					"item_code": item_code_s[0]+"-"+item_code_s[1],		
					"quantity":1*req_quantity
			})
		
		if(flag):
				i=2
				while i < len(item_code_s):
						if(item_code_s[i]=="no"):
								i=i+1
						else:
							final_order_items.append({
									"item_code": item_code_s[i]+"-"+item_code_s[i+1],		
									"quantity":1*req_quantity
							})
							i=i+2
				  
		if((item_code_s[0].find('312NS'))!=-1):
					#final_order_items=[]
					final_order_items.append({
							"item_code": item_code_s[0],		
							"quantity":1*req_quantity
					})
					i=1
					while i < len(item_code_s):
						if(item_code_s[i]=="no"):
    								i=i+1
						else:
							final_order_items.append({
									"item_code": item_code_s[i]+"-"+item_code_s[i+1],		
									"quantity":1*req_quantity
							})
							i=i+2 
		
		return final_order_items           
"""  
@frappe.whitelist()
def magento_sync12(api_status=None): 	 
	authorize.Configuration.configure(
    authorize.Environment.TEST,
    '6M7Hp5u6',
    '8d5MgF9zB6A272df',  
	)	 
	result = authorize.Transaction.sale({
		'amount': 5.00,
		'customer_id': '1509792124',
		'payment_id': '1509337279',
		'shipping_id': '1509450231', 
		'line_items': [{
            'item_id': 'CIR0001',
            'name': 'Circuit Board',
            'description': 'A brand new robot component',
            'quantity': 5,
            'unit_price': 4.00,
            'taxable': 'true',  
        }, {
            'item_id': 'CIR0002',
            'name': 'Circuit Board 2.0',
            'description': 'Another new robot component',
            'quantity': 99,
            'unit_price': 10.00,
            'taxable': 'true',
        }],
		'order': {
			'invoice_number': 'INV0001',
			'description': 'Just another invoice...',
		},
		'shipping_and_handling': {
			'amount': 10.00,
			'name': 'UPS 2-Day Shipping',
			'description': 'Handle with care',
		},
		'extra_options': {
		'customer_ip': '100.0.0.1',
		},
		'retail': {
		'market_type':1,
		'device_type':7,
		},
		'tax_exempt': False,
		'recurring': True,
		})      
	"""result = authorize.Transaction.sale({
    'amount':9.00,  
	'email':'rabia.farid89@gmail.com',
	'shipping_id': '14634122',             	
	'customer_id': '1509792265',
	'payment_id': '1509337428', 	
	
    'tax': {
        'amount': 4.00,
        'name': 'Double Taxation Tax',
        'description': 'Another tax for paying double tax',
    },
    'duty': {
        'amount': 2.00,
        'name': 'The amount for duty',
        'description': 'I can''t believe you would pay for duty',
    },
    'line_items': [{
            'item_id': 'CIR0001',
            'name': 'Circuit Board',
            'description': 'A brand new robot component',
            'quantity': 5,
            'unit_price': 4.00,
            'taxable': 'true',
        }, {
            'item_id': 'CIR0002',
            'name': 'Circuit Board 2.0',
            'description': 'Another new robot component',
            'quantity': 1,
            'unit_price': 10.00,
            'taxable': 'true',
        }, {
            'item_id': 'SCRDRVR',
            'name': 'Screwdriver',
            'description': 'A basic screwdriver',
            'quantity': 1,
            'unit_price': 10.00,
            'taxable': 'true',
        }],
    'order': {
        'invoice_number': 'INV00010',
        'description': 'Just another invoice...',
        'order_number': 'PONUM000010',                  
    },                     
    'shipping_and_handling': {
        'amount': 10.00,
        'name': 'UPS 2-Day Shipping',
        'description': 'Handle with care',
    }, 
    'extra_options': {
        'customer_ip': '100.0.0.1',
    },
    'tax_exempt': False,
    'recurring': True,
	}) """ 
	"""result = authorize.Customer.create({
		'merchant_id': '8989762983402603',
		'email': 'rob12345@robotronstudios.com',
		'description': 'Rob the robot',
		'customer_type': 'individual',
		'billing': {
		'first_name': 'Rob',
		'last_name': 'Oteron',
		'company': 'Robotron Studios',
		'address': '101 Computer Street',
		'city': 'Tucson',
		'state': 'AZ',
		'zip': '85704',
		'country': 'US',
		'phone_number': '520-123-4567',
		'fax_number': '520-456-7890',
		},
		'credit_card': {
		'card_number': '4111111111111111',
		'card_code': '456',
		'expiration_month': '04',
		'expiration_year': '2020',
		},
		'shipping': {
			'first_name': 'Robs1',
			'last_name': 'Oteronwr',
			'company': 'Robotron Studiosffgg',
			'address': '6001 Computer Street',
			'city': 'riverside',
			'state': 'CA', 
			'zip': '85704',
			'country': 'US',       
		},  
		})"""
	"""result = authorize.CreditCard.create('1509792265', {
		'customer_type': 'individual',
		'card_number': '4111111111111111',
		'expiration_month': '04',
		'expiration_year': '2020',
		'card_code': '123',
		'billing': {
		'first_name': 'f1',
		'last_name': 'f2',
		'company': 'eyyy',
		'address': '101 laptop Street',
		'city': 'Tucson',
		'state': 'AZ',
		'zip': '85704',
		'country': 'US',
		'phone_number': '520-123-4567',
		'fax_number': '520-456-7890',
		},
		})
	result = authorize.Transaction.details('40041116603')
	return result  """
	return result  
	#return cc.tracking_info

            

def magento_sync(api_status=None):               
	try:
		token=get_magento_token()
		return token
		headers={        
			"Authorization":"Bearer "+json.loads(token),  
			"Content-Type": "application/json"   
		} 
		#url="https://www.cobbpromo.com/rest/V1/orders?searchCriteria[filter_groups][0][filters][0][field]=created_at&searchCriteria[filter_groups][0][filters][0][condition_type]=from&searchCriteria[filter_groups][0][filters][0][value]=2019-07-12 09:07:47&searchCriteria[filter_groups][1][filters][0][field]=created_at&searchCriteria[filter_groups][1][filters][0][condition_type]=to&searchCriteria[filter_groups][1][filters][0][value]=2019-07-16 20:53:57"   
		after_date=str(add_days(getdate(today()),-10))  
		#url="https://www.cobbpromo.com/rest/V1/orders/items/32" 
		url="https://www.cobbpromo.com/rest/V1/orders?searchCriteria[filter_groups][0][filters][0][field]=created_at&searchCriteria[filter_groups][0][filters][0][condition_type]=from&searchCriteria[filter_groups][0][filters][0][value]="+after_date+"&searchCriteria[filter_groups][0][filters][0][field]=status&searchCriteria[filter_groups][0][filters][0][value]=Processing"                   
		#url="https://www.cobbpromo.com/rest/V1/products/custom-NSFB"
		#url="https://www.cobbpromo.com/rest/V1/orders/30" 
		response = requests.get(url,headers=headers)      
		orders=json.loads(response.text)
		#frappe.msgprint(orders)    
		ord_id=""     
		changes = [] 
		channel="CO-MA" 
		ss=""
		log_dict = {"doctype": "MP Log","sync_datetime": datetime.datetime.now(),"channel":channel,"log_table": []}
		msgprint_log = [] 
		if orders['total_count']==0:
			msgprint('No order in list')
		else: 
			for fd in orders['items']:
				ord_id=fd.get("items",{})[0].get("order_id",{}) 
				raw_billing_data = fd.get("billing_address")
				#cust_title=raw_billing_data.get('firstname') +" "+raw_billing_data.get('lastname')
				raw_shipping_data=fd.get('extension_attributes', {}).get('shipping_assignments',{})[0].get('shipping',{}).get('address',{})	   
				billing_data,shipping_data,customer_name,ship_to=extract_shipping_billing(raw_billing_data,raw_shipping_data)						
				ss=make_channel_controller(fd,ord_id,customer_name,ship_to,shipping_data,billing_data,channel,sync)
	except Exception as e:
		frappe.msgprint(e)   
		frappe.log_error(title="get_orders_Magneto", message=e)
	#msgprint_log.append(ss)  
	#msgprint_log.append('Finished.')
	#frappe.msgprint(msgprint_log) 

def make_channel_controller(fd,ord_id,cust_title,ship_to,shipping_data,billing_data,channel,sync):
	co=frappe.db.get_all("Channel Controller",filters={"order_id": ord_id,"channel":channel},fields=["name"])
	if len(co)==0:
		new_cha_cont = frappe.new_doc("Channel Controller")
		now = datetime.datetime.now() 
		status="Received"      
		reason="" 
		assigned_to=""
		controller_id=channel+"_"+str(ord_id)
		new_cha_cont.order_id=ord_id
		new_cha_cont.status="Received"
		new_cha_cont.channel=channel
		new_cha_cont.date_time=datetime.datetime.now()		
		new_cha_cont.controller_id= controller_id
		ups_val=validate_ups_Address(shipping_data)
		if 'ValidAddressIndicator' in ups_val['XAVResponse']: 
				new_cha_cont.shipping_address_validation="<span style='color:green'>Valid Address</span>"
				new_cha_cont.classification=ups_val['XAVResponse']['AddressClassification']['Description']
		if 'NoCandidatesIndicator' in ups_val['XAVResponse']: 
				new_cha_cont.shipping_address_validation="<b style='color:red'>Invalid Address</b>"
				new_cha_cont.classification=""
				status="On-Hold" 
				reason+="System Msg: Order stopped, invalid address.\n"        					    
				if 'AmbiguousAddressIndicator' in ups_val['XAVResponse']:
					new_cha_cont.shipping_address_validation="<b style='color:orange'>Ambiguous Address</b>"
					new_cha_cont.classification=""          
					status="On-Hold"
					reason+="System Msg: Order stopped, Ambiguous Address.\n"
					address_list=ups_val['XAVResponse']['Candidate'] 
					#frappe.msgprint(address_list) 
					desc_address="" 
					if(type(address_list)=='list'):       
						for add in address_list:    
							address=add['AddressKeyFormat']
							if  (len(address['AddressLine'])>0):   
									AddressLine=address['AddressLine'][0]
							else:
									AddressLine=address['AddressLine']    			
							f_Add=AddressLine+", "+address['PoliticalDivision2']+", "+address['PostcodePrimaryLow']+", "+address['CountryCode']
							
							desc_address+=f_Add+"??"          						         
						new_cha_cont.suggestions_1=desc_address
					else:
						for add in address_list:    
							address=add['AddressKeyFormat']
							if  (len(address['AddressLine'])>0):   
									AddressLine=address['AddressLine'][0]
							else:
									AddressLine=address['AddressLine']    			
							f_Add=AddressLine+", "+address['PoliticalDivision2']+", "+address['PostcodePrimaryLow']+", "+address['CountryCode']
						
							desc_address+=f_Add+"??"          						         
						new_cha_cont.suggestions_1=desc_address
    						
		new_cha_cont.ship_to= ship_to
		new_cha_cont.customer=cust_title
		#new_cha_cont.latest_deliver=latest_ship[0] 
		#new_cha_cont.date_time=datetime.datetime.now()	
		new_cha_cont.date_time=now.strftime("%Y-%m-%d, %H:%M:%S")	
		new_cha_cont.address_line_1=shipping_data["address_line1"]  
		new_cha_cont.city= shipping_data["city"]
		state=shipping_data["state"] 
		new_cha_cont.state=state
		new_cha_cont.phone=shipping_data["phone"]
		new_cha_cont.pincode =shipping_data["pincode"]
		new_cha_cont.state=state
		state_channel=frappe.db.get_all("US States",filters={"abb":state},fields=["mp_channel"])  	
		if(len(state_channel)>0): 						
				region=state_channel[0]["mp_channel"]  
		else:  
				state_channel_s=frappe.db.get_all("US States",filters={"name":state},fields=["mp_channel"]) 
				if(len(state_channel_s)>0): 							
					region=state_channel_s[0]["mp_channel"] 
				else:
					region="GA" 
		new_cha_cont.region =region
		assigned_to=region 
		items_list = [] 
		items_list_m = fd.get("items")

		for item in items_list_m:
			items_list.append({
				"item_code":item.get("sku"),
				"qty":item.get("qty_ordered"),
				"mp_line_item_id":item.get("item_id"),
				"item_name":item.get("name")
			})
		for item in items_list:
			new_cha_cont.append("ama_order_item",{
				"item_sku":item['item_code'],
				"quantity": item['qty'],
				"mp_item_id":item["mp_line_item_id"],
				"title":item["item_name"] 
			}) 
			new_cha_cont.append("tracking_info",{
				"quantity": item['qty'],
				"mp_item_id":item["mp_line_item_id"],
				"carrier":"UPS",
				"method":"Ground" 
			}) 
			list1=[]
			list=[]
			missing_item=[]
			list1=mp_get_magento_items(item['item_code'],item['qty'],item["mp_line_item_id"],controller_id)
			if_custom=item['item_code'].split("-")
			if(if_custom[0]!='custom'):
				new_cha_cont.order_type="Stock-Item"
				for x in list1:   
					list.append({"item_code":x["item_code"],"quantity":x["quantity"]})
				if list is None:         
						reason+="Algo Item Not Found In inventory "
						status="On-Hold"   
				else:
					for li in list:    
							req_qty=int(li.get("quantity"))
							item_name=frappe.db.get_all("Item",filters={"item_code":li.get("item_code")},fields=["item_name","is_stock_item"])   									
							item_disab=frappe.db.get_all("Item",filters={"item_code":li.get("item_code"),"disabled":1},fields=["item_name"])   									
							list_qty=frappe.db.get_all("Bin",filters={"item_code":li.get("item_code")},fields=["actual_qty"])   									
							if(item_name):
								if(item_name[0]["is_stock_item"]):
										#avai_qty=list_qty[0]['actual_qty']
										avai_qty=100 
										if(int(avai_qty) < req_qty):
											missing_item.append({"item":li.get("item_code")})
											avai_qty=0
								else: 
										avai_qty=""
													
								if(item_disab):
									reason+="SysMsg:"+ li.get("item_code") +" is discontinued. \n"
									status="On-Hold"       

								new_cha_cont.append("items",{
									"item_code": li.get("item_code"),
									"qty": li.get("quantity"),
									"item_name":item_name[0]["item_name"],
									"stock_in_hand":avai_qty
								})
							else:
									missing_item.append({"item":li.get("item_code")})  
							if(region=="GA"):
									if(missing_item):
												reason+="SysMsg: Item Not Found in GA inventory. \n"
												data_r=check_items_availabilty_IN_CA(items_list)
												if(data_r['message']['title']==""):
														assigned_to=="CA"
														m_item="" 
														for mi in missing_item:
															m_item+=mi.get("item")+"," 
														reason+="SysMsg: Moved to CA due to "+ m_item+ " missing at GA. \n"
												else:
														reason+=data_r['message']['title']
														status="On-Hold"
							if(region=="CA"):   							
									data_r=check_items_availabilty_IN_CA(items_list)  
									if(data_r['message']['title']!=""):  										
											if(missing_item):   										
												for mi in missing_item:
													m_item+=mi+","
												status = "On-Hold"
												reason+="SysMsg: In-sufficient stock of "+m_item+" in GA.\n"
											else:
													assigned_to="GA"                      
													reason+="SysMsg: Moved to GA due to stockouts at CA.\n"
		else:
					region="CA"
					new_cha_cont.order_type="Custom"
		new_cha_cont.assigned_to=assigned_to	  		
		new_cha_cont.status=status	
		new_cha_cont.reasons=reason			
		new_cha_cont.insert()                      
		frappe.db.commit()  
		return "success"

def mp_get_magento_items(item_sku,req_quantity,line_itemid,controller_id):
		item_code_s = item_sku.split('-')		
		final_order_items=[]
		flag=False
		if((item_code_s[0].find('custom'))!=-1):
			token=get_magento_token()
			headers={        
				"Authorization":"Bearer "+json.loads(token),  
				"Content-Type": "application/json"   
			} 
			product_code=item_code_s[0]+"-"+item_code_s[1]		
			"""url_product="https://www.cobbpromo.com/rest/V1/products/"+product_code
			response_product = requests.get(url_product,headers=headers)      
			product_detail=json.loads(response_product.text)

			new_cus_ord = frappe.new_doc("Custom Order")
			flag=False
			final_order_items.append({
				"item_code": item_code_s[2],		
				"quantity":1*req_quantity
			})
			ii=4
			while ii < len(item_code_s):
					i_c=item_code_s[ii]
					if(i_c=='no'):
    						ii=ii+1
					elif(i_c=='textcolor' or i_c=='bgcolor' or i_c=='designinstruction' or i_c=='logo' or i_c=='fullname' or i_c=='email' or i_c=='phone'):
							ii=ii+1
					else:
						code=item_code_s[ii]+"-"+item_code_s[ii+1]
						final_order_items.append({
							"item_code": code,		
							"quantity":1*req_quantity
						})
						ii=ii+2 """ 					
		elif((item_code_s[0].find('NSFB'))!=-1):
				flag=True
				final_order_items.append({
						"item_code": item_code_s[0]+"-"+item_code_s[1],		
						"quantity":1*req_quantity
				})
		elif((item_code_s[0].find('NSF'))!=-1):
				flag=True
				final_order_items.append({
						"item_code": item_code_s[0]+"-"+item_code_s[1],		
						"quantity":1*req_quantity
				})
		elif((item_code_s[0].find('NSRE'))!=-1):
				flag=True
				final_order_items.append({
						"item_code": item_code_s[0]+"-"+item_code_s[1],		
						"quantity":1*req_quantity
				})    
		item_m=item_code_s[0]+"-"+item_code_s[1]
		if((item_m.find('GD-11'))!=-1):
				flag=True
				final_order_items.append({
						"item_code": item_code_s[0]+"-"+item_code_s[1],		
						"quantity":1*req_quantity
				})
		if((item_m.find('GD-12'))!=-1):
			flag=True
			final_order_items.append({
					"item_code": item_code_s[0]+"-"+item_code_s[1],		
					"quantity":1*req_quantity
			})
		if((item_m.find('NS-NB'))!=-1):
			flag=True
			final_order_items.append({
					"item_code": item_code_s[0]+"-"+item_code_s[1],		
					"quantity":1*req_quantity
			})
		
		if(flag):
				i=2
				while i < len(item_code_s):
						if(item_code_s[i]=="no"):
								i=i+1
						else:
							final_order_items.append({
									"item_code": item_code_s[i]+"-"+item_code_s[i+1],		
									"quantity":1*req_quantity
							})
							i=i+2
				  
		if((item_code_s[0].find('312NS'))!=-1):
					#final_order_items=[]
					final_order_items.append({
							"item_code": item_code_s[0],		
							"quantity":1*req_quantity
					})
					i=1
					while i < len(item_code_s):
						if(item_code_s[i]=="no"):
    								i=i+1
						else:
							final_order_items.append({
									"item_code": item_code_s[i]+"-"+item_code_s[i+1],		
									"quantity":1*req_quantity
							})
							i=i+2 
		
		return final_order_items   

@frappe.whitelist()    
def sync(api_status=None):
	try:
		#magento_setting=frappe.get_doc("Magento Setting") 
		#magento_setting.last_sync=datetime.datetime.now()
		#magento_setting.save()
		#frappe.db.commit()  
		#enable_checkbox = magento_setting.enable_magento                   	
		token=get_magento_token()
		#url="http://50.116.37.238:8080/Magento2/rest/V1/products/Cobb restaurants and food Flag Banner CNSFB-3158-pole-standard-clip-yes" 
		#url="http://50.116.37.238:8080/Magento2/rest/V1/orders?searchCriteria=all" 
		#url="http://50.116.37.238:8080/Magento2/rest/V1/orders/23"
		#url="http://50.116.37.238:8080/Magento2/rest/V1/orders/items/23"                               
		"""url="http://50.116.37.238:8080/Magento2/rest/V1/orders?searchCriteria[filter_groups][0][filters][0][field]=created_at&searchCriteria[filter_groups][0][filters][0][condition_type]=from&searchCriteria[filter_groups][0][filters][0][value]=2016-07-01 00:00:00&searchCriteria[filter_groups][1][filters][0][field]=created_at&searchCriteria[filter_groups][1][filters][0][condition_type]=to&searchCriteria[filter_groups][1][filters][0][value]=2018-07-01 00:00:00"""
		#url="http://50.116.37.238:8080/Magento2/rest/V1/orders?searchCriteria[filter_groups][0][filters][0][field]=status&searchCriteria[filter_groups][0][filters][0][value]=pending"   
		url="http://50.116.37.238:8080/Magento2/rest/V1/orders?searchCriteria[filter_groups][0][filters][0][field]=created_at&searchCriteria[filter_groups][0][filters][0][condition_type]=from&searchCriteria[filter_groups][0][filters][0][value]=2019-05-12 09:07:47&searchCriteria[filter_groups][1][filters][0][field]=created_at&searchCriteria[filter_groups][1][filters][0][condition_type]=to&searchCriteria[filter_groups][1][filters][0][value]=2019-05-13 20:53:57"   
		#url="http://50.116.37.238:8080/Magento2/rest/<store_code>/1/order/5/ship"  
		headers={     
			"Authorization":"Bearer "+json.loads(token),  
			"Content-Type": "application/json"
		}	            
		response = requests.get(url,headers=headers)
		orders=json.loads(response.text)  					
    		 
		ord_id="" 
		changes = [] 
		channel="CO-MA"
		log_dict = {"doctype": "MP Log","sync_datetime": datetime.datetime.now(),"channel":channel,"log_table": []}
		msgprint_log = [] 
		if orders['total_count']==0:
			#msgprint_log.append('No order in list')
			msgprint('No order in list')
		else: 
			for fd in orders['items']:
				ord_id=fd.get("items",{})[0].get("order_id",{}) 
				raw_billing_data = fd.get("billing_address")
				cust_title=raw_billing_data.get('firstname') +" "+raw_billing_data.get('lastname')
				raw_shipping_data=fd.get('extension_attributes', {}).get('shipping_assignments',{})[0].get('shipping',{}).get('address',{})	   
				if fd.get('increment_id') == '000000025': 
					#0 for uncheck and 1 for check 
					#sync=enable_checkbox       					
					#msgprint_log.append(raw_billing_data) 		
					#customer_woo_com_email = raw_billing_data.get("email")	
					s=co=frappe.db.get_all("Channel Controller",filters={"order_id": ord_id,"channel":channel},fields=["name","status"])	
					status=co[0]['status']
					if (len(co)>0 and status=='Cancel'):							
							return "cancel"
					else:						
							#make_channel_controller(fd,ord_id,cust_title,raw_shipping_data,channel,enable_checkbox)     
							billing_data,shipping_data,customer_name,ship_to=extract_shipping_billing(raw_billing_data,raw_shipping_data)						
							customer_name,billing_name,shipping_name,status,changes=link_customer_and_address(billing_data,shipping_data,cust_title,changes,ord_id)						
							if status=='success':     
								new_sales_order,updated_db,changes,or_st=extract_orders(fd,customer_name,billing_name,shipping_name,changes,ord_id,channel)							
								if updated_db ==False:
									msgprint_log.append('Magento Order ID: '+ str(ord_id)+ ' has '+or_st)         
								else:
										create_mp_orders(new_sales_order,updated_db)
										msgprint_log.append('Magento Order ID: '+ str(ord_id)+ ' has successfully added')
										changes.append({"change": "Magento Order successfully added","customer_id":customer_name,"mp_order_id":ord_id}) 			
							else:
									msgprint_log.append('Magento Order ID: '+	str(ord_id)+', Address not Valid')   
	except Exception as e:
		frappe.msgprint(e)   
		frappe.log_error(title="get_orders_Magneto", message=e)  
	"""finally:
		if len(changes)>0: 
			log="" 					
			for change in changes:
				log_dict['log_table'].append(change)
				log = frappe.get_doc(log_dict)  
			log.insert()
			frappe.db.commit()
		msgprint_log.append('Finished.')
		frappe.msgprint(msgprint_log) """ 
		

def extract_orders(fd,customer_name,billing_name,shipping_name,changes,ord_id,channel):   						
		# print("in extract order")
		# print(ord_id)
		#for translation of pole kit
		pole_kit={
			'cfe':'Carbon Fiber,Economy',
			'ae':'Aluminium,Economy',
			'cfp':'Carbon Fiber,Premium',
			'ap':'Aluminium,Premium'  
		}
		so_fields=frappe.db.get_all("Sales Order",filters={"magento_order_id": ord_id},fields=["name"])
		if len(so_fields)==0: 
			item_list = [] 
			msg="" 
			
			items_list = fd.get("items")			
			new_sales_order = frappe.new_doc("Sales Order")
			new_sales_order.customer = customer_name
			new_sales_order.sales_channel = channel
			updated_db = True
			for item in items_list:
					concat_skus = item.get("sku")	
					quantity=item.get("qty_ordered")
					Mp_item_id=item.get("item_id")
					order_detail = get_order_details(concat_skus)
					# print(str(order_detail))
					# print(order_detail.get('flag'))
					item_magento_id=order_detail.get('flag')                            
					#list=frappe.get_value("Item Link MP",{"woocom_sku": item_woo_com_id})
					#list=frappe.db.get_all("Item Link MP",filters={"magento_sku": item_magento_id},fields=["item_code","quantity"])
					list=mp_validate_item(channel,item_magento_id)
					if list is None: 
							updated_db = False
					else:
						for li in list: 
								req_qty=li.get("quantity")*quantity 
								list_qty=frappe.db.get_all("Bin",filters={"item_code":li.get("item_code")},fields=["actual_qty"])   
								avai_qty=list_qty[0]['actual_qty']
									
								if (avai_qty < int(req_qty) ):
										updated_db = False   
								new_sales_order.append("items",{
									"item_code": li.get("item_code"),
									"mp_line_item_id":Mp_item_id,
									"qty": li.get("quantity")*quantity
								}) 
					if order_detail.get('td_clip') != 'tdc_no':
						new_sales_order.append("items",{
									"item_code": order_detail.get('td_clip'),
									"qty": quantity
						}) 
					if order_detail.get('travell_pkg') != 'tp_no':
						new_sales_order.append("items",{
									"item_code": order_detail.get('travell_pkg'),
									"qty": quantity
						}) 
					if order_detail.get('mount_hw') != 'mh_no':
						new_sales_order.append("items",{
									"item_code": order_detail.get('mount_hw'),
									"qty": quantity
						})
					if order_detail.get('polkit') != 'pk_no':
						pole_param = pole_kit.get(order_detail.get('polkit')).split(',')
						#print(pole_param)
						pieces = order_detail.get('pole_piece').split('p')[1]
						#print(pieces)
						itm = frappe.get_doc("Item",item_magento_id)
						item_group = "Stock"
						if "Custom Printed" in itm.item_group or "VU Printing" in itm.item_group:
							item_group = "Custom"

						if "-" in item_magento_id:
							flag_type=item_magento_id.split("-")[0]
						elif "312N" in item_magento_id:
							flag_type="312N"
						
						if len(frappe.get_all("Items Fetch",filters={'flag_type':flag_type,'item_group':item_group},fields=['*'])) > 0:
							result = frappe.get_all("Items Fetch", filters={'flag_type':flag_type,'item_group':item_group},fields=["*"])[0] #filters={'item_code': flage_value})
							result = frappe.get_doc("Items Fetch", result.name)
							for r in result.pool_set:
								rule=[1==1]
								if pole_param[0]:
										rule.append(r.material == pole_param[0])
								if pole_param[1]:
										rule.append(r.quality == pole_param[1])
								if pieces:
										rule.append(r.no_pieces == pieces)
								
								#print(rule)
								if all(rule):
									#print(r.pool_set)
									new_sales_order.append("items",{
												"item_code": r.pool_set,
												"qty": quantity
									})
									break  
			#return new_sales_order
			# print(serialize(new_sales_order.items[1]))
			# return "ok"

			delivery_date=date.today()    
			created_date = fd.get("created_at").split(" ")
			new_sales_order.transaction_date = created_date[0]  
			new_sales_order.po_no = fd.get("items",{})[0].get("order_id",{})
			#new_sales_order.po_no = fd.get("items",{})[0].get("product_id",{})         
			new_sales_order.magento_order_id = ord_id
			new_sales_order.naming_series = "SO-"
			new_sales_order.shipping_service="USPS Priority Mail - First Class" 
			#new_sales_order.customer_address=billing_name 			
			new_sales_order.address_display=billing_name[0]   
			new_sales_order.status="Draft" 
			new_sales_order.selling_price_list="Standard Selling"			
			new_sales_order.price_list_currency= "USD"
			new_sales_order.conversion_rate= 1
			new_sales_order.ignore_pricing_rule= 1
			new_sales_order.apply_discount_on= "Net Total"
			#new_sales_order.contact_email="cust_email"
			#new_sales_order.shipping_address=shipping_name 
			new_sales_order.delivery_date = delivery_date 
			new_sales_order.shipping_address_name=shipping_name[0]
			new_sales_order.billing_address_validation='Address Validated'
			new_sales_order.shipping_address_validation='Address Validated'
			if updated_db == False:
					changes.append({"change": "Item Not avaible",
							"mp_order_id":ord_id}) 
					msg= "Item Not Found" 
					
		else:
				updated_db = False
				changes.append({"change": "Order Already exist",
							"mp_order_id":ord_id}) 
				msg= "Order Already exist"	
				new_sales_order=""	
		return  new_sales_order,updated_db,changes,msg  

def create_magento_orders(fd,customer_name,billing_name,shipping_name,cust_title,changes,ord_id):						
		so_fields=frappe.db.get_all("Sales Order",filters={"magento_order_id": ord_id},fields=["name"])
		if len(so_fields)==0:
			item_list = []  
			items_list = fd.get("items")			
			new_sales_order = frappe.new_doc("Sales Order")
			new_sales_order.customer = cust_title
			updated_db = True
			for item in items_list:
				item_magento_id = item.get("sku")	
				quantity=item.get("qty_ordered")		
				#list=frappe.get_value("Item Link MP",{"woocom_sku": item_woo_com_id})
				#list=frappe.db.get_all("Item Link MP",filters={"magento_sku": item_magento_id},fields=["item_code","quantity"])
				list=mp_validate_item("COBB-MAG",item_magento_id)
				if list is None: 
    					updated_db = False
				else:
					for li in list:
							req_qty=li.get("quantity")*quantity 
							list_qty=frappe.db.get_all("Bin",filters={"item_code":li.get("item_code")},fields=["actual_qty"])   
							avai_qty=list_qty[0]['actual_qty']
								
							if (avai_qty < int(req_qty) ):
									updated_db = False   
							new_sales_order.append("items",{
								"item_code": li.get("item_code"),
								"qty": li.get("quantity")*quantity
							}) 
							"""req_qty=li["quantity"]*quantity 
							li["quantity"]=req_qty
							list_qty=frappe.db.get_all("Bin",filters={"item_code": li["item_code"]},fields=["actual_qty"])   
							avai_qty=list_qty[0]['actual_qty']
								
							if (avai_qty < int(req_qty) ):
									updated_db = False   
							new_sales_order.append("items",{
								"item_code": li["item_code"],
								"qty": li["quantity"]*quantity,
							})""" 
			#return new_sales_order
			delivery_date=date.today()    
			created_date = fd.get("created_at").split(" ")
			new_sales_order.transaction_date = created_date[0]  
			new_sales_order.po_no = fd.get("items",{})[0].get("order_id",{})
			#new_sales_order.po_no = fd.get("items",{})[0].get("product_id",{})         
			new_sales_order.magento_order_id = ord_id
			new_sales_order.naming_series = "SO-"
			new_sales_order.shipping_service="USPS Priority Mail - First Class" 
			#new_sales_order.customer_address=billing_name 
			
			new_sales_order.address_display=billing_name[0]   
			new_sales_order.status="Draft" 
			new_sales_order.selling_price_list="Standard Selling"			
			new_sales_order.price_list_currency= "USD"
			new_sales_order.conversion_rate= 1
			new_sales_order.ignore_pricing_rule= 1
			new_sales_order.apply_discount_on= "Net Total"
			#new_sales_order.contact_email="cust_email"
			#new_sales_order.shipping_address=shipping_name 
			new_sales_order.delivery_date = delivery_date 
			new_sales_order.shipping_address_name=shipping_name[0]
			new_sales_order.billing_address_validation='Address Validated'
			new_sales_order.shipping_address_validation='Address Validated' 
			if updated_db == True  :
				#new_sales_order.insert()      
				#frappe.db.commit() 
				new_sales_order.submit()
				frappe.db.commit()
				so_fields=new_sales_order.name
				#dn=make_delivery_note(so_fields)
				#dn.insert()
				#dn.submit()        
				#frappe.db.commit()
			else:
					changes.append({"change": "Item Not avaible",
							"mp_order_id":ord_id}) 
					return "Item Not Found"     
					
		else:
					changes.append({"change": "Order Already exist",
								"mp_order_id":ord_id}) 
					return "Order Already exist" 
		return  "success"+so_fields
		
"""def link_customer_and_address(billing_data,shipping_data,customer_status,changes,magento_ord_id):
			customer_name = str(billing_data.get("address_title"))
			billing_name="" 
			shipping_name=""
			status= "success"
			if customer_status == 0:
				# create
				customer = frappe.new_doc("Customer")			
			if customer_status == 1:
				# Edit
				#customer_woo_com_email = billing_data.get("email")
				customer = frappe.get_doc("Customer",{"name": customer_name})
				#old_name = customer.customer_name   
			customer.customer_name = customer_name	
			customer.save() 
			frappe.db.commit()
							
			keys = ('address_line1','address_line2','city','pincode','state','address_title')				
			filters_billing = {}
			address_queries_billing={}   
			for key in keys:  
				if billing_data[key] is not None:
					filters_billing[key] = billing_data[key]

			address_queries_billing = frappe.db.get_values("Address",filters=filters_billing,fieldname="name")
			if len(address_queries_billing) >= 1:
				billing_name= address_queries_billing[0]
			else:	
				ups_val=validate_ups_Address(billing_data)
				if 'ValidAddressIndicator' in ups_val:
					address_doc_billing = frappe.get_doc(billing_data) 
					address_doc_billing.append("links", {
						"link_doctype": "Customer",
						"link_name": customer.customer_name
					})					
					address_doc_billing.insert()					
					frappe.db.commit()
					billing_name_t= frappe.db.get_values("Address",filters=filters_billing,fieldname="name")
					billing_name=billing_name_t[0]
				if 'NoCandidatesIndicator' in ups_val:
							status= "failure"
							billing_name=None
							shipping_name=None
							changes.append({"change": "Address Not validate by UPS",
							"mp_order_id":magento_ord_id})							
							return customer_name,billing_name,shipping_name,status
					
			#for shipping check if exist or create a new shipping address
			filters_shipping = {}
			address_queries_shipping={}        
			for key in keys:  
				if shipping_data[key] is not None:
					filters_shipping[key] =shipping_data[key]

			address_queries_shipping= frappe.db.get_values("Address",filters=filters_shipping,fieldname="name")
			if len(address_queries_shipping) >= 1:
					shipping_name= address_queries_shipping[0]
			else:	
					ups_val=validate_ups_Address(billing_data)
					if 'ValidAddressIndicator' in ups_val:
						address_doc_shipping = frappe.get_doc(shipping_data) 
						address_doc_shipping.append("links", {
							"link_doctype": "Customer",
							"link_name": customer.customer_name
						})
						address_doc_shipping.insert()
						frappe.db.commit()
						shipping_name_t= frappe.db.get_values("Address",filters=filters_billing,fieldname="name")
						shipping_name=shipping_name_t[0]
					if 'NoCandidatesIndicator' in ups_val:
								status= "failure"
								billing_name=None
								shipping_name=None
								changes.append({"change": "Address Not validate by UPS",
								"mp_order_id":magento_ord_id})							
								return customer_name,billing_name,shipping_name,status
			
			return customer_name,billing_name,shipping_name,status     """         

def extract_shipping_billing(raw_billing_data,raw_shipping_data):
			street_raw_billing=raw_billing_data.get("street")
			street_raw_shipping=raw_shipping_data.get("street")
			
			street_billing1=street_raw_billing[0]
			#street_billing2=street_raw_billing[1]
			street_shipping1=street_raw_shipping[0]			
			#street_shipping2=street_raw_shipping[1]
			
			#for i in range(0,len(street_raw_billing)): 
			#	street_billing=street_billing+street_raw_billing[i]+" " 			
			#for i in range(0,len(street_raw_shipping)): 
			#	street_shipping=street_shipping+street_raw_shipping[i]+" " 
			order_customer_name=str(raw_billing_data.get("firstname"))+ " "+str(raw_billing_data.get("lastname"))
			existing_customer_name = frappe.db.get_value("Customer",filters={"name": order_customer_name}, fieldname="name")
			if existing_customer_name:
    				customer_name=existing_customer_name
			else:
					customer_name=order_customer_name   
			ship_to=str(raw_shipping_data.get("firstname"))+ " "+str(raw_shipping_data.get("lastname"))
			billing_address={
				"doctype": "Address",
				"address_title": str(raw_billing_data.get("firstname"))+ " "+str(raw_billing_data.get("lastname")),
				"address_type": "Billing",
				"address_line1": street_billing1,
				"address_line2": "",
				"city": raw_billing_data.get("city", "Not Provided"),
				"state": raw_billing_data.get("region"),
				"pincode":str(raw_billing_data.get("postcode")),  
				"country": frappe.get_value("Country", filters={"code":raw_billing_data.get("country_id", "IN").lower()}),
				"phone": str(raw_billing_data.get("telephone")),
				"email_id":str(raw_billing_data.get("email"))
			}
			shipping_address={
				"doctype": "Address",
				"address_title":str(raw_shipping_data.get("firstname"))+ " "+str(raw_shipping_data.get("lastname")),
				"address_line1" :street_shipping1,
				"address_line2" :"",
				"city" : raw_shipping_data.get("city", "Not Provided"),
				"address_type" : "Shipping",
				"country" : frappe.get_value("Country", filters={"code":raw_shipping_data.get("country_id", "IN").lower()}),
				"state" :  raw_shipping_data.get("region"),
				"pincode" :  str(raw_shipping_data.get("postcode")),
				"phone" : str(raw_shipping_data.get("telephone")),
				"email_id" :str(raw_shipping_data.get("email"))
			}	
			return billing_address,shipping_address,customer_name,ship_to      

def serialize(obj):
    if isinstance(obj, date):
        serial = obj.isoformat()
        return serial

    return obj.__dict__