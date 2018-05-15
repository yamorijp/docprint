require('./patch');

var drafter = require('drafter');
var hercule = require('hercule');
var fs = require('fs');
var pug = require('pug');
var parse = require('./parse');
var mkdir = require('mkdirp');
var util = require('./util');
var host = require('./host');
var path = require('path');

var slugify = util.slugify;
var at = util.at;
var capitalize = util.capitalize;
var stripSlash = util.stripSlash;

module.exports = function(options) {
	options = options || {};
	var filePath = stripSlash(options.filepath),
		destFolder = stripSlash(options.destination || filePath),
		header = options.header,
		headerhtml = options.headerhtml,
		cssFile = options.css,
		customCSS,
		title = options.title || "API Documentation";

	if (cssFile) {
		customCSS = fs.readFileSync(cssFile).toString();
	}
	if(header) {
		headerhtml = fs.readFileSync(header).toString();
	}

	try {
		var relativePath = path.resolve(filePath);
		relativePath = relativePath.substring(0, relativePath.lastIndexOf('/'));
	  	var result = drafter.parseSync(
	  		hercule.transcludeStringSync(fs.readFileSync(filePath).toString(), {
	  			relativePath: relativePath
	  		}), {
	  		requireBlueprintName: true
	  	});
	  	setHost(result);
	  	var output = {};
	  	parse(result, output);
	  	
	  	destFolder = path.resolve(destFolder);
		var dataStructures = at(output, 'content.0.content');
		dataStructures = dataStructures && dataStructures.find(function(c){ return c.type === 'dataStructures'; } ) || [];
		dataStructures = dataStructures && dataStructures.content;

		var css = fs.readFileSync(__dirname + '/css/style.css').toString();
		var langs = ['curl', 'node', 'python', 'java', 'ruby', 'php', 'go'];

		langs.forEach(function(l) {
			mkdir.sync(destFolder + '/' + l);
			require('fs').writeFileSync(destFolder + '/' + l +  '/index.html', 
				pug.renderFile(__dirname + '/jade/index.pug', { 
					output : output, 
					css: css, 
					headerContent: headerhtml,
					customCSS: customCSS,
					dataStructures: dataStructures, 
					capitalize: capitalize, 
					lang: l,
					title: title
			}));
		});
	} catch (err) {
	  console.log(err, err.stack);
	}

}

function setHost(result) {
	var metas = at(result, 'content.0.attributes.meta');
	if (metas && metas.find) {
		var hostMeta = metas.find(function(m) {
			return at(m, 'content.key.content') === 'HOST';
		});
        
		hostMeta && host.set(stripSlash(at(hostMeta, 'content.value.content')) || 'http://{host}');
	}
}

