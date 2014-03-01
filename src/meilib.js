/*
* MeiLib - General purpose JavaScript functions for processing MEI documents.
* 
* meilib.js
*
* Author: Zoltan Komives
* Created: 05.07.2013
* 
* Copyright © 2012, 2013 Richard Lewis, Raffaele Viglianti, Zoltan Komives,
* University of Maryland
* 
* Licensed under the Apache License, Version 2.0 (the "License"); you
* may not use this file except in compliance with the License.  You may
* obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
* implied.  See the License for the specific language governing
* permissions and limitations under the License.
*/


var MeiLib = {};
MeiLib.JSON = {};

MeiLib.RuntimeError = function (errorcode, message) {
  this.errorcode = errorcode;
  this.message = message;
}

MeiLib.RuntimeError.prototype.toString = function() {
  return 'MeiLib.RuntimeError: ' + this.errorcode + ': ' + this.message?this.message:"";
}

MeiLib.createPseudoUUID = function() {
  return ("0000" + (Math.random()*Math.pow(36,4) << 0).toString(36)).substr(-4)
}

/**
* Enumerate over the children events of node (node is a layer or a beam).
* 
* @param node an XML DOM object
*/
MeiLib.EventEnumerator = function (node) {
  this.init(node);
}

MeiLib.EventEnumerator.prototype.init = function(node) {
  if (!node) throw new MeiLib.RuntimeError('MeiLib.EventEnumerator.init():E01', 'node is null or undefined');
  this.node = node;
  this.next_evnt = null;
  this.EoI = true; // false if and only if next_evnt is valid.
  this.children = $(this.node).children();
  this.i_next = -1;
  this.read_ahead();
}

MeiLib.EventEnumerator.prototype.nextEvent = function() {
  if (!this.EoI) {
    var result = this.next_evnt;
    this.read_ahead();
    return result;
  }
  throw new MeiLib.RuntimeError('MeiLib.LayerEnum:E01', 'End of Input.')
}

MeiLib.EventEnumerator.prototype.read_ahead = function() {
  if (this.beam_enumerator) { 
    if (!this.beam_enumerator.EoI) {
      this.next_evnt = this.beam_enumerator.nextEvent();
      this.EoI = false;
    } else {
      this.EoI = true;
      this.beam_enumerator = null;
      this.step_ahead()
    }
  } else {
    this.step_ahead()
  }
}

MeiLib.EventEnumerator.prototype.step_ahead = function () {
  ++this.i_next;
  if (this.i_next < this.children.length) 
  { 
    this.next_evnt = this.children[this.i_next];
    var node_name = $(this.next_evnt).prop('localName');
    if (node_name === 'note' || node_name === 'rest' || node_name === 'mRest' || node_name === 'chord') {
      this.EoI = false
    } else if (node_name === 'beam') {
      this.beam_enumerator = new MeiLib.EventEnumerator(this.next_evnt);
      if (!this.beam_enumerator.EoI) {
        this.next_evnt = this.beam_enumerator.nextEvent();
        this.EoI = false;        
      } else {
        this.EoI = true;
      }
    }
  } else {
    this.EoI = true;
  }
}


