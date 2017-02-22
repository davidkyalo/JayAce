define([
	'./bag'
], function (bag) {
	'use strict';

	var config = bag({
		debug : false
	});

	var exception = function(message='', name="Exception", fallback="Error"){
		return config.debug === true ? name + ': ' + message : fallback;
	}

	exception.config = config;

	return exception;
});