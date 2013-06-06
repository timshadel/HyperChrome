/**
 * Adapted the code in to order to run in a web worker. 
 * 
 * Original author: Benjamin Hollis
 */

function htmlEncode(t) {
	return t != null ? t.toString().replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
}

function decorateWithSpan(value, className) {
	return '<span class="' + className + '">' + htmlEncode(value) + '</span>';
}

function decorateHref(value) {
	return decorateWithSpan('"', "type-string") + '<a href="' + value + '">' + htmlEncode(value) + '</a>' + decorateWithSpan('"', "type-string");
}

function valueToHTML(value) {
	var valueType = typeof value, output = "";
	if (value == null)
		output += decorateWithSpan("null", "type-null");
	else if (value && value.constructor == Array)
		output += arrayToHTML(value);
	else if (valueType == "object")
		output += objectToHTML(value);
	else if (valueType == "number")
		output += decorateWithSpan(value, "type-number");
	else if (valueType == "string")
		if (/^(http|https):\/\/[^\s]+$/.test(value))
			output += decorateHref(value);
		else
			output += decorateWithSpan('"' + value + '"', "type-string");
	else if (valueType == "boolean")
		output += decorateWithSpan(value, "type-boolean");

	return output;
}

function arrayToHTML(json) {
	var i, length, output = '<div class="collapser"></div>[<span class="ellipsis"></span><ul class="array collapsible">', hasContents = false;
	for (i = 0, length = json.length; i < length; i++) {
		hasContents = true;
		output += '<li><div class="hoverable">';
		output += valueToHTML(json[i]);
		if (i < length - 1)
			output += ',';
		output += '</div></li>';
	}
	output += '</ul>]';
	if (!hasContents)
		output = "[ ]";
	return output;
}

function loadSrc(srcId, src) {
	postMessage({
		srcId: "#"+srcId,
		src : src
	});
}

function actionToHTML(json) {
	keys = Object.keys(json), output = '<div class="collapser"></div><span class="ellipsis"></span>';
	output += '<div class="action"><form action="' + json.action + '"';
	if (json.method) output += ' method="' + json.method + '"';
	if (json.type) output += ' enctype="' + json.type + '"';
	output += ' class="collapsible">';
	if (json.input) {
		var fields = Object.keys(json.input)
		for (var i = 0; i < fields.length; i++) {
			var name = fields[i];
			var field = json.input[fields[i]];
			var type, value;
			if (typeof field === 'object') {
				type = (field.type || 'text');
				value = field.value;
			} else {
				type = 'hidden';
				value = field;
			}
			output += '<li><div class="hoverable">';
			output += '<span class="property">' + htmlEncode(name) + '</span> ';
			if (type === 'textarea') {
				output += '<br><textarea name="' + name + '"></textarea';
			} else if (type === 'select') {
				output += '<select name="' + name + '"';
			} else {
				output += '<input name="' + name + '" type="' + type + '"'
			}
			if (value) {
				output += ' value="' + value + '"'
			}
			if (field.required) {
				output += ' required';
			}
			if (field.multiple) {
				output += ' multiple';
			}
			output += '>';
			if (type === 'hidden') {
				output += decorateWithSpan(value, "type-hidden");
			}
			if (type === 'select') {
				var options = field.options;
				for (var o = 0; o < options.length; o++) {
					var option = options[o];
					var ovalue, otext;
					if (typeof option === 'object') {
						ovalue = option.value;
						otext = option.text;
					} else {
						ovalue = option;
						otext = option;
					}
					output += '<option value="' + ovalue + '">' + otext + '</option>';
				}
				output += "</select>";
			}
			output += '</div></li>';
		};
	}
	output += '<li><input type="submit" value="Send"></li></form>';
	if (json.type === 'application/json') {
		output += '<script>';
		output += '// something here which hooks the form submit and alters it to submit json.';
		output += '</script>';
	}
	output += '</div>';
	return output;
}

function objectToHTML(json) {
	var i, key, length, keys = Object.keys(json), output = '<div class="collapser"></div>{<span class="ellipsis"></span><ul class="obj collapsible">', hasContents = false;

	if (json.src && json.type) {
		var isJson = json.type.match(/json/);
		var isImage = json.type.match(/image/);
		var shouldEmbed = isImage || isJson;
		if (shouldEmbed) {
			output = '<div class="collapser"></div>' + decorateWithSpan(JSON.stringify(json), "type-hidden") + '<span class="ellipsis"></span><ul class="obj collapsible">';
		}
		if (isJson) {
	    var srcId = 'src' + Math.floor(Math.random() * 1000000);
	    output += '<div id="' + srcId + '" class="src"></div>';
	    loadSrc(srcId, json.src);
	    return output;
		} else if (isImage) {
	    output += '<div class="src"><image src="' + json.src + '"></div>';
	    return output;
		}
	}

	for (i = 0, length = keys.length; i < length; i++) {
		key = keys[i];
		hasContents = true;
		output += '<li><div class="hoverable">';
		output += '<span class="property">' + htmlEncode(key) + '</span>: ';
		if (key === 'href') {
			output += decorateHref(json[key]);
    } else if (key === 'src') {
      output += decorateHref(json[key]);
		} else {
			output += valueToHTML(json[key]);
		}
		if (i < length - 1)
			output += ',';
		output += '</div></li>';
	}
	if (json.action) {
		output += '<li><div class="hoverable">' + actionToHTML(json) + '</div></li>';
	}
	output += '</ul>}';
	if (!hasContents)
		output = "{ }";
	return output;
}

function jsonToHTML(json, fnName) {
	var output = '';
	if (fnName)
		output += '<div class="callback-function">' + fnName + '(</div>';
	output += valueToHTML(json);
	if (fnName)
		output += '<div class="callback-function">)</div>';
	return output;
}

addEventListener("message", function(event) {
	var object;
	try {
		object = JSON.parse(event.data.json);
	} catch (e) {
		postMessage({
			error : true
		});
		return;
	}
	postMessage({
		onjsonToHTML : true,
		docId: event.data.docId,
		html : jsonToHTML(object, event.data.fnName)
	});
}, false);
