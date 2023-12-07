from __future__ import unicode_literals
import frappe
from frappe import _
import requests, json 
import base64, hashlib, hmac
from six.moves.urllib.parse import urlparse
from erpnext.selling.doctype.sales_order.sales_order import make_delivery_note 
from frappe.utils.password import get_decrypted_password
import datetime

@frappe.whitelist()             
def MP_shipment(ship_track,so_no):#ship_track,so_no
			try:
				so=frappe.db.get_all("Sales Order",filters={"name": so_no},fields=["*"])	
				#ship_track=[{'track_number':"1Z53F7010396257544","carrier_code":"ups","shipping_service":"UPS-Ground"}]
				#so_no = "SO-00898"
				so=frappe.get_doc("Sales Order",so_no)			
				sales_channel= so.get("sales_channel") 
				#ship_track=json.loads(str(ship_track))                 
				switcher={
					"CO-AM":"amazon_order_id",
					"COBB-EBAY":"ebay_order_id",
					"COBB-WOO":"woocommerce_id",
					"COBB-MAG":"magento_order_id",
					"FFN-AMA":"amazon_order_id",
					"FFN-EBAY":"ebay_order_id",
					"FFN-WOO":"woocommerce_id",
					"FFN-MAG":"magento_order_id",
					"GLO-AMA":"amazon_order_id",  
					"GLO-EBAY":"ebay_order_id",
					"GLO-WOO":"woocommerce_id",
					"GLO-MAG":"magento_order_id"
				}
				channel_controller= so.get(switcher.get(sales_channel,"void"))
				channel_controller_name=sales_channel+"_"+channel_controller
				channel_c_doc = frappe.get_doc("Channel Controller", channel_controller_name)
				channel_c_doc.status="Shipped"
				tracking_id=""
				for ship in ship_track:
						tracking_id=ship.get("track_number")

				for item in channel_c_doc.ama_order_item:
						channel_c_doc.append("tracking_info",{
							"quantity": item.quantity,
							"mp_item_id":item.mp_item_id,
							"carrier":ship_track[0].get("carrier_code"),
							"method":ship_track[0].get("shipping_service"),
							"tracking_id":tracking_id,
							"shipped_date":datetime.datetime.now().strftime("%Y/%m/%d %l:%M:%S"),
						})
				channel_c_doc.save()				
				frappe.db.commit() 
			except Exception as e: 
				frappe.log_error(frappe.get_traceback())
			"""so=frappe.db.get_all("Sales Order",filters={"name": so_no},fields=["*"])	
			#ship_track=[{'track_number':"1Z53F7010396257544","carrier_code":"ups","shipping_service":"UPS-Ground"}]
			#so_no = "SO-00898"
			so=frappe.get_doc("Sales Order",so_no)			
			sales_channel= so.get("sales_channel") 
			ship_track=json.loads(ship_track)
			switcher={
				"CO-AM":"amazon_order_id",
				"COBB-EBAY":"ebay_order_id",
				"COBB-WOO":"woocommerce_id",
				"COBB-MAG":"magento_order_id",
				"FFN-AMA":"amazon_order_id",
				"FFN-EBAY":"ebay_order_id",
				"FFN-WOO":"woocommerce_id",
				"FFN-MAG":"magento_order_id",
				"GLO-AMA":"amazon_order_id",
				"GLO-EBAY":"ebay_order_id",
				"GLO-WOO":"woocommerce_id",
				"GLO-MAG":"magento_order_id"
			}
			channel_controller= so.get(switcher.get(sales_channel,"void"))
			print(channel_controller)
			channel_c_doc = frappe.get_all("Channel Controller", filters={'order_id':channel_controller},fields=['*'])[0]
			print(channel_c_doc)
			doc = frappe.get_doc("Channel Controller",channel_c_doc.name)
			tracking_id=''
			for ship in ship_track:
					tracking_id=tracking_id+ship.get("track_number")+","

			doc.update({
				"carrier":ship_track[0].get("carrier_code"),
				"shipped_date":datetime.datetime.now(),
				"method":ship_track[0].get("shipping_service"),
				"tracking_id":tracking_id,
				"status":"Shipped"
			})
			doc.save(ignore_permissions=True)
			frappe.db.commit()"""
			#mp_order_id=so.get("magento_order_id")
			# mp_item=[]
			# mp_ship=[]
			# items_list= so.get("items") 
			# token=get_magento_token()
			# headers={ 
			# 	"Authorization":"Bearer "+json.loads(token),  
			# 	"Content-Type": "application/json"
			# } 
			# for item in items_list:
			# 	mp_line_item_id = item.get("mp_line_item_id")	
			# 	quantity=item.get("qty")
			# 	mp_item.append({
			# 		"order_item_id": mp_line_item_id,
			# 		"qty": quantity 
			# 	})
			# 	"""mp_item.append({"items":[{
			# 		"order_item_id": mp_line_item_id,
			# 		"qty": quantity 
			# 	}]
			# 	}) """
			
			# for ship in ship_track:
			# 		track_number=ship.get("track_number")	
			# 		carrier_code=ship.get("carrier_code")
			# 		mp_ship.append({
			# 			"track_number": track_number,
			# 			"title": "United Parcel Service",#carrier_code,
			# 			"carrier_code": carrier_code
			# 		})
			
			# comments = {
			# 				"extension_attributes": {},
			# 				"comment": "Item(s) has been shipped",
			# 				"is_visible_on_front": 0
			# 			}
			# bodyS={"items":mp_item,"notify": True,"comment":comments,"tracks":mp_ship}
			# urlI="http://50.116.37.238:8080/Magento2/rest/default/V1/order/"+mp_order_id+"/invoice"
			# urlS="http://50.116.37.238:8080/Magento2/rest/default/V1/order/"+mp_order_id+"/ship"
			# bodyI={		
			# "capture": True,
			# "notify": True
			# } 
			# dataI=json.dumps(bodyI)    
			# response = requests.post(urlI,headers=headers,data=dataI)

			# dataS=json.dumps(bodyS)    
			# response = requests.post(urlS,headers=headers,data=dataS) 
			# return response.text 