/**
* Calculate the duration of an event (number of beats) according to the given meter.
* 
* Event refers to musical event such as notes, rests, chords. The MEI element <space/> is also
* considered an event.
* 
* @param evnt an XML DOM object
* @param meter the time signature object { count, unit }
*/
MeiLib.durationOf = function (evnt, meter) {

  IsSimpleEvent = function(tagName) {
    return (tagName === 'note' || tagName === 'rest' || tagName === 'space');
  }

  var durationOf_SimpleEvent = function(simple_evnt, meter) {
    var dur = $(simple_evnt).attr('dur');
    if (!dur) throw new MeiLib.RuntimeError('MeiLib.durationOf:E04', '@dur of <note>, <rest> or <space> must be specified.');
    return MeiLib.dotsMult(simple_evnt) * MeiLib.dur2beats(Number(dur), meter);    
  }
  
  var durationOf_Chord = function(chord, meter, layer_no) {
    if (!layer_no) layer_no = "1";
    var dur = $(chord).attr('dur');
    var dotsMult = MeiLib.dotsMult(chord);
    if (dur) return dotsMult * MeiLib.dur2beats(Number(dur), meter);
    $(chord).find('note').each(function(){ 
      lyr_n = $(this).attr('layer');
      if (!lyr_n || lyr_n === layer_no) {
        var dur_note = $(this).attr('dur');
        var dotsMult_note = MeiLib.dotsMult(chord);
        if (!dur && dur_note) { 
          dur = dur_note; 
          dotsMult = dotsMult_note;
        } else if (dur && dur != dur_note) {
          throw new MeiLib.RuntimeError('MeiLib.durationOf:E05', 'duration of <chord> is ambiguous.');
        }
      }
    });
    if (dur) return dotsMult * MeiLib.dur2beats(Number(dur), meter);
    throw new MeiLib.RuntimeError('MeiLib.durationOf:E06', '@dur of chord must be specified either in <chord> or in at least one of its <note> elements.');
  }

  var durationOf_Beam = function(beam, meter) {
    var acc=0;
    beam.children().each(function() {
      var dur_b;
      var dur;
      var tagName = this.prop('localName');
      if ( IsSimpleEvent(tagName) ) {
        dur_b = durationOf_SimpleEvent(this, meter);
      } else if ( tagName === 'chord' ) {
        dur_b = durationOf_Chord(this, meter);
      } else {
        throw new MeiLib.RuntimeError('MeiLib.durationOf:E03', "Not supported element '" + tagName + "'");
      }
      acc += dur_b;
    });
    return acc;
  }
  
  var evnt_name = $(evnt).prop('localName');
  if ( IsSimpleEvent(evnt_name) ) {
    return durationOf_SimpleEvent(evnt, meter);
  } else if (evnt_name === 'mRest') {
    return meter.count;
  } else if (evnt_name === 'chord') {
    return durationOf_Chord(evnt, meter);
  } else if (evnt_name === 'beam') {
    return durationOf_Beam(evnt, meter);
  } else {
    throw new MeiLib.RuntimeError('MeiLib.durationOf:E05', "Not supported element: '" + evnt_name + "'");
  }
  
}


/*
* Find the event with the minimum distance from of the given timestamp.
* 
* @param tstamp {String} the timestamp to match against events in the given context. Local timestamp only (without measure part).
* @param layer {Obejct} an XML DOM object, contains all events in the given measure.
* @param meter {Object} the effective time signature object { count, unit } in the measure containing layer.
* @return {String} the xml:id of the closest element, or undefined if <code>layer</code> contains no events.
*/
MeiLib.tstamp2id = function ( tstamp, layer, meter ) {
  var ts = Number(tstamp); 
  var ts_acc = 0;  // total duration of events before current event
  var c_ts = function() { return ts_acc+1; } // tstamp of current event
  var distF = function() { return ts - c_ts(); } // signed distance between tstamp and tstamp of current event;

  var eventList = new MeiLib.EventEnumerator(layer); 
  var evnt;
  var dist;
  var prev_evnt; // previous event
  var prev_dist; // previuos distance
  while (!eventList.EoI && (dist === undefined || dist>0)) {
    prev_evnt = evnt;
    prev_dist = dist;
    evnt = eventList.nextEvent();
    dist = distF();    
    ts_acc += MeiLib.durationOf(evnt, meter);
  }

  if (dist === undefined) return undefined;
  var winner;
  if (dist < 0) {
    if (prev_evnt && prev_dist<Math.abs(dist) ) { winner = prev_evnt; }
    else { winner = evnt; }
  } else {
    winner = evnt;
  } 
  var xml_id;
  xml_id = $(winner).attr('xml:id');
  if (!xml_id) {
    xml_id = MeiLib.createPseudoUUID();
    $(winner).attr('xml:id', xml_id);
  }
  return xml_id;
}

