define([
	'./utils'
], function(utils) {
	'use strict';

	var hooks = function() {
		return hooks.fire.apply(null, arguments);
	};

	hooks._actions = {};

	hooks.bind = function (actions, callback) {
		utils.forEach(actions.split(' '), function(action){
			hooks._actions[action] = hooks._actions[action] || [];
			hooks._actions[action].push(callback);
		});
		return hooks;
	}

	hooks.unbind = function(actions, callback){
		utils.forEach(actions.split(' '), function(action){
			if(!(action in hooks._actions))
				return;
			hooks._actions[action].splice(hooks._actions[action].indexOf(callback), 1);
		});
		return hooks;
	}

	hooks.fire = function (a /* , args... */){
		if(a in hooks._actions){
			var action = new Action(arguments);
			for(var i = 0; i < hooks._actions[a].length; i++){
				hooks._actions[a][i].apply(action, action.args);
			}
		}
	}

	function Action(args) {
		var self = this;
		self.args = Array.apply(null, args);
		self.name = self.args.shift();
		// self.args.push(this);
	}

	window.fire = hooks.fire;

	return hooks;

});