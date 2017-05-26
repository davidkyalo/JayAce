define([
	'./obj'
], function (obj) {
	'use strict';

	class Model
	{
		constructor(data){
			if(data)
				this.update(data);
		}

		update (data){
			obj.extend(true, this, data);
		}
	}
	return Model;
});
