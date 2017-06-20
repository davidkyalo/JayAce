define([
	'./utils',
	'./obj',
	'./bag'
], function(utils, obj, bag){
	'use strict';

	var mod = {};

	// var reNamedParams = /:\??[A-Za-z0-9_]+;?/g;
	var reNamedParams = /(\{([A-Za-z0-9_]+)\})/g;
	var reOptionalNamedParams = /(\(\?([^\{]*)\{([A-Za-z0-9_]+)\}([^\)\(]*)(?:\)+)?)/g;

	mod.config = bag({ baseUrl : '/', strict : true });

	mod.absolute = absolute;
	function absolute(url, base){
		if(!base)
			base = '/'; //self.config.url;

		if(utils.startsWith(url, 'http') || utils.startsWith(url, '//')){
			return url;
		}
		else if(utils.startsWith(url, '/')) {
			if(url.split('?')[0].length > 1)
				return url;
		}

		return join(base, url);
	}

	mod.join = join;
	function join(){
		var url = arguments[0];

		utils.forEach(utils.tail(arguments), function(value){
			if(utils.endsWith(url, '/') && utils.startsWith(value, '/')){
				value = value.substring(1);
			}
			var slash = '/';
			if(utils.endsWith(url, '/') || utils.startsWith(value, '/')){
				slash = '';
			}
			url += slash + value;
		});
		return url;
	}

	mod.encode = encode;
	function encode(uri){
		return encodeURIComponent(uri);
	}

	mod.parse = parse;
	function parse(rule, params, args){
		rule = rule || '';
		params = params || {};
		args = args || {};
		var url = rule;

		var matchedParams = [];
		var matches = null;
		while(matches = reOptionalNamedParams.exec(url))
			matchedParams.push(matches);

		utils.forEach(matchedParams, function(match){
			if((match[3] in params) && params[match[3]] !== undefined){
				url = url.replace(match[1], match[2]+params[match[3]]+match[4]);
			}
			else{
				url = url.replace(match[1], '');
			}
		});

		matchedParams = [];

		while(matches = reNamedParams.exec(url))
			matchedParams.push(matches);

		utils.forEach(matchedParams, function(match){
			if(match[2] in params){
				url = url.replace(match[1], params[match[2]]);
			}
			else{
				throw "[Urls.parse] Missing url param key ("+ match[2] +") for :"+rule;
				url = url.replace(match[1], '');
			}
		});

		var argStr = '';
		utils.forEach(args, function(value, arg){
			arg = encode(arg);
			if(value instanceof Array){
				value.forEach(function(v, i){
					v = encode(v)
					argStr += argStr == '' ? `?${arg}[]=${v}` : `&${arg}[]=${v}`;
				});
			}
			else{
				value = encode(value);			
				argStr += argStr == '' ? '?'+arg+'='+value : '&'+arg+'='+value;
			}
			
		});
		return url + argStr;
	}

	class Url
	{
		constructor(base='/', rule='', params={}, args={}){
			this.base = base;
			this.rule = rule;
			this.params = bag(params);
			this.args = bag(args);
		}

		append (rule='', params={}, args={}){
			this.rule = join(this.rule, rule || '');
			this.params.update(params);
			this.args.update(args);
		}

		prepend (rule='', params={}, args={}){
			this.rule = join(rule || '', this.rule);
			this.params.update(params);
			this.args.update(args);
		}

		extend (){
			utils.forEach(arguments, function(url){
				if(typeof url === 'object'){
					this.append(
						obj.get(url, 'rule', ''),
						obj.get(url, 'params', {}),
						obj.get(url, 'args', {})
					);
				}else{
					this.append(url);
				}
			}.bind(this));

		}

		pretend (){
			utils.forEach(arguments, function(url){
				if(typeof url === 'object'){
					this.prepend(
						obj.get(url, 'rule', ''),
						obj.get(url, 'params', {}),
						obj.get(url, 'args', {})
					);
				}else{
					this.prepend(url);
				}
			}.bind(this));
		}

		copy (deep=true){
			return new Url(
				this.base, this.rule,
				this.params.copy(deep),
				this.args.copy(deep)
			);
		}

		parse () {
			var url = parse(this.rule, this.params, this.args);
			return absolute(url, this.base);
		}

		toString () {
			return this.parse();
		}
	}

	mod.Url = Url;

	// mod.urls = urls;
	// function urls(config={}){
	// 	var self = {};
	// 	self.config = mod.config.merge(config);
	// 	self.url = url;
	// 	function url(rule, params, args, baseUrl){
	// 		if(!baseUrl)
	// 			baseUrl = self.config.baseUrl;
	// 		return new Url(baseUrl, rule, params, args);
	// 	}
	// 	return self;
	// }
	// mod.urls['url'] = function(){
	// 	return urls().url.apply(null, arguments);
	// }

	mod.url = url;
	function url(rule, params, args, baseUrl){
		if(!baseUrl)
			baseUrl = mod.config.baseUrl;
		return new Url(baseUrl, rule, params, args);
	}

	mod.addFactory = addFactory
	function addFactory(name, config){
		config = bag(obj.extend(true, {}, mod.config, config || {}));
		if(name in mod)
			throw "Error adding url factory '"+name+"'. Name already exists.";

		mod[name] = function(rule, params, args, baseUrl){
			if(!baseUrl)
				baseUrl = config.get('baseUrl', '/');
			return new Url(baseUrl, rule, params, args);
		}

		return mod[name];
	}

	return mod;
});