def check_items_availabilty_IN_CA(item_list=None):
		url="http://localhost:8001/api/method/erpnext.erpnext_integrations.connectors.MP_connector.check_items_availabilty_IN_CA"
		#data=json.dumps(item_list)
		data=json.dumps(item_list, default=str)
		r = requests.post(url, data)
		data_r = r.json() 
		return data_r  

def create_mp_orders(new_sales_order,updated_db):  
	if updated_db == True:   			
			new_sales_order.insert()   
			frappe.db.commit() 
			"""new_sales_order.submit()
			frappe.db.commit()
			so_fields=new_sales_order.name
			dn=make_delivery_note(so_fields)
			dn.insert()
			dn.submit()        
			frappe.db.commit()"""
						
def get_magento_token():
			list=frappe.get_doc("Magento Setting")
			m_pass= get_decrypted_password('Magento Setting', 'Magento Setting', 'api_password', False)			
			tokenURL = list.url
			data=json.dumps({
				"username":list.api_user, 
				"password":m_pass
			})  
			headers = {
				"Content-Type":"application/json"
			}
			response = requests.post(tokenURL,headers=headers,data=data) 
			return response.text    
    	
def link_customer_and_address(billing_data,shipping_data,cust_title,changes,mp_order_id):
		customer_name = cust_title
		billing_name="" 
		shipping_name=""
		status= "success"
		if frappe.get_value("Customer",{"name": cust_title}):
    		#edit
			customer = frappe.get_doc("Customer",{"name": customer_name})
		else:
			#Add
			customer = frappe.new_doc("Customer")			
		 
		customer.customer_name = customer_name	
		customer.save() 
		frappe.db.commit()
		keys = ('address_line1','address_line2','city','pincode','state','address_title')				
		if(billing_data!=""):
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
							"mp_order_id":mp_order_id})							
							return customer_name,billing_name,shipping_name,status,changes		
		if(shipping_data!=""):
			filters_shipping = {}
			address_queries_shipping={}        
			for key in keys:  
				if shipping_data[key] is not None:
					filters_shipping[key] =shipping_data[key]

			address_queries_shipping= frappe.db.get_values("Address",filters=filters_shipping,fieldname="name")
			if len(address_queries_shipping) >= 1:
					shipping_name= address_queries_shipping[0]
			else:	
					address_doc_shipping = frappe.get_doc(shipping_data) 
					address_doc_shipping.append("links", {
						"link_doctype": "Customer",
						"link_name": customer.customer_name
					})
					address_doc_shipping.insert()
					frappe.db.commit()
					shipping_name_t= frappe.db.get_values("Address",filters=filters_shipping,fieldname="name")
					shipping_name=shipping_name_t[0]
					"""ups_val=validate_ups_Address(shipping_data)
					if 'ValidAddressIndicator' in ups_val:
						address_doc_shipping = frappe.get_doc(shipping_data) 
						address_doc_shipping.append("links", {
							"link_doctype": "Customer",
							"link_name": customer.customer_name
						})
						address_doc_shipping.insert()
						frappe.db.commit()
						shipping_name_t= frappe.db.get_values("Address",filters=filters_shipping,fieldname="name")
						shipping_name=shipping_name_t[0]
					if 'NoCandidatesIndicator' in ups_val:
								status= "failure"
								billing_name=None
								shipping_name=None
								changes.append({"change": "Address Not validate by UPS",
								"mp_order_id":mp_order_id})							
								return customer_name,billing_name,shipping_name,status,changes"""
		return customer_name,billing_name,shipping_name,status,changes

