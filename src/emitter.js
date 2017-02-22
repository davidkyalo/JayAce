define([
	'./utils'
], function(utils) {
	'use strict';

	class Emitter
	{
		listen (events, func){
			var self = this;
			self._events = self._events || {};
			utils.forEach(events.split(' '), function(event){
				self._events[event] = self._events[event] || [];
				self._events[event].push(func);
			});
		}

		removeListener (events, func){
			var self = this;
			self._events = self._events || {};
			utils.forEach(events.split(' '), function(event){
				if(event in self._events === false)
					return;
				self._events[event].splice(self._events[event].indexOf(func), 1);
			});
		}

		trigger	(event /* , args... */){
			var self = this;
			self._events = self._events || {};
			if(event in self._events){
				var args = Array.prototype.slice.call(arguments, 1);
				for(var i = 0; i < self._events[event].length; i++){
					self._events[event][i].apply(self, args);
				}
			}
		}
	}

	Emitter.mixin = function(destObject, methods){
		var props	= ['listen', 'removeListener', 'trigger'];
		methods = methods || {};
		for(var i = 0; i < props.length; i ++){
			var name = props[i] in methods ? methods[props[i]] : props[i];
			if( typeof destObject === 'function' ){
				destObject.prototype[name] = Emitter.prototype[props[i]];
			}else{
				destObject[name] = Emitter.prototype[props[i]];
			}
		}
		return destObject;
	}

	return Emitter;
});