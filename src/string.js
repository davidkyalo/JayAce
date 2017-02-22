define([], function(){
	String.prototype.join = function(pieces){
		var g = this;
		var j = null;
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

});
