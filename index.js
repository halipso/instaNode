var Request = require('request');
var Cheerio = require('cheerio');

module.exports = instaLib;

function instaLib() {
	this._jar = Request.jar();
	this.request = Request.defaults({"jar": this._jar, "timeout": 50000, "gzip": true});
}

instaLib.prototype.setCookie = function(cookie) {
	var cookieName = cookie.match(/(.+)=/)[1];
	if(cookieName == 'steamLogin') {
		this.steamID = new SteamID(cookie.match(/=(\d+)/)[1]);
	}

	var isSecure = !!cookieName.match(/(^steamMachineAuth|^steamLoginSecure$)/);
	this._jar.setCookie(Request.cookie(cookie), (isSecure ? "https://" : "http://") + "store.steampowered.com");
};

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
		var feed = JSON.parse($('script:nth-child(4)').text().replace('window._sharedData = ', '').slice(0, -1));
		self._csrf = feed.config.csrf_token;
		feed = feed.entry_data.FeedPage[0].feed.media.nodes;
		callback(feed);
	});
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

instaLib.prototype.getByTag = function(tag, callback) {
	var self = this;
	this.request.get('https://www.instagram.com/explore/tags/'+tag, function (err, response, body) {
		var $ = Cheerio.load(body);
		var feed = JSON.parse($('script:nth-child(4)').text().replace('window._sharedData = ', '').slice(0, -1)).entry_data.TagPage[0].tag.media.nodes;
		callback(feed);
	});
}
