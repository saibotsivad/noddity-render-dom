var TestRetrieval = require('./retrieval-stub.js')
var renderDom = require('../../index.js')
var levelmem = require('level-mem')
var Butler = require('noddity-butler')
var Linkify = require('noddity-linkifier')

module.exports = function testState() {
	var retrieval = new TestRetrieval()
	var db = levelmem('no location', {
		valueEncoding: require('noddity-butler/test/retrieval/encoding.js')
	})
	var butler = new Butler(retrieval, db, {
		refreshEvery: 100
	})
	var linkifier = new Linkify('#/prefix')

	if (typeof document !== 'undefined') {
		document.querySelector('body').innerHTML = ''
	}

	function render(post, data) {
		renderDom(post, {
			butler: butler,
			linkifier: linkifier,
			el: 'body',
			data: data
		})
	}

	return {
		retrieval: retrieval,
		render: render
	}
}
