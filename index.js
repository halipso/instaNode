var Request = require('request');
var Cheerio = require('cheerio');

module.exports = instaLib;

function instaLib() {
	this._jar = Request.jar();
	this.request = Request.defaults({"jar": this._jar, "timeout": 50000, "gzip": true});
}

instaLib.prototype.setCookies = function(cookies) {
	var self = this;
	cookies.forEach(function(cookie) {
		self._jar.setCookie(Request.cookie(cookie), "https://www.instagram.com/");
	});
};

instaLib.prototype.getFeed = function(callback) {
	var self = this;
	this.request.get("https://www.instagram.com/", function(err, response, body) {
		var $ = Cheerio.load(body);
		var feed = JSON.parse($('script:nth-child(4)').text().replace('window._sharedData = ', '').slice(0, -1).replace(/\r?\n|\r/gm,'').replace(/WebFontConfig(.*?) \}\;/gm,''));
		self._csrf = feed.config.csrf_token;
		feed = feed.entry_data.FeedPage[0].graphql.user.edge_web_feed_timeline;
		callback(feed);
	});
}

instaLib.prototype.getCSRF = function(callback) {
	this.getFeed(callback);
}

instaLib.prototype.like = function(id, callback) {
	var self = this;
	this.request.post({
		headers: {'Referer' : 'https://www.instagram.com/', 'x-csrftoken' : self._csrf, 'x-instagram-ajax' : 1, 'x-requested-with' : 'XMLHttpRequest'},
		uri: 'https://www.instagram.com/web/likes/'+id+'/like/',
	}, function(err, response, body) {
		if(typeof(callback) == "function")
			callback(body);
	});
}

instaLib.prototype.follow = function(id, callback) {
	var self = this;
	this.request.post({
		headers: {'Referer' : 'https://www.instagram.com/', 'x-csrftoken' : self._csrf, 'x-instagram-ajax' : 1, 'x-requested-with' : 'XMLHttpRequest'},
		uri: 'https://www.instagram.com/web/friendships/'+id+'/follow/',
	}, function(err, response, body) {
		if(typeof(callback) == "function")
			callback(body);
	});
}

instaLib.prototype.unfollow = function(id, callback) {
	var self = this;
	this.request.post({
		headers: {'Referer' : 'https://www.instagram.com/', 'x-csrftoken' : self._csrf, 'x-instagram-ajax' : 1, 'x-requested-with' : 'XMLHttpRequest'},
		uri: 'https://www.instagram.com/web/friendships/'+id+'/unfollow/',
	}, function(err, response, body) {
		if(body.indexOf('status') > -1)
			callback(true);
		else
			callback(false);
	});
}

instaLib.prototype.getByLocation = function(location, cursor, callback) {
	var self = this;
	var ftext = "media.first(72)";
	if(cursor)
		ftext = "media.after("+cursor+", 72)";
	self.request.post({
		headers: {'Referer' : 'https://www.instagram.com/', 'x-csrftoken' : self._csrf, 'x-instagram-ajax' : 1, 'x-requested-with' : 'XMLHttpRequest'},
		uri: 'https://www.instagram.com/query/',
		form: {q: "ig_location("+location+") { "+ftext+" {count, nodes {id, code, caption, owner { id } }, page_info }} ", ref: "locations::show", query_id: ""}
	}, function(err, response, body) {
		try {
			body = JSON.parse(body);
			var nodes = body.media.nodes;
			var end_cursor = '';
			if(body.media.page_info.has_next_page)
				end_cursor = body.media.page_info.end_cursor;
		} catch (e) {
			callback();
			return;
		}
		callback(nodes, end_cursor);
	});
}

instaLib.prototype.getByTag = function(tag, callback) {
	var self = this;
	this.request.get('https://www.instagram.com/explore/tags/'+tag, function (err, response, body) {
		var $ = Cheerio.load(body);
		var feed = JSON.parse($('script:nth-child(4)').text().replace('window._sharedData = ', '').slice(0, -1)).entry_data.TagPage[0].tag.media.nodes;
		
		callback(feed);
	});
}

instaLib.prototype.getFollows = function(username, callback) {
	var self = this;
	var load = function() {
		self.request.get('https://www.instagram.com/'+username+'/?__a=1', function(err, response, body) {
			var user = JSON.parse(body).user;
			var followers = [];
			var _get = function(cursor) {
				var ftext = "follows.first(20)";
				if(cursor)
					ftext = "follows.after("+cursor+", 20)";
				self.request.post({
					headers: {'Referer' : 'https://www.instagram.com/'+username, 'x-csrftoken' : self._csrf, 'x-instagram-ajax' : 1, 'x-requested-with' : 'XMLHttpRequest'},
					uri: 'https://www.instagram.com/query/',
					form: {q: "ig_user("+user.id+") { "+ftext+" { count, page_info { end_cursor, has_next_page }, nodes { id, followed_by_viewer, requested_by_viewer, username,follows_viewer,  followed_by { count }, media.first(1) { count, nodes{ id, code } }, biography } } } ", ref: "relationships::follow_list", query_id: ""}
				}, function(err, response, body) {
						try {
							body = JSON.parse(body);
						} catch (e) {
							_get(cursor);
							return;
						}
						console.log(followers.length);
						followers = followers.concat(body.follows.nodes);
						if(body.follows.page_info.has_next_page)
							setTimeout(function() { _get(body.follows.page_info.end_cursor) });
						else
							callback(followers);
				});
			}
			_get();
		});
	}

	load();
}

