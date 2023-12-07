

import frappe
import json
from frappe.utils.data import flt, nowdate
from frappe.modules.utils import scrub
from erpnext.accounts.doctype.invoice_discounting.invoice_discounting import get_party_account_based_on_invoice_discounting
from erpnext.accounts.doctype.journal_entry.journal_entry import get_default_bank_cash_account
from erpnext.accounts.doctype.account.account import get_account_currency


@frappe.whitelist()
def get_pe(reference_no):

    pe = frappe.db.sql(
        """ SELECT * FROM `tabPayment Entry` WHERE reference_no=%s """, reference_no, as_dict=1)

    return True if len(pe) > 0 else False


@frappe.whitelist()
def create_payment_entry(args):

    pe = frappe.new_doc("Payment Entry")

    dt = "Sales Invoice"

    bank_account = None

    bank_amount = None

    data = json.loads(args)

    for dn in data:
        doc = frappe.get_doc("Sales Invoice", dn)

        party_amount = doc.base_grand_total

        if dt in ("Sales Invoice", "Sales Order"):
            party_type = "Customer"

            # # party account
        if dt == "Sales Invoice":
            party_account = get_party_account_based_on_invoice_discounting(
                dn) or doc.debit_to

        party_account_currency = doc.get(
            "party_account_currency") or get_account_currency(party_account)

        # payment type
        payment_type = "Receive"

        # # amounts
        grand_total = outstanding_amount = 0
        if party_amount:
            grand_total = outstanding_amount = party_amount
        elif dt in ("Sales Invoice", "Purchase Invoice"):
            if party_account_currency == doc.company_currency:
                grand_total = doc.base_rounded_total or doc.base_grand_total
            else:
                grand_total = doc.rounded_total or doc.grand_total
            outstanding_amount = doc.outstanding_amount
        elif dt in ("Expense Claim"):
            grand_total = doc.total_sanctioned_amount
            outstanding_amount = doc.total_sanctioned_amount \
                - doc.total_amount_reimbursed - flt(doc.total_advance_amount)
        elif dt == "Employee Advance":
            grand_total = doc.advance_amount
            outstanding_amount = flt(doc.advance_amount) - flt(doc.paid_amount)
        elif dt == "Fees":
            grand_total = doc.grand_total
            outstanding_amount = doc.outstanding_amount
        else:
            if party_account_currency == doc.company_currency:
                grand_total = flt(doc.get("base_rounded_total")
                                or doc.base_grand_total)
            else:
                grand_total = flt(doc.get("rounded_total") or doc.grand_total)
            outstanding_amount = grand_total - flt(doc.advance_paid)

            # bank or cash
        bank = get_default_bank_cash_account(doc.company, "Bank", mode_of_payment=doc.get("mode_of_payment"),
                                            account=bank_account)

        paid_amount = received_amount = 0
        if party_account_currency == bank.account_currency:
            paid_amount = received_amount = abs(outstanding_amount)
        elif payment_type == "Receive":
            paid_amount = abs(outstanding_amount)
            if bank_amount:
                received_amount = bank_amount
            else:
                received_amount = paid_amount * doc.conversion_rate
        else:
            received_amount = abs(outstanding_amount)
            if bank_amount:
                paid_amount = bank_amount
            else:
                # if party account currency and bank currency is different then populate paid amount as well
                paid_amount = received_amount * doc.conversion_rate

        if(doc.card_type):
            pe.card_type = doc.card_type
        if(doc.name_on_card):
            pe.name_on_card = doc.name_on_card
        if(doc.authorizenet_id):
            pe.authorizenet_id = doc.authorizenet_id
        if(doc.credit_card):
            pe.credit_card = doc.credit_card

        pe.payment_type = payment_type
        pe.company = doc.company
        pe.cost_center = doc.get("cost_center")
        pe.posting_date = nowdate()
        pe.mode_of_payment = "Credit Card"
        pe.party_type = party_type
        pe.party = doc.get(scrub(party_type))
        pe.letter_head = doc.get("letter_head")
        pe.reference_date = nowdate()
        pe.reference_no = "1202ss"


        pe.append("references", {
            'reference_doctype': "Sales Invoice",
            'reference_name': dn,
            "bill_no": doc.get("bill_no"),
            "due_date": doc.get("due_date"),
            'total_amount': grand_total,
            'outstanding_amount': outstanding_amount,
            'allocated_amount': outstanding_amount
        })

    pe.insert(ignore_permissions=True)
    # frappe.db.commit()

    return pe
