import frappe
from frappe.frappeclient import FrappeClient
from frappe.utils.password import get_decrypted_password

def validate_item(doc, method):
    # sites = frappe.get_single("Sync Settings").__dict__['sites']
    site = "https://master.tailerp.com/"
    conn = FrappeClient(site)
    print(site)
    password = "bai@u78$1"
    conn._login("Administrator", password)
    record = check_item_exist(doc,conn)

    item_naming_by = conn.get_doc('Stock Settings', "Stock Settings")['item_naming_by']
    check_item_records(doc, conn)
    if not check_item(doc.name, conn):
        create_item(doc,conn,item_naming_by)
    # else:
    #     update_item(doc,record,conn,item_naming_by)


def check_item_exist(doc,conn):
    record = conn.get_list('Item', fields=['*'], filters = {'manufacturer_item_code': doc.name})
    return record

def check_item_records(doc, conn):
    check_item_group(doc.item_group, conn)
    check_item_group(doc.sub_group, conn)
    check_uom(doc.stock_uom, conn)
    for i in doc.uoms:
        check_uom(i.uom, conn)

def check_item(item, conn):
    if item:
        get_item = conn.get_doc("Item", item)
        if not get_item:
            return False
        return True
def check_item_group(item_group, conn):
    if item_group:
        get_item_group = conn.get_doc('Item Group', item_group)
        if not get_item_group:
            obj = {
                "doctype": "Item Group",
                "item_group_name": item_group
            }
            conn.insert(obj)
    # pass

def check_uom(stock_uom, conn):
    if stock_uom:
        get_item_group = conn.get_doc('UOM', stock_uom)
        if not get_item_group:
            obj = {
                "doctype": "UOM",
                "uom_name": stock_uom
            }
            conn.insert(obj)

def create_item(doc,conn,item_naming_by):
    obj = get_obj(doc,item_naming_by,conn)
    conn.insert(obj)
    print("CREATED!\n")

def update_item(doc,record,conn,item_naming_by):
    record_from_other_system = conn.get_doc('Item', record[0]['name'])
    obj = get_obj(doc,item_naming_by,conn)
    for i in obj:
        if i in record_from_other_system:
            record_from_other_system[i] = obj[i]

    conn.update(record_from_other_system)

def get_obj(doc,item_naming_by,conn):
    company = conn.get_doc('Global Defaults', "Global Defaults")['default_company']
    obj = {"manufacturer_item_code": doc.name}

    obj['item_code'] = doc.name if item_naming_by == "Item Code" else doc.item_code

    for i in get_keys():
        if i in doc.__dict__:
            obj[i] = doc.__dict__[i]
    uom = []
    for ii in doc.__dict__['uoms']:
        uom_obj = {}
        for x in get_uom_keys():
            if x in ii.__dict__:
                uom_obj[x] = ii.__dict__[x]
        uom.append(uom_obj)
    obj['uoms'] = uom
    item_default = []
    for xx in doc.__dict__['item_defaults']:
        item_default_obj = {}
        for xxx in get_item_defaults_keys():
            if xxx in xx.__dict__:
                item_default_obj[xxx] = xx.__dict__[xxx]
        item_default_obj['company'] = company
        item_default_obj['income_account'] = "4010 - Sales - In-stock Banners & Flags - MD"
        item_default.append(item_default_obj)
    obj['item_defaults'] = item_default
    return obj

def get_keys():
    return [ 'doctype','name','stock_uom','disabled','allow_alternative_item',
            'is_stock_item','include_item_in_manufacturing','is_fixed_asset','end_of_life',
            'default_material_request_type','valuation_method','weight_uom','has_batch_no','create_new_batch',
            'has_expiry_date','retain_sample','has_serial_no','has_variants','variant_based_on','is_purchase_item',
            'min_order_qty','is_customer_provided_item','delivered_by_supplier',
            'country_of_origin','is_sales_item','enable_deferred_revenue',
            'enable_deferred_expense',
            'inspection_required_before_purchase',
            'inspection_required_before_delivery',
            'is_sub_contracted_item',
            'show_in_website',
            'show_variant_in_website',
            'publish_in_hub',
            'synced_with_hub',
            'item_name',
            'item_group',
            'standard_rate',
            'create_variant',
            'hub_sync_id',
            'variant_of',
            'discontinued',
            'sub_group',
            'valuation_rate',
            'asset_category',
            'asset_naming_series',
            'over_delivery_receipt_allowance',
            'over_billing_allowance',
            'brand',
            'description',
            'color_1','color_2','color_3','color_4',
            'color_5','color_6','color_7','color_8',
            'shelf_life_in_days',
            'warranty_period',
            'weight_per_unit',
            'batch_number_series',
            'sample_quantity',
            'serial_no_series',
            'location_1_in_warehouse',
            'location_2_in_warehouse',
            'location_3_in_warehouse',
            'purchase_uom',
            'safety_stock',
            'lead_time_days',
            'last_purchase_rate',
            'customer',
            'customs_tariff_number',
            'sales_uom',
            'max_discount',
            'deferred_revenue_account',
            'no_of_months',
            'deferred_expense_account',
            'no_of_months_exp',
            'quality_inspection_template',
            'default_bom',
            'customer_code',
            'weightage',
            'website_warehouse',
            'web_long_description',
            'website_content',
            'total_projected_qty',
            'hub_category_to_publish',
            'hub_warehouse',
            'amazon_item_code',
        ]

def get_uom_keys():
    return ['doctype',
         'name',
         'owner',
         'parent',
         'parentfield',
         'parenttype',
         'uom',
         'conversion_factor',
         ]

def get_item_defaults_keys():
    return [
        'doctype',
        # 'default_warehouse',
        'parent',
        'parentfield',
        'parenttype',
        'default_price_list',
        'buying_cost_center',
        'default_supplier',
        'expense_account',
        'selling_cost_center',
     ]