def mp_validate_item(mp_id,mp_item_code):
			list_name=frappe.db.get_all("MP Link Item",filters={"mp_id":mp_id,"mp_item_code":mp_item_code},fields=["name"])		
			if len(list_name)>0:
				li_name=list_name[0]['name']
				l=frappe.get_doc("MP Link Item", li_name)
				return l.get("item_table")
			else:
				return

def validate_ups_Address(data):    
			address=[]
			if(data['address_line2']!=""):
					address=data['address_line2']
					address=data['address_line1']
			else:
					address=data['address_line1']             

			headers= {
				'Access-Control-Allow-Origin': '*',   
				"Access-Control-Allow-Headers": "X-Requested-With"
			} 
			payload = {"XAVRequest": {"AddressKeyFormat":
				{"CountryCode": "US",
				"PostcodePrimaryLow": data['pincode'], 
				"ConsigneeName": "", 
				"AddressLine": address,  
				"PoliticalDivision2": "", 
				"PoliticalDivision1": data['state'], 
				"BuildingName": ""},   
				"Request": {"RequestOption": "3", 
				"TransactionReference": {"CustomerContext": ""}}, 
				"MaximumListSize": "10"}, 
				"UPSSecurity": {"ServiceAccessToken": 
				{"AccessLicenseNumber": "5D503DAFAFF485B5"}, 
				"UsernameToken": {"Username": "cobbpromo", "Password": "X%(8BJ68)"}}}
			"""payload = {"XAVRequest": {"AddressKeyFormat":   
			{"CountryCode": "US",
			"PostcodePrimaryLow":"92507", 
			"ConsigneeName":"", 
			"AddressLine":"6251 Box Springs Blvd", 
			"PoliticalDivision2":"",  
			"PoliticalDivision1":"CA", 
			"BuildingName":None},     
			"Request":{"RequestOption": "3", 
			"TransactionReference": {"CustomerContext": ""}}, 
			"MaximumListSize":"10"}, 
			"UPSSecurity":{"ServiceAccessToken": 
			{"AccessLicenseNumber":"5D503DAFAFF485B5"}, 
			"UsernameToken": {"Username":"cobbpromo","Password":"X%(8BJ68)"}}} """
			data=json.dumps(payload)  
			#r =requests.post('https://wwwcie.ups.com/rest/XAV', data=data,headers=headers)  
			r=requests.post('https://onlinetools.ups.com/rest/XAV',data=data,headers=headers)
			#http://www.ups.com/using/services/rave/qcostcgi.cgi
			#return r.text 
			return r.json() 

@frappe.whitelist()
def validate_js_address(payload=None):
			headers= {
				'Access-Control-Allow-Origin': '*',   
				"Access-Control-Allow-Headers": "X-Requested-With"
			} 
			r=requests.post('https://onlinetools.ups.com/rest/XAV',data=payload,headers=headers)
			return r.json()
			 
def validate_webhooks_request(doctype,  hmac_key, secret_key='secret'):
	def innerfn(fn):
		settings = frappe.get_doc(doctype)

		if frappe.request and settings and settings.get(secret_key) and not frappe.flags.in_test:
			sig = base64.b64encode(
				hmac.new(
					settings.get(secret_key).encode('utf8'),
					frappe.request.data,
					hashlib.sha256
				).digest()
			)

			if frappe.request.data and \
				frappe.get_request_header(hmac_key) and \
				not sig == bytes(frappe.get_request_header(hmac_key).encode()):
					frappe.throw(_("Unverified Webhook Data"))
			frappe.set_user(settings.modified_by)

		return fn

	return innerfn

def get_webhook_address(connector_name, method, exclude_uri=False):
	endpoint = "erpnext.erpnext_integrations.connectors.{0}.{1}".format(connector_name, method)

	if exclude_uri:
		return endpoint

	try:
		url = frappe.request.url
	except RuntimeError:
		url = "http://localhost:8000"

	server_url = '{uri.scheme}://{uri.netloc}/api/method/{endpoint}'.format(uri=urlparse(url), endpoint=endpoint)

	return server_url  