function getGpml(url, callback) {
	// this needs to be updated to get a URL provided by the php backend. We could also consider getting the GPML from the SOAP webservice,
	// but that would require a more significant refactoring.
	// Should we allow for getting GPML from other locations than WikiPathways?
	// need to test whether it will work to get GPML from WikiPathways when viewer is used as widget on third-party site.

	function Right(str, n){
		if (n <= 0)
			return "";
		else if (n > String(str).length)
			return str;
		else {
			var iLen = String(str).length;
			return String(str).substring(iLen, iLen - n);
		}
	}

	function Left(str, n){
		if (n <= 0)
			return "";
		else if (n > String(str).length)
			return str;
		else {
			return String(str).substring(0, n);
		}
	}

	function getDataFile(callback) {
		try {
			jQuery.get(url).success(function(data) {
				callback(data);
			})
		}
		catch (e) {
			console.log("Error: File not found.");
			return {"@xmlns":"http://pathvisio.org/GPML/2013a","@Name":"Error - File not found.","@Version":"20130621","Graphics":[{"@BoardWidth":"471.0","@BoardHeight":"239.0"}],"InfoBox":{"@CenterX":"0.0","@CenterY":"0.0"},"Biopax":null,"DataNodes":[{"@TextLabel":"Error - File not found.","@GraphId":"ec16d","Graphics":{"@Width":"249.5","@Height":"73.5","@ZOrder":"32768","@FontName":"Verdana","@FontWeight":"Bold","@FontSize":"16","@Valign":"Middle","@Color":"#ff0000","x":1.5,"y":19.5,"@FillColor":"white"},"Xref":{"@Database":"","@ID":""}}]};
		}
	};

	function convertToArray(object) {
		if (Object.prototype.toString.call( object ) === '[object Object]' ) {
			var array = [];
			array.push(object)
			return array;
		}
		else {
			if( Object.prototype.toString.call( object ) === '[object Array]' ) {
				return object;
			}
		}
	}

	function validateCssColor(color){
		if (color == null | color == 'undefined' | color == '' | (!color)) {
			return false;
		}
		else {
			var rgb = $('<div style="color:#28e32a">');     // Use a non standard dummy color to ease checking for edge cases
			var valid_rgb = "rgb(40, 227, 42)";
			rgb.css("color", color);
			if(rgb.css('color') == valid_rgb && color != ':#28e32a' && color.replace(/ /g,"") != valid_rgb.replace(/ /g,""))
				return false;
			else
				return true;
		}
	};

	function convertGpml2Json(data){
		try //Internet Explorer
		{
			var xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
			xmlDoc.async="false";
			xmlDoc.loadXML(data);
		}
		catch(e)
		{
			try //Firefox, Mozilla, Opera, etc.
			{
				var parser=new DOMParser();
				var xmlDoc=parser.parseFromString(data,"text/xml");
			}
			catch(e)
			{
				alert(e.message);
				return;
			}
		}

		// We can use xml2json.js or JXON.js. Which is better?
		
		// xml2json.js
		///*
		var json = xml2json(xmlDoc, "");
		var parsedJson = JSON.parse(json);
		//var parsedJson = jQuery.parseJSON(json);
		//*/

	       // JXON.js
		/*
		var parsedJson = {};
		parsedJson.Pathway = JXON.build(xmlDoc.documentElement);
		*/

		var xmlns = "";

		try {
			xmlns = parsedJson.Pathway["@xmlns"]
		}
		catch (e) {
			alert(e.message);
			return;
		}

		// test for whether file is GPML based on xmlns without reference to version
		var gpmlXmlnsSupported = "http://pathvisio.org/GPML/2013a";
		var gpmlXmlnsIdentifier = "/GPML/";
		// current and previous GPML xmlns values
		// "http://pathvisio.org/GPML/2013a"
		// "http://genmapp.org/GPML/2010a"
		// "http://genmapp.org/GPML/2008a"
		// "http://genmapp.org/GPML/2007"
		if ( xmlns.indexOf(gpmlXmlnsIdentifier) !== -1 ) {

			// test for whether the GPML file version matches the current version supported by pathvisio.js
			if (xmlns != gpmlXmlnsSupported) {
				// preferably, this would call the Java RPC updater for the file to be updated.
				alert("Pathvisio.js may not fully support the version of GPML provided (xmlns: " + xmlns + "). Please convert to the supported version of GPML (xmlns: " + gpmlXmlnsSupported + ").")
			}

			// Convert output from xml2json into well-formed JSON.
			// It would be better to do this in the conversion file xml2json.js.

			// BiopaxRefs
			try {
				parsedJson.Pathway.BiopaxRefs = convertToArray( parsedJson.Pathway.BiopaxRef );
				delete parsedJson.Pathway.BiopaxRef;

				parsedJson.Pathway.BiopaxRefs.forEach(function(element, index, array) {
					// modify data
				});
			}
			catch (e) {
				console.log("No BiopaxRefs found.");
			}

			// Comments 
			try {
				parsedJson.Pathway.Comments = convertToArray( parsedJson.Pathway.Comment );
				delete parsedJson.Pathway.Comment;

				parsedJson.Pathway.Comments.forEach(function(element, index, array) {
					// modify data
				});
			}
			catch (e) {
				console.log("No Comments found.");
			}

			// DataNodes 
			try {
				parsedJson.Pathway.DataNodes = convertToArray( parsedJson.Pathway.DataNode );
				delete parsedJson.Pathway.DataNode;

				parsedJson.Pathway.DataNodes.forEach(function(element, index, array) {
					element.Graphics["x"] = parseFloat(element.Graphics["@CenterX"]) - parseFloat(element.Graphics["@Width"])/2;
					element.Graphics["y"] = parseFloat(element.Graphics["@CenterY"]) - parseFloat(element.Graphics["@Height"])/2;
					delete element.Graphics["@CenterX"];
					delete element.Graphics["@CenterY"];

					element.Graphics["@Width"] = parseFloat(element.Graphics["@Width"]);
					element.Graphics["@Height"] = parseFloat(element.Graphics["@Height"]);

					if (element.Graphics.hasOwnProperty("@FillColor")) {
						// does not deal with color if user entered "white". Should use validateColor() to address.
						element.Graphics["@FillColor"] = "#" + element.Graphics["@FillColor"]
					}
					else {
						element.Graphics['@FillColor'] = "#ffffff";
					};	

					if (element.Graphics.hasOwnProperty("@Color")) {
						element.Graphics["@Color"] = "#" + element.Graphics["@Color"]
					}
					else {
						element.Graphics['@Color'] = "#000000";
					};	

					if (element.Graphics.hasOwnProperty("@FontName")) {
						element.Graphics["@Color"] = element.Graphics["@FontName"]
					}
					else {
						element.Graphics['@FontName'] = "Arial";
					};	
				});
			}
			catch (e) {
				console.log("No DataNodes found.");
			}

			// Groups
			try {
				parsedJson.Pathway.Groups = convertToArray( parsedJson.Pathway.Group );
				delete parsedJson.Pathway.Group;

				parsedJson.Pathway.Groups.forEach(function(element, index, array) {
					// modify data
				});
			}
			catch (e) {
				console.log("No Groups found.");
			}

			// Interactions
			try {
				parsedJson.Pathway.Interactions = convertToArray( parsedJson.Pathway.Interaction );
				delete parsedJson.Pathway.Interaction;

				parsedJson.Pathway.Interactions.forEach(function(element, index, array) {
					element.Graphics.Points = convertToArray( element.Graphics.Point );
					delete element.Graphics.Point;
					// modify data
				});
			}
			catch (e) {
				console.log("No Interactions found.");
			}

			// Labels
			try {
				parsedJson.Pathway.Labels = convertToArray( parsedJson.Pathway.Label );
				delete parsedJson.Pathway.Label;

				parsedJson.Pathway.Labels.forEach(function(element, index, array) {
					// modify data
				});
			}
			catch (e) {
				console.log("No Labels found.");
			}

			// Shapes
			try {
				parsedJson.Pathway.Shapes = convertToArray( parsedJson.Pathway.Shape );
				delete parsedJson.Pathway.Shape;

				parsedJson.Pathway.Shapes.forEach(function(element, index, array) {
					// modify data
				});
			}
			catch (e) {
				console.log("No Shapes found.");
			}

			return parsedJson.Pathway;
		}
		else {
			alert("Pathvisio.js does not support the data format provided. Please convert to GPML and retry.")
			return;
		}
	};

	if (!(url)) {
		url = "../../samples/gpml/error.gpml";
	}
	var pathway = getDataFile(function(data) {
		var pathway = convertGpml2Json(data);
		return callback(pathway);
	})
}