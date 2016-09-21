# instaNode
Instagram Node.js library

# Installation

```
var instaLib = require('./index.js');
```

# Usage
Instantiate a instagram object...

```js
var instagram = new instaLib();
```

...then setup session:

```js
instagram.setCookies('cookies');
```

Important: you need to use getFeed method once at the beggining to get CSRF token

# Methods

## getFeed(callback)

Loads last posts from your instagram feed.

## like(id, [callback])

Likes instagram post with the specified id.

Options:

* `id` is the id of instagram post.

## follow(id, [callback])

Follows user with the specified id.

Options:

* `id` is the id of instagram user.

## getByTag(tag, callback)

Loads last posts from instagram with the specified hash tag.

Options:

* `tag` is the hash tag you want to find.
