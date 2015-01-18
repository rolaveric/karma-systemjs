module.exports = function (config) {
	config.set({
		plugins: ['karma-firefox-launcher', 'karma-jasmine'],

		frameworks: ['jasmine'],

		files: ['lib/adapter.js', 'test/adapter.spec.js'],

		browsers: ['Firefox'],

		autoWatch: true
	});
};
