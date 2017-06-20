define([
	'./obj',
], function (obj) {
	'use strict';

    var	exc = {};
	var global = global || (window || {});

	function notImplementedErrorMessage (func, cls, message){
		var name = typeof(func) == 'function' ? func.name+'()' : func;
		if(typeof(cls) !== 'object' && typeof(cls) !== 'function'){
			message = cls;
			cls = undefined;
		}
		if(cls)
			cls = typeof(cls) === 'function' ? cls.name : cls.__class__.name;

		message = message || "";
		cls = cls ? ' in class: ['+cls+']' : '';
		var type = cls === '' ? 'Function:' : 'Method:';

		return type+' '+name+cls+'. '+message;
	}

	function badMethodCallErrorMessage(method, cls, message){
		var name = typeof(method) == 'function' ? method.name+'()' : func;
		if(typeof(cls) !== 'object' && typeof(cls) !== 'function'){
			message = cls;
			cls = undefined;
		}
		if(cls)
			cls = typeof(cls) === 'function' ? cls.name : cls.__class__.name;

		message = message || "";
		cls = cls ? ' in class: ['+cls+']' : '';
		return 'Method: '+name+cls+'. '+message;
	}


	function depreciatedErrorMessage (func, alt, cls, message){
		if(typeof(cls) !== 'object' && typeof(cls) !== 'function'){
			message = cls;
			cls = undefined;
		}
		message = message || "";
		var name =  typeof(func) == 'function' ? func.name+'()' : func;

		alt = alt && typeof(alt) == 'function' ? alt.name+'()' : alt;
		alt = alt ? ' Use: '+alt+' instead.' : '';

		if(cls)
			cls = typeof(cls) === 'function' ? cls.name : cls.__class__.name;

		cls = cls ? ' in class: ['+cls+']' : '';
		var type = cls === '' ? 'Function:' : 'Method:';

		return type+' '+name+cls+'.'+alt+' '+message;
	}

	class Exception extends Error
	{
		//
	}

	class NotImplementedError extends Exception
	{
		constructor(func, cls, message, fileName, lineNumber){
			super(notImplementedErrorMessage(func, cls, message), fileName, lineNumber);
		}
	}
	exc.NotImplementedError = global.NotImplementedError = NotImplementedError;


	class KeyError extends Exception
	{
		//
	}
	exc.KeyError = global.KeyError = KeyError;


	class ValueError extends Exception
	{
		//
	}
	exc.ValueError = global.ValueError = ValueError;

	class BadMethodCallError extends Exception
	{
		constructor(method, cls, message, fileName, lineNumber){
			super(badMethodCallErrorMessage(method, cls, message), fileName, lineNumber);
		}
	}
	exc.BadMethodCallError = global.BadMethodCallError = BadMethodCallError;


	class DepreciatedError extends Exception
	{
		constructor(func, alt, cls, message, fileName, lineNumber){
			super(depreciatedErrorMessage(func, alt, cls, message), fileName, lineNumber);
		}
	}
	exc.DepreciatedError = global.DepreciatedError = DepreciatedError;


	function depreciated(func, alt, cls, message, fileName, lineNumber){
		if(func instanceof DepreciatedError)
			var e = func;
		else
			var e = new DepreciatedError(func, alt, cls, message, fileName, lineNumber);
		console.warn(e.name+': '+e.message);
	}
	exc.depreciated = global.depreciated = depreciated;

	

	return exc;

});