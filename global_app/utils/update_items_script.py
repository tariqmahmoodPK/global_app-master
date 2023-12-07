import frappe
from frappe.utils.xlsxutils import read_xlsx_file_from_attached_file


@frappe.whitelist()
def read_file_from_featherflags_file():
    print("READING")
    doc = frappe.get_doc("File", "7804811aef")
    if doc.file_url:
        rows = read_xlsx_file_from_attached_file(file_url=doc.file_url)
        data_rows = rows[1:]
        for idx, row in enumerate(data_rows):
            item_code = row[3]
            sub_category_list = str(row[2]).split(sep=",")
            item_location1 = row[14]
            item_location2 = row[15]
            item_location3 = row[16]

            update_items(item_code, item_location1, item_location2,
                         item_location3, sub_category_list)

        return 'Success'
    else:
        return


@frappe.whitelist()
def read_file_from_worlds_file():
    print("READING")
    doc = frappe.get_doc("File", "a06bb8dca3")
    if doc.file_url:
        rows = read_xlsx_file_from_attached_file(file_url=doc.file_url)
        data_rows = rows[1:]
        for idx, row in enumerate(data_rows):
            item_code = row[2]
            sub_category_list = ['Country & State']
            item_location1 = "None"
            item_location2 = "None"
            item_location3 = "None"

            print(item_code)

            update_items(item_code, item_location1, item_location2,
                         item_location3, sub_category_list)

        return 'Success'
    else:
        return


@frappe.whitelist()
def read_file_from_banner_price_file():
    print("READING")
    doc = frappe.get_doc("File", "9f97c00852")
    if doc.file_url:
        rows = read_xlsx_file_from_attached_file(file_url=doc.file_url)
        data_rows = rows[1:]
        for idx, row in enumerate(data_rows):
            item_code = row[2]
            sub_category_list = ['Pricing Numbers']
            item_location1 = "None"
            item_location2 = "None"
            item_location3 = "None"

            print(item_code)

            update_items(item_code, item_location1, item_location2,
                         item_location3, sub_category_list)

        return 'Success'
    else:
        return


@frappe.whitelist()
def read_file_from_windshield_file():
    print("READING")
    doc = frappe.get_doc("File", "8eb7e33752")
    if doc.file_url:
        rows = read_xlsx_file_from_attached_file(file_url=doc.file_url)
        data_rows = rows[1:]
        for idx, row in enumerate(data_rows):
            item_code = row[2]
            sub_category_list = str(row[1]).split(sep=",")
            item_location1 = "None"
            item_location2 = "None"
            item_location3 = "None"

            print(item_code)

            update_items(item_code, item_location1, item_location2,
                         item_location3, sub_category_list)

        return 'Success'
    else:
        return


@frappe.whitelist()
def read_file_from_supernovo_file():
    print("READING")
    doc = frappe.get_doc("File", "81fc8219a9")
    if doc.file_url:
        rows = read_xlsx_file_from_attached_file(file_url=doc.file_url)
        data_rows = rows[1:]
        for idx, row in enumerate(data_rows):
            item_code = row[2]
            sub_category_list = str(row[1]).split(sep=",")
            item_location1 = row[12]
            item_location2 = row[13]
            item_location3 = row[14]

            print(item_code)

            update_items(item_code, item_location1, item_location2,
                         item_location3, sub_category_list)

        return 'Success'
    else:
        return


@frappe.whitelist()
def read_file_from_realestate6_file():
    print("READING")
    sub_category_list = []
    doc = frappe.get_doc("File", "ffcdf44576")
    if doc.file_url:
        rows = read_xlsx_file_from_attached_file(file_url=doc.file_url)
        data_rows = rows[1:]
        for idx, row in enumerate(data_rows):
            item_code = row[4]
            sub_category_list = str(row[2]).split(sep=",")
            item_location1 = "None"
            item_location2 = "None"
            item_location3 = "None"

            print(item_code)

            update_items(item_code, item_location1, item_location2,
                         item_location3, sub_category_list)

        return 'Success'
    else:
        return


@frappe.whitelist()
def read_file_from_inflatable10_file():
    print("READING")
    sub_category_list = []
    doc = frappe.get_doc("File", "ca570d7fda")
    if doc.file_url:
        rows = read_xlsx_file_from_attached_file(file_url=doc.file_url)
        data_rows = rows[1:]
        for idx, row in enumerate(data_rows):
            item_code = row[3]
            sub_category_list = str(row[2]).split(sep=",")
            item_location1 = "None"
            item_location2 = "None"
            item_location3 = "None"

            print(item_code)

            update_items(item_code, item_location1, item_location2,
                         item_location3, sub_category_list)

        return 'Success'
    else:
        return


