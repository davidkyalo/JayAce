/**
 * Module http.
 *
 * @class 		http.Http
 * @class 		http.Request
 * @class 		http.Response
 * @class 		http.Resource
 * @function	http.resource
 * @Bag 		http.config
 * @function	http
 * @method 		http.get
 * @method 		http.post
 * @method 		http.put
 * @method 		http.patch
 * @method 		http.delete
 */

define([
	'./bag',
	'./obj',
	'./utils',
	'./urls',
	'./vow',
	'jquery'
], function(bag, obj, utils, urls, Vow, jQuery){
	'use strict';

/***Global http config***/
	var config = bag({
		request : {
			options : {
				url     : '',
				method  : 'GET',
				data    : null,
			},
			transformers : [],
			interceptors : []
		},
		response : {
			transformers : [],
			interceptors : []
		},
	});

/***Class Response***/
	class Response
	{
		constructor(data, textStatus, xhr, request, config={}){
			this.data = data || {};
			this.status = { text: textStatus, code : xhr.status};
			this.xhr = xhr;
			this.request = request;
			this.config = bag(config);
			this.headers = {
				all : this.xhr.getAllResponseHeaders,
				get : this.xhr.getResponseHeader
			};
			this._isPrepared = false;
			this.prepare();
		}

		prepare (){
			if(this._isPrepared)
				return;

			this._runTransformers(this._getTransformers());

			this._runInterceptors(this._getInterceptors());

			this._isPrepared = true;
		}

		_getTransformers (){
			return config.get('response.transformers', [])
				.concat(this.config.get('transformers', []));
		}

		_runTransformers (transformers){
			utils.forEach(transformers, function(transformer){
				this.data = transformer(this.data, this);
			}.bind(this));
		}

		_getInterceptors (){
			return config.get('response.interceptors', [])
				.concat(this.config.get('transformers', []));
		}

		_runInterceptors (interceptors){
			utils.forEach(interceptors, function(interceptor){
				interceptor(this);
			}.bind(this));
		}
	}

/***Class Request***/
	class Request
	{
		constructor(options = {}, config={}, responseConfig={}){
			this.promise = new Vow();
			this._isPrepared = false;
			this.wasAborted = false;
			this.config = bag(config);
			this.responseConfig = responseConfig;
			this.options = options;
		}

		prepare (){
			if(this._isPrepared)
				return;

			this._setOptions();

			this.options.success = function(data, textStatus, xhr){
				this._success(data, textStatus, xhr);
			}.bind(this);

			this.options.error = function(xhr, textStatus){
				this._error(xhr, textStatus);
			}.bind(this);

			this._runTransformers(this._getTransformers());

			this._runInterceptors(this._getInterceptors());

			this._isPrepared = true;
		}

		_setOptions(){
			this.options = obj.extend(true, {},
					config.get('request.options', {}),
					this.config.get('options', {}),
					this.options);
		}

		_success (data, textStatus, xhr){
			var response = this.createResponse(data, textStatus, xhr);
			this.promise.fulfil(response.data, response);
		}

		_error (xhr, textStatus){
			var data = obj.get(xhr, 'responseJSON');
			var response = this.createResponse(data, textStatus, xhr);
			this.promise.reject(response);
		}

		createResponse (data, textStatus, xhr){
			var cls = this._responseClass();
			return new cls(data, textStatus, xhr, this.options, this.responseConfig);
		}

		_responseClass(){
			var cls = obj.get(this.responseConfig, 'class');
			if(!cls) cls = config.get('response.class');
			return cls ? cls : Response;
		}

		_getTransformers (){
			return config.get('request.transformers', [])
				.concat(this.config.get('transformers', []));
		}

		_getInterceptors (){
			return config.get('request.interceptors', [])
				.concat(this.config.get('transformers', []));
		}

		_runTransformers (transformers){
			utils.forEach(transformers, function(transformer){
				this.options.data = transformer(this.options.data, this);
			}.bind(this));
		}

		_runInterceptors (interceptors){
			utils.forEach(interceptors, function(interceptor){
				interceptor(this);
			}.bind(this));
		}

		send (){
			this.prepare();

			if(!this.wasAborted)
				jQuery.ajax(this.options);

			return this;
		}

		abort (){
			this.prepare();
			jQuery.ajax(this.options).abort();
			this.wasAborted = true;
			return this;
		}

		success (callback){
			this.promise.fulfilled(callback);
			return this;
		}

		error (callback){
			this.promise.broken(callback);
			return this;
		}

		finally (callback){
			this.promise.resolved(callback);
			return this;
		}

		then (){
			this.promise.then.apply(this.promise, arguments);
			return this;
		}
	}

/***Class Http***/
	class Http
	{
		constructor(config={}){
			this.config = bag(config);
		}

		request (url, method, data, options={}){
			options = options || {};
			options.url = url;
			options.method = method;
			if(data)
				options.data = data;

			var request = this.createRequest(options);
			request.send();

			return request;
		}

		createRequest (options={}){
			var cls = this._requestClass();
			return new cls(
					options,
					this.config.get('request', {}),
					this.config.get('response', {})
				);
		}

		_requestClass(){
			var cls = this.config.get('request.class');
			if(!cls) cls = config.get('request.class');
			return cls ? cls : Request;
		}

		get (url, options={}){
			return this.request(url, 'GET', null, options);
		}

		post (url, data, options={}){
			return this.request(url, 'POST', data, options);
		}

		put (url, data, options={}){
			return this.request(url, 'PUT', data, options);
		}

		patch (url, data, options={}){
			return this.request(url, 'PATCH', data, options);
		}

		delete (url, options={}){
			return this.request(url, 'DELETE', null, options);
		}
	}

/***Class Resource***/
	class Resource
	{
		constructor(config={}){
			this.config = bag(obj.extend(true, {
				url : '/:pk/',
				modelBuilder : null,
				primaryKeyField : 'id',
				displayName : {
					singular : 'item',
					plural : 'items'
				},
				envelopes : {
					response : {
						single : null,
						collection : null,
					},
					request : null //'data',
				},
				request : {
					dataType : 'json',
					contentType : 'application/json; charset=utf-8',
				},
				ajaxErrorMessages : {
					all : ["Error fetching [displayName.plural] from the server.", "Please reload the page and try again."],
					get : ["Error fetching [displayName.singular] from the server.", "Please reload the page and try again."],
					post : ["Error creating [displayName.singular].", "Please reload the page and try again."],
					put :["Error updating [displayName.singular].", "Please reload the page and try again."],
					patch :["Error updating [displayName.singular].", "Please reload the page and try again."],
					delete : ["Error deleting [displayName.singular]."," Please reload the page and try again."],
				},
				http : {}
			}, config));
			this.http = new Http(this.config.http);
		}

		requestOptions (options, method){
			options = obj.extend(true, {}, this.config.request, options || {});
			if('data' in options)
				options.data = this.prepareRequestData(options.data, method);
			return options;
		}

		getUrl (key, params, args){
			let url = this.config.url;
			if(key instanceof String){
				if(this.config.urls)
					url = this.config.urls[key];
			}
			else{
				args = params;
				params = key;
			}
			if(url instanceof urls.Url){
				url = url.copy();
				url.params.update(params || {});
				url.args.update(args || {});
				return url;
			}

			return urls.url(this.config.url, params, args);
		}

		promise (){
			var promise = new Vow();
			promise.error = function(callback){
				return promise.broken(function(status, data, response){
					if(status === 'error')
						return callback(data.message, data, response);
				});
			}
			promise.fail = function(callback){
				return promise.broken(function(status, data, response){
					if(status === 'fail')
						return callback(data.data, data, response);
				});
			}

			promise.otherwise = function(callback){
				return promise.broken(function(status, data, response){
					if(status === 'fail')
						return callback(data.data, data, response);
					else if(status === 'error')
						return callback(data.message, data, response);
					else
						return callback(status, data, response);
				});
			}

			return promise;
		}

		fetchResults (url, verb, options) {
			if(options && options.args)
				url.args.update(obj.pull(options, 'args'));

			var promise = this.promise();
			verb = verb.toUpperCase();
			this.http.request(url, verb, null, this.requestOptions(options, ( verb == 'GET' ? 'all' : verb.toLowerCase() )))
				.success(function(data, response){
					data = this.prepareResponseData(data, response, 'all', true);
					if(data.status === 'success'){
						data.data = this.parseCollectionResponse(data.data);
						return promise.fulfil(data.data, data, response);
					}
					else{
						return promise.reject(data.status, data, response);
					}
				}.bind(this))
				.error(function(response){
					return this.ajaxError(response, promise, 'all');
				}.bind(this));
			return promise;
		}

		fetchResult (url, verb, options) {
			if(options && options.args)
				url.args.update(obj.pull(options, 'args'));

			var promise = this.promise();
			var act = verb.toLowerCase();

			this.http.request(url, verb.toUpperCase(), null, this.requestOptions(options, act))
				.success(function(data, response){
					data = this.prepareResponseData(data, response, act, false);
					if(data.status === 'success'){
						data.data = this.parseSingleEntityResponse(data.data);
						return promise.fulfil(data.data, data, response);
					}
					else{
						return promise.reject(data.status, data, response);
					}
				}.bind(this))
				.error(function(response){
					return this.ajaxError(response, promise, act);
				}.bind(this));
			return promise;
		}

		sendData (url, verb, data, options){
			options = options || {};
			if(data)
				options.data = data;
			return this.fetchResult(url, verb, options);
		}

		all (options, urlparams, urlargs){
			// urlargs = urlargs || obj.pull(options, 'args');
			var url = this.getUrl(urlparams, urlargs);
			return this.fetchResults(url, 'GET', options);
			// var promise = this.promise();

			// this.http.get(url, this.requestOptions(options, 'all'))
			// 	.success(function(data, response){
			// 		data = this.prepareResponseData(data, response, 'all', true);
			// 		if(data.status === 'success'){
			// 			data.data = this.parseCollectionResponse(data.data);
			// 			return promise.fulfil(data.data, data, response);
			// 		}
			// 		else{
			// 			return promise.reject(data.status, data, response);
			// 		}
			// 	}.bind(this))
			// 	.error(function(response){
			// 		return this.ajaxError(response, promise, 'all');
			// 	}.bind(this));
			// return promise;
		}

		get (pk, options){
			var url = this.getUrl({pk : pk}, obj.pull(options, 'args'));
			var promise = this.promise();

			this.http.get(url, this.requestOptions(options, 'get'))
				.success(function(data, response){
					data = this.prepareResponseData(data, response, 'get', false);
					if(data.status === 'success'){
						data.data = this.parseSingleEntityResponse(data.data);
						return promise.fulfil(data.data, data, response);
					}
					else{
						return promise.reject(data.status, data, response);
					}
				}.bind(this))
				.error(function(response){
					return this.ajaxError(response, promise, 'get');
				}.bind(this));
			return promise;
		}

		post (entity, options){
			var url = this.getUrl(undefined, obj.pull(options, 'args'));
			var promise = this.promise();

			this.http.post(url,
				this.prepareRequestData(entity, 'post', url),
				this.requestOptions(options, 'post'))
				.success(function(data, response){
					data = this.prepareResponseData(data, response, 'post', false);
					if(data.status === 'success'){
						data.data = this.parseSingleEntityResponse(data.data);
						return promise.fulfil(data.data, data, response);
					}
					else{
						return promise.reject(data.status, data, response);
					}
				}.bind(this))
				.error(function(response){
					return this.ajaxError(response, promise, 'post');
				}.bind(this));
			return promise;
		}

		put (entity, options){
			var url = this.getUrl({pk:this.pk(entity)}, obj.pull(options, 'args'));
			var promise = this.promise();

			this.http.put(url,
				this.prepareRequestData(entity, 'put', url),
				this.requestOptions(options, 'put'))
				.success(function(data, response){
					data = this.prepareResponseData(data, response, 'put', false);
					if(data.status === 'success'){
						data.data = this.parseSingleEntityResponse(data.data);
						return promise.fulfil(data.data, data, response);
					}
					else{
						return promise.reject(data.status, data, response);
					}
				}.bind(this))
				.error(function(response){
					return this.ajaxError(response, promise, 'put');
				}.bind(this));
			return promise;
		}

		delete (pk, options){
			var params = pk instanceof Array ? undefined : { pk: pk };
			var url = this.getUrl(params, obj.pull(options, 'args'));
			var promise = this.promise();

			if(pk instanceof Array)
				options.data = pk;

			this.http.delete(url, this.requestOptions(options, 'delete'))
				.success(function(data, response){
					data = this.prepareResponseData(data, response, 'delete', false);
					if(data.status === 'success'){
						return promise.fulfil(data.data, data, response);
					}
					else{
						return promise.reject(data.status, data, response);
					}
				}.bind(this))
				.error(function(response){
					return this.ajaxError(response, promise, 'delete');
				}.bind(this));
			return promise;
		}

		create (entity, options){
			return this.post(entity, options);
		}

		update (entity, options){
			return this.put(entity, options);
		}

		save (entity, options){
			return this.entityExists(entity)
					? this.put(entity, options)
					: this.post(entity, options);
		}

		prepareRequestData (data, method, url){
			var envelope = this.config.envelopes.request;
			if(typeof(envelope) == 'object')
				envelope = obj.get(envelope, method);

			var result = {};

			if(method == 'all' || method == 'get' || method == 'delete'){
				// if(envelope)
				// 	result[envelope] = JSON.stringify(data);
				// else
					result = data;
			}
			else{
				if(envelope)
					result[envelope] = data;
				else
					result = data;
				result = JSON.stringify(result);
			}

			return result;
		}

		prepareResponseData (data, response, action, isCollection){
			return data;
		}

		parseCollectionResponse (data){
			var envelope = this.config.envelopes.response.collection;
			if(envelope){
				data[envelope] = this.createModels(data[envelope] || []);
			}else{
				data = this.createModels(data || []);
			}
			return data;
		}

		parseSingleEntityResponse (data){
			var envelope = this.config.envelopes.response.single;
			if(envelope){
				data[envelope] = this.createModel(data[envelope] || {});
			}else{
				data = this.createModel(data || {});
			}
			return data;
		}

		ajaxError (response, promise, action){
			return promise.reject(
					'error',
					this.getAjaxErrorData(response, action),
					response
				);
		}

		getAjaxErrorData (response, action){
			if(response.data && typeof(response.data) === 'object' && 'status' in response.data)
				return response.data;

			var data = {
				status : 'error',
				message : this.getAjaxErrorMessage(action, response),
				code : response.status.code,
			};

			data.data = response.data;
			response.data = data;

			return data;
		}

		getAjaxErrorMessage (action, response){
			var message = action in this.config.ajaxErrorMessages
							? this.config.ajaxErrorMessages[action]
							: "Something went wrong while processing your request. "
								+"Please reload the page and try again.";

			var singularName = this.config.displayName.singular;
			var pluralName = this.config.displayName.plural;
			if(typeof(message) === 'object'){
				var messages = [];
				utils.forEach(message, function(m){
					messages.push(m.replace('[displayName.plural]', pluralName)
						.replace('[displayName.singular]', singularName));
				});
				return messages;
			}
			else{
				message = message.replace('[displayName.plural]', pluralName)
							.replace('[displayName.singular]', singularName);
			}
			return message;
		}

		entityExists (entity){
			return this.pk(entity) != null;
		}

		pk (entity){
			return obj.get(entity, this.config.primaryKeyField, null);
		}

		createModel (entity){
			return this.config.modelBuilder ? this.config.modelBuilder(entity) : entity;
		}

		createModels (entities){
			var models = [];
			utils.forEach(entities, function(entity){
				models.push(this.createModel(entity));
			}.bind(this));
			return models;
		}
	}

	Resource.createProxy = function(options){
		options = obj.extend(true, {
			lazy : true,
			methods : {
				all : 'all',
				get : 'get',
				post : 'post',
				put : 'put',
				delete : 'delete',
				create : 'create',
				update : 'update',
				save : 'save',
			},
			properties : {
				config : 'config',
				http : 'http'
			}
		}, options || {});

		return utils.createProxy(this, options);
	}

/***Resource helper function***/
	function resource(config={}){
		return new Resource(config);
	}


/***The main module export***/
	var http = function(config={}){
		return new Http(config);
	}

	http.config = config;
	http.Http = Http;
	http.Request = Request;
	http.Response = Response;
	http.Resource = Resource;
	http.resource = resource;

	var _http = null;

	function getHttp(){
		if(!_http)
			_http = new Http();
		return _http;
	}

	return utils.proxy(http, getHttp, {
		lazy : true,
		methods : {
			'request'   : 'request',
			'get'       : 'get',
			'post'      : 'post',
			'put'       : 'put',
			'patch'     : 'patch',
			'delete'    : 'delete'
		}
	});

});