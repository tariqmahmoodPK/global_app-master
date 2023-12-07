import frappe,json

@frappe.whitelist()
def get_custom_designs(name,values):
    data = json.loads(values)

    conditions = ""
    if "order_number" in data and data['order_number']:
        conditions += " and"
        conditions += " CD.sales_order like '%{0}%'".format(data['order_number'])

    if "customer_name" in data and data['customer_name']:
        conditions += " and"
        conditions += " CD.customer_name like '%{0}%'".format(data['customer_name'])

    if "email_address" in data and data['email_address']:
        conditions += " and"
        conditions += " CD.email_address like '%{0}%'".format(data['email_address'])

    if "rush" in data and data['rush']:
        conditions += " and"
        conditions += " CDI.rush={0}".format(1 if data['rush'] == "YES" else 0 if data['rush'] == "NO" else "")

    selected_custom_design = []
    query = """ SELECT 
                                          CD.*, 
                                          CDI.rush, 
                                          CDI.graphic_designer, 
                                          CDI.needs_to_ship_by, 
                                          CDI.size,
                                          CDI.item,
                                          CDI.item_name,
                                          CDI.singledouble_sided,
                                          CDI.shippinglocal_pickup,
                                          CDI.product_type,
                                          CDI.sent_to_print_by,
                                          CDI.pick_up_date,
                                          CDI.pick_up_time,
                                          CDI.taken_over_by,
                                          CDI.notes,
                                          CDI.name as row_name
                                      FROM `tabCustom Design` AS CD INNER JOIN `tabCustom Design Items` AS CDI ON CDI.parent = CD.name WHERE CD.docstatus = 1 {0} Order By CD.name ASC""".format(conditions)
    custom_designs = frappe.db.sql(query, as_dict=1)
    if name:
        selected_custom_design = frappe.db.sql(""" SELECT 
                                                  CD.*, 
                                                  CDI.rush, 
                                                  CDI.graphic_designer, 
                                                  CDI.needs_to_ship_by, 
                                                  CDI.attach_image, 
                                                  CDI.size, 
                                                  CDI.item,
                                                  CDI.item_name,
                                                  CDI.singledouble_sided,
                                                  CDI.shippinglocal_pickup,
                                                  CDI.product_type,
                                                  CDI.sent_to_print_by,
                                                  CDI.pick_up_date,
                                                  CDI.pick_up_time,
                                                  CDI.taken_over_by,
                                                  CDI.notes,
                                                  CDI.name as row_name
                                              FROM `tabCustom Design` AS CD INNER JOIN `tabCustom Design Items` AS CDI ON CDI.parent = CD.name WHERE CD.docstatus = 1 and CDI.name = %s Order By CD.name ASC""", name,
                                       as_dict=1)
        selected_custom_design[0]['image'] = '''<img src='{0}' height="300" width="300" style="border: 1px solid black" />'''.format(selected_custom_design[0].attach_image) if selected_custom_design[0].attach_image else ""

    previous_name = ""
    for i in custom_designs:
        i['href_cd'] = 'href="' + frappe.utils.get_url() + "/desk#Form/Custom%20Design/" + i.name + '"'
        i['onclick_td'] = '''onclick="select_cd('{0}')"'''.format(i.row_name)
        if i.name == previous_name:
            i.name = ""
        else:
            previous_name = i.name

    return {
        "custom_designs": custom_designs,
        "custom_designs_length": len(custom_designs),
        "selected_custom_design": selected_custom_design[0] if len(selected_custom_design) > 0 else custom_designs[0] if len(custom_designs) > 0 else selected_custom_design,
        "selected_custom_design_length": len(selected_custom_design) or len(custom_designs),
        "selected_row": selected_custom_design[0].row_name if len(selected_custom_design) > 0 else custom_designs[0].row_name if len(custom_designs) > 0 else selected_custom_design,
        "on_edit" : '''onclick="edit_custom_design('{0}')"'''.format(selected_custom_design[0].name if len(selected_custom_design) > 0 else custom_designs[0].name if len(custom_designs) > 0 else "")
    }