MeiLib.XMLID = function(elem) {
  xml_id = $(elem).attr('xml:id');
  if (!xml_id) {
    xml_id = MeiLib.createPseudoUUID();
    $(elem).attr('xml:id', xml_id);
  }
  return xml_id;
}

/*
* Calculates a timestamp value for an event in a given context. (Event refers to musical events such 
* as notes, rests and chords).
* 
* @param eventid {String} the xml:id of the event
* @param context {Array} of contextual objects {layer, meter}. Time signature is mandatory 
*                        for the first one, but optional for the rest. All layers belong to a single 
*                        logical layer. They are the layer elements from some consequtive measures.
* @return {String} the MEI timestamp value (expressed in beats relative to the meter of the measure containing the event)
*                  of all events that happened before the given event in the given context. If the event is not in the first 
*                  measure (layer) the timestamp value contains a 'measure part', that is for example 2m+2 if the
*                  event is at the second beat in the 3rd measure.
*/
MeiLib.id2tstamp = function (eventid, context) {
  var meter;
  var found = false;
  for (var i=0; i<context.length && !found; ++i) {   
    if (context[i].meter) meter = context[i].meter;
    if (i===0 && !meter) throw new MeiLib.RuntimeError('MeiLib.id2tstamp:E001', 'No time signature specified');

    var result = MeiLib.sumUpUntil(eventid, context[i].layer, meter);
    if (result.found) {
      found = true;
      return i.toString() + 'm' + '+' + (result.beats+1).toString();
    } 
  }
  throw new MeiLib.RuntimeError('MeiLib.id2tstamp:E002', 'No event with xml:id="' + eventid + '" was found in the given MEI context.');
};


/*
* Convert absolute duration into relative duration (nuber of beats) according to time signature.
* 
* @param dur {Number} reciprocal value of absolute duration (e.g. 4->quarter note, 8->eighth note, etc.)
* @param meter the time signature object { count, unit }
* @return {Number}
*/
MeiLib.dur2beats = function(dur, meter) {
  return (meter.unit/dur);
}

/*
* Convert relative duration (nuber of beats) into absolute duration (e.g. quarter note, 
* eighth note, etc) according to time signature.
* 
* @param beats {Number} duration in beats
* @param meter time signature object { count, unit }
* @return {Number} reciprocal value of absolute duration (e.g. 4 -> quarter note, 8 -> eighth note, etc.)
*/
MeiLib.beats2dur = function(beats, meter) {
  return (meter.unit/beats);
}

/**
 * Converts the <code>dots</code> attribute value into a duration multiplier. 
 *
 * @param node XML DOM object containing a node which may have <code>dots</code> attribute
 * @return {Number} The result is 1 if no <code>dots</code> attribute is present. For <code>dots="1"</code> 
 *                  the result is 1.5, for <code>dots="2"</code> the result is 1.75, etc.
 */
MeiLib.dotsMult = function(node) {
  var dots = $(node).attr('dots');
  dots = Number(dots || "0");
  var mult = 1;
  for (;dots>0;--dots) { mult += (1/Math.pow(2,dots)) };  
  return mult;
}

