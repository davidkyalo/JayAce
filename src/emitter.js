define([
	'./obj'
], function(obj) {
	'use strict';

	class Emitter
	{
		listen (event, callback, once){
			if(event instanceof Array){
				for (var i = 0; i < event.length; i++) {
					this.listen(event[i], callback, once);
				}
				return true;
			}

			this._events = this._events || { once : {}, always : {} };

			if (!!(once)){
				this._events.once[event] = this._events.once[event] || [];
				this._events.once[event].push(callback);
			}else{
				this._events.always[event] = this._events.always[event] || [];
				this._events.always[event].push(callback);
			}

			return true;
		}

		listenOnce (event, callback) {
			return this.listen(event, callback, true);
		}

		removeListener (event, callback, once){
			if(!this._events)
				return false;

			if(event instanceof Array){
				var removed = [];
				for (var i = 0; i < event.length; i++) {
					if(this.removeListener(event[i], callback, once))
						removed.push(event[i]);
				}
				return removed;
			}

			if(once === undefined)
				return this.removeListener(event, callback, false) || this.removeListener(event, callback, true);

			if(once)
				return (event in this._events.once) && !!(this._events.once[event].splice(
						this._events.once[event].indexOf(callback), 1
					).length);
			else
				return (event in this._events.always) && !!(this._events.always[event].splice(
						this._events.always[event].indexOf(callback), 1
					).length);
		}

		trigger	(event /* , args... */){
			if(!this._events || !( (event in this._events.always) || (event in this._events.once) ))
				return;

			var args = Array.prototype.slice.call(arguments, 1);
			var context = this.__class__.__bindSenderToEmittedEvents__ ? this : undefined;
			if((event in this._events.once)){
				while (this._events.once[event].length > 0){
					this._events.once[event].shift().apply(context, args);
				}
			}
			if((event in this._events.always)){
				for(var i = 0; i < this._events.always[event].length; i++){
					this._events.always[event][i].apply(context, args);
				}
			}
		}
	}

	Emitter.__bindSenderToEmittedEvents__ = false;

	Emitter.mixin = function(target, methods, newThis){
		var methods = obj.extend({
			listen : 'listen',
			listenOnce : 'listenOnce',
			removeListener : 'removeListener',
			trigger : 'trigger',
		}, methods || {});

		newThis = newThis === undefined ? target : newThis;

		for(let key in methods){
			let name = methods[key];
			if(!name) continue;

			if(typeof target === 'function')
				target.prototype[name] = Emitter.prototype[key];
			else
				target[name] = Emitter.prototype[key].bind(newThis);
		}

		return target;
	}

	return Emitter;
});