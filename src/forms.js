define([
	'./utils',
	'jquery',
	'./obj',
	'./bag',
], function (utils, jQuery, obj, bag){
	'use strict';

	class Form
	{
		constructor(defaults={}, selector='form', inputSelector='input, textarea, select'){
			this.defaults = bag(defaults);
			this.data = bag(defaults);
			this.selector = selector;
			this.inputSelector = inputSelector;
		}

		get (name, _default){
			return this.data.get(name, _default);
		}

		update (data){
			this.data.update(data);
		}

		element (){
			return jQuery(this.selector);
		}

		inputs (target=null){
			if(target === null)
				return this.element().find(this.inputSelector);

			var selector = '';
			var parts = this.inputSelector.split(',');
			for (var i = 0; i < parts.length; i++) {
				selector += selector == ''
						? parts[i].trim() + target
						: ', '+ parts[i].trim() + target;
			}
			// return this.element().find(selector);
			return this.element().find(selector);
		}

		read (){
			this.data.update(this.getInputValues(this.inputs()));
			return this.data;
		}

		updateInputs(){
			this.setInputValues(this.inputs(), this.data);
		}

		reset (){
			this.resetData();
			this.resetInputs();
		}

		resetData (){
			this.data = bag(this.defaults);
		}

		resetInputs (){
			this.setInputValues(this.inputs(), this.defaults)
		}

		getInputValues (inputs, defa) {
			var data = {};
			var self = this;
			inputs.each(function(){
				var input = jQuery(this);
				var name = input.attr('name');
				var type = input.attr('type');
				var value;
				if(type == 'radio' || type == 'checkbox'){
					var selected = jQuery(self.selector +' input[name='+ name +']:checked');
					value = selected.length > 0 ? selected.val() : self.defaults.get(name);
				}
				else{
					value = input.val();
				}

				if(value === "" && self.defaults.get(name) === null)
					value = null;

				data[name] = value;
			});

			return data;
		}

		setInputValues (inputs, values) {
			var self = this;
			inputs.each(function(){
				var input = jQuery(this);
				var name = input.attr('name');

				if(!(name in values))
					return;

				var type = input.attr('type');
				if(type == 'radio' || type == 'checkbox'){
					var selector = 'input[name='+ name +'][value='+values[name]+']';
					jQuery(this.selector+' '+selector).prop('checked', true);
				}
				else{
					input.val(values[name]);
				}
			});
		}

		focus (name=null){
			var inputs = this.inputs(name ? `[name="${name}"]` : ':not([type="hidden"])');
			if(inputs.length > 0)
				inputs[0].focus();

			// if(name){
			// 	// var input = jQuery(this.selector +' input[name='+ name +'], '
			// 	// 		+ this.selector +' select[name='+ name +'], '
			// 	// 		+ this.selector +' textarea[name='+ name +']');
			// }else{
			// 	var inputs = this.inputs().not('input[type="hidden"]');
			// 	for (var i = 0; i < inputs.length; i++) {
			// 		var input = jQuery(inputs[i]);
			// 		if(input.attr('type') !== 'hidden')
			// 			break;
			// 	}
			// }
			// input.focus();
		}

	}

	return {
		Form : Form,
		form : function(data={}, selector='form', inputSelector='input, textarea, select'){
			return new Form(data, selector, inputSelector);
		}
	};
});