instaLib.prototype.getFollowers = function(username, callback) {
	var self = this;
	var load = function() {
		self.request.get('https://www.instagram.com/'+username+'/?__a=1', function(err, response, body) {
			var user = JSON.parse(body).user;
			var followers = [];
			var _get = function(cursor) {
				var ftext = "followed_by.first(100)";
				if(cursor)
					ftext = "followed_by.after('"+cursor+"', 100)";
				self.request.post({
					headers: {'Referer' : 'https://www.instagram.com/'+username, 'x-csrftoken' : self._csrf, 'x-instagram-ajax' : 1, 'x-requested-with' : 'XMLHttpRequest'},
					uri: 'https://www.instagram.com/query/',
					form: {q: "ig_user("+user.id+") { "+ftext+" { count, page_info { end_cursor, has_next_page }, nodes { id, followed_by_viewer, requested_by_viewer, username,  followed_by { count }, media.first(1) { count, nodes{ date } }, biography } } } ", ref: "relationships::follow_list", query_id: ""}
				}, function(err, response, body) {
						try {
							body = JSON.parse(body);
						} catch (e) {
							_get(cursor);
							return;
						}
						followers = followers.concat(body.followed_by.nodes);
						if(body.followed_by.page_info.has_next_page)
							setTimeout(function() { _get(body.followed_by.page_info.end_cursor) });
						else
							callback(followers);
				});
			}
			_get();
		});
	}

	load();
}

instaLib.prototype.getBotFollowers = function(username, rules, callback) {
	console.log(rules);
	console.log(username);

	if(!rules)
		rules = {};

	this.getFollowers(username, function(followers) {
		var bots = [];
		
		followers.forEach(function(item) {

			var trigger = 0;

			if(!trigger && 'min_followers' in rules) {
				if(item.followed_by.count < rules['min_followers'])
					trigger = 1;
			}

			if(!trigger && 'nodes_count' in rules) {
				if(item.media.count < rules['nodes_count'])
					trigger = 1;
			}

			if(!trigger && 'keywords' in rules && item.biography) {
				var keywords = rules['keywords'].split(',');
				var usertext = item.biography.toLowerCase();
				keywords.forEach(function(item) {
					item = item.toLowerCase();
					if(usertext.indexOf(item) > -1)
						trigger == 1;
				});
			}

			if(!trigger && 'last_photo_date' in rules) {
				if(item.media.count == 0) {
					trigger = 1;
				} else if(item.media.nodes.length > 0) {
					var myDate=rules['last_photo_date'].split(".");
					var newDate=myDate[1]+"/"+myDate[0]+"/"+myDate[2];
					var date = new Date(newDate).getTime()/1000;
					if(item.media.nodes[0].date < date)
						trigger = 1;
					//console.log(date+":"+item.media.nodes[0].date);s
				}
			}

			if(trigger)
				bots.push(item.id);

		});
		callback(bots);
	});
}

instaLib.prototype.banUser = function(id, callback) {
	this.request.post({
		headers: {'Referer' : 'https://www.instagram.com/', 'x-csrftoken' : this._csrf, 'x-instagram-ajax' : 1, 'x-requested-with' : 'XMLHttpRequest'},
		uri: 'https://www.instagram.com/web/friendships/'+id+'/block/',
	}, function(err, response, body) {
		console.log(body);
		if(body.indexOf('status') > -1)
			callback(true);
		else
			callback(false);
	});
}

instaLib.prototype.getUser = function(username, callback) {
	this.request.get('https://www.instagram.com/'+username+'/?__a=1', function(err, response, body) {
		body = JSON.parse(body);
		callback(body.user);
	});
}

instaLib.prototype.login = function(username, password, callback) {
	var self = this;
	this.request.get("https://www.instagram.com/", function(err, response, body) {
		self._csrf = body.match(/csrf_token\"\: \"(.*?)\"/)[1];
		self.request.post({
			headers: {'Referer' : 'https://www.instagram.com/', 'x-csrftoken' : self._csrf, 'x-instagram-ajax' : 1, 'x-requested-with' : 'XMLHttpRequest'},
			uri: 'https://www.instagram.com/accounts/login/ajax/',
			form: {username: username, password: password}
		}, function(err, response, body) {
			body = JSON.parse(body);
			var authenticated = body.authenticated;
			if(authenticated) {
				self.request.get("https://www.instagram.com/", function(err, response, body) {
					
					self._csrf = body.match(/csrf_token\"\: \"(.*?)\"/)[1];
					if(typeof(callback) == "function")
						callback(authenticated, self._jar.getCookieString('https://www.instagram.com/'));
				});
			} else {
				callback(authenticated);
			}
		});
	});
}
