from __future__ import unicode_literals
from frappe import _

def get_data():
	return {
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
