define([
	'./utils',
	'./obj'
], function (utils, obj) {
	'use strict';

	class Bag
	{
		constructor(items){
			if(items)
				this.update(items);
		}

		has (key){
			return obj.has(this, key);
		}

		get (key, _default){
			return obj.get(this, key, _default);
		}

		pull (key, _default){
			return obj.pull(this, key, _default);
		}

		set (key, value, _default){
			return obj.set(this, key, value, _default);
		}

		default (key, _default=null){
			var value = this.get(key);
			if(value !== undefined)
				return value;

			value = utils.value(_default);
			this.set(key, value);
			return value;
		}

		defaults (defaults){
			obj.extend(true, this, defaults, this.copy(true));
		}

		update (/* , items... */){
			var items = [true, this];

			for (var i = 0; i < arguments.length; i++) {
				if(arguments[i])
					items.push(arguments[i]);
			}

			if(items.length > 2)
				obj.extend.apply(obj, items);
		}

		merge (/* , items... */){
			var cp = this.copy(true);
			cp.update.apply(cp, arguments);
			return cp;
		}

		each(callback){
			return obj.each(this, callback);
		}

		copy (deep=false){
			return new Bag(obj.copy(this, deep));
		}

		keys (){
			return obj.keys(this);
		}

		count (){
			return obj.count(this);
		}
	}

	var bag = function(items={}){
		return new Bag(items);
	}

	bag.Bag = Bag;
	return bag;
});