@frappe.whitelist()
def read_file_from_inflatable18_file():
    print("READING")
    sub_category_list = []
    doc = frappe.get_doc("File", "a4af17375a")
    if doc.file_url:
        rows = read_xlsx_file_from_attached_file(file_url=doc.file_url)
        data_rows = rows[1:]
        for idx, row in enumerate(data_rows):
            item_code = row[3]
            sub_category_list = str(row[2]).split(sep=",")
            item_location1 = "None"
            item_location2 = "None"
            item_location3 = "None"

            print(item_code)

            update_items(item_code, item_location1, item_location2,
                         item_location3, sub_category_list)

        return 'Success'
    else:
        return


@frappe.whitelist()
def read_file_from_hardware_file():
    print("READING")
    sub_category_list = []
    doc = frappe.get_doc("File", "3bdd1c5679")
    if doc.file_url:
        rows = read_xlsx_file_from_attached_file(file_url=doc.file_url)
        data_rows = rows[1:]
        for idx, row in enumerate(data_rows):
            item_code = row[3]
            sub_category_list = str(row[1]).split(sep=",")
            item_location1 = "None"
            item_location2 = "None"
            item_location3 = "None"

            print(item_code)

            update_items(item_code, item_location1, item_location2,
                         item_location3, sub_category_list)

        return 'Success'
    else:
        return


@frappe.whitelist()
def read_file_from_bunting_file():
    print("READING")
    sub_category_list = []
    doc = frappe.get_doc("File", "5945d40d8f")
    if doc.file_url:
        rows = read_xlsx_file_from_attached_file(file_url=doc.file_url)
        data_rows = rows[1:]
        for idx, row in enumerate(data_rows):
            item_code = row[2]
            sub_category_list = str(row[1]).split(sep=",")
            item_location1 = "None"
            item_location2 = "None"
            item_location3 = "None"

            print(item_code)

            update_items(item_code, item_location1, item_location2,
                         item_location3, sub_category_list)

        return 'Success'
    else:
        return


@frappe.whitelist()
def read_file_from_boomer_file():
    print("READING")
    sub_category_list = []
    doc = frappe.get_doc("File", "cbf7774cc5")
    if doc.file_url:
        rows = read_xlsx_file_from_attached_file(file_url=doc.file_url)
        data_rows = rows[1:]
        for idx, row in enumerate(data_rows):
            item_code = row[2]
            sub_category_list = str(row[1]).split(sep=",")
            item_location1 = "None"
            item_location2 = "None"
            item_location3 = "None"

            print(item_code)

            update_items(item_code, item_location1, item_location2,
                         item_location3, sub_category_list)

        return 'Success'
    else:
        return


@frappe.whitelist()
def read_file_from_3x5state_file():
    print("READING")
    sub_category_list = []
    doc = frappe.get_doc("File", "cbf7774cc5")
    if doc.file_url:
        rows = read_xlsx_file_from_attached_file(file_url=doc.file_url)
        data_rows = rows[1:]
        for idx, row in enumerate(data_rows):
            item_code = row[2]
            sub_category_list = ["Country & State"]
            item_location1 = "None"
            item_location2 = "None"
            item_location3 = "None"

            print(item_code)

            update_items(item_code, item_location1, item_location2,
                         item_location3, sub_category_list)

        return 'Success'
    else:
        return


def update_items(item_code, item_location1, item_location2, item_location3, sub_category_list):
    try:
        item_doc = frappe.get_doc("Item", item_code)

        if item_location1 != None and item_location1 != "None":
            item_doc.location_1_in_warehouse = item_location1
        if item_location2 != None and item_location2 != "None":
            item_doc.location_2_in_warehouse = item_location2
        if item_location3 != None and item_location3 != "None":
            item_doc.location_3_in_warehouse = item_location3

        for sub_cat in sub_category_list:
            ref_sub_cat = sub_cat.strip().rstrip()
            if ref_sub_cat != None and ref_sub_cat != "None":
                try:
                    sub_category = frappe.get_doc(
                        "Sub Category", ref_sub_cat)
                    item_doc.append("item_category", {
                        "category_name": sub_category.name
                    })
                except:
                    sub_category = frappe.new_doc("Sub Category")
                    sub_category.category_name = ref_sub_cat
                    sub_category.save()

                    item_doc.append("item_category", {
                        "category_name": sub_category.name
                    })

                item_doc.save()
                frappe.db.commit()

    except Exception as e:
        print(e)
