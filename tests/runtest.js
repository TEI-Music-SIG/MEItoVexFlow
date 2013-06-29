
MEI2VF.RunTest = function(test_case, canvas, titleElem){

  $(titleElem).html(test_case.title);

  //load the xml file...
  Vex.LogInfo("Running Test Case Title: '" + test_case.title + "' MEI-XML: '" + test_case.mei_xml + "'");
  xmlDoc=loadXMLDoc(test_case.mei_xml);
  if (xmlDoc) { 
    Vex.LogInfo('MEI-XML loaded.'); 
  } else {
    //TODO: throw exception
  }

  //... and render it onto the canvas
  var MEI = xmlDoc.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'score');
  Vex.LogInfo('Rendering... ');
  MEI2VF.render_notation(MEI, canvas, 981,400);
  Vex.LogInfo('Done (' + test_case.title + ')');
	
}

