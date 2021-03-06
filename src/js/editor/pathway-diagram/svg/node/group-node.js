pathvisiojs.renderer.svg.node.groupNode = function(){
  'use strict';
  function render(args, callback) {
    if (!args.container) {
      throw new Error('Error: container element not specified for rendering groupNode.');
    }
    if (!args.data) {
      throw new Error('Error: group data missing for rendering groupNode.');
    }

    pathvisiojs.renderer.svg.node.render(args, function(groupContainer) {
      groupContainer.attr("class", function (d) {
        var cssClass = 'node group-node ' + pathvisiojs.renderer.svg.convertToCssClassName(d.groupType) + ' ';
        return cssClass;
      })

      var groupContents = args.data.contains;
      callback(groupContainer, groupContents);
    });
  }
 
  return {
    render:render
  };
}();
