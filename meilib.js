/*
* MeiLib - General purpose JavaScript functions for processing MEI documents.
* 
* meilib.js
*
* Author: Zoltan Komives <zolaemil@gmail.com>
* Created: 05.07.2013
* 
*/


var MeiLib = {};

MeiLib.RuntimeError = function (errorcode, message) {
  this.errorcode = errorcode;
  this.message = message;
}

MeiLib.RuntimeError.prototype.toString = function() {
  return 'MeiLib.RuntimeError: ' + this.errorcode + ': ' + this.message?this.message:"";
}


/*
* Enumerate over the children events of node (node is a layer or a beam)
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



/*
* Calculate the duration of an event (number of beats) according to the given meter.
*/
MeiLib.durationOf = function (evnt, meter) {

  IsSimpleEvent = function(tagName) {
    return (tagName === 'note' || tagName === 'rest' || tagName === 'space');
  }

  var durationOf_SimpleEvent = function(simple_evnt, meter) {
    var dur = $(evnt).attr('dur');
    if (!dur) throw new MeiLib.RuntimeError('MeiLib.durationOf:E04', '@dur of <note> or <rest> must be specified.');
    return MeiLib.dur2beats(Number(dur), meter);    
  }
  
  var durationOf_Chord = function(chord, meter, layer_no) {
    if (!layer_no) layer_no = "1";
    var dur = $(chord).attr('dur');
    if (dur) return MeiLib.dur2beats(Number(dur), meter);
    $(chord).find('note').each(function(){ 
      lyr_n = $(this).attr('layer');
      if (!lyr_n || lyr_n === layer_no) {
        var dur_note = $(this).attr('dur');
        if (!dur && dur_note) dur = dur_note;
        else if (dur && dur != dur_note) throw new MeiLib.RuntimeError('MeiLib.durationOf:E05', 'duration of <chord> is ambiguous.');        
      }
    });
    if (dur) return MeiLib.dur2beats(Number(dur), meter);
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
* Find the event with the minimum distance from the location tstamp refers to.
* 
* @param tstamp: timestamp to match against events in the given context. Local timestamp only (without measure part).
* @param layer: a layer obejcts that contains all events in the given measure.
* @param meter: effective time signature obejct { count, unit }.
* @returns: the xml:id of the closest element, or undefined if 'layer' contains no events.
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
  var xmlid;
  xmlid = $(winner).attr('xml:id');
  if (!xmlid) throw new MeiLib.RuntimeError('MeiLib.tstamp2id:E001', 'No xml:id specified for element ' + winner);
  return xmlid;
}

/*
* Find the event with the minimum distance from the location tstamp refers to.
* 
* @param tstamp: timestamp to match against events in the given context.
* @param context: is an array of layer obejcts that belong to a single logical layer --> all events are properly ordered.
*/
MeiLib.tstamp2idInContext = function ( tstamp, context ) {
  //calculate tstamp for every event in context, and compare to tstamp.
  //perform minimum-search (can exit when the value is greater than the value before, since values are properly ordered.)


  //get first event -> current_event;
  //current_tstamp_1 = 0; //
  //distance = tstamp;
  //min_dist distance;
  //do
  //  if distance < min_dist then min_dist <-- distance 
  //  if distance > min_dist then 
  //  
  //
  



  var meter;
  var found = false;
  for (var i=0; i<context.length && !found; ++i) {   
    Vex.LogDebug('<<<< Measure ' + i + " >>>>");
    if (context[i].meter) meter = context[i].meter;
    if (i===0 && !meter) throw new MeiLib.RuntimeError('MeiLib.tstamp2id:E001', 'No time signature specified');
  }
  throw new MeiLib.RuntimeError('MeiLib.E002', 'No event with xml:id="' + eventid + '" was found in the given MEI context.');  
  
}

/*
* Calculates a timestamp value for an event in a given context.
* 
* @param eventid: is the xml:id of the event
* @param context: is an array of contextual objects {layer, meter}. Time signature is mandatory 
*                  for the first one. Layers belong to a single logical layer.
* @returns: the total duration (in beats - in relation to the meter of the target measure) of all events 
*             that happened before the given event in the given context. 
*/
MeiLib.id2tstamp = function (eventid, context) {
  var meter;
  var found = false;
  for (var i=0; i<context.length && !found; ++i) {   
    Vex.LogDebug('<<<< Measure ' + i + " >>>>");
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
* Convert absolute duration into relative duration (nuber of beats) according to time signature
* 
* @param dur: reciprocal value of absolute duration (e.g. 4->quarter note, 8->eighth note, etc.)
* @param meter: time signature object { count, unit }
*/
MeiLib.dur2beats = function(dur, meter) {
  return (meter.unit/dur);
}

/*
* Convert relative duration (nuber of beats) into absolute duration (e.g. quarter note, 
* eighth note, etc) according to time signature
* 
* @param beats: duration in beats
* @param meter: time signature object { count, unit }
* @returns: reciprocal value of absolute duration (e.g. 4->quarter note, 8->eighth note, etc.)
*/
MeiLib.beats2dur = function(beats, meter) {
  return (meter.unit/beats);
}


/*
* 
* @returns: an object { beats:number, found:boolean } where 
*             1. 'found' is true and 'beats' is the total duration of the events that happened before the 
*                 event 'eventid' within 'layer', or
*             2. 'found' is false and 'beats is the total duration of the events in 'layer'.       
*/
MeiLib.sumUpUntil = function(eventid, layer, meter) {
  
  
  //TODO: return { beats, found } ??? d
  var sumUpUntil_inNode = function(node_elem) {
    var node = $(node_elem);
    var node_name = node.prop('localName');
    if (node_name === 'note' || node_name === 'rest') { 
      //TODO: dotted value!
      if (node.attr('xml:id') === eventid) {
        return { beats:0, found:true };
      } else {
        var dur = Number(node.attr('dur'));
        if (!dur) throw new MeiLib.RuntimeError('MeiLib.sumUpUntil:E001', "Duration is not a number ('breve' and 'long' are not supported).");
        var dots = Number(node.attr('dots'));
        //TODO: dots
        var beats = MeiLib.dur2beats(dur, meter);
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
          if (node.find("[xml\\:id='" + eventid + "']")) {
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

