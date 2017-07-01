define([
	'./utils',
	'./obj'
], function (utils, obj) {
	'use strict';

	var NOTHING = {};

	class Bag
	{
		constructor(items, missing, notation='.'){
	
			Object.defineProperty(this, '__missing__', {
				enumerable: false,
				configurable: false,
				writable: false,
				value: missing
			});

			Object.defineProperty(this, '__oO__', {
				enumerable: false,
				configurable: false,
				writable: true,
				value: new obj.Obj(notation)
			});

			if(items) this.update(items);
		}

		has (key){
			return this.__oO__.has(this, key);
		}

		get (key, _default){
			var rv = this.__oO__.get(this, key, _default);
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
			return this.__oO__.set(this, key, value, _default);
		}

		default (key, _default=null){
			var value = this.__oO__.get(this, key, NOTHING);
			if(value === NOTHING){
				value = _default;
				this.set(key, value);
			}
			return value;
		}

		defaults (defaults){
			this.__oO__.extend(true, this, defaults, this.copy(true));
		}

		forget (key){
			return this.__oO__.forget(this, key);
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
				this.__oO__.extend.apply(this.__oO__, items);
		}

		merge (/* , items... */){
			var cp = this.copy(true);
			cp.update.apply(cp, arguments);
			return cp;
		}

		each(callback){
			return this.__oO__.each(this, callback);
		}

		copy (deep=false){
			return new Bag(this.__oO__.copy(this, deep));
		}

		keys (){
			return this.__oO__.keys(this);
		}

		count (){
			return this.__oO__.count(this);
		}
	}

	var bag = function(items={}, missing){
		return new Bag(items, missing);
	}

	bag.Bag = Bag;
	return bag;
});