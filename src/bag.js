define([
	'./utils',
	'./obj'
], function (utils, obj) {
	'use strict';

	var NOTHING = {};

	class Bag
	{
		constructor(items, missing){
			if(items) this.update(items);

			Object.defineProperty(this, '__missing__', {
				enumerable: false,
				configurable: false,
				writable: false,
				value: missing
			});
		}

		has (key){
			return obj.has(this, key);
		}

		get (key, _default){
			var rv = obj.get(this, key, _default);
			if(rv === undefined && this.__missing__){
				rv = this.__missing__(this, key);
				if(rv !== undefined)
					this.set(key, rv);
			}
			return rv;
		}

		pull (key, _default){
			var value = this.get(key, NOTHING);
			if(value === NOTHING)
				return _default;

			this.forget(key);
			return value;
		}

		set (key, value, _default){
			return obj.set(this, key, value, _default);
		}

		default (key, _default=null){
			var value = obj.get(this, key, NOTHING);
			if(value === NOTHING){
				value = _default;
				this.set(key, value);
			}
			return value;
		}

		defaults (defaults){
			obj.extend(true, this, defaults, this.copy(true));
		}

		forget (key){
			return obj.forget(this, key);
		}

		remove (keys){
			return this.forget(key);
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

	var bag = function(items={}, missing){
		return new Bag(items, missing);
	}

	bag.Bag = Bag;
	return bag;
});