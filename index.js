var parseTemplate = require('noddity-template-parser')
var Ractive = require('ractive')
var extend = require('xtend')
var uuid = require('random-uuid-v4')
var runParallel = require('run-parallel')
var oneTime = require('onetime')
var EventEmitter = require('events').EventEmitter
Ractive.DEBUG = false

module.exports = function getRenderedPostWithTemplates(post, options, cb) {
	if (!options || !options.linkifier || !options.butler || !options.data) {
		throw new Error('Expected linkifier, butler, and data properties on options object.')
	}
	var butler = options.butler
	cb = oneTime(cb)
	var renderPost = render.bind(null, options.linkifier)

	if (typeof post === 'string') {
		butler.getPost(post, function (err, fetchedPost) {
			if (err) return cb(err)
			initialize(fetchedPost)
		})
	} else {
		initialize(post)
	}

	function initialize(rootPost) {
		var rendered = renderPost(rootPost)

		var ractive = new Ractive({
			el: options.el,
			data: extend(options.data || {}, rootPost.metadata),
			template: rendered.templateString
		})

		augmentData(rootPost, butler, function (err, data) {
			if (err) return cb(err)

			ractive.set(data)
		})

		function setCurrent(post, onLoadCb) {
			var util = {
				getPost: butler.getPost,
				renderPost: renderPost,
				ractive: ractive
			}
			ractive.resetPartial('current', makePartialString(post.filename))
			scan(post, util, rendered.filenameUuidsMap, rendered.uuidArgumentsMap, function () {})
			setTimeout(onLoadCb, 500, null)
		}

		makeEmitter(setCurrent)
		setCurrent.ractive = ractive

		cb(null, setCurrent)
	}
}

function render(linkifier, post) {
	var filenameUuidsMap = {}
	var uuidArgumentsMap = {}
	console.log('render', post.filename)
	var ast = parseTemplate(post, linkifier)
	var templateString = ast.map(function (piece) {
		if (piece.type === 'template') {
			var id = uuid()
			if (!filenameUuidsMap[piece.filename]) filenameUuidsMap[piece.filename] = []
			filenameUuidsMap[piece.filename].push(id)
			uuidArgumentsMap[id] = piece.arguments
			return makePartialString(id)
		} else if (piece.type === 'string') {
			return piece.value
		}
	}).join('')

	return {
		templateString: templateString,
		filenameUuidsMap: filenameUuidsMap,
		uuidArgumentsMap: uuidArgumentsMap
	}
}

function scan(post, util, filenameUuidsMap, uuidArgumentsMap, onLoadCb) {
	var ractive = util.ractive

	;(filenameUuidsMap[post.filename] || []).forEach(function (uuid) {
		var templateArgs = uuidArgumentsMap[uuid]
		var partialData = extend(post.metadata, templateArgs) // parent post metadata is not transferred...
		var childContextPartial = makePartialString(post.filename, partialData)
		var partialName = normalizePartialName(uuid)
		ractive.resetPartial(partialName, childContextPartial)
	})

	var filenamesToFetch = Object.keys(filenameUuidsMap).filter(filenameHasNoPartial(ractive))

	var tasks = filenamesToFetch.map(function (filename) {
		return function task(next) {
			util.getPost(filename, function (err, childPost) {
				if (!err) {
					var rendered = util.renderPost(childPost)

					var partialName = normalizePartialName(childPost.filename)
					ractive.resetPartial(partialName, rendered.templateString)

					scan(childPost, util,
						extendMapOfArrays(filenameUuidsMap, rendered.filenameUuidsMap),
						extend(uuidArgumentsMap, rendered.uuidArgumentsMap)
					)
				}
				next(err)
			})
		}
	})
	runParallel(tasks, onLoadCb)
}

function normalizePartialName(partialName) {
	return '_' + partialName.replace(/\./g, '_')
}

function makePartialString(partialName, partialContext) {
	partialName = normalizePartialName(partialName)
	partialContext = (partialContext ? ' ' + JSON.stringify(partialContext) : '')
	return '{{>' + partialName + partialContext + '}}'
}

function filenameHasNoPartial(ractive) {
	return function (filename) {
		return !ractive.partials[normalizePartialName(filename)]
	}
}

function extendMapOfArrays(map1, map2) {
	return Object.keys(map1).concat(Object.keys(map2)).reduce(function (combined, key) {
		combined[key] = (map1[key] || []).concat(map2[key] || [])
		return combined
	}, {})
}

function augmentData(post, butler, cb) {
	butler.getPosts(function(err, posts) {
		if (err) {
			cb(err)
		} else {
			cb(null, {
				postList: posts.map(function(post) {
					return extend(post, post.metadata)
				}),
				posts: posts.reduce(function(posts, post) {
					posts[post.filename] = post
					return posts
				}, {}),
				current: post.filename
			})
		}
	})
}

function makeEmitter(fn) {
	var emitter = new EventEmitter()
	Object.keys(EventEmitter.prototype).filter(function(key) {
		return typeof EventEmitter.prototype[key] === 'function'
	}).forEach(function(key) {
		fn[key] = EventEmitter.prototype[key].bind(emitter)
	})
}
