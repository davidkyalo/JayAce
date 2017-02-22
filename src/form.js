define([
	'./utils',
	'jquery',
	'./obj'
], function (utils, jquery, obj){
	'use strict';

	class Form
	{
		constructor(selector, inputSelector=null, defaults={}){
			this.selector = selector;
			if(typeof(inputSelector) === 'object'){
				this.defaults = inputSelector;
				this.inputSelector = 'input, textarea, select';
			}
			else{
				this.inputSelector = inputSelector || 'input, textarea, select';
				this.defaults = defaults;
			}
		}

		el (){ return jquery(this.selector); }

		inputs (target=null){
			if(target === null)
				return this.el().find(this.inputSelector);
			var selector = '';
			var parts = this.inputSelector.split(',');
			for (var i = 0; i < parts.length; i++) {
				selector += selector == ''
						? parts[i] + ' ' + target
						: ', '+ parts[i] + ' ' + target;
			}
			return this.el().find(selector);
		}

		data (defaults={}){	return this.jsonify(this.inputs(), defaults); }

		focus (name=null){
			if( name != null ){
				var input = jquery(this.selector +' input[name='+ name +'], '
						+ this.selector +' select[name='+ name +'], '
						+ this.selector +' textarea[name='+ name +']');
			}else{
				var inputs = this.inputs();
				for (var i = 0; i < inputs.length; i++) {
					var input = jquery(inputs[i]);
					if(input.attr('type') !== 'hidden')
						break;
				}
			}
			input.focus();
		}

		jsonify (inputs, defaults={}) {
			var data = {};
			defaults = obj.extend(true, {}, this.defaults, defaults);
			var self = this;
			inputs.each(function(){
				var name = jquery(this).attr('name');
				var type = jquery(this).attr('type');
				var value = jquery(this).val();

				if(type == 'radio' || type == 'checkbox'){
					var selected = jquery(self.selector +' input[type='+ type +'][name='+ name +']:checked');
					value = selected.length > 0 ? selected.val() : obj.get(defaults, name, null);
				}

				if(value === "" && name in defaults)
					value = defaults[name];

				data[name] = value;
			});
			return obj.extend(true, defaults, data);
		}
	}

	var form = function(selector, inputSelector=null, defaults={}){
		return new Form(selector, inputSelector, defaults);
	}

	form.Form = Form;
	return form;
});