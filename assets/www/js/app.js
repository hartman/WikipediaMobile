window.app = function() {
	function loadCachedPage (url) {
		// Hide the iframe until the stylesheets are loaded,
		// to avoid flash of unstyled text.
		// Instead we're hidden, which also sucks.
		var replaceRes = function() {

			// images
			$('#main img').each(function() {
				var em = $(this);
				var gotLinkPath = function(linkPath) {
					em.attr('src', 'file://' + linkPath.file);
				}
				var target = this.src.replace('file:', 'https:');
				window.plugins.urlCache.getCachedPathForURI(target, gotLinkPath, gotError);
			});
		};
		var gotPath = function(cachedPage) {
			loadPage('file://' + cachedPage.file, url, function() {
				replaceRes();
			});
		}
		var gotError = function(error) {
			console.log('Error: ' + error);
			chrome.hideSpinner();
			// chrome.showNoConnectionMessage();
			// navigator.app.exitApp();
		}
		window.plugins.urlCache.getCachedPathForURI(url, gotPath, gotError);
	}

	function loadPage(url, origUrl, callback) {
		origUrl = origUrl || url;
		console.log('hideAndLoad url ' + url);
		console.log('hideAndLoad origUrl ' + origUrl);
		var doRequest = function() {
			network.makeRequest({
				url: url, 
				success: function(data) {
						chrome.renderHtml(data, origUrl);
						if(callback) {
							callback();
						}
						chrome.onPageLoaded();
					},
				error: function(xhr) {
					if(xhr.status == 404) {
						loadLocalPage('404.html');
					} else {
						loadLocalPage('error.html');
					}
					languageLinks.clearLanguages();
					$('#savePageCmd').attr('disabled', 'disabled');
					console.log('disabling language');
					$('#languageCmd').attr('disabled', 'disabled');
				}
			});
		};
		console.log("Apparently we are connected = " + network.isConnected());
		if(!network.isConnected()) {
			app.setCaching(true, function() { 
				console.log("HEYA!");
				doRequest(); 
				app.setCaching(false);
			});
		} else {
			doRequest();
		}
	}

	function loadLocalPage(page) {
		$('base').attr('href', 'file:///android_asset/www/');
		$('#main').load(page, function() {
			$('#main').localize();
			chrome.onPageLoaded();
		});
	}

	function urlForTitle(title) {
		return app.baseURL + "/wiki/" + encodeURIComponent(title.replace(/ /g, '_'));
	}

	function setContentLanguage(language) {
		preferencesDB.set('language', language);
		app.baseURL = 'https://' + language + '.m.wikipedia.org';
	}

	function setFontSize(size) {
		preferencesDB.set('fontSize', size);
		$('#main').css('font-size', size);
	}
	
	
	function setCaching(enabled, success) {
		// Do nothing by default
		success();
	}


	function navigateToPage(url, options) {
		var options = $.extend({cache: false, updateHistory: true}, options || {});
		$('#searchParam').val('');
		chrome.showSpinner();
		
		if (options.cache) {
			loadCachedPage(url);
		} else {
			loadPage(url);
		}
		if (options.updateHistory) {
			currentHistoryIndex += 1;
			pageHistory[currentHistoryIndex] = url;
			// We're adding an entry to the 'forward/backwards' chain.
			// So disable forward.
		} 
		console.log("navigating to " + url);
		// Enable change language - might've been disabled in a prior error page
		console.log('enabling language');
		$('#languageCmd').removeAttr('disabled');  
		chrome.showContent();
	}

	function getCurrentUrl() {
		return pageHistory[currentHistoryIndex];
	}

	function getCurrentTitle() {
		var url = getCurrentUrl(),
			page = url.replace(/^https?:\/\/[^\/]+\/wiki\//, ''),
			unescaped = decodeURIComponent(page),
			title = unescaped.replace(/_/g, ' ');
		return title;
	}

	var exports = {
		setFontSize: setFontSize,
		setContentLanguage: setContentLanguage,
		navigateToPage: navigateToPage,
		getCurrentUrl: getCurrentUrl,
		getCurrentTitle: getCurrentTitle,
		urlForTitle: urlForTitle,
		setCaching: setCaching
	};

	return exports;
}();
