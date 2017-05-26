define([
	'jQuery',
	'lodash',
], function(jQuery, lodash) {
	'use strict';

	lodash.paramNames = function(func){
		return func.toString()
			.replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg,'')
			.match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m)[1]
			.split(/,/);
	}

	lodash.callable = callable;
	function callable(thing){
		return lodash.isFunction(thing);
		// return (thing instanceof Function);
	}

	lodash.copy = copy;
	function copy(object, deep){
		return jQuery.extend(deep, {}, object);
	}

	lodash.value = value;
	function value(value /* , args... */){
		if(value && callable(value))
			return value.apply(null, Array.prototype.slice.call(arguments, 1));
		return value;
	}

	lodash.proxy = proxy;
	function proxy(target, source, options={}){
		if(target === null)
			return createProxy(source, options);

		options = jQuery.extend(true, {
			lazy : true,
			methods : {},
			properties : {}
		}, options);

		var resolve = function(){
			var instance = options.lazy ? source() : source;
			return instance;
		}

		lodash.forEach(options.methods, function(method, name){
			target[name] = function(){
				var instance = resolve();
				return instance[method].apply(instance, arguments);
			};
		});

		lodash.forEach(options.properties, function(key, name){
			Object.defineProperty(target, name, {
				get : function(){
					var instance = resolve();
					return instance[key];
				},
				set : function(value){
					var instance = resolve();
					instance[key] = value;
					return true;
				},
				configurable : true,
				enumerable : true
			});
		});

		return target;
	}

	lodash.createProxy = createProxy;
	function createProxy(cls, options){

		var source = function(){
			if(!cls.__proxy_instance__)
				cls.__proxy_instance__ = new cls();
			return cls.__proxy_instance__;
		};

		var target = function(){
			return source();
		};

		target[cls.name] = cls;

		return proxy(target, source, options);
	}

	lodash.slugify = slugify;
	var reSlug = /[^-a-zA-Z0-9_]+/g;
	function slugify(value, sep){
		sep = sep || '-';
		value = new String(value);
		return value.trim().replace(reSlug, sep).toLowerCase();
	}

	return lodash;
});
