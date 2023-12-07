// Array.prototype.remove = function() {
//     var what, a = arguments, L = a.length, ax;
//     while (L && this.length) {
//         what = a[--L];
//         while ((ax = this.indexOf(what)) !== -1) {
//             this.splice(ax, 1);
//         }
//     }
//     return this;
// };

// if (window.location.pathname === "/invoices") {

//     var invoiceList = []
//     var  total_price = 0.0
//     var currency = ""



//     $(".result .web-list-item a .row").each(
//         function (index) {  
//             if(!$(this.children[0].children[0]).is(".green")){
//                 var price_currency = this.children[2].innerText.split(" ")
//                 currency = price_currency[0]
//                 var temp_price = this.children[2].innerText.replace(" ","")

//                 var final_price = temp_price.replace(currency,"")
//                 $(this).prepend($(`<input class='checkBox' item_price = '${final_price}' sales_invoice_name='${this.children[0].children[0].innerText.replace(" ","")}' type='checkbox'/>`))    
//             }else{
//                 $(this).prepend($(`<input class='checkBox' disabled='true' item_price = '${final_price}' sales_invoice_name='${this.children[0].children[0].innerText.replace(" ","")}' type='checkbox'/>`))
//             }
//          }
//     )
//     $(".result .web-list-item a .row .col-sm-3").addClass("col-sm")
//     $(".result .web-list-item a .row .col-sm-3").removeClass("col-sm-3")

//     $("main.container").append(`<div style="margin-top: 10px" ><Button disabled="true" class='pay_all_btn'>Pay ${currency} ${parseFloat(total_price).toFixed(2)}</Button></div>`)
//     $("main.container .pay_all_btn").css("width","100%")
//     $("main.container .pay_all_btn").addClass('btn btn-primary btn-sm')



//     $('.checkBox').on('click', function () {
//         var invoice_name =  $(this).attr('sales_invoice_name')
//         var price =  parseFloat($(this).attr('item_price'))

//         if(this.checked){
//             invoiceList.push(invoice_name)
//             total_price = total_price + price
//         }else{
//             invoiceList.remove(invoice_name)
//             total_price = total_price - price
//         }

//         if(invoiceList.length > 0){
//             $(".pay_all_btn").attr("disabled",false)
//         }else{
//             $(".pay_all_btn").attr("disabled",true)
//         }

//         $("main.container .pay_all_btn").text("Pay "+currency+" "+parseFloat(total_price).toFixed(2))




//     });



//     $(".pay_all_btn").on('click', function(){
//         frappe.call({
//             method: "global_app.doc_events.payment_entry.create_payment_entry",
//             args: {
//                 "args": invoiceList
//             },
//             async: false,
//             callback: function(r){
//                console.log(r.message)
//             }
//         })
//     })


// }


// if (window.location.pathname === "/all-products") {
// 	const queryString = window.location.search
// 	const urlParams = new URLSearchParams(queryString);
// 	const category_name = urlParams.get("categories")
// 	if (category_name) {
// 		const args = {
// 			category_name: category_name
// 		}
// 		frappe.call('enshop.api.item_filters.get_products_html_for_website_by_category_name', args)
// 			.then(r => {
// 				if(r.message){
// 					var html = r.message
// 					$($('.page_content').children()[2]).html(html);
// 				}else{
// 					$($('.page_content').children()[2]).html("<div></div>");
// 				}
// 			})
// 	}
// }


// $(() => {
// 	class ProductListing {
// 		constructor() {
// 			this.bind_filters();
// 			this.bind_search();
// 			this.restore_filters_state();
// 		}

// 		bind_filters() {
// 			this.field_filters = {};
// 			this.attribute_filters = {};

// 			$('.product-filter').on('change', frappe.utils.debounce((e) => {
// 				const $checkbox = $(e.target);
// 				const is_checked = $checkbox.is(':checked');

// 				if ($checkbox.is('.attribute-filter')) {
// 					const {
// 						attributeName: attribute_name,
// 						attributeValue: attribute_value
// 					} = $checkbox.data();

// 					if (is_checked) {
// 						this.attribute_filters[attribute_name] = this.attribute_filters[attribute_name] || [];
// 						this.attribute_filters[attribute_name].push(attribute_value);
// 					} else {
// 						this.attribute_filters[attribute_name] = this.attribute_filters[attribute_name] || [];
// 						this.attribute_filters[attribute_name] = this.attribute_filters[attribute_name].filter(v => v !== attribute_value);
// 					}

