define([
	'./bag',
	'./obj',
	'./utils',
	'./emitter',
	'./exception',
	'nunjucks',
	'jquery',
], function(bag, obj, utils, Emitter, exception, nunjucks, jquery){
	'use strict';

	/**
	 * Global views config.
	 *
	 * @type {Bag} config
	*/
	var config = bag({
		env : {
			dev : false,
			autoescape : true,
			throwOnUndefined : false,
			trimBlocks : false,
			lstripBlocks : false
		},
		webLoader : {
			baseUrl : '/templates',
			useCache : false,
			async : false
		}
	});

/*-End config-*/

	/**
	 * Engine The view rendering engine.
	 *
	 * @class {Engine}
	*/
	class Engine
	{
		constructor(config={}){
			this.config = bag(config);
			this._env = null;
		}

		env(){
			if(!this._env)
				this._env = this.createEnvironment();
			return this._env;
		}

		render (templateName, context){
			return this.env().render(templateName, context);
		}

		renderString (template, context){
			return this.env().renderString(template, context);
		}

		createEnvironment (){
			var opts = obj.extend(true, {},
					config.get('env', {}),
					this.config.get('env', {})
				);
			return new nunjucks.Environment( this.createLoader(), opts);
		}

		createLoader (){
			var opts = obj.extend(true, {},
					config.get('webLoader', {}),
					this.config.get('webLoader', {})
				);

			var baseUrl = obj.pull(opts, 'baseUrl', '/templates');
			return new nunjucks.WebLoader(baseUrl, opts);
		}
	}

/*-End Engine-*/


	/**
	 * Generates unique view "ids" for each view instance which are used to identify
	 * rendered view elements.
	 *
	 * @class {ViewCounter}
	 */
	class ViewCounter
	{
		constructor (prefix = 'JayView_', padSize=-6){
			this._count = 0;
			this._padSize = -6;
			this._prefix = prefix;
		}

		next (){
			this._count += 1;
			return this._prefix+this._count.toString().pad('0', this._padSize);
		}
	}

/*-End ViewCounter-*/


	/**
	 * ViewRegistry Provides a public registry for view classes
	 *
	 * @class {ViewRegistry}
	 */
	class ViewRegistry extends bag.Bag
	{
		constructor(counter){
			super({});
			this.counter = counter;
		}

		register (cls, alias=null){
			var name = cls.name;
			var current = this.get(name);
			if(current && current !== cls)
				throw exception("Cannot redefine view "+name+".", 'DuplicateViewError');
			if(!current){
				this[name] = cls;
				cls.alias = name;
			}
			if(alias && alias !== name){
				this.alias(cls, alias);
			}
		}

		alias (cls, alias){
			var current = this.get(alias);
			if(current && current !== cls)
				throw exception("Cannot redefine view alias "+alias+".", 'DuplicateViewError');

			if(!current){
				this[alias] = cls;
				cls.alias = alias;
			}
		}

		getAlias (cls, fromInstance=false){
			if(fromInstance)
				cls = cls.__proto__.constructor;
			return cls.alias ? cls.alias : cls.name;
		}

		genId (cls, fromInstance=false){
			return this.counter.next();
		}
	}

	/**
	 * The view registry instance.
	 *
	 * @type {ViewRegistry} registry
	 */
	var registry = new ViewRegistry(new ViewCounter());

/*-End ViewRegistry-*/

	/**
	 * The base view class.
	 */
	class View
	{
		constructor (template=null, container=null)
		{
			this._name = registry.getAlias(this, true);
			this._id = registry.genId(this, true);
			this.engine = view.engine;
			this.template = template;
			this.append = false;
			this.prepend = false;
			this.container = container;
			this.renderCount = 0;
			this.static = {};
			this._domEvents = [];
			this._dirty = [];
			this.resetState();
			this._registerBaseEvents();
			this.events();
		}

		el (jQueryObject=false, target=""){
			target = target.length > 0 ? " "+target : target;
			var selector = this._name + '.'+this._id + target;
			return jQueryObject ? jquery(selector) : selector;
		}

		setEngine (engine){ this.engine = engine}

		initialState (){ return {}; }

		inDom (){ return this.el(true).length > 0; }

		isDirty (){ throw exception("Method isDirty", 'NotImplementedError'); }

		updateState (state){ this.state.update(state); }

		resetState (){ this.state = bag(this.initialState()); }

		on (events, target, callback){
			if(callback === undefined && utils.callable(target))
				this.listen(events, target);
			else
				this._addDomEvent(events, target, callback);
		}

		render (){
			this._render();
		}

		destroy (resetState){
			this.trigger('destroying', resetState);
			this._removeDomNodes();

			if(resetState)
				this.resetState();

			this.trigger('destroy', resetState);
		}

		events (){}

		_addDomEvent (events, selector, callback){
			var listener = {
				events : events,
				selector : selector,
				callback : callback,
				isBound : false
			};
			this._domEvents.push(listener);
		}

		_render (){
			this.trigger('rendering');
			if(this.inDom())
				this._updateDomNodes(this._compileTemplate());
			else
				this._createDomNodes(this._compileTemplate());
			this.renderCount += 1;
			this.trigger('render');
		}

		_compileTemplate (){
			return this.engine.render(this.template, this._getTemplateVars());
		}

		_getTemplateVars (){
			return obj.extend( true, {'this' : this}, this.static, this.state);
		}

		_createDomNodes (markup){
			this._removeDomNodes();
			markup = '<'+this._name+' class="'+this._id+'">'
						+markup+'</'+this._name+'>';
			var self = this;
			jquery(this.container).each(function(){
				if(self.append)
					jquery(this).append(markup);
				else if(self.prepend)
					jquery(this).prepend(markup);
				else
					jquery(this).html(markup);
			});
		}

		_updateDomNodes (markup){
			this.el(true).html(markup);
		}

		_removeDomNodes (){
			this.el(true).remove();
		}

		_registerBaseEvents (){
			var self = this;
			this.listen('render', function(){
				utils.forEach(self._domEvents, function(listener){
					if(listener.isBound)
						return;

					jquery(document).on(
						listener.events,
						self.el(false, listener.selector),
						listener.callback);

					listener.isBound = true;
				});
			});
		}
	}

	Emitter.mixin(View);

	View.register = function(alias=null){
		registry.register(this, alias);
	}

/*-End ViewRegistry-*/

	/**
	 * The default Engine instance.
	 *
	 * @type {Engine} _engine
	 */
	var _engine = null;

	/**
	 * Get the default Engine instance or create if not set.
	 *
	 * @return {Engine}
	 */
	function getEngine(){
		if(!_engine)
			_engine = new Engine();
		return _engine;
	}

	/**
	 * Create a view instance.
	 * Also the module's export.
	 *
	 * @return {View}
	 */
	function view(name/*, args */){
		var cls = registry.get(name);
		if(!cls)
			throw exception("View "+cls+" doesn't exist in registry.", "ViewNameError");

		var args = Array.prototype.slice.call(arguments, 1);
		args.unshift(cls);
		return new (cls.bind.apply(cls, args));
	}

	view.View = View;
	view.Engine = Engine;
	view.engine = function(config={}){
		return new Engine(config);
	}
	view.ViewRegistry = ViewRegistry;
	view.ViewCounter = ViewCounter;
	view._registry = registry;

	var engineProxyOpts = {
		lazy : true,
		methods : {
			render			: 'render',
			renderString	: 'renderString'
		}
	};

	utils.proxy(view, getEngine, engineProxyOpts);
	utils.proxy(view.engine, getEngine, engineProxyOpts);

	return view;

});