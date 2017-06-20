define([
	'./utils',
	'jquery'
], function(utils, jQuery) {
	'use strict';

	class Obj
	{
		constructor(notation = '.'){
			this.notation = notation;
		}

		has (object, key){

			if(!object || key === null || key == "")
				return false;

			if(key in object)
				return true;

			var segments = this.splitKey(key);
			var target = object;
			for (var i = 0; i < segments.length; i++) {
				if(!(segments[i] in target))
					return false;
				target = target[segments[i]];
			}
			return true;
		}

		forget (object, keys){
			if(!object)
				return object;

			var original = object;

			if(!(keys instanceof Array)){
				keys = [keys];
			}

			var skip = false;
			for (var i = 0; i < keys.length; i++) {
				if(keys[i] in object){
					delete object[keys[i]];
					continue;
				}

				skip = false;

				object = original;

				var parts = this.splitKey(keys[i]);

				while(parts.length > 1){
					var part = parts.shift();

					if(part in object){
						object = object[part];
					}
					else{
						skip = true;
						break;
					}
				}

				if(skip) continue;

				delete object[parts.shift()];
			}
			return object;
		}

		get (object, key, _default){
			if(!object)
				return _default; //utils.value(_default);

			if(key === null || key === "")
				return object;

			if(key in object)
				return object[key];

			var segments = this.splitKey(key);
			var target = object;
			for (var i = 0; i < segments.length; i++) {
				if(typeof(target) !== 'object' || !(segments[i] in target))
					return _default; // utils.value(_default);

				target = target[segments[i]];
			}

			return target;
		}

		pull (object, key, _default){
			var value = this.get(object, key, _default);
			this.forget(object, key);
			return value;
		}

		set (object, key, value, _default){
			if(key === null)
				return object = value;
			var parts = this.splitKey(key);
			var target = object;
			while(parts.length > 1){
				var part = parts.shift();
				if(!(part in target) || typeof(target[part]) !== 'object'){
					target[part] = !_default ? {} : _default(part, target);
				}
				target = target[part];
			}
			target[parts.shift()] = value;
			return object;
		}

		each (object, callback){
			throw new BadMethodCallError('This method is not working as expected.');
			var keys = this.keys(object);
			for (var i = 0; i < keys.length; i++) {
				if(callback(keys[i], object[keys[i]], object) === false)
					break;
			}
			return object;
		}

		copy (object, deep=false, target=undefined){
			target = target === undefined ? {} : target;
			if(deep)
				return jQuery.extend(true, target, object);
			else
				return jQuery.extend(target, object);
		}

		// extend (){ return jQuery.extend.apply(null, arguments);	}

		keys (object){ return utils.keys(object); }

		count (object){	return this.keys(object).length; }

		splitKey (key){ return new String(key).split(this.notation); }
	}

	Obj.prototype.each = utils.each;
	Obj.prototype.extend = jQuery.prototype.extend;

	var obj = new Obj();
	obj.Obj = Obj;
	return obj;
});
