# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from . import __version__ as app_version

app_name = "global_app"
app_title = "Global App"
app_publisher = "jan"
app_description = "Global App"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "jangeles@bai.ph"
app_license = "MIT"

# Includes in <head>
# ------------------
# include js, css files in header of desk.html
# app_include_css = "/assets/global_app/css/global_app.css"
# app_include_js = "/assets/global_app/js/global_app.js"

# include js, css files in header of web template
# web_include_css = "/assets/global_app/css/global_app.css"
web_include_js = "/assets/global_app/js/shopping_invoice.js"

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
    "Packing Slip": "public/js/packing_slip.js",
    "Payment Entry": "public/js/payment_entry.js",
    "Sales Order": "public/js/sales_order.js",
    "Sales Invoice": "public/js/sales_invoice.js",
    "Channel Controller": "public/js/channel_controller.js",
    "Delivery Note": "public/js/delivery_note.js",
    "Address": "public/js/address.js",

}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"
# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Website user home page (by function)
# get_website_user_home_page = "global_app.utils.get_home_page"

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Installation
# ------------

# before_install = "global_app.install.before_install"
# after_install = "global_app.install.after_install"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "global_app.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
    "Packing Slip": {
        "on_cancel": "global_app.doc_events.packing_slip.on_cancel_ps",
        "validate": "global_app.doc_events.packing_slip.validate_ps",
    },
    "Sales Order": {
        "on_cancel": "global_app.doc_events.sales_order.on_cancel_so",
        "before_submit": "global_app.doc_events.sales_order.on_submit_so",
        "on_update_after_submit": "global_app.doc_events.sales_order.on_update_after_submit_so",
        # "on_submit": "global_app.doc_events.sales_order.generate_dn",
    },
    "Delivery Note": {
        "on_cancel": "global_app.doc_events.delivery_note.on_cancel_dn",
    },
    "Sales Invoice": {
        "on_submit": "global_app.doc_events.sales_invoice.on_submit_si",
    }
}

# Scheduled Tasks
# ---------------

scheduler_events = {

    "cron": {
        "30 * * * *": [
            "global_app.doc_events.channel_controller.update_remote_tracking_number"
        ]
    }
    # "all": [
    # 	"global_app.tasks.all"
    # ],
    # "daily": [
    # 	"global_app.tasks.daily"
    # ],
    # "hourly": [
    # 	"global_app.tasks.hourly"
    # ],
    # "weekly": [
    # 	"global_app.tasks.weekly"
    # ]
    # "monthly": [
    # 	"global_app.tasks.monthly"
    # ]
}

# Testing
# -------

# before_tests = "global_app.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "global_app.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps


override_doctype_dashboards = {
    "Channel Controller": "global_app.doc_events.cc_dashboard.get_dashboard_data"
}


fixtures = [
    {
        'doctype': 'Custom Field',
        'filters': [
            [
                "name",
                'in',
                [
                    'Sales Order-shipment_date',
                    'Sales Order-shipping_service',
                    'Item-manufacturer_item_code'
                    'Sales Order-sales_channel',
                    'Packing Slip packages shadow-saturday_delivery',
                    'Packing Slip packages shadow-signature_required',
                    'Sales Invoice-insurance_claim',
                    'Sales Invoice-claim_date',
                    'Sales Invoice-claim_number',
                    'Sales Invoice-results',
                    'Sales Invoice-approved_amount',
                    'Sales Invoice-requested_amount',
                    'Sales Invoice-reason_for_claim',
                    'Sales Invoice-column_break_143',
                    'Sales Invoice-section_break_147',
                    "Sales Invoice-notes_to_customer",
                    "Sales Invoice-notes",
                    "Item-manufacture_details",
                    "Item-color_1",
                    "Item-color_2",
                    "Item-color_3",
                    "Item-color_4",
                    "Item-col111",
                    "Item-color_5",
                    "Item-color_6",
                    "Item-color_7",
                    "Item-color_8",
                    "Sales Order-so_type",
                    "Sales Order-so_type_status",
                    "Address-company_name",
                    "Sales Order-has_custom_design",
                    "Sales Order-has_custom_item",
                    "Item-item_category",
                    "Sales Order-shipment_items",
                    "Sales Order-shipment_cost",
                ]
            ]
        ]
    },
    {
        'doctype': 'Print Format',
        'filters': [
            [
                "name",
                'in',
                [
                    'COBB Sales Invoice'
                ]
            ]
        ]
    },
    {
        'doctype': 'Property Setter',
        'filters': [
            [
                "name",
                'in',
                [
                    'Address-address_line2-label',
                    'Address-address_title-read_only',
                ]
            ]
        ]
    }
]
