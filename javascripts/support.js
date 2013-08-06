
MEI2VF.RunTest = function(test_case, canvas, titleElem, codeElem, descElem){

  $(titleElem).html(test_case.title);
  $(descElem).html(test_case.desc);
  var canvas_width = test_case.canvas_width ? test_case.canvas_width : 1031;
  var canvas_height = test_case.canvas_height ? test_case.canvas_height : 180;
  $(canvas).attr('width', canvas_width);
  $(canvas).attr('height', canvas_height);
  var score_width = canvas_width - 50;
  var score_height = canvas_height - 50;

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
  MEI2VF.render_notation(MEI, canvas, score_width, score_height);
  
  var serializer = new XMLSerializer();
  var strMEI = serializer.serializeToString($(MEI).get(0));
  var strMEI_rplc1 = strMEI.replace(/</g, '&lt;');
  var strMEI_rplc2 = strMEI_rplc1.replace(/>/g, '&gt;');
  $(codeElem).html(strMEI_rplc2);
  
  
  Vex.LogInfo('Done (' + test_case.title + ')');
	
}

function loadXMLDoc(xmlDoc) {
  if (window.XMLHttpRequest) {
    // code for IE7+, Firefox, Chrome, Opera, Safari
    xmlhttp=new XMLHttpRequest();
  } else {
    // code for IE6, IE5
    xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
  }
  xmlhttp.open("GET",xmlDoc,false);
  xmlhttp.send();
  return xmlhttp.responseXML;
}