/**
* For a given event (such as note, rest chord or space) calculates the combined legth of preceding events, 
* or the combined lenght of all events if the given event isn't present.
* 
* @param eventid {String} the value of the xml:id attribute of the event
* @param layer {Object} an XML DOM object containing the MEI <Layer> element
* @param meter the time signature object { count, unit }
* @return an object { beats:number, found:boolean }.
*          1. 'found' is true and 'beats' is the total duration of the events that happened before the 
*               event 'eventid' within 'layer', or
*          2. 'found' is false and 'beats is the total duration of the events in 'layer'.       
*/
MeiLib.sumUpUntil = function(eventid, layer, meter) {
  
  var sumUpUntil_inNode = function(node_elem) {
    var node = $(node_elem);
    var node_name = node.prop('localName');
    if (node_name === 'note' || node_name === 'rest') { 
      if (node.attr('xml:id') === eventid) {
        return { beats:0, found:true };
      } else {
        var dur = Number(node.attr('dur'));
        if (!dur) throw new MeiLib.RuntimeError('MeiLib.sumUpUntil:E001', "Duration is not a number ('breve' and 'long' are not supported).");
        var dots = node.attr('dots');
        dots = Number(dots || "0");
        var beats = MeiLib.dotsMult(node) * MeiLib.dur2beats(dur, meter);
        
        return { beats:beats, found:false };
      }
    } else if (node_name === 'mRest') {
      if (node.attr('xml:id') === eventid) {
        found = true;
        return { beats:0, found:true };
      } else {
        return { beats:meter.count, found:false }; //the duration of a whole bar expressed in number of beats.
      }
    } else if (node_name === 'layer' || node_name === 'beam') {
      
      //sum up childrens' duration
      var beats = 0;
      var children = node.children();
      var found = false;
      for (var i=0; i<children.length && !found; ++i) {
        var subtotal = sumUpUntil_inNode(children[i]);
        beats += subtotal.beats;
        found = subtotal.found;
      }
      return { beats:beats, found:found };
    } else if (node_name === 'chord') {
      var chord_dur = node.attr('dur'); 
      if (node.attr('xml:id')===eventid) {
        return { beats:0, found:true };
      } else {        
        //... or find the longest note in the chord ????
        var chord_dur = node.attr('dur'); 
        if (chord_dur) { 
          if (node.find("[xml\\:id='" + eventid + "']").length) {
            return { beats:0, found:true };
          } else {
            return { beats:MeiLib.dur2beats(chord_dur, meter), found:found };
          }        
        } else {
          var children = node.children();
          var found = false;
          for (var i=0; i<children.length && !found; ++i) {
            var subtotal = sumUpUntil_inNode(children[i]);
            beats = subtotal.beats;
            found = subtotal.found;
          }
          return { beats:beats, found:found };            
        }
      };
    }    
    return { beats:0, found:false };
  }


  return sumUpUntil_inNode(layer);  
}

/**
 * Represents an MEI <app> element. 
 * 
 * @param xmlID {String} the xml:id attribute value of the <app> element.
 * @param parentID {String} the xml:id attribute value of the direct parent element of the <app> element.
 */
MeiLib.App = function(xmlID, parentID) {
  this.xmlID = xmlID;
  this.variants = [];
  this.parentID = parentID;
}

/**
 * Represents a reference to a variant (<lem> or <rdg>) which is to be inserted in place of an <app>.
 *
 */
MeiLib.AppReplacement = function(tagname, xmlID) {
  this.tagname = tagname;
  this.xmlID = xmlID;
}

/**
 * Represents a <lem> or <rdg> element.
 * 
 * @param xmlID {String} the xml:id attribute value of the element.
 * @param tagname {String} 'lem' for <lem> and 'rdg for <rdg> elements.
 * @param source {String} space-separated list of the source IDs what the given variant belongs to.
 */
MeiLib.Variant = function(xmlID, tagname, source){
  this.xmlID = xmlID;
  this.tagname = tagname;
  this.source = source;
}

/**
 * A variant-MEI is an MEI that contain one or more <app> elements.
 * 
 * The <code>VarianMei</code> class offers methods to access information regarding the available 
 * variants in the score.
 * 
 * @param variant_mei is an XML document.
 */
MeiLib.VariantMei = function(variant_mei) {
  if (variant_mei) this.init(variant_mei);
}


/**
 * Initializes a <code>MeiLib.VariantMei</code> object.
 *
 * The constructor extracts information about the variants and compiles them into JS objects. The obejcts are created and
 * exposed:
 *  1. <code>sourceList</code> is the list of sources as defined in MEI's header (meiHead).
 *  2. <code>APPs</code> is an object which contains infromation about each <app> elements. It is indexed by the 
 *     xml:id attribute value of th <app> elements.
 *
 * @param variant_mei is an XML document.
 */
MeiLib.VariantMei.prototype.init = function(variant_mei) {
  this.xmlDoc = variant_mei;
  this.head = variant_mei.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'meiHead');
  this.score = variant_mei.getElementsByTagNameNS("http://www.music-encoding.org/ns/mei", 'score');
  this.parseSourceList();
  this.parseAPPs();
}

MeiLib.VariantMei.prototype.getVariantScore = function() {
  return this.score;
}

MeiLib.VariantMei.prototype.getAPPs = function() {
  return this.APPs;
}

MeiLib.VariantMei.prototype.getSourceList = function() {
  return this.sourceList;
}

/**
 * Extracts information about the sources as defined in the MEI header.
 * 
 * @return {Object} is a container indexed by the xml:id attribute value of the <sourceDesc> element.
 */
MeiLib.VariantMei.prototype.parseSourceList = function() {
  var srcs = $(this.head).find('sourceDesc').children();
  this.sourceList = {};
  var i
  for(i=0;i<srcs.length;++i) {
    var src = srcs[i];
    var xml_id = $(src).attr('xml:id');
    var serializer = new XMLSerializer();
    this.sourceList[xml_id] = serializer.serializeToString(src);    
  }
  return this.sourceList;
}

/**
 * Extracts information about the <app> elements in the score. The method stores its result in 
 * the <code>APPs</code> property.
 * 
 * <code>APPs</code> is a container of  MeiLib.App obejcts indexed by the xml:id attribute value of the <app> elements. 
 */
MeiLib.VariantMei.prototype.parseAPPs = function() {
  this.APPs = {};
  var apps = $(this.score).find('app');
  for (var i=0;i<apps.length; i++) {
    var app = apps[i];
    var parent = app.parentNode;
    var variants = $(app).find('rdg, lem');
    var AppsItem = new MeiLib.App(MeiLib.XMLID(app), MeiLib.XMLID(parent));
    AppsItem.variants = {};
    for (var j=0;j<variants.length;j++) {
      var variant = variants[j];
      var source = $(variant).attr('source');
      var tagname = $(variant).prop('localName');
      var varXMLID = MeiLib.XMLID(variant);
      AppsItem.variants[varXMLID] = new MeiLib.Variant(varXMLID, tagname, source);
    }
    this.APPs[MeiLib.XMLID(app)] = AppsItem;
  }
}

/**
 * Get a slice of the score.
 *
 * @param params {Obejct} contains the parameters for slicing. For more info see at documentation 
 *               of MeiLib.SliceMEI
 * @return a VariantMei object
 */
MeiLib.VariantMei.prototype.getSlice = function(params) {
  var slice = new MeiLib.VariantMei();
  slice.xmlDoc = this.xmlDoc;
  slice.head = this.head;
  slice.score = [MeiLib.SliceMEI(this.score[0], params)];
  slice.sourceList = this.sourceList;
  slice.APPs = this.APPs;
  return slice;
}

/**
 * The MeiLib.SingleVariantPathScore class offers methods to transform a variant-MEI into a single-variant-path MEI, 
 * and manipulate the single-variant-path score.
 * 
 * A single-variant-path score is an MEI which contains no <app> element. The term 'variant-path' refers to a combination of
 * variants at different locations in the score. For instance, consider a score that has 2 different variants at measure 5 (let's call them 
 * (variant A and variant B), and it contains three different variants at measure 10 (let's call those ones variants C, D and E)!
 * In this case a variant path would contain two elements the first one is either A or B, the second one is C, D or E.
 *
 * The contructor takes a variant-MEI as an argument and transforms it into an MEI that contains no <app> elements any more, but 
 * instead each <app> is replaced by the content of one its children <rdg> or <lem>.
 *
 * The class cretes a copy of the original MEI and performs the transformation 
 * on the copy, hence the original MEI remains intact. The calss also stores a reference to the 
 * original MEI so it can be accessed later.
 * 
 * The extracted information about all the <app> elements are stored in an array. Using this array the application
 * can access information such as what variants are present in the score, what source a variant comes from, etc. 
 * This array is exposed by te <code>APPs</code> property.
 * 
 * The constructor also records for each app element, the content of which childrend <rdg> or <lem> is included in 
 * the transformed score. This information is stored in the <code>variantPath</code> property.
 */
MeiLib.SingleVariantPathScore = function(variantMEI, appReplacements){
  this.init(variantMEI, appReplacements);
}

/**
 * Performs the initial transformation of the variant-MEI.
 * 
 * Create a single-variant-path score from a variant-MEI. A single-variant-path score is an MEI which 
 * contains no <app> element. It is created from an MEI which does contain one or more <app> elements, (in 
 * other words a variant-MEI). Each <app> element in the variant-MEI is replaced by the content of 
 * one its children <rdg> or <lem>. The replacement is marked with processing instructions so it can be
 * replaced again later.
 * 
 * @param variantMEI 
 * @param appReplacements an indexed container of { tagname, xmlID } objects
 * @return an XML DOM object, the transformed score
 */
MeiLib.SingleVariantPathScore.prototype.init = function(variantMEI, appReplacements) {

  appReplacements = appReplacements || {};

  this.variant_score = variantMEI.score[0];
  this.APPs = variantMEI.APPs;
  // Make a copy of variant-mei. We don't want to remove nodes from the original object.
  this.score = this.variant_score.cloneNode(true);
  this.variantPath = {};
  
  // Transform this.score into a single-variant-score:
  //
  //   * itereate through all <app> elements:
  //     o if there's replacement defined for the app (by appReplacements[app.xmlID]),
  //      - then apply that replacement, if there's nothing defined, make default selection:
  //      - insert the content of first lem or first rdg! 
  // When replacing an item, insert mark the location of replacement with XML 
  // processing instructions.
  
  var apps = $(this.score).find('app');
  
  var var_instance2insert;
  var rdg_xml_id
  var this_score = this.score;
  var this_variantPath = this.variantPath;
  var this_APPs = this.APPs;
  var xmlDoc = variantMEI.xmlDoc;
  $(apps).each(function(i, app){
    var app_xml_id = MeiLib.XMLID(app);
    var replacement = appReplacements[app_xml_id];
    if (replacement) {
      // apply replacement, or...
      rdg_xml_id = replacement.xmlID;
      var tagname = replacement.tagname;
      var rdg_inst = $(this_score).find(tagname + '[xml\\:id="' + rdg_xml_id +'"]')[0];
      if (!rdg_inst) throw new MeiLib.RuntimeError('MeiLib.SingleVariantPathScore.prototype.init():E01', "Cannot find <lem> or <rdg> with @xml:id '" + rdg_xml_id + "'.");
      var_instance2insert = rdg_inst.childNodes;      
    } else {
      // ...the default replacement is...
      var lem = $(app).find('lem')[0];
      if (lem) {
        // ...the first lem, or...
        rdg_xml_id = MeiLib.XMLID(lem);
        var_instance2insert = lem.childNodes;
      } else {
        // ...the first rdg.
        var rdg = $(app).find('rdg')[0];
        rdg_xml_id = MeiLib.XMLID(rdg);
        var_instance2insert = rdg.childNodes;
      }
    }
    var parent = app.parentNode;
    var PIStart = xmlDoc.createProcessingInstruction('MEI2VF', 'rdgStart="' + app_xml_id + '"');
    parent.insertBefore(PIStart, app);
    $.each(var_instance2insert, function () { 
      parent.insertBefore(this.cloneNode(true), app); 
    });
    var PIEnd = xmlDoc.createProcessingInstruction('MEI2VF', 'rdgEnd="' + app_xml_id + '"');
    parent.insertBefore(PIEnd, app);
    parent.removeChild(app);

    this_variantPath[app_xml_id] = this_APPs[app_xml_id].variants[rdg_xml_id];
  })

  return this.score;
}

/**
 * Updates the whole score by replacing one or more variant instance with another variant. 
 * 
 * @param variantPathUpdate {object} the list of changes. It is an container of xml:id attribute values of 
 *                                   <rdg> or <lem> elements, indexed by the xml:id attribute values of the
 *                                   corresponding <app> elements.
 *                                   variantPathUpdate[appXmlID] = varInstXmlID is the xml:id attribute value of 
 *                                   the <rdg> or <lem> element, which is to be inserted in place of the 
 *                                   original <app xml:id=appXmlID>.
 */
MeiLib.SingleVariantPathScore.prototype.updateVariantPath = function(variantPathUpdate) {
  for (appID in variantPathUpdate) {
    var variant2insert = this.APPs[appID].variants[variantPathUpdate[appID]];
    this.replaceVariantInstance({appXmlID:appID, replaceWith:variant2insert});
  }
}

/**
 * Replace a variant instance in the score and the current variant path obejct (this.variantPath)
 * 
 * @param var_inst_update {object}
 * @return the updated score
 */
MeiLib.SingleVariantPathScore.prototype.replaceVariantInstance = function(var_inst_update) {
  
  var replaceWith_xmlID = var_inst_update.replaceWith.xmlID;
  var var_inst_elem = $(this.variant_score).find(var_inst_update.replaceWith.tagname + '[xml\\:id="' + replaceWith_xmlID +'"]')[0];
  var app_xml_id = var_inst_update.appXmlID;
  var var_instance2insert = var_inst_elem.childNodes;
  
  var match_pseudo_attrValues = function(data1, data2) {
    data1 = data1.replace("'", '"');
    data2 = data2.replace("'", '"');
    return data1 === data2;
  }
  
  var parent = $(this.score).find('[xml\\:id=' + this.APPs[app_xml_id].parentID +']')[0];
  var children = parent.childNodes;
  var inside_inst = false;
  var found = false;
  var insert_before_this = null;
  $(children).each( function() {
    var child = this;
    if (child.nodeType === 7) {
      if (child.nodeName === 'MEI2VF' && match_pseudo_attrValues(child.nodeValue, 'rdgStart="' + app_xml_id + '"')) {
        inside_inst = true;     
        found = true;   
      } else if (child.nodeName === 'MEI2VF' && match_pseudo_attrValues(child.nodeValue, 'rdgEnd="' + app_xml_id + '"')) {
        inside_inst = false;                
        insert_before_this = child;
      }
    } else if (inside_inst) {
      parent.removeChild(child);
    } 
  });

  if (!found) throw "processing instruction not found"; 
  if (inside_inst) throw "Unmatched <?MEI2VF rdgStart?>";
    
  var insert_method; 
  if (insert_before_this) { 
    insert_method = function (elem) { parent.insertBefore(elem, insert_before_this) };
  } else {
    insert_method = function (elem) { parent.appendChild(elem) };
  }

  $.each(var_instance2insert, function () { 
     insert_method(this.cloneNode(true)); 
  });  
   
  this.variantPath[app_xml_id] = var_inst_update.replaceWith;
   
  return this.score;
}



/**
 * Get a slice of the score.
 *
 * @param params {Obejct} contains the parameters for slicing. For more info see at documentation 
 *               of MeiLib.SliceMEI
 * @return an XML DOM object
 */
