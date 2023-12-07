(function () {
  'use strict';

  frappe.templates['authorizenet_summary'] = '{% if ( stored_payment_label ) { %}   <div class="row">     <div class="col-sm-12 authorizenet_summary stored-payment">{{ stored_payment_label }}</div>   </div> {% } else { %}   <div class="row">     <div class="col-sm-6 authorizenet-summary name-on-card label">Name on Card</div>     <div class="col-sm-6 authorizenet-summary name-on-card value {%= card_info.name_on_card?"":"error" %}">    {%= card_info.name_on_card?card_info.name_on_card:"Missing" %}   </div>   </div>   <div class="row">     <div class="col-sm-6 authorizenet-summary card-number label">Card Number</div>     <div class="col-sm-6 authorizenet-summary card-number value {% if ( !card_info.card_number ) %}error{% } %}">    {% if ( !card_info.card_number ) { %}Missing{% } else { %}{%= card_info.card_number %}{% } %}   </div>   </div>  <div class="row">     <div class="col-sm-6 authorizenet-summary card-code label">Card Code</div>     <div class="col-sm-6 authorizenet-summary card-code value {% if ( !card_info.card_code ) %}error{% } %}">    {% if ( !card_info.card_code ) { %}Missing{% } else { %}{%= card_info.card_code %}{% } %}   </div>   </div>   <div class="row">     <div class="col-sm-6 authorizenet-summary card-exp label">Card Expires</div>     <div class="col-sm-6 authorizenet-summary card-exp value">{%= card_info.exp_month %}/{%= card_info.exp_year %}</div>   </div>   <div class="row">     <div class="col-sm-6 authorizenet-summary card-store label">Store Payment Information?</div>     <div class="col-sm-6 authorizenet-summary card-store value">{% if ( store_payments ) { %} YES {% } else { %} NO {% } %}</div>   </div>   {% if ( billing_info ) { %}   <div class="row">     <address class="col-sm-12">       {% if ( billing_info.address_1 ) { %}     {%= billing_info.title %}<br>         {%= billing_info.address_1 %}<br>         {% if ( billing_info.address_2 ) { %}           {%= billing_info.address_2 %}<br>         {% } %}         {%= billing_info.city %}, {%= billing_info.state %} {%= billing_info.postal_code %}<br>         {%= billing_info.country %}       {% } else { %}         Address is incomplete.       {% } %}     </address>   </div>   {% } %} {% } %} ';

  frappe.provide("frappe.integration_service");

  frappe.integration_service.authorizenet_gateway = Class.extend({
  	card_fields: {
  		"authorizenet_name": "name_on_card",
  		"authorizenet_number": "card_number",
  		"authorizenet_code": "card_code",
  		"authorizenet_exp_month": "exp_month",
  		"authorizenet_exp_year": "exp_year",
  		"authorizenet_store_payment": "store_payment",		
  	},
  	billing_fields:{
  		"authorizenet_bill_line1": "address",
  		"authorizenet_bill_city": "city",
  		"authorizenet_bill_state": "state",
  		"authorizenet_bill_pincode": "zip",
  		"authorizenet_bill_country": "country",
  		"auth_email":"auth_email"
  	},

  	init: function(addressForm, embedForm, selector) {
  		this.addressForm = addressForm;
  		this.selector = selector;
  	},

  	collect_billing_info: function() {
  		var billing_info = {};
  		// collect billing field value  
  		//if ( this.addressForm ) {
  			for(var field in this.billing_fields) {
  				var $field = $('#'+field);
  				billing_info[this.billing_fields[field]] = $field.val();
  				if ( billing_info[this.billing_fields[field]] !== undefined && typeof billing_info[this.billing_fields[field]] == "string" ) {
  					// no empty data allowed
  					billing_info[this.billing_fields[field]] = billing_info[this.billing_fields[field]].trim();
  				}
  			}
  			/*var result = this.addressForm.validate();
  			billing_info = $.extend({}, result.address);

  			if ( $('#authorizenet_zipcode').length > 0 ) {
  				billing_info["pincode"] = $('#authorizenet_zipcode').val();
  			}*/
  		//}

  		return billing_info;
  	},
  	collect_card_info: function() {
  		var card_info = {};

  		// check if store payment was selected
  		var stored_payment_option = $('input[name="authorizednet-stored-payment"]:checked').val();
  		if ( stored_payment_option !== undefined && stored_payment_option != "none" ) {
  			return null;
  		}

  		// collect card field values
  		for(var field in this.card_fields) {
  			var $field = $('#'+field);
  			if ( $field.attr('type') == 'checkbox' ) {
  				card_info[this.card_fields[field]] = $field.is('checked');
  			} else {
  				card_info[this.card_fields[field]] = $field.val();
  			}

  			// clean up string
  			if ( card_info[this.card_fields[field]] !== undefined && typeof card_info[this.card_fields[field]] == "string" ) {
  				// no empty data allowed
  				card_info[this.card_fields[field]] = card_info[this.card_fields[field]].trim();
  			}
  		}

  		return card_info;
  	},

  	collect_stored_payment_info: function() {
  		var $input = $('input[name="authorizednet-stored-payment"]:checked');
  		var auth_email=$('#auth_email').val();
  		var stored_payment_option = $input.val();
  		if ( stored_payment_option == "none"  || stored_payment_option == undefined) { 
  			return null; 
  		}else{       
  			var stored_payment=stored_payment_option.split("/");		
  			return {
  				"payment_id": stored_payment[0],
  				"address_name": $input.attr("data-address"),
  				"shipping_id":"",
  				"auth_email":auth_email,
  				"name_on_card":stored_payment[1]?stored_payment[1]:"",
  			}
  		}
  	},

  	form: function() {
  		var base = this;

  		// Handle removal of stored payments
  		$('.btn-stored-payment-remove').click(function() {
  			var stored_payment = $(this).attr('data-id');
  			var $input = $(this).closest('.field').find('input[name="authorizednet-stored-payment"]');
  			// sanity check, only allow removing on active selection
  			if ( !$input.is(':checked') ) {
  				return;
  			}

  			if ( confirm("Permanently remove stored payment?") ) {
  				$('input[name="authorizednet-stored-payment"][value="none"]').prop('checked', true);
  				$('input[name="authorizednet-stored-payment"][value="none"]').trigger('change');
  				$(this).closest('.field').remove();
  				return frappe.call({
  					method: 'frappe.client.delete',
  					args: {
  						doctype: "AuthorizeNet Stored Payment",
  						name: stored_payment
  					},
  					callback: function() {
  					}
  				});
  			}
  		});

  		// handle displaying manual payment information forms
  		$('input[name="authorizednet-stored-payment"]').change(function() {
  			if ( $(this).val() != 'none' ) {
  				$('#authorizenet-manual-info').slideUp('slow');
  			} else {
  				$('#authorizenet-manual-info').slideDown('slow');
  				$('#authorizenet-manual-info input:first').focus();
  			}
  		});

  		// initially copy all field values on checkbox change
  		$('#authorizenet_address_same_as').change(function() {
  			var addr_src = $(this).attr('data-source');
  			if ( $(this).is(':checked') ) {
  				$(addr_src).find('[data-type]').each(function() {
  					var name = $(this).attr('data-type');
  					var value = $(this).val();
  					$('.authorizenet-form .field [data-type="'+name+'"]').val(value);
  					$('.authorizenet-form .field [data-type="'+name+'"]').prop('disabled', true);
  					$('.authorizenet-form .field [data-type="'+name+'"]').closest('.field').addClass('disabled');
  				});
  			} else {
  				$('.authorizenet-form .field [data-type]').each(function() {
  					$(this).prop('disabled', false);
  					$(this).closest('.field').removeClass('disabled');
  				});
  			}
  		});

  		// then track all changes on source fields
  		if ( $('#authorizenet_address_same_as').length > 0 ) {
  			var addr_src = $('#authorizenet_address_same_as').attr('data-source');
  			$(addr_src).on('field-change', function(e, field) {
  				if ( $('#authorizenet_address_same_as').is(':checked') ) {
  					$('.authorizenet-form .field [data-type="'+field.name+'"]').val(field.value);
  					$('.authorizenet-form .field [data-type="'+field.name+'"]').prop('disabled', true);
  					$('.authorizenet-form .field [data-type="'+field.name+'"]').closest('.field').addClass('disabled');
  				}
  			});
  		}

  		$('.authorizenet-form .field').each(function() {
  			$(this).find('input, select').change(function() {
  				if ( base.selector ) {
  					base.selector.validate();
  				}
  			});
  		});

  		// handle smart placeholder labels
  		$('.authorizenet-form .field').each(function() {
  			var $field = $(this);
  			var $input = $(this).find('input:first, select:first');

  			$input
  				.change(function() {
  					if ( $(this).val() ) {
  						$field.addClass('hasvalue');
  					} else {
  						$field.removeClass('hasvalue');
  					}
  				})
  				.keyup(function() {
  					if ( $(this).val() ) {
  						$field.addClass('hasvalue');
  					} else {
  						$field.removeClass('hasvalue');
  					}
  				})
  				.blur(function() {
  					$field.removeClass('focus');
  				})
  				.focus(function() {
  					$field.addClass('focus');
  				});
  		});

  		var limit_digit_input = function(length) {
  			var value = $(this).val();
  			var clean = value.replace(/[^\d]/, "");
  			if ( clean.length > length ) {
  				clean = clean.substring(0, length);
  			}

  			if ( value != clean ) {
  				$(this).val(clean);
  			}
  		};

  		$('#authorizenet_exp_month').on("change keyup", function() {
  			limit_digit_input.bind(this)(2);
  		});

  		$('#authorizenet_exp_year').on("change keyup", function() {
  			limit_digit_input.bind(this)(4);
  		});

  		$('#authorizenet_code').on("change keyup", function() {
  			limit_digit_input.bind(this)(4);
  		});

  		$('.authorizenet-form [data-magic-month]').each(function() {
  			var $target = $($(this).attr('data-magic-month'));
  			var $month = $(this);

  			$target.change(function() {
  				var year = $target.find(":selected").val();
  				var today = new Date();

  				if ( year == today.getFullYear() ) {
  					var this_month = today.getMonth() + 1;
  					var selected_month = $month.find(":selected").attr("value");

  					$month.find("option").each(function() {
  						var value = parseInt($(this).attr("value"));
  						if ( value < this_month ) {
  							$(this).hide();
  						}
  					});

  					if ( selected_month < this_month ) {
  						var select = ("0"+this_month).slice(-2);
  						$month.val(select);
  						$month.change();
  					}
  				} else {
  					$month.find("option").show();
  				}
  			});

  			$target.change();
  		});

  	},//	method: "authorizenet.templates.pages.integrations.authorizenet_checkout.test_function",
  			
  	/*process_test:function(reference_docname){
  		frappe.call({    
  			method: "authorizenet.utils.get_line_items",
  			freeze: 1,
  			freeze_message: "Processing Order. Please Wait...",
  			args: {
  				'reference_doctype':'Payment Request',
  				'reference_docname':'PR00026-3'
  			},
  			callback:function(r){  
  				console.log(r.message)
  			}
  		})	                                                        
  	},*/
  	process_card: function(card_info, billing_info, stored_payment_options, request_name, callback) {
  		this._process({
  			card_info: card_info,
  			billing_info: billing_info,
  			authorizenet_profile: stored_payment_options
  		}, request_name, callback);
  	},  
  	_process: function(data, request_name, callback) {
  		frappe.call({
  			method: "authorizenet.authorizenet.doctype.authorizenet_settings.authorizenet_settings.process",
  			freeze: 1,
  			freeze_message: "Processing Order. Please Wait...",
  			args: {
  				options: data,
  				request_name: request_name
  			},
  			callback:function(r){  
  				console.log(r);
  			}
  		})
  		.done(function(data, textStatus, xhr) {
  			if(typeof data === "string") { data = JSON.parse(data); }
  			var status = xhr.statusCode().status;

  			var result = data;
  			if ( result.message.status == "Completed" ) {
  				callback(null, result.message);
  			} else {
  				var errors = [];
  				if ( result.message.error.constructor != Array ) {
  					errors.push(result.message.error);
  				} else {
  					errors = result.message.error;
  				}

  				callback({
  					errors: errors,
  					status: status,
  					recoverable: result.recoverable || false,
  					xhr: xhr,
  					textStatus: textStatus
  				}, null);
  			}
  		})
  		.fail(function(xhr, textStatus) {
  			if(typeof data === "string") { data = JSON.parse(data); }
  			var status = xhr.statusCode().status;
  			var errors = [];
  			var _server_messages = null;
  			if (xhr.responseJSON && xhr.responseJSON._server_messages) {
  				try {
  					_server_messages = JSON.parse(xhr.responseJSON._server_messages);
  				} catch(ex) {
  					errors.push(ex);
  					_server_messages = [xhr.responseJSON._server_messages];
  				}
  			}

  			var errors = [];
  			if ( _server_messages && _server_messages.constructor == Array ) {
  				try {
  					for(var i = 0; i < _server_messages.length; i++) {
  						var msg;
  						try {
  							msg = JSON.parse(_server_messages[i]);
  							if ( msg.message ) {
  								msg = msg.message;
  							}
  						} catch(ex) {
  							msg = ex;
  						}
  						errors.push("Server Error: " + msg);
  					}
  				} catch(ex) {
  					errors.push(_server_messages);
  					errors.push(ex);
  				}
  			}else if ( _server_messages && _server_messages.exc ) {
  				errors.push(_server_messages.exc);
  			}

  			callback({
  				errors: errors,
  				status: status,
  				recoverable: 0,
  				xhr: xhr,
  				textStatus: textStatus
  			}, null);
  		});

  	},

  	/**
  	 * Collects all authnet fields necessary to process payment
  	 */
  	collect: function() {
  		var billing_info = this.collect_billing_info();
  		var card_info = this.collect_card_info();
  		var stored_payment_options = this.collect_stored_payment_info();
  		this.process_data = {
  			card_info: card_info,
  			billing_info: billing_info,
  			authorizenet_profile: stored_payment_options
  		};
  	},

  	validate: function() {
  		this.collect();
  		//TODO: Validate fields
  		var valid = true;
  		var error = {};
  		var address = {};

  		// stored payment path
  		if ( this.process_data.authorizenet_profile &&
  				 this.process_data.authorizenet_profile.payment_id ) {
  			valid = true;
  			address["address"] = this.process_data.authorizenet_profile.address_name;
  		} else {
  			// manual entry path
  			if ( !this.process_data.card_info.name_on_card ) {
  				valid = false;
  				error['authorizenet_name'] = "Credit Card Name is required";
  			}

  			if ( !this.process_data.card_info.card_number ) {
  				valid = false;
  				error['authorizenet_number'] = "Credit Card Number is required";
  			}

  			if ( !this.process_data.card_info.card_code ) {
  				valid = false;
  				error['authorizenet_code'] = "Security Code is required";
  			}

  			if ( !this.process_data.card_info.exp_month ) {
  				valid = false;
  				error['authorizenet_exp_month'] = "Exp Month is required";
  			}

  			if ( !this.process_data.card_info.exp_year ) {
  				valid = false;
  				error['authorizenet_exp_year'] = "Exp Year is required";
  			}

  			if ( this.selector.is_backend ) {
  				if ( !this.process_data.billing_info.pincode ) {
  					valid = false;
  					error['authorizenet_bill_pincode'] = "Postal Code is required";
  				}
  			}

  			if ( this.process_data.billing_info && !this.selector.is_backend ) {
  				if ( !this.process_data.billing_info.address_1 ) {
  					valid = false;
  					error['authorizenet_bill_line1'] = "Address line 1 is required";
  				}

  				if ( !this.process_data.billing_info.city ) {
  					valid = false;
  					error['authorizenet_bill_city'] = "City is required";
  				}

  				if ( !this.process_data.billing_info.pincode ) {
  					valid = false;
  					error['authorizenet_bill_pincode'] = "Postal Code is required";
  				}

  				if ( !this.process_data.billing_info.country ) {
  					valid = false;
  					error['authorizenet_bill_country'] = "Postal Code is required";
  				}

  				// copy address for awc
  				for(var key in this.process_data.billing_info) {
  					address[key] = this.process_data.billing_info[key];
  				}
  			} else if ( !this.selector.is_backend ) {
  				valid = false;
  			}
  		} // eof-manual entry path

  		return {
  			valid: valid,
  			errors: error,
  			address: address
  		}
  	}

  });

  frappe.provide("frappe.gateway_selector");

  frappe.gateway_selector.authorizenet_embed =  frappe.integration_service.authorizenet_gateway.extend({
    _initialized: false,

    /**
     * Called when the form is displayed
     */
    show: function() {
      if ( !this._initialized ) {
        this.form('');
      }

      $('#gateway-selector-continue').text("Submit Payment");
    },

    /**
     * Called when the form is hidden
     */
    hide: function() {
      // form was hidden
    },

    /**
     * Process card. Requires a callback function of the form (err, data).
     *
     * When err is not undefined, the payment processing failed. Err should have
     * information about the error.
     *
     * When data is not undefined, the payment processing was successful. Data
     * should return an object of the form:
     * {
     *    redirect_to: <success url>,
     *    status: <status string from Integration Request doctype>
     * }
     */
    process: function(overrides, callback) {
      var data = Object.assign({}, this.process_data, overrides);
      this._process(data, null, callback);
    },

    getSummary: function() {
      this.collect();

      var stored_payment_label = false;
      if ( this.process_data.authorizenet_profile && this.process_data.authorizenet_profile.payment_id ) {
        stored_payment_label = $('input[name="authorizednet-stored-payment"]:checked').siblings('.long-text').html();
      }

      return frappe.render(frappe.templates.authorizenet_summary, Object.assign({
          store_payments: $('#authorizenet_store_payment').is(':checked'),
          stored_payment_label: stored_payment_label
        }, this.process_data));
    }

  });

}());
//# sourceMappingURL=authorizenet_embed.js.map
