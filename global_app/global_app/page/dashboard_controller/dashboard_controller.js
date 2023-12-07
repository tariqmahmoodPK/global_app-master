var page={}
frappe.pages['dashboard-controller'].on_page_load = function(wrapper) {
	page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Dashboard',
		single_column: true
	});
	page.set_secondary_action('Refresh', () => refresh(), 'octicon octicon-sync')
	frappe.call({
		method: "global_app.global_app.page.dashboard_controller.dashboard_controller.get_dashboard_data",
		args: {},
		freeze: true,
		freeze_message: "Fetching data please wait...",
		callback: function(resp) {
			page.main.html(frappe.render_template("dashboard_controller", {'doc': resp.message}));
			var defaulttab = document.getElementsByClassName("accounting").className
			openCity(defaulttab, "Accounting")
		}
	});


}
function refresh(){
	console.log("REFRESH")
	frappe.call({
		method: "global_app.global_app.page.dashboard_controller.dashboard_controller.get_dashboard_data",
		args: {},
		freeze: true,
		freeze_message: "Fetching data please wait...",
		callback: function(resp) {
			page.main.html(frappe.render_template("dashboard_controller", {'doc': resp.message}));
			var defaulttab = document.getElementsByClassName("accounting").className
			openCity(defaulttab, "Accounting")
		}
	});
}

function openCity(classname, name) {
  var i, tabcontent, tablinks;

  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
    if(tablinks[i].name === name){
		tablinks[i].style["background-color"] = "gray";
    	tablinks[i].style.color= "white";
	} else {
    	tablinks[i].style["background-color"] = "#F1F1F1";
    	tablinks[i].style.color= "#36414c";
	}

  }
  document.getElementById(name).style.display = "block";
  classname += " active";
}