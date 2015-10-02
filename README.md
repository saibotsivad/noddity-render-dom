# noddity-render-dom

> Render Noddity posts to the DOM

[![Build Status](https://travis-ci.org/ArtskydJ/noddity-render-dom.svg?branch=master)](https://travis-ci.org/ArtskydJ/noddity-render-dom)

# example

```js
var renderDom = require('noddity-render-dom')
var Butler = require('noddity-butler')
var Linkifier = require('noddity-linkifier')
var LevelJs = require('level-js')

var db = new LevelJs('noddity-posts-db')
var butler = new Butler('http://example.com/blogfiles/', levelUpDb)
var linkifier = new Linkifier('#/myposts/')

var options = {
	butler: butler,
	linkifier: linkifier,
	el: 'body',
	data: {
		config: {
			configProperty: 'configValue'
		},
		arbitraryValue: 'lol'
	}
}

renderDom('post-template.html', options, function (err, setCurrent) {
	setCurrent('my-awesome-post.md', function (err) {
		if (err) throw err // 404
	})
})
```

# api

```js
var renderDom = require('noddity-render-dom')
```

## `renderDom(post, options, cb)`

- `post`: a Noddity post object or a post filename
- `options`: all the other arguments
	- `butler`: a [Noddity Butler](https://www.npmjs.com/package/noddity-butler)
	- `linkifier`: a [Noddity Linkifier](https://www.npmjs.com/package/noddity-linkifier)
	- `el`: a selector string of the element to which the Ractive object will be bound
	- `data`: Any properties on the `data` object will be made available to the templates.
- `cb(err, setCurrent)`: a function to be called when the first render is finished.

## `setCurrent(post, [cb])`

`setCurrent` is a function/event emitter.

Call the function to change the current post to a different post.

- `post`: a Noddity post object, or a post filename
- `cb(err)`: an optional function that is called when the current post is set or a fatal error occurs

### events

- `error(err)` is emitted on non-fatal errors, e.g. an embedded template not loading
	- `err` is an Error object

```js
setCurrent.on('error', function (err) {
	console.error(err)
})
```

# license

[VOL](http://veryopenlicense.com)
