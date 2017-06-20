define([], function(){
	String.prototype.join = function(){
		var g = this;
		var j = null;

		if(arguments.length == 1 && typeof(arguments[0]) === 'object')
			var pieces = arguments[0];
		else
			var pieces = arguments;

		for (var i = 0; i < pieces.length; i++) {
			var p = pieces[i].toString();
			j = j == null ? p : j+g+p;

		}
		return j;
	}

	String.prototype.pad = function(value, len){
		var self = this;
		var d = len < 0 ? (len*-1) - this.length : len - this.length;
		if(d < 1)
			return this;
		var p = value.repeat(d);
		return len > 0 ? this+p : p+this;
	}

	if((new Object()).__class__ === undefined){
		var descriptor = {
			get : function(){
				return this.__proto__.constructor;
			},
			enumerable : false,
			configurable : false
		};

		Object.defineProperty(Object.prototype, '__class__', descriptor);
	}
});
