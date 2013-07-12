
MeiLibTest = function(){


  var mei_xml = 'TC.tstamp2id.xml'
  //load the xml file...
  xmlDoc=loadXMLDoc(mei_xml);
  if (xmlDoc) { 
    console.log('MEI-XML loaded.'); 
  } else {
    //TODO: throw exception
  }

  //... and render it onto the canvas
  var score = xmlDoc.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'score');
  console.log('Start');

  Vex.LogLevel = 4;


  var context = [];
  var meter = { count:4, unit:4};
  // $(score).find('layer').each(function(i, layer) {
  //   context.push({layer:layer, meter:meter});
  // });  
  // 
  // for (var i=32; i<=32; ++i) {
  //   var id = 'v1e' + ((i<10)?'0':'') + i.toString();
  //   console.log(id + ': ' + MeiLib.id2tstamp(id, context));
  // }
  

  console.log('********* TEST: EventEnumerator and durationOf() ****************');
  
  $(score).find('layer').each(function(i, layer) {
    console.log('<<<<measure ' + (i+1).toString());
    context.push({layer:layer, meter:meter});
    var layerEnum = new MeiLib.EventEnumerator(layer);
    var evnt;
    while (!layerEnum.EoI) {
      evnt = layerEnum.nextEvent();
      var id = $(evnt).attr('xml:id'); 
      var idstr = '['+id+']';
      console.log(idstr + MeiLib.durationOf(evnt, meter));
    }
  });
  
  console.log('******************************************************************');
  console.log('********* TEST: tstamp2id() **************************************');
  
  $(score).find('layer').each(function(i, layer) {
    context.push({layer:layer, meter:meter});
  });

  
  var TCs = {
    tstamp2id:[ { name:'TEST: simple', measure:1 }, 
                { name:'TEST: with beams', measure:2 }, 
                { name:'TEST: mRest', measure:3 },
                { name:'TEST: chords', measure:5 } ]
  }

  for (var k=0; k<TCs.tstamp2id.length; ++k) {
    console.log('=================== ' + TCs.tstamp2id[k].name + mei_xml + ':meausre #' + TCs.tstamp2id[k].measure.toString());
    var index=TCs.tstamp2id[k].measure-1;
    var tstamps = ['1', '1.1', '1.25', '1.5', '1.75', '2', '2.1', '2.25', '2.5', '2.9', '3', '3.1', '3.5', '3.9', '4', '4.25', '4.5', '4.75', '5' ];
    for (var i=0; i<tstamps.length; ++i) {
      console.log('tstamp=' + tstamps[i] + '--> xmlid=' + MeiLib.tstamp2id(tstamps[i], context[index].layer, meter));    
    }
  }
  

  // $.each(layers, function(i, layer) {
  //   context.push({layer:layer, meter:meter});
  // });
  
  




  console.log('Done');
	
}

