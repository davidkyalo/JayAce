define([
	'jquery',
	'lodash'
], function(jquery, lodash) {
	'use strict';

	lodash.paramNames = function(func){
		return func.toString()
			.replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg,'')
			.match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m)[1]
			.split(/,/);
	}

	lodash.callable = callable;
	function callable(thing){
		return (thing instanceof Function);
	}

	lodash.copy = copy;
	function copy(object, deep){
		return jquery.extend(deep, {}, object);
	}

	lodash.value = value;
	function value(value /* , args... */){
		if(value && callable(value))
			return value.apply(null, Array.prototype.slice.call(arguments, 1));
		return value;
	}

	function proxy(target, source, options={}){
		options = jquery.extend(true, {
			lazy : true,
			methods : {},
			properties : {}
		}, options);

		lodash.forEach(options.methods, function(method, name){
			target[name] = function(){
				var instance = options.lazy ? source() : source;
				return instance[method].apply(instance, arguments);
			};
		});

		return target;
	}

	lodash.proxy = proxy;

	return lodash;
});
