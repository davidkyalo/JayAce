define([
	// deps...
], function(){
	'use strict';

	class LazyArray extends Array
	{
		constructor(state){
			super();
			this.push
		}

		// static escriptorProperties
	}

	// function defineProperty(target, )

	Object.defineProperties(LazyArray.prototype, {
		state : {
			enumerable : false,
			configurable : true,
			writable : true,
			value : -1
		}
	});

	return LazyArray;

});