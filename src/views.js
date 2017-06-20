define([
	'./bag',
	'./obj',
	'./urls',
	'./utils',
	'./emitter',
	'./exceptions',
	'nunjucks',
	'jquery',
], function(bag, obj, urls, utils, Emitter, exceptions, nunjucks, jQuery){
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
		loader : {
			webloader : false,
			baseUrl : '/templates',
			useCache : false,
			async : false
		}
	});

/*-End config-*/

	function getTemplateUrl(baseUrl, name){
		var url = urls.join(baseUrl, name);
		if(!utils.endsWith(url, '.html'))
			url += '.html';
		return url;
	}


	function makeWebLoader(){
		return nunjucks.WebLoader.extend({
			getSource: function(name, cb) {
				var useCache = this.useCache;
				var result;
				this.fetch(getTemplateUrl(this.baseURL, name), function(err, src) {
					if(err) {
						if(cb) {
							cb(err.content);
						} else {
							if (err.status === 404) {
								result = null;
							} else {
								throw err.content;
							}
						}
					}
					else {
						result = { src: src,
							path: name,
							noCache: !useCache };
							if(cb) {
								cb(null, result);
							}
					}
				});
				return result;
			},

		});
	}

	function makeFileSystemLoader(){
		var path = require('path');
		var fs = require('fs');
		return nunjucks.FileSystemLoader.extend({
			getSource: function(name) {
				if(path.extname(name) !== '.html')
					name += '.html';

				var fullpath = null;
				var paths = this.searchPaths;

				for(var i=0; i<paths.length; i++) {
					var basePath = path.resolve(paths[i]);
					var p = path.resolve(paths[i], name);

					// Only allow the current directory and anything
					// underneath it to be searched
					if(p.indexOf(basePath) === 0 && fs.existsSync(p)) {
						fullpath = p;
						break;
					}
				}

				if(!fullpath) {
					return null;
				}

				this.pathsToNames[fullpath] = name;

				return { src: fs.readFileSync(fullpath, 'utf-8'),
						path: fullpath,
						noCache: this.noCache };
			}

		});
	}
	var FileSystemLoader = makeFileSystemLoader();
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
					config.get('loader', {}),
					this.config.get('loader', {})
				);

			var baseUrl = obj.pull(opts, 'searchPaths', '/templates');
			// return new nunjucks.WebLoader(baseUrl, opts);
			return new FileSystemLoader(baseUrl, opts);
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
	class DuplicateViewError extends exceptions.KeyError
	{
		constructor (name, message, fileName, lineNumber){
			super('<'+name+'> '+(message || ""), fileName, lineNumber);
		}
	}

	class DuplicateViewAliasError extends DuplicateViewError
	{
		//
	}

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
				throw new DuplicateViewError(name);
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
				throw new DuplicateViewAliasError(alias);

			if(!current){
				this[alias] = cls;
				cls.alias = alias;
			}
		}

		getAlias (cls, fromInstance=false){
			if(fromInstance)
				cls = cls.__class__;
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
		constructor (template=null, container_selector=null)
		{
			this._name = registry.getAlias(this, true);
			this._id = registry.genId(this, true);
			this.engine = views.engine;
			this.template = template;
			this.append = false;
			this.prepend = false;
			this.container_selector = container_selector;
			this.renderCount = 0;
			this.static = {};
			this._state = null;
			this._domEvents = [];
			this._dirty = [];
			this.parentView = null;
			this.childViews = [];
			this._context = null;
			this._baseEvents();
			this.events();
		}

		get container (){
			return jQuery(this.container_selector);
		}

		get state (){
			if(!this._state)
				this.resetState();
			return this._state;
		}

		get context (){
			return this._getTemplateContext();
			// if(!this._context)
			// 	this._context = this._getTemplateContext();
			// return this._context;
		}

		get parent (){
			if(!this.parentView)
				return null;
			return this.parentView.context;
		}

		el (jqueryObject=false, target=""){
			throw new DepreciatedError(this.el, this.element, this);

			var selector = this.selector(target);
			return jqueryObject ? jQuery(selector) : selector;
		}

		element (target){
			return jQuery(this.selector(target));
		}

		selector (target) {
			var selector = this._name +'.'+this._id;
			return target ? selector+' '+target : selector;
		}

		setEngine (engine){ this.engine = engine}

		initialState (){ return {}; }

		inDom (){ return this.element().length > 0; }

		isDirty (){ throw new NotImplementedError(this.isDirty, this); }

		updateState (state){ this.state.update(state); }

		resetState (){ this._state = bag(this.initialState()); }

		resetContextData (){ this._context = null; }

		on (events, target, callback, once){
			if(!utils.callable(callback) && utils.callable(target))
				this.listen(events, target, callback);
			else
				this._addDomEvent(events, target, callback);
		}

		with (view, extendContext=true, container_selector=null){
			view._setParentView(this, extendContext, container_selector);
			this.childViews.push(view);
		}

		render (){
			this._render();
		}

		destroy (resetState){
			this.trigger('destroying', this, resetState);
			this._removeDomNodes();

			if(resetState)
				this.resetState();

			this.resetContextData();
			this._destroyChildViews(resetState);

			this.trigger('destroy', this, resetState);
		}

		events (){}

		_addDomEvent (events, selector, callback){
			var listener = {
				events : events,
				selector : selector,
				callback : callback,
				isBound : false,

			};
			this._domEvents.push(listener);
		}

		_render (){
			this.trigger('rendering', this);
			if(this.inDom()){
				this._updateDomNodes(this._compileTemplate());
			}
			else{
				this._createDomNodes(this._compileTemplate());
			}

			this._renderChildViews();
			this.renderCount += 1;
			this.trigger('render', this);
		}

		_compileTemplate (){
			return this.engine.render(this.template, this.context);
		}

		_getTemplateContext (){
			return obj.extend({self : this}, this.static, this.state);
		}

		_wrapMarkupWithSelfTag (markup){
			return '<'+this._name+' class="'+this._id+'">'
						+markup+'</'+this._name+'>';
		}

		_createDomNodes (markup){
			this._removeDomNodes();
			markup = this._wrapMarkupWithSelfTag(markup);
			if(this.append)
				this.container.append(markup);
			else if(this.prepend)
				this.container.prepend(markup);
			else
				this.container.html(markup);
		}

		_updateDomNodes (markup){
			this.element().html(markup);
		}

		_removeDomNodes (){
			this.element().remove();
		}

		_renderChildViews (){
			for (var i = 0; i < this.childViews.length; i++) {
				this.childViews[i].render();
			}
		}

		_destroyChildViews (resetState) {
			for (var i = 0; i < this.childViews.length; i++) {
				this.childViews[i].destroy(resetState);
			}
		}

		_setParentView (view, extendContext, container_selector) {
			this.parentView = view;
			if(container_selector || !this.container_selector){
				container_selector = container_selector || '[child-view="'+this._name+'"]';
				this.container_selector = view.selector(container_selector);
			}
		}

		_baseEvents (){
			var self = this;
			this.listen('render', function(){
				utils.forEach(self._domEvents, function(listener){
					if(listener.isBound)
						return;

					self.container.on(
						listener.events,
						self.selector(listener.selector),
						listener.callback);

					listener.isBound = true;
				});
			});
		}
	}

	Emitter.mixin(View);

	View.register = function(namespace=null, alias=null){
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

	var views = {};

	views.config = config;
	views.View = View;
	views.Engine = Engine;
	views.ViewRegistry = ViewRegistry;
	views.ViewCounter = ViewCounter;

	views.view = function(name/*, args */){
		var cls = registry.get(name);
		if(!cls)
			throw new KeyError("View "+cls+" doesn't exist in registry.", "ViewNameError");

		var args = Array.prototype.slice.call(arguments, 1);
		args.unshift(cls);
		return new (cls.bind.apply(cls, args));
	}

	views.engine = function(config={}){
		return new Engine(config);
	}

	views._registry = registry;

	var engineProxyOpts = {
		lazy : true,
		methods : {
			render			: 'render',
			renderString	: 'renderString'
		}
	};

	utils.proxy(views, getEngine, engineProxyOpts);
	utils.proxy(views.engine, getEngine, engineProxyOpts);

	return views;

});