MeiLib.SingleVariantPathScore.prototype.getSlice = function(params) {
  return MeiLib.SliceMEI(this.score, params);
}


/**
 * Returns a slice of the MEI. The slice is specified by the number of the starting and ending measures.
 *
 * About the <code>staves</code> parameter: it specifies a list of staff numbers. If it is defined, only the listed staves
 * will be kept in the resulting slice. The following elements will be removed from:
 *   1. <staffDef> elements (@staff value is matched against the specified list)
 *   2. <staff> elements (@n value is matched against the specified list)
 *   3. any other child element of measures that has @staff specified AND it is not listed.
 * 
 * Note that <staff> elements without @n will be removed.
 * 
 * @param params {obejct} like { 
 *                               start_n:NUMBER, 
 *                               end_n:NUMBER, 
 *                               noKey:BOOLEAN, 
 *                               noClef:BOOLEAN, 
 *                               noMeter:BOOLEAN,
 *                               noConnectors, 
 *                               staves:[NUMBER] 
 *                             },
 *                        where <code>noKey</code>, <code>noClef</code> and <code>noMeter</code> and <code>noConnectors</code> 
 *                        are optional. taves is optional. If staves is set, it is an array of staff numbers. Only the staves 
 *                        specified in the list will be included in the resulting MEI.
 * @return XML DOM object
 */
MeiLib.SliceMEI = function(MEI, params) {
  
  var setVisibles = function(elements, params) {
    $.each(elements, function (i, elem) {
      if (params.noClef) $(elem).attr('clef.visible', 'false');
      if (params.noKey) $(elem).attr('key.sig.show', 'false');
      if (params.noMeter) $(elem).attr('meter.rend', 'false');
    }); 
  }

  var paramsStaves = params.staves;
  if (paramsStaves) {
    var staffDefSelector = '';
    var staffNSelector = '';
    var commaspace = '';
    for (var i=0;i<paramsStaves.length;i++){
      staffDefSelector += commaspace + '[n="' + paramsStaves[i] + '"]';
      staffNSelector += commaspace + '[staff="' + paramsStaves[i] + '"]'
      if (i === 0) commaspace = ', ';
    }
  }

  
  var slice = MEI.cloneNode(true);
  var scoreDefs;
  if (paramsStaves) $(slice).find('staffDef').remove(':not(' + staffDefSelector + ')');
  if (params.noClef || params.noKey || params.noMeter) {
    var staffDefs = $(slice).find('staffDef');
    var scoreDefs = $(slice).find('scoreDef');
    setVisibles(scoreDefs, params);
    setVisibles(staffDefs, params);
  }
  if (params.noConnectors) {
    $(slice).find('staffGrp').removeAttr('symbol');
  }
  var section = $(slice).find('section')[0];
  var inside_slice = false;
  var found = false;

  /** 
   * Iterate through each child of the seciont and remove everything outside the slice.
   * Remove  
   */ 
  var section_children = section.childNodes;
  $(section_children).each( function() {
    var child = this;

    if (!inside_slice) {
      if (child.localName === 'measure' && Number($(child).attr('n')) === params.start_n) {
        inside_slice = true;
        found = true;
      } else {
        section.removeChild(child);
      } 
    } 

    if (inside_slice) {
      //remove unwanted staff
      if (paramsStaves) {
        $(child).find('[staff]').remove(':not(' + staffNSelector + ')');
        var staves = $(child).find('staff');
        $(staves).each(function() {
          var staff = this;
          if ($.inArray(Number($(staff).attr('n')), paramsStaves) === -1) {
            var parent = this.parentNode;
            parent.removeChild(this);
          } 
        })
      }
      
      //finish inside_slice state if it's the end of slice.
      if (child.localName === 'measure' && Number($(child).attr('n')) === params.end_n) {
        inside_slice = false;
      }
    }

  });

  return slice;
}