// 					if (this.attribute_filters[attribute_name].length === 0) {
// 						delete this.attribute_filters[attribute_name];
// 					}
// 				} else if ($checkbox.is('.field-filter')) {
// 					const {
// 						filterName: filter_name,
// 						filterValue: filter_value
// 					} = {
// 						filterName: "item_category",
// 						filterValue: "Liquor / Beer / Wine"
// 					}



// 					//('{"item_category":["Liquor / Beer / Wine"]}')

// 					if (is_checked) {
// 						this.field_filters[filter_name] = this.field_filters[filter_name] || [];
// 						this.field_filters[filter_name].push(filter_value);
// 					} else {
// 						this.field_filters[filter_name] = this.field_filters[filter_name] || [];
// 						this.field_filters[filter_name] = this.field_filters[filter_name].filter(v => v !== filter_value);
// 					}

// 					if (this.field_filters[filter_name].length === 0) {
// 						delete this.field_filters[filter_name];
// 					}
// 				}

// 				const query_string = get_query_string({
// 					field_filters: JSON.stringify(if_key_exists({ "item_category": ["Liquor / Beer / Wine"] })),
// 					attribute_filters: JSON.stringify(if_key_exists(this.attribute_filters)),
// 				});
			
// 				// window.history.pushState('filters', '', '/all-products?' + query_string);
// 				//
// 				$($('.page_content').children()[2]).prop('disabled', true);
// 				this.get_items_with_filters()
// 					.then(html => {
// 						$($('.page_content').children()[2]).html(html);

// 					})
// 					.then(data => {
// 						$('.page_content input').prop('disabled', false);
// 						return data;
// 					})
// 					.catch(() => {
// 						$('.page_content input').prop('disabled', false);
// 					});
// 			}, 1000));
// 		}

// 		make_filters() {

// 		}

// 		bind_search() {
// 			$('input[type=home-search]').on('keydown', (e) => {
// 				if (e.keyCode === 13) {
// 					// Enter
// 					console.log("ENTER")
// 					const value = e.target.value;
// 					if (value) {
// 						window.location.href = 'all-products?search=' + e.target.value;
// 					} else {
// 						window.location.search = '';
// 					}
// 				}
// 			});
// 		}

// 		restore_filters_state() {
// 			const filters = frappe.utils.get_query_params();
// 			let { field_filters, attribute_filters } = filters;

// 			if (field_filters) {
// 				field_filters = (JSON.parse('{"item_category":["Liquor / Beer / Wine"]}'))
// 				console.log(field_filters)

// 				for (let fieldname in field_filters) {
// 					const values = field_filters[fieldname];
// 					const selector = values.map(value => {
// 						return `input[data-filter-name="${fieldname}"][data-filter-value="${value}"]`;
// 					}).join(',');
// 					$(selector).prop('checked', true);
// 				}
// 				this.field_filters = field_filters;
// 				console.log(this.field_filters)
// 			}
// 			if (attribute_filters) {
// 				console.log(attribute_filters)
// 				attribute_filters = JSON.parse(attribute_filters);
// 				for (let attribute in attribute_filters) {
// 					const values = attribute_filters[attribute];
// 					const selector = values.map(value => {
// 						return `input[data-attribute-name="${attribute}"][data-attribute-value="${value}"]`;
// 					}).join(',');
// 					$(selector).prop('checked', true);
// 				}
// 				this.attribute_filters = attribute_filters;
// 			}
// 		}

// 		get_items_with_filters() {
// 			const { attribute_filters, field_filters } = this;
// 			const args = {
// 				field_filters: if_key_exists(field_filters),
// 				attribute_filters: if_key_exists(attribute_filters)
// 			};

// 			return new Promise((resolve, reject) => {
// 				frappe.call('erpnext.portal.product_configurator.utils.get_products_html_for_website', args)
// 					.then(r => {
// 						if (r.exc) reject(r.exc);
// 						else resolve(r.message);
// 					})
// 					.fail(reject);
// 			});
// 		}
// 	}

// 	new ProductListing();

// 	function get_query_string(object) {
// 		const url = new URLSearchParams();
// 		for (let key in object) {
// 			const value = object[key];
// 			if (value) {
// 				url.append(key, value);
// 			}
// 		}
// 		return url.toString();
// 	}

// 	function if_key_exists(obj) {
// 		let exists = false;
// 		for (let key in obj) {
// 			if (obj.hasOwnProperty(key) && obj[key]) {
// 				exists = true;
// 				break;
// 			}
// 		}
// 		return exists ? obj : undefined;
// 	}
// })
