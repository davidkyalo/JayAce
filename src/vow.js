define([
	// deps...
], function(){
	'use strict';

	class Vow
	{
		constructor(resolver){
			this.resolver = resolver;

			this._state = 'pending';
			this._results = [];
			this.isReady = false;
			this.wasFulfilled = false;
			this.wasBroken = false;
			this.wasResolved = false;
			this._queues = {
				fulfilled : [], broken: [], resolved :[]
			};
		}

		status (status){
			if(status !== undefined)
				return (this._state == status);
			return this._state;
		}

		_dequeue (queue, obj){
			if(obj == undefined)
				obj = null;
			while (queue.length > 0) {
				queue.shift().apply(obj, this._results);
			}
		}

		_resolve(){
			this.wasResolved = true;
			this._state = 'resolved';
			this._dequeue(this._queues.resolved);
		}

		_pushResults (results){
			for (var i = 0; i < results.length; i++) {
				this._results.push(results[i]);
			}
		}

		get (){
			return this._results;
		}

		run (func){
			if(this.wasResolved) return;

			if(!func) func = this.resolver;

			if(func){
				this._state = 'working';
				func.call({ fulfil: this.fulfil, reject: this.reject }, this.fulfil, this.reject);
			}
		}

		fulfil (){
			this._state = 'ready';
			this.isReady = true;
			this.wasFulfilled = true;
			this._pushResults(arguments);
			this._dequeue(this._queues.fulfilled);
			this._resolve();
		}

		reject (){
			this._state = 'ready';
			this.isReady = true;
			this.wasBroken = true;
			this._pushResults(arguments);
			this._dequeue(this._queues.broken);
			this._resolve();

		}

		fulfilled (func){
			this._queues.fulfilled.push(func);

			if(this.isReady)
				this._dequeue(this._queues.fulfilled);
			else if(this.status('pending'))
				this.run();

			return this;
		}

		broken (func){
			this._queues.broken.push(func);

			if(this.isReady)
				this._dequeue(this._queues.broken);
			else if(this.status('pending'))
				this.run();

			return this;
		}

		resolved (func){
			this._queues.resolved.push(func);

			if(this.wasResolved)
				this._resolve();
			else if(this.status('pending'))
				this.run();

			return this;
		}

		success (func){
			return this.fulfilled(func);
		}

		error (func){
			return this.broken(func);
		}

		then (fulfilledFunc, brokenFunc, resolvedFunc){
			if(fulfilledFunc)
				this.fulfilled(fulfilledFunc);

			if(brokenFunc)
				this.broken(brokenFunc);

			if(resolvedFunc)
				this.resolved(resolvedFunc);

			return this;
		}
	}

	return Vow;

});