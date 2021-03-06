pathvisiojs.renderer = function(){
  'use strict';

  // currently just using Gecko (Firefox) list of supported image formats for the HTML img tag:
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Img
  // TODO decide what to do if the user specifies an SVG image as a dataSource element

  // the viewMethods are sorted in order of preference - viewMethod with lower index will be used if more than one is returned.
  var sourceDataFileTypeToViewMethodMappings = {
    gpml:[
      'svg' //in the future, could add canvas support
    ],
    biopax:[ //biopax is not currently supported
      'svg' //in the future, could add canvas support
    ],
    pdf:[
      'pdf' //not supported now. this would be future. we might use pdf.js or we could just try using an embed or object tag.
    ],
    png:[
      'img'
    ],
    jpg:[
      'img'
    ],
    jpeg:[
      'img'
    ],
    jpe:[
      'img'
    ],
    jif:[
      'img'
    ],
    jfif:[
      'img'
    ],
    jfi:[
      'img'
    ],
    gif:[
      'img'
    ],
    ico:[
      'img'
    ],
    bmp:[
      'img'
    ],
    dib:[
      'img'
    ]
  };

  function getFirstRenderableSourceDataElement(sourceData) {
    var sourceDataElement, viewMethodsForSourceDataFileType, supportedViewMethodsForSourceDataFileType,
      results = {},
      supportedViewMethods = getSupportedViewMethods();

    var i = 0;
    do {
      sourceDataElement = sourceData[i];
      viewMethodsForSourceDataFileType = sourceDataFileTypeToViewMethodMappings[sourceDataElement.fileType];
      supportedViewMethodsForSourceDataFileType = pathvisiojs.utilities.intersect(viewMethodsForSourceDataFileType, supportedViewMethods);
      i += 1;
    } while ((supportedViewMethodsForSourceDataFileType.length < 1) && (i < sourceData.length + 1));

    sourceDataElement.selectedViewMethod = supportedViewMethodsForSourceDataFileType[0];
    return sourceDataElement;
  }

  //function getImageFormatByDataSourceFileType(fileType) {
  //this is testing the browser the user is currently using 
  function getSupportedViewMethods() {
    //making an assumption that all browsers we care about support the HTML img tag

    var supportedViewMethods = ['img'];

    // TODO support svg that is not inline in the svg viewMethod
    // The IE9 detection is a temporary hack. It is used because IE9 cannot currently convert GPML to pvjson,
    // so it cannot display the resulting SVG.
    // TODO get gpml to pvjson conversion working with IE9
    if (Modernizr.inlinesvg) {
    //if (Modernizr.inlinesvg && (!pathvisiojs.utilities.isIE())) {
    //if (Modernizr.inlinesvg && (pathvisiojs.utilities.isIE() !== 9)) {
      supportedViewMethods.push('svg');
    }
    
    return supportedViewMethods;
  }

  function loadHtmlTemplate(userSpecifiedContainer, callback) {
    userSpecifiedContainer.html(pathvisioNS['src/pathvisiojs.html']);
    var diagramContainer = userSpecifiedContainer.select('#diagram-container');
    callback(diagramContainer);
  }

  function load(args) {
    // this function gets a reference to a GPML file and draws a visual representation of the pathway
    // TODO Much of the SVG creation code should be moved to ./svg/svg.js so we just call
    // pathvisiojs.renderer.svg.load() in the same way as we do for
    // pathvisiojs.renderer.img.load()

    // ********************************************
    // Check for minimum required set of parameters
    // ********************************************

    var userSpecifiedContainerSelector = args.container,
      sourceData = args.sourceData,
      fitToContainer = args.fitToContainer,
      cssUri = args.cssUri,
      customMarkers = args.customMarkers,
      //customSymbols = args.customSymbols,
      highlights = args.highlights,
      hiddenElements = args.hiddenElements,
      userSpecifiedContainer, // the element matching the user-specified selector. the user specified selector is the parameter "container" in the pathvisiojs.load() method.
      pathvisioJsContainer,
      diagramContainer;

    if (!sourceData[0].uri) {
      throw new Error('No sourceData uri specified.');
    }

    if (!userSpecifiedContainerSelector) {
      throw new Error('No container selector specified as container for pathvisiojs.');
    }

    userSpecifiedContainer = d3.select(userSpecifiedContainerSelector);
    if (userSpecifiedContainer.length !== 1) {
      throw new Error('Container selector must be matched by exactly one element.');
    }

    // waterfall means that each function completes in order, passing its result to the next
    async.waterfall([
      function(callback){ // this could be in parallel
        // ********************************************
        // Load HTML template
        // ********************************************
        var htmlTemplate = loadHtmlTemplate(userSpecifiedContainer, function(thisPathwayContainer) {
          diagramContainer = thisPathwayContainer;
          callback(null);
        });
      },
      function(callback){
        // ********************************************
        // Add loading gif
        // ********************************************
        var diagramLoadingIconUri = pathvisiojs.config.diagramLoadingIconUri;
        var img = diagramContainer.append('img')
        .attr('id', 'loading-icon')
        .attr('src', diagramLoadingIconUri)
        .attr('width', 50);

        // ********************************************
        // Get desired dimensions for pathway diagram
        // ********************************************
        var renderableSourceDataElement = getFirstRenderableSourceDataElement(sourceData);

        // ********************************************
        // Get desired dimensions for pathway diagram
        // ********************************************
        var boundingClientRect = userSpecifiedContainer[0][0].getBoundingClientRect();
        var containerWidth = boundingClientRect.width - 3; //account for space for pan/zoom controls,
        var containerHeight = boundingClientRect.height - 3; //account for space for search field;

        callback(null, containerWidth, containerHeight, renderableSourceDataElement);
      },
      function(containerWidth, containerHeight, renderableSourceDataElement, callback){
        var svg, pathway,
        loadDiagramArgs = {};
        loadDiagramArgs.container = diagramContainer;
        loadDiagramArgs.renderableSourceDataElement = renderableSourceDataElement;
        loadDiagramArgs.containerWidth = containerWidth;
        loadDiagramArgs.containerHeight = containerHeight;
        loadDiagramArgs.fitToContainer = fitToContainer;
        loadDiagramArgs.highlights = highlights;

        // ********************************************
        // Check for SVG support. If false, use static image (png, jpg, gif, etc.) fallback
        // ********************************************
        if (renderableSourceDataElement.selectedViewMethod === 'svg') { // TODO get this working in IE9
          loadDiagramArgs.cssUri = cssUri;
          loadDiagramArgs.customMarkers = customMarkers;
          //loadDiagramArgs.customSymbols = customSymbols;
          //*
          pathvisiojs.renderer.svg.load(loadDiagramArgs, function(diagram) {
            if (!!diagram) {
              callback(null, diagram);
            }
            else {
              // TODO refactor this to not just assume PNG will be available as fallback
              loadDiagramArgs.renderableSourceDataElement = sourceData[1];
              pathvisiojs.renderer.img.load(loadDiagramArgs, function(diagram) {
                callback(null, diagram);
              });
            }
          });
          //*/
        }
        else {
          pathvisiojs.renderer.img.load(loadDiagramArgs, function(diagram) {
            callback(null, diagram);
          });
        }
      },
      function(diagram, callback){
        // ********************************************
        // Remove loading icon
        // ********************************************
        diagramContainer.select('#loading-icon').remove();

        // adding this as a signal for e2e tests that the diagram has finished loading 
        // TODO refactor tests so they don't need this hack.
        d3.select('body').append('span')
        .attr('id', 'pathvisiojs-is-loaded');
        //console.log('Pathvisiojs done loading.');
        callback(null);
      }
    ]);
  }

  return{
    load:load
  };
}();

     
