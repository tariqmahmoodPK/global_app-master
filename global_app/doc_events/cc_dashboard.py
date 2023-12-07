from frappe import _

def get_dashboard_data(data):
    data = {
		'transactions': [
			{
				'label': _('Sales'),
				'items': ['Sales Invoice']
			},
			{
				'label': _('Purchase'),
				'items': ['Purchase Invoice']
			},
		]
	}
    return data