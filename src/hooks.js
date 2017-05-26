define([
	'./bag',
	'./obj',
	'./vow',
	'./utils',
	'./emitter',
], function(bag, obj, Vow, utils, Emitter) {
	'use strict';

	function getElementEventData(element, event)
	{
		var data = {};
		var attrPrefix = 'data-'+event.type.toLowerCase()+'-';
		for (var i = 0; i < element.attributes.length; i++) {
			var attr = element.attributes[i];
			if(!utils.startsWith(attr.nodeName, attrPrefix))
				continue;

			if(attr.nodeName.length === attrPrefix.length)
				continue;

			var key = utils.camelCase(attr.nodeName.substring(attrPrefix.length));
			data[key] = attr.nodeValue;
		}

		return data;
	}

	class Action
	{
		constructor(name, callback, deps)
		{
			this.name = name;
			this.hooks = null;
			this._callback = null;
			this._deps = utils.isArray(deps) ? deps : utils.toArray(deps);
			// this._loadedDeps = bag();
			// this._paramIndex = null;
			this._params = [];
			this._invokes = 0;
			this.callback(callback);

		}

		_invoke (hooks, data){
			if(!this._callback)
				throw "Error running action hook '"+this.name+"'. Callback not set.";

			this.hooks = hooks;
			var promise = new Vow();
			this._loadDeps(data, promise);
			return promise;
		}

		_loadDeps(data, promise) {
			if(!this._deps || this._deps.length == 0 || this._params.length == this._deps.length)
				return this._depsLoaded(data, promise);

			this._runDepsLoader(data, promise);
		}

		_runDepsLoader(data, promise) {
			var self = this;

			require(self._deps || [], function(){
				// var i = 0;
				// while(self._deps.length > 0){
				// 	self._deps.shift();
				// 	// self._loadDeps[self._deps.shift()] = arguments[i];
				// 	i +=1;
				// }

				self._params = Array.apply(null, arguments);
				self._depsLoaded(data, promise);
			});
		}

		_depsLoaded (data, promise){
			var response = this._callback.apply(this, utils.concat([data], this._params));
			promise.fulfil(response);
			this._invokes += 1;
			this.hooks = null;
		}

		callback (value){
			if(value && !utils.isFunction(value))
				throw "Invalid action hook callback '"+this.name+"'. Callback must be a function.";
			this._callback = value;
			return this;
		}

		deps (){
			for (var i = 0; i < arguments.length; i++) {
				this._deps = utils.concat(this._deps, arguments[i]);
			}
			return this
		}
	}

	var domEvents = ['click', 'dblclick', 'focus', 'change', 'blur', 'dragdrop'];

	class Hooks {

		constructor (namespace, events){
			this.actions = bag();
			this.wildCards = bag();
			this._current = [];
			this.namespace = namespace;
			this._domEvents = [];
			this._groupStack = [];
			this._bindDomEventsListeners(events || domEvents);
		}

		get groupData (){
			if(this._groupStack.length > 0)
				return utils.last(this._groupStack);
			return null;
		}

		_bindDomEventsListeners (events){

			/*
			// Vanila js version.
			var listener = this._getDomEventsListener();
			for (var i = 0; i < events.length; i++) {
				var event = events[i].toLowerCase();
				if(this._domEvents.indexOf(event) > -1)
					continue;
				document.addEventListener(event, listener, true);
				this._domEvents.push(event);
			}*/

			//With jQuery.
			var self = this;
			jQuery(function() {
				var listener = self._getJqueryEventsListener();
				var attrName = self.domAttributeName();
				for (var i = 0; i < events.length; i++) {
					var event = events[i].toLowerCase();

					if(self._domEvents.indexOf(event) > -1)
						continue;

					jQuery(document).on(event, '['+event+'-'+attrName+']', function (e) {
						console.warn('Hooks: Signature attribute `event-hook` is depreciated. Use `hook-click`. On:', this);
						return listener(e, this);
					});
					jQuery(document).on(event, '['+attrName+'-'+event+']', function (e) {
						return listener(e, this);
					});

					self._domEvents.push(event);
				}
			});
		}

		_getDomEventsListener (){
			var self = this;
			var attrName = this.domAttributeName();
			return function(e)
			{
				var target = e.target;
				if(!target.getAttribute)
					return;

				var action = target.getAttribute(e.type.toLowerCase()+'-'+attrName);
				if(action === null || action === '')
					return;

				self.runDomAction(action, getElementEventData(target, e));
			};
		}

		_getJqueryEventsListener (){
			var self = this;
			var attrName = this.domAttributeName();
			return function(e, element)
			{
				if(!element.getAttribute)
					return;

				var action = element.getAttribute(attrName +'-'+ e.type.toLowerCase());
				if(action === null || action === '')
					action = element.getAttribute(e.type.toLowerCase()+'-'+attrName);

				if(action === null || action === '')
					return;

				self.runDomAction(action, getElementEventData(element, e));
			};
		}

		addDomEvents (){
			this._bindDomEventsListeners(arguments);
		}

		domAttributeName (){
			return this.namespace ? 'hook-'+this.namespace : 'hook';
		}

		add (action, callback, deps){
			// if(action instanceof Array){
			// 	for (var i = 0; i < action.length; i++) {
			// 		this.add(action[i], callback);
			// 	}
			// }
			// else{
			if(action in this.actions)
				throw "DuplicateHookError: Hook "+action+" already defined.";
			action = this.createAction(action, callback, deps);
			return this.actions[action.name] = action;
			// }
			// return true;
		}

		has (action){
			return (action in this.actions);
		}

		replace(action, callback){
			this.remove(action, callback);
			return this.add(action, callback);
		}

		remove (action){
			if(action instanceof Array){
				var removed = [];
				for (var i = 0; i < action.length; i++) {
					if(this.remove(action[i], callback))
						removed.push(action[i]);
				}
				return removed;
			}
			else{
				if(!(action in this.actions))
					return false;

				delete this.actions[action];
				return true;
			}
		}

		createAction (name, callback, deps) {
			var grp = this.groupData;

			if(!utils.isArray(deps))
				deps = utils.toArray(deps);

			if(grp){
				if(grp.namespace)
					name = grp.namespace+'.'+utils.trimStart(name, '.');
				if(!callback && grp.callback)
					callback = grp.callback;

				if(grp.deps.length > 0)
					deps = utils.union(grp.deps, deps);
			}
			return new Action(name, callback, deps);
		}

		group (options, callback){
			this._updateGroupStack(options);
			callback(this);
			this._groupStack.pop();
		}

		_updateGroupStack (data){
			data = bag(data);
			if(!utils.isArray(data.deps))
				data.deps = utils.toArray(data.deps);

			data.default('deps', []);
			var old = this.groupData;
			if(old){
				if(old.namespace){
					if(data.namespace)
						data.namespace = old.namespace+'.'+utils.trim(data.namespace, '.');
					else
						data.namespace = old.namespace;
				}

				if(!data.callback && old.callback)
					data.callback = old.callback;

				if(old.deps.length > 0){
					data.deps = utils.union(old.deps, data.deps);
				}
			}
			this._groupStack.push(data);
		}

		current (all=false){
			if(all)
				return this._current;
			else if(this._current.length > 0)
				return this._current[this._current.length-1];
			else
				return null;
		}

		run (action, data){
			if(!(action in this.actions))
				throw "CallToUndefinedHook: Hook "+action+" not defined.";

			data = bag(data);
			this._current.push(action);
			this.trigger('before['+action+']', data, action);

			// var response = this.actions[action].call(null, data, action);
			var promise = this.actions[action]._invoke(this, data);
			promise.fulfilled(function(response){
				this.trigger('after['+action+']', data, response, action);
				this._current.pop();
			}.bind(this));

			return promise;
			// this.trigger('after['+action+']', data, response, action);
			// this._current.pop();
			// return response;
		}

		runDomAction (action, data){
			return this.run(action, data);
		}

		before (action, callback){
			if(action instanceof Array){
				for (var i = 0; i < action.length; i++) {
					this.before(action[i], callback);
				}
			}
			else{
				this.listen('before['+action+']', callback);
			}
			return true;
		}

		after (action, callback){
			if(action instanceof Array){
				for (var i = 0; i < action.length; i++) {
					this.after(action[i], callback);
				}
			}
			else{
				this.listen('after['+action+']', callback);
			}
			return true;
		}
	}

	Emitter.mixin(Hooks);

	var hooks = new Hooks();
	hooks.Hooks = Hooks;
	return hooks;
});