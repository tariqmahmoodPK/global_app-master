var page;
frappe.pages['custom-design-contro'].on_page_load = function(wrapper) {
	frappe.ui.toolbar.toggle_full_width()

	page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Custom Design Controller',
		single_column: true
	});
	page.wrapper.find('h6').css("font-size", "20px")
	page.wrapper.find('h6').css("margin-right", "20%")
	page.wrapper.find('h6').css("color", "rgb(54, 65, 76)")
	page.wrapper.find('h6').removeClass("text-muted")
	page.set_title('Custom Design')
	page.set_primary_action('New', () => create_new(), 'octicon octicon-plus')
	page.set_secondary_action('Refresh', () => render_view(), 'octicon octicon-sync')
	page.set_title_sub('Hello '  + frappe.user.full_name() + '!')


	render_view()
}
function create_new(name = "New Custom Design 1") {
	frappe.route_options = { "from_controller": "YES" }
	frappe.set_route('Form', 'Custom Design', name)
}
var values = {}
var name_ = ""
function render_view(name = "") {
console.log("VALUUUUUUUUUUUUUUEEESS")
console.log(values)
	frappe.call({
		method: "global_app.global_app.page.custom_design_contro.custom_design_contro.get_custom_designs",
		args: {
			name: name,
			values: values
		},
		freeze: true,
		freeze_message: "Fetching data please wait...",
		async: false,
		callback: function(resp) {
		   	// $(frappe.render_template("custom_design_contro", {'doc': resp.message})).appendTo(page.main)
		   page.main.html(frappe.render_template("custom_design_contro", { 'doc': resp.message }));
		   page.page_form = $('<div class="page-form row hide"></div>').prependTo(page.main);
			var field1 = page.add_field({label: 'Order #', fieldtype: 'Data', fieldname: 'order_number', default: values['order_number'],onchange: function() {
				values['order_number'] = field1.get_value()
				render_view(name_)
			}});
			var field2 = page.add_field({label: 'Customer Name', fieldtype: 'Data', fieldname: 'customer_name', default: values['customer_name'],onchange: function() {
				values['customer_name'] = field2.get_value()
				render_view(name_)
			}});

			var field3 = page.add_field({label: 'Email Address', fieldtype: 'Data', fieldname: 'email_address', default: values['email_address'],onchange: function() {
				values['email_address'] = field3.get_value()
				render_view(name_)
			}});
			var field4 = page.add_field({label: 'Rush', fieldtype: 'Select', options: ["","YES", "NO"],fieldname: 'rush', default: values['rush'],onchange: function() {
				values['rush'] = field4.get_value()
				render_view(name_)
			}});
		}
	});

}

function select_cd(name) {
	name_ = name
	render_view(name)
}
function edit_custom_design(name) {
	create_new(name)
}
