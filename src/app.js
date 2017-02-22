define([
	//
], function() {
	'use strict';

	class App
	{
		constructor(){
			this._started = false;
		}

		start(){
			if(this._started)
				return;
			this.boot();
			this.run();
			this._started = true;
		}

		boot(){

		}

		run (){

		}
	}

	return App;
});
