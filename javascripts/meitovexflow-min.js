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

MeiLib.createPseudoUUID = function() {
  return ("0000" + (Math.random()*Math.pow(36,4) << 0).toString(36)).substr(-4)
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
  var xml_id;
  xml_id = $(winner).attr('xml:id');
  if (!xml_id) {
    xml_id = MeiLib.createPseudoUUID();
    $(winner).attr('xml:id', xml_id);
  }
  return xml_id;
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

// Component of MEItoVexFlow
// Author: Raffaele Viglianti, 2012
// 
// Tables for MEI <-> VexFlow values

mei2vexflowTables = {}

mei2vexflowTables.positions = {
  'above' : Vex.Flow.Modifier.Position.ABOVE,
  'below' : Vex.Flow.Modifier.Position.BELOW
}

mei2vexflowTables.hairpins = {
  'cres' : Vex.Flow.StaveHairpin.type.CRESC,
  'dim' : Vex.Flow.StaveHairpin.type.DECRESC
}

mei2vexflowTables.articulations = {
  'acc': 'a>',
  'stacc': 'a.',
  'ten': 'a-',
  'stacciss': 'av',
  'marc': 'a^',
  //'marc-stacc':
  //'spicc':
  //'doit':
  //'rip':
  //'plop':
  //'fall':
  //'bend':
  //'flip':
  //'smear':
  'dnbow': 'am',
  'upbow': 'a|',
  //'harm':
  'snap': 'ao',
  //'fingernail':
  //'ten-stacc':
  //'damp':
  //'dampall':
  //'open':
  //'stop':
  //'dbltongue':
  //'trpltongue':
  //'heel':
  //'toe':
  //'tap':
  'lhpizz': 'a+',
  'dot': 'a.',
  'stroke': 'a|'
};

Node.prototype.attrs = function() {
  var i;
  var attrs = {};
  for (i in this.attributes) {
    attrs[this.attributes[i].name] = this.attributes[i].value;
  }
  return attrs;
};

Array.prototype.all = function(test) {
  test = test || function(a) { return a == true; };

  var i;
  for (i = 0; i < this.length; i++) {
    if (test(this[i]) === false) { return false; }
  }
  return true;
};

Array.prototype.any = function(test) {
  test = test || function(a) { return a == true; };

  var i;
  for (i = 0; i < this.length; i++) {
    if (test(this[i]) === true) { return true; }
  }
  return false;
};


MEI2VF = {}

MEI2VF.RUNTIME_ERROR = function(error_code, message) {
  this.error_code = error_code;
  this.message = message;
}

MEI2VF.RUNTIME_ERROR.prototype.toString = function() {
  return "MEI2VF.RUNTIME_ERROR: " + this.error_code + ': ' + this.message;
}

MEI2VF.render_notation = function(score, target, width, height) {
  var width = width || 800;
  var height = height || 350;
  var n_measures; // = $(score).find('measure').get().length;
  var measure_width;// = Math.round(width / n_measures);

  var context;
  var measures = [];
  var beams = [];
  var notes = [];
  var notes_by_id = {};
  var staves_by_n = [];
  var ties = [];
  var slurs = [];
  var hairpins = [];
  var unresolvedTStamp2 = [];
  
  var SYSTEM_SPACE = 50;
  var system_left = 20;
  var system_top = 0;
  var measure_left = system_left;
  var bottom_most = 0;
  var system_n = 0;
  var nb_of_measures = 0; //number of measures already rendered in the current system;
  var system_break = false;
  var new_section = true;
  
  var staffInfoArray = new Array();
  var staveConnectors = {};
  
  var count_measures_siblings_till_sb = function(element) {
    Vex.Log('count_measures_siblings_till_sb() {}');
    if (element.length === 0) return 0;
    switch ($(element).prop('localName')) {
      case 'measure': return 1 + count_measures_siblings_till_sb( $(element).next());
      case 'sb': return 0; 
      default: return count_measures_siblings_till_sb($(element).next());
    }
  }
  
  var update_measure_width = function (measure) {
    n_measures = count_measures_siblings_till_sb(measure);
    measure_width = Math.round( (width-system_left)/n_measures);    
    Vex.LogDebug('update_measure_width(): ' + n_measures + ', width:' + measure_width);
  }
  
  var startSystem = function(measure) {
    update_measure_width(measure);
    Vex.LogDebug('startSystem() {enter}');
    if (new_section) {
      nb_of_measures = 0;
      measure_left = system_left;      
      system_n += 1;
      system_top = bottom_most + SYSTEM_SPACE*(system_top>0?1:0);
      new_section = false;
      system_break = false;
      $.each(staffInfoArray, function(i,staff_info) { 
        if (staff_info) {
          staff_info.renderWith.clef = true;
          staff_info.renderWith.keysig = true;
          staff_info.renderWith.timesig = true;          
        }
      });      
      // staffInfo.renderWith.clef = true;
      // staffInfo.renderWith.keysig = true;
      // staffInfo.renderWith.timesig = true;
    } else if (system_break) {
      nb_of_measures = 0;
      measure_left = system_left;
      system_n += 1;
      system_top = bottom_most + SYSTEM_SPACE;
      system_break = false;
      // staffInfo.renderWith.clef = true;
      // staffInfo.renderWith.keysig = true;
      $.each(staffInfoArray, function(i,staff_info) { 
        if (staff_info) {
          staff_info.renderWith.clef = true;
          staff_info.renderWith.keysig = true;
        }
      });
    }
  }
  
  var moveOneMeasure = function() {
      if (measures[measures.length-1]) {
      var previous_measure = measures[measures.length-1][0];

      measure_left = previous_measure.x + previous_measure.width;      
      Vex.LogDebug('moveOneMeasure(): measure_left:' + measure_left);
    } else {
      measure_left = system_left;
    }
  }

  
  var atStartSystem = function () {
    return (new_section || system_break );
  }
  
  var get_attr_value = function(element, attribute) {
    var result = get_attr_value_opt(element, attribute);
    if (!result) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.MissingAttribute', 'Attribute ' + attribute + ' is mandatory.');
    return result;
  }

  var get_attr_value_opt = function(element, attribute) {
    var result = $(element).attr(attribute);
    return result;
  }

  var mei_note2vex_key = function(mei_note) {
    mei_note = (typeof mei_note === 'number' &&
                arguments.length === 2 && 
                typeof arguments[1] === 'object') ? arguments[1] : mei_note;

    var pname = $(mei_note).attr('pname');
    var oct = $(mei_note).attr('oct');
    if (!pname  || !oct) {
      throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.MissingAttribute', 'pname and oct attributes must be specified for <note>');
    }
    return pname + '/' + oct;
  };

  //Add annotation (lyrics)
  var mei_syl2vex_annot = function(mei_note) {
    var syl = $(mei_note).find('syl'); 
    var full_syl = '';
    $(syl).each(function(i,s){ 
      var dash = ($(s).attr('wordpos')=='i' || $(s).attr('wordpos')=='m') ? '-' : '';
      full_syl += (i>0 ? '\n' : '')+$(s).text()+dash;
    });
    var dash = (syl.attr('wordpos')=='i' || syl.attr('wordpos')=='m') ? '-' : '';
    return full_syl; 
  }
  
  //Add annotation (directions)
  var mei_dir2vex_annot = function(parent_measure, mei_note) {
    var dir = $(parent_measure).find('dir')
    var dir_text = '';
    var pos = '';
    $(dir).each(function(){
      var startid = get_attr_value(this, 'startid');
      var xml_id = get_attr_value(mei_note,'xml:id');
      var place = get_attr_value(this, 'place');
      if (startid === xml_id){
        dir_text += $(this).text().trim();
        pos = place;
      }
    });
    return [dir_text, pos];
  }

  var vex_key_cmp = function(key1, key2) {
    key1 = {pitch: key1.split('/')[0][0], octave: Number(key1.split('/')[1])};
    key2 = {pitch: key2.split('/')[0][0], octave: Number(key2.split('/')[1])};

    if (key1.octave === key2.octave) {
      if (key1.pitch === key2.pitch) { 
        return 0; 
      } else if (key1.pitch < key2.pitch) { 
        return -1; 
      } else if (key1.pitch > key2.pitch) { 
        return 1; 
      }
    } else if (key1.octave < key2.octave) { 
      return -1; 
    } else if (key1.octave > key2.octave) { 
      return 1; 
    }
  }

  var mei_dur2vex_dur = function(mei_dur) {
    mei_dur = String(mei_dur);
    //if (mei_dur === 'long') return ;
    //if (mei_dur === 'breve') return ;
    if (mei_dur === '1') return 'w';
    if (mei_dur === '2') return 'h';
    if (mei_dur === '4') return 'q';
    if (mei_dur === '8') return '8';
    if (mei_dur === '16') return '16';
    if (mei_dur === '32') return '32';
    if (mei_dur === '64') return '64';
    //if (mei_dur === '128') return ;
    //if (mei_dur === '256') return ;
    //if (mei_dur === '512') return ;
    //if (mei_dur === '1024') return ;
    //if (mei_dur === '2048') return ;
    //if (mei_dur === 'maxima') return ;
    //if (mei_dur === 'longa') return ;
    //if (mei_dur === 'brevis') return ;
    //if (mei_dur === 'semibrevis') return ;
    //if (mei_dur === 'minima') return ;
    //if (mei_dur === 'semiminima') return ;
    //if (mei_dur === 'fusa') return ;
    //if (mei_dur === 'semifusa') return ;
    throw new Vex.RuntimeError('BadArguments', 'The MEI duration "' + mei_dur + '" is not supported.');
  };

  var mei_note2vex_dur = function(mei_note, allow_dotted) {
    allow_dotted = allow_dotted || true;

    mei_note = (typeof mei_note === 'number' && 
                arguments.length === 2 && 
                typeof arguments[1] === 'object') ? arguments[1] : mei_note;

    var dur_attr =$(mei_note).attr('dur');
    if (dur_attr === undefined) {
      alert('Could not get duration from:\n' + JSON.stringify(mei_note, null, '\t'));
    }

    var dur = mei_dur2vex_dur(dur_attr);
    if (allow_dotted === true && $(mei_note).attr('dots') === '1') {
      dur += 'd';
    }
    return dur;
    //return mei_dur2vex_dur($(mei_note).attr('dur')) + (allow_dotted === true && $(mei_note).attr('dots') === '1') ? 'd' : '';
    //return mei_dur2vex_dur($(mei_note).attr('dur'));
  };

  var mei_accid2vex_accid = function(mei_accid) {
    if (mei_accid === 'n') return 'n';
    if (mei_accid === 'f') return 'b';
    if (mei_accid === 's') return '#';
    if (mei_accid === 'ff') return 'bb';
    if (mei_accid === 'ss') return '##';
    throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadAttributeValue', 'Invalid attribute value: ' + mei_accid);
  };

  var mei_note_stem_dir = function(mei_note, parent_staff_element) {
    var given_dir = $(mei_note).attr('stem.dir');
    if (given_dir !== undefined) {
      return (given_dir === 'up') ? Vex.Flow.StaveNote.STEM_UP : (given_dir === 'down') ? Vex.Flow.StaveNote.STEM_DOWN : undefined;
    } else {
      var clef = staff_clef($(parent_staff_element).attr('n'));
      if (clef === 'treble') {
        return (vex_key_cmp('a/5', mei_note2vex_key(mei_note)) === 1) ? Vex.Flow.StaveNote.STEM_UP : Vex.Flow.StaveNote.STEM_DOWN;
      } else if (clef === 'bass') {
        return (vex_key_cmp('c/3', mei_note2vex_key(mei_note)) === -1) ? Vex.Flow.StaveNote.STEM_DOWN : Vex.Flow.StaveNote.STEM_UP;
      }
    }
  };

  var mei_staffdef2vex_keyspec = function(mei_staffdef) {
    if ($(mei_staffdef).attr('key.pname') !== undefined) {
      var keyname = $(mei_staffdef).attr('key.pname').toUpperCase();
      var key_accid = $(mei_staffdef).attr('key.accid');
      if (key_accid !== undefined) {
        switch (key_accid) {
          case 's': keyname += '#'; break;
          case 'f': keyname +=  'b'; break;
          default: throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.UnexpectedAttributeValue', "Value of key.accid must be 's' or 'f'");
        } 
      }
      var key_mode = $(mei_staffdef).attr('key.mode'); 
      if (key_mode !== undefined) {
        keyname += key_mode === 'major' ? '' : 'm';        
      }
      return keyname;
    } else {
      return 'C'
    }
  };

  var mei_staffdef2vex_clef = function(mei_staffdef) {
    var clef_shape = get_attr_value(mei_staffdef, 'clef.shape');
    var clef_line = get_attr_value_opt(mei_staffdef, 'clef.line');
    if (clef_shape === 'G' && (!clef_line || clef_line === '2')) {
      return 'treble';
    } else if (clef_shape === 'F' && (!clef_line || clef_line === '4') ) {
      return 'bass';
    } else if (clef_shape === 'C' && clef_line === '3') {
        return 'alto';
    } else if (clef_shape === 'C' && clef_line === '4') {
        return 'tenor';
    } else {
      throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Clef definition is not supported: [ clef.shape="' + clef_shape + '" ' + (clef_line?('clef.line="' + clef_line + '"'):'') + ' ]' );
    }
  };

  var staff_clef = function(staff_n) {
    if (staff_n>=staffInfoArray.length) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.staff_clef():E01', 'No staff definition for staff n=' + staff_n);
    var staffdef = staffInfoArray[staff_n].staffDef;
//    var staffdef = $(score).find('staffDef[n=' + staff_n + ']')[0];
    return mei_staffdef2vex_clef(staffdef);
  };

  var mei_staffdef2vex_timespec = function(mei_staffdef) {
    if ($(mei_staffdef).attr('meter.count') !== undefined && $(mei_staffdef).attr('meter.unit') !== undefined) {
      return $(mei_staffdef).attr('meter.count') + '/' + $(mei_staffdef).attr('meter.unit');
    }
  };

  var initialise_score = function(canvas) {
    var renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
    context = renderer.getContext();
  };

  var staff_height = function(staff_n) {
    return 100;
  }

  //
  // The Y coordinate of staff #staff_n (within the current system)
  //
  var staff_top_rel = function(staff_n) {
    var result = 0;
    var i;
    for (i=0;i<staff_n-1;i++) result += staff_height(i);
    return result;
  }
  
  //
  // The Y coordinate of staff #staff_n (from the top of the canvas)
  //
  var staff_top_abs = function(staff_n){
    var result = system_top + staff_top_rel(staff_n);
    var bottom_most_candidate = result + staff_height(staff_n);
    if (bottom_most_candidate > bottom_most) bottom_most = bottom_most_candidate;
    return result;
  }

  //
  // Initialise staff #staff_n. Render necessary staff modifiers.
  //
  var initialise_staff_n = function(staff_n, width) {
    
    if (!staff_n) {
      throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadArgument', 'Cannot render staff without attribute "n".')
    }
        
    var staffdef = staffInfoArray[staff_n].staffDef;
    
    //removed because it's an insufficient solution, and when system breaks are supported it would introduce new problems:
    //if (staffInfoArray[staff_n].renderWith.clef || staffInfoArray[staff_n].renderWith.keysig || staffInfoArray[staff_n].renderWith.timesig) width += 30;
    
    var staff = new Vex.Flow.Stave(measure_left, staff_top_abs(staff_n), width);
    if (staffInfoArray[staff_n].renderWith.clef) {
      staff.addClef(mei_staffdef2vex_clef(staffdef));
      staffInfoArray[staff_n].renderWith.clef = false;
    }
    if (staffInfoArray[staff_n].renderWith.keysig) {
      if ($(staffdef).attr('key.sig.show') === 'true' || $(staffdef).attr('key.sig.show') === undefined) {
        staff.addKeySignature(mei_staffdef2vex_keyspec(staffdef));
      }
      staffInfoArray[staff_n].renderWith.keysig = false;
    }
    if (staffInfoArray[staff_n].renderWith.timesig) {
      if ($(staffdef).attr('meter.rend') === 'norm' || $(staffdef).attr('meter.rend') === undefined) {
        staff.addTimeSignature(mei_staffdef2vex_timespec(staffdef));
      }
      staffInfoArray[staff_n].renderWith.timesig = false;
    }
    staff.setContext(context).draw();
    return staff;
  }

  var render_measure_wise = function() {
    var scoredef = $(score).find('scoreDef')[0];
    if (!scoredef) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadMEIFile', 'No <scoreDef> found.')
    process_scoreDef(scoredef);
    $(score).find('section').children().each(process_section_child);
    $.each(beams, function(i, beam) { beam.setContext(context).draw(); });
    //do ties, slurs and hairpins now!
    render_vexTies(ties);
    render_vexTies(slurs);
    render_vexHairpins(hairpins);
  };

  var render_vexTies = function(eventlinks) {
    $(eventlinks).each(function(i, link) {
      var f_note = notes_by_id[link.getFirstId()];
      var l_note = notes_by_id[link.getLastId()];
      
      var f_vexNote; if (f_note) f_vexNote = f_note.vexNote;
      var l_vexNote; if (l_note) l_vexNote = l_note.vexNote;
      new Vex.Flow.StaveTie({
        first_note: f_vexNote,
        last_note: l_vexNote}).setContext(context).draw();
    });
  }

  var render_vexHairpins = function(hairpin_links) {
    
    $(hairpin_links).each(function(i, link) {
      var f_note = notes_by_id[link.getFirstId()];
      var l_note = notes_by_id[link.getLastId()];
      
      var f_vexNote; if (f_note) f_vexNote = f_note.vexNote;
      var l_vexNote; if (l_note) l_vexNote = l_note.vexNote;
      
      var place = mei2vexflowTables.positions[link.params.place];
      var type = mei2vexflowTables.hairpins[link.params.form];        
      var l_ho = 0;
      var r_ho = 0;
      var hairpin_options = {height: 10, y_shift:0, left_shift_px:l_ho, r_shift_px:r_ho};
  
      new Vex.Flow.StaveHairpin({
        first_note: f_vexNote,
        last_note: l_vexNote,
      }, type).setContext(context).setRenderOptions(hairpin_options).setPosition(place).draw();
    });
  } 
  
  var draw_stave_connectors = function() {
    for (var first_last in staveConnectors) {
      var staveConn = staveConnectors[first_last];
      var vexType = staveConn.vexType();
      var top_staff = staves_by_n[staveConn.top_staff_n];
      var bottom_staff = staves_by_n[staveConn.bottom_staff_n];
      if (vexType && top_staff && bottom_staff) {
        var vexConnector = new Vex.Flow.StaveConnector(top_staff, bottom_staff);
        vexConnector.setType(staveConn.vexType());
        vexConnector.setContext(context);
        vexConnector.draw();
      }
    }
  }
  
  /*  MEI element <section> may contain (MEI v2.1.0):
  *    MEI.cmn: measure
  *    MEI.critapp: app
  *    MEI.edittrans: add choice corr damage del gap handShift orig reg restore sic subst supplied unclear 
  *    MEI.shared: annot ending expansion pb sb scoreDef section staff staffDef
  *    MEI.text: div
  *    MEI.usersymbols: anchoredText curve line symbol
  *
  *  Supported elements: measure, scoreDef, staffDef
  */
  var process_section_child = function(i, child) {
    switch ($(child).prop('localName')) {
      case 'measure': 
        var need_connectors;
        if (atStartSystem()) {  
          startSystem(child);
          need_connectors = true;
        } else {
          moveOneMeasure();
          need_connectors = false;
        } 
        extract_staves(child);
        if (need_connectors) { 
          draw_stave_connectors();
          need_connectors = false;
        }
        extract_linkingElements(child, 'tie', ties);
        extract_linkingElements(child, 'slur', slurs);
        extract_linkingElements(child, 'hairpin', hairpins);
        break;
      case 'scoreDef': process_scoreDef(child); break;
      case 'staffDef': process_staffDef(child); break;
      case 'sb': process_systemBreak(child); break;
      default: throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Element <' + $(child).prop('localName') + '> is not supported in <section>');
    } 
  }
  
  var process_systemBreak = function(sb) {
    system_break = true;
  }
  
  var process_scoreDef = function(scoredef) {
    $(scoredef).children().each(process_scoredef_child);
  }

  /*  MEI element <scoreDef> may contain (MEI v2.1.0):
  *    MEI.cmn: meterSig meterSigGrp
  *    MEI.harmony: chordTable
  *    MEI.linkalign: timeline
  *    MEI.midi: instrGrp
  *    MEI.shared: keySig pgFoot pgFoot2 pgHead pgHead2 staffGrp 
  *    MEI.usersymbols: symbolTable
  * 
  *  Supported elements: staffGrp
  */
  var process_scoredef_child = function(i, child) {
    switch ($(child).prop('localName')) {
      case 'staffGrp': process_staffGrp(child); break;
      default: throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Element <' + $(child).prop('localName') + '> is not supported in <scoreDef>');
    }     
  }
  
  var process_staffGrp = function(staffGrp) {
    var result = {};
    var symbol = staffGrp.attrs().symbol;
    $(staffGrp).children().each(function (i, child) {
      var local_result = process_staffGrp_child(i, child); 
      Vex.LogDebug('process_staffGrp() {1}.{a}: local_result.first_n:' + local_result.first_n + ' local_result.last_n:'+local_result.last_n);
      if (i === 0) { 
        result.first_n = local_result.first_n;
        result.last_n = local_result.last_n;        
      } else { 
        result.last_n = local_result.last_n; 
      }
    });
    Vex.LogDebug('process_staffGrp() {2}: symbol:' + symbol + ' result.first_n:' + result.first_n + ' result.last_n:'+result.last_n);
    staveConnectors[result.first_n.toString()+':'+result.last_n.toString()] = new MEI2VF.StaveConnector(symbol, result.first_n, result.last_n);
    return result;
  }
  
  
  /*  MEI element <staffGrp> may contain (MEI v2.1.0):
  *    MEI.cmn: meterSig meterSigGrp MEI.mensural: mensur proport
  *    MEI.midi: instrDef
  *    MEI.shared: clef clefGrp keySig label layerDef
  * 
  *  Supported elements: staffGrp, staffDef
  */
  var process_staffGrp_child = function(i, child) {
    switch ($(child).prop('localName')) {
      case 'staffDef': 
        var staff_n = process_staffDef(child); 
        return {first_n:staff_n, last_n:staff_n};
        break;
      case 'staffGrp': return process_staffGrp(child); break;
      default: throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Element <' + $(child).prop('localName') + '> is not supported in <staffGrp>');
    }
  }
  
  var process_staffDef = function(staffDef) {
    var staff_n = Number(staffDef.attrs().n);
    var staff_info = staffInfoArray[staff_n];
    if (staff_info) {
      staffInfoArray[staff_n].updateDef(staffDef);
    } else {
      staffInfoArray[staff_n] = new MEI2VF.StaffInfo(staffDef, true, true, true);
    }
    return staff_n;
  }
  
  var extract_staves = function(measure) {
    measures.push( $(measure).find('staff').map(function(i, staff) { return extract_layers(i, staff, measure); }).get() );
  };

  var extract_layers = function(i, staff_element, parent_measure) {
    var staff, left, top;
    
    //get current staffDef
    var staff_n = Number(staff_element.attrs().n);
    staff = initialise_staff_n(staff_n, measure_width);
    var layer_events = $(staff_element).find('layer').map(function(i, layer) { 
      return extract_events(i, layer, staff_element, parent_measure); 
    }).get();
    
    // rebuild object by extracting vexNotes before rendering the voice TODO: put in independent function??
    var vex_layer_events = [];
    $(layer_events).each( function() { 
      vex_layer_events.push({ 
        events : $(this.events).get().map( function(events) { 
          return events.vexNote ? events.vexNote : events; 
        }), 
        layer: this.layer
      })
    });

    var voices = $.map(vex_layer_events, function(events) { return make_voice(null, events.events); });
    var formatter = new Vex.Flow.Formatter().joinVoices(voices).format(voices, measure_width).formatToStave(voices, staff);
    $.each(voices, function(i, voice) { voice.draw(context, staff);});

    staves_by_n[staff_n] = staff;    

    return staff;
  };

  var extract_events = function(i, layer, parent_staff_element, parent_measure) {
    // check if there's an unresolved TStamp2 reference to this location (measure, staff, layer):
    var measure_n = parent_measure.attrs().n;
    if (!measure_n) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.extract_events:', '<measure> must have @n specified');
    var staff_n = parent_staff_element.attrs().n; if (!staff_n) staff_n = "1";
    var layer_n = layer.attrs().n; if (!layer_n) layer_n = "1";
    var staffdef = staffInfoArray[staff_n].staffDef;
    var refLocationIndex = measure_n + ':' + staff_n + ':' + layer_n;
    if (unresolvedTStamp2[refLocationIndex]) {
      $(unresolvedTStamp2[refLocationIndex]).each(function(i, eventLink) {
        var count = $(staffdef).attr('meter.count');
        var unit = $(staffdef).attr('meter.unit');
        var meter = { count:Number(count), unit:Number(unit) };
        eventLink.setContext( { layer:layer, meter:meter } );
        //TODO: remove eventLink from the list
        unresolvedTStamp2[refLocationIndex][i] = null;
      });
      //at this point all references should be supplied with context.
      unresolvedTStamp2[refLocationIndex] = null;
    }
    // the calling context for this function is always a
    // map(extract_events).get() which will flatten the arrays
    // returned. Therefore, we wrap them up in an object to
    // protect them.
    return {
      layer: i, 
      events: $(layer).children().map(function(i, element) { 
        return process_element(element, layer, parent_staff_element, parent_measure); 
      }).get()};
  };

  /*
  * Extract <tie>, <slur> or <hairpin> elements and create EventLink obejcts
  */
  var extract_linkingElements = function (measure, element_name, eventlink_container) {

    var link_staffInfo = function(lnkelem) {
      var staff_n = lnkelem.attrs().staff;
      if (!staff_n) { staff_n = "1"; } 
      var layer_n = lnkelem.attrs().layer;
      if (!layer_n) { layer_n = "1"; }
      return { staff_n:staff_n, layer_n:layer_n };
    }
   
    //convert tstamp into startid in current measure
    var local_tstamp2id = function(tstamp, lnkelem, measure) {
      var stffinf = link_staffInfo(lnkelem);      
      var staff = $(measure).find('staff[n="' + stffinf.staff_n + '"]');
      var layer = $(staff).find('layer[n="'+ stffinf.layer_n + '"]').get(0);
      if (!layer) {
        var layer_candid = $(staff).find('layer');
        if (layer_candid && !layer_candid.attr('n')) layer = layer_candid;
        if (!layer) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.extract_linkingElements:E01', 'Cannot find layer');
      } 
      var staffdef = staffInfoArray[stffinf.staff_n].staffDef;
      if (!staffdef) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.extract_linkingElements:E02', 'Cannot determine staff definition.');
      var meter = { count:Number(staffdef.attrs()['meter.count']), unit:Number(staffdef.attrs()['meter.unit']) };
      if (!meter.count || !meter.unit) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.extract_linkingElements:E03', "Cannot determine meter; missing or incorrect @meter.count or @meter.unit.");
      return MeiLib.tstamp2id(tstamp, layer, meter);      
    }
    
    var measure_partOf = function(tstamp2) {
      var indexOfPlus;
      return tstamp2.substring(0,tstamp2.indexOf('m'));
    }

    var beat_partOf = function(tstamp2) {
      var indexOfPlus;
      return tstamp2.substring(tstamp2.indexOf('+')+1);
    }

    var link_elements = $(measure).find(element_name);
    $.each(link_elements, function(i, lnkelem) {
      
      var eventLink = new MEI2VF.EventLink(null, null);
      if (element_name === 'hairpin') {
        var form = lnkelem.attrs().form;
        if (!form) throw new  MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:extract_linkingElements', '@form is mandatory in <hairpin> - make sure the xml is valid.');
        var place = lnkelem.attrs().place;
        eventLink.setParams({ form:form, place:place });
      } 
      // find startid for eventLink. if tstamp is provided in the element, 
      // tstamp will be calculated.
      var startid = lnkelem.attrs().startid;
      if(startid) {
        eventLink.setFirstId(startid);
      } else {
        var tstamp = lnkelem.attrs().tstamp;
        if (tstamp) {
          startid = local_tstamp2id(tstamp, lnkelem, measure);
          eventLink.setFirstId(startid);
        } else {
          //no @startid, no @tstamp ==> eventLink.first_ref remains empty.
        }
      }

      // find end reference value (id/tstamp) of eventLink:
      var endid = lnkelem.attrs().endid;
      if (endid) {
          eventLink.setLastId(endid);
      } else {
        var tstamp2 = lnkelem.attrs().tstamp2;
        if (tstamp2) {
          var measures_ahead = Number(measure_partOf(tstamp2));
          if (measures_ahead>0) {
            eventLink.setLastTStamp(beat_partOf(tstamp2));
            //register that eventLink needs context;
            //need to save: measure.n, link.staff_n, link.layer_n
            var staffinfo = link_staffInfo(lnkelem);
            var measure_n = measure.attrs().n;
            var tartget_measure_n = Number(measure_n) + measures_ahead;
            var refLocationIndex = tartget_measure_n.toString() + ':' + staffinfo.staff_n + ':' + staffinfo.layer_n;
            if (!unresolvedTStamp2[refLocationIndex]) unresolvedTStamp2[refLocationIndex] = new Array();
            unresolvedTStamp2[refLocationIndex].push(eventLink);
          } else {
            endid = local_tstamp2id(beat_partOf(tstamp2),lnkelem,measure);
            eventLink.setLastId(endid);
          }          
        } else {
          //no @endid, no @tstamp2 ==> eventLink.last_ref remains empty.
        }
      }
      
      eventlink_container.push(eventLink);

    });
  }

  var make_tieslur = function(startid, endid, container) {
    var eventLink = new MEI2VF.EventLink(startid, endid);
    container.push(eventLink);    
  };

  var start_tieslur = function(startid, linkCond, container) {
    var eventLink = new MEI2VF.EventLink(startid, null);
    eventLink.setParams({linkCond:linkCond});
    container.push(eventLink);
  }
  
  var terminate_tie = function(endid, linkCond) {
    
    var cmpLinkCond = function (lc1, lc2) {
      return (lc1 && lc2 && 
              lc1.pname === lc2.pname && 
              lc1.oct === lc2.oct && 
              lc1.system === lc2.system);
    }
    
    if (!linkCond.pname || !linkCond.oct) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:TermTie01', 'no pitch or specified for the tie');
    var found=false
    var i; var tie;
    for(i=0; !found && i<ties.length;++i) {
      tie = ties[i];
      if (!tie.getLastId()) {
        if (cmpLinkCond(tie.params.linkCond, linkCond)) {
          found=true;
          tie.setLastId(endid);
        } else {
          //in case there's no link condition set for the link, we have to retreive the pitch of the referenced note.
          // var note_id = tie.getFirstId();
          // if (note_id) {
          //   var note = notes_by_id[note_id];
          //   if (note && cmpLinkCond(tie.params.linkCond, linkCond)) {
          //     found=true;
          //     tie.setLastId(endid);
          //   }
          // }        
        }
      }
    };
    //if no tie object found that is uncomplete and with the same pitch, 
    //then create a tie that has only endid set.
    if (!found) {
      var tie = new MEI2VF.EventLink(null, endid);
      ties.push(tie);      
    }
  }
  
  var terminate_slur = function(endid, linkCond) {
    
    var cmpLinkCond = function (lc1, lc2) {
      return lc1.nesting_level === lc2.nesting_level && 
             lc1.system === lc2.system;
    }
    
    var found=false
    var i=0; var slur;
    for(i=0; !found && i<slurs.length;++i) {
      var slr=slurs[i];
      if (slr && !slr.getLastId() && cmpLinkCond(slr.params.linkCond, linkCond)) {
        found=true;
        slr.setLastId(endid);
      }
    }
    if (!found) {
      var slr = new MEI2VF.EventLink(null, endid);
      slurs.push(slr);      
    }
  }
  
  var parse_slur_attribute = function(slur_str) {
    var result = []
    var numbered_tokens = slur_str.split(' ');
    $.each(numbered_tokens, function(i, numbered_token) {
      var num;
      if (numbered_token.length === 1) {
        result.push({ letter:numbered_token, nesting_level:0 })
      } else if (numbered_token.length===2) {
        if ( !(num=Number(numbered_token[1])) ) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:ParseSlur01', "badly formed slur attribute")
        result.push({ letter:numbered_token[0], nesting_level:num });
      } else {
        throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:ParseSlur01', "badly formed slur attribute");
      }
    });
    return result;
  }
  
  
  var make_note = function(element, parent_layer, parent_staff_element, parent_measure) {

    //Support for annotations (lyrics, directions, etc.)
    var make_annot_below = function(text) {
      return (new Vex.Flow.Annotation(text)).setFont("Times").setBottom(true);
    };

    var make_annot_above = function(text) {
      return (new Vex.Flow.Annotation(text)).setFont("Times");
    };

    try {
      var note = new Vex.Flow.StaveNote( 
        {
          keys: [mei_note2vex_key(element)],
          clef: staff_clef($(parent_staff_element).attr('n')),
          duration: mei_note2vex_dur(element),
          stem_direction: mei_note_stem_dir(element, parent_staff_element)
        });

      note.addAnnotation(2, make_annot_below(mei_syl2vex_annot(element)));
      var annot = mei_dir2vex_annot(parent_measure, element);
      note.addAnnotation(2, annot[1] == 'below' ? make_annot_below(annot[0]) : make_annot_above(annot[0]));

      try {
        var i;
        for (i=0;i<parseInt($(element).attr('dots'));i++){
          note.addDotToAll();
        }
      } catch (x) {
        throw new Vex.RuntimeError('BadArguments',
        'A problem occurred processing the dots of <note>: ' + JSON.stringify(element.attrs()) + '. \"' + x.toString() + '"');
      }
      var mei_accid = $(element).attr('accid');
      if (mei_accid) {
        note.addAccidental(0, new Vex.Flow.Accidental(mei_accid2vex_accid(mei_accid)));
      }
      $.each($(element).find('artic'), function(i, ar){
        note.addArticulation(0, new Vex.Flow.Articulation(mei2vexflowTables.articulations[$(ar).attr('artic')]).setPosition(mei2vexflowTables.positions[$(ar).attr('place')]));
      });
      // FIXME For now, we'll remove any child nodes of <note>
      $.each($(element).children(), function(i, child) { $(child).remove(); });

      //Build a note object that keeps the xml:id

      // If xml:id is missing, create it
      var xml_id = $(element).attr('xml:id');
      if (!xml_id) {
        xml_id = MeiLib.createPseudoUUID();
        $(element).attr('xml:id', xml_id);
      }

      var mei_tie = $(element).attr('tie'); 
      if (!mei_tie) mei_tie = "";
      var pname = $(element).attr('pname');
      if (!pname) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadArguments', 'mei:note must have pname attribute');
      var oct = $(element).attr('oct');
      if (!oct) throw new MEI2VF.RUNTIME_ERROR('MEI2VF.RERR.BadArguments', 'mei:note must have oct attribute');
      for (var i=0; i<mei_tie.length; ++i) {
        switch (mei_tie[i]) {
          case 'i': start_tieslur(xml_id, {pname:pname, oct:oct, system:system_n}, ties); break;
          case 't': terminate_tie(xml_id, {pname:pname, oct:oct, system:system_n}); break;
        }
      }

      var mei_slur = $(element).attr('slur'); 
      if (mei_slur) {
        //create a list of { letter, num }
        var tokens = parse_slur_attribute(mei_slur);
        $.each(tokens, function(i, token) {
          switch (token.letter) {
            case 'i': start_tieslur(xml_id, {nesting_level:token.nesting_level, system:system_n}, slurs); break;
            case 't': terminate_slur(xml_id, {nesting_level:token.nesting_level, system:system_n}); break;
          }
        });
      } 
      
      
      var note_object = {vexNote: note, id: xml_id};
      notes.push(note_object);

      notes_by_id[xml_id] = { meiNote:element, vexNote:note };

      return note_object;

    } catch (x) {
      throw new Vex.RuntimeError('BadArguments',
      'A problem occurred processing the <note>: ' + JSON.stringify(element.attrs()) + '. \"' + x.toString() + '"');
    }
  };

  var make_rest = function(element, parent_layer, parent_staff_element, parent_measure) {
    try {
      var rest = new Vex.Flow.StaveNote({keys: ['c/5'], duration: mei_note2vex_dur(element, false) + 'r'});
      if ($(element).attr('dots') === '1') {
        rest.addDotToAll();
      }
      return rest;
    } catch (x) {
      throw new Vex.RuntimeError('BadArguments',
      'A problem occurred processing the <rest>: ' + JSON.stringify(element.attrs()) + '. \"' + x.toString() + '"');
    }
  };

  var make_mrest = function(element, parent_layer, parent_staff_element, parent_measure) {

    try {
      var mrest = new Vex.Flow.StaveNote({keys: ['c/5'], duration: 'wr'});
      return mrest;
    } catch (x) {
      throw new Vex.RuntimeError('BadArguments',
      'A problem occurred processing the <mRest>: ' + JSON.stringify(element.attrs()) + '. \"' + x.toString() + '"');
    }
  };

  var make_beam = function(element, parent_layer, parent_staff_element, parent_measure) {
    var elements = $(element).children().map(function(i, note) 
    { 
      //make sure to get vexNote out of wrapped note objects
      var proc_element = process_element(note, parent_layer, parent_staff_element, parent_measure);
      return proc_element.vexNote ? proc_element.vexNote : proc_element;
    }).get();

    beams.push(new Vex.Flow.Beam(elements));

    return elements;
  };

  var make_chord = function(element, parent_layer, parent_staff_element, parent_measure) {
    try {
      var keys = $(element).children().map(mei_note2vex_key).get();
      var duration = mei_dur2vex_dur(Math.max.apply(Math, $(element).children().map(function() { 
        return Number($(this).attr('dur')); 
      }).get()));
      var dotted = $(element).children().map(function() { 
        return $(this).attr('dots') === '1'; 
      }).get().any();
      if (dotted === true) { duration += 'd'; }

      var chord = new Vex.Flow.StaveNote({keys: keys,
        clef: staff_clef($(parent_staff_element).attr('n')),
        duration: duration
      });
      //stem_direction: stem_direction: mei_note_stem_dir(mei_note, parent_staff)});

      if (dotted === true) { chord.addDotToAll(); }

      $(element).children().each(function(i, note) { 
        var mei_accid = $(note).attr('accid');
        if (mei_accid !== undefined) { 
          chord.addAccidental(i, new Vex.Flow.Accidental(mei_accid2vex_accid(mei_accid))); 
        }
      });

      return chord;
    } catch (x) {
      throw new Vex.RuntimeError('BadArguments', 'A problem occurred processing the <chord>:' + x.toString());
      // 'A problem occurred processing the <chord>: ' +
      // JSON.stringify($.each($(element).children(), function(i, element) { 
      //   element.attrs(); 
      // }).get()) + '. \"' + x.toString() + '"');
    }
  };

  var process_element = function(element, parent_layer, parent_staff_element, parent_measure) {
    var element_type = $(element).prop("localName");
    if (element_type === 'rest') {
      return make_rest(element, parent_layer, parent_staff_element, parent_measure);
    } else if (element_type === 'mRest') {
      return make_mrest(element, parent_layer, parent_staff_element, parent_measure);
    } else if (element_type === 'note') {
      return make_note(element, parent_layer, parent_staff_element, parent_measure);
    } else if (element_type === 'beam') {
      return make_beam(element, parent_layer, parent_staff_element, parent_measure);
    } else if (element_type === 'chord') {
      return make_chord(element, parent_layer, parent_staff_element, parent_measure);
    } else {
      throw new Vex.RuntimeError('BadArguments',
      'Rendering of element "' + element_type + '" is not supported.');
    }
  };

  var make_voice = function(i, voice_contents) {
    if (!$.isArray(voice_contents)) { throw new Vex.RuntimeError('BadArguments', 'make_voice() voice_contents argument must be an array.');  }

    var voice = new Vex.Flow.Voice({num_beats: Number($(score).find('staffDef').attr('meter.count')),
    beat_value: Number($(score).find('staffDef').attr('meter.unit')),
    resolution: Vex.Flow.RESOLUTION});

    voice.setStrict(false);
    voice.addTickables(voice_contents);
    //$.each(voice_contents, function(i, o) { voice.addTickables([o]); });
    return voice;
  };

  initialise_score(target);
  render_measure_wise();
};


/* 
* EventLink.js
* Author: Zoltan Komives (zolaemil@gmail.com)
* Created: 04.07.2013
* 
* Represents a link between two MEI events. The link is represented by two references: 
*  1. reference to start event, 
*  2. reference to end event.
* 
* 
*/

MEI2VF.EventLink = function(first_id, last_id) {
  this.init(first_id, last_id);
}

MEI2VF.EventLink.prototype.init = function(first_id, last_id) {
  this.first_ref = new MEI2VF.EventReference(first_id);
  this.last_ref = new MEI2VF.EventReference(last_id);
  this.params = {};
}
/**
 * @param params is an object. for ties and slurs { linkCond } to indicate the linking condition when 
 *               parsing from attributes (pitch name for ties, nesting level for slurs); for hairpins
 *               params it is an object { place, form }
 */
MEI2VF.EventLink.prototype.setParams = function (params) {
  this.params = params;
}

MEI2VF.EventLink.prototype.setFirstRef = function (first_ref) {
  this.first_ref = first_ref;
}

MEI2VF.EventLink.prototype.setLastRef = function (last_ref) {
  this.last_ref = last_ref;
}

MEI2VF.EventLink.prototype.setFirstId = function(id) {
  this.first_ref.setId(id);
}

MEI2VF.EventLink.prototype.setLastId = function(id) {
  this.last_ref.setId(id);
}

MEI2VF.EventLink.prototype.setFirstTStamp = function (tstamp) {
  this.first_ref.setTStamp(tstamp);
}

MEI2VF.EventLink.prototype.setLastTStamp = function (tstamp2) {
  this.last_ref.setTStamp(tstamp2);
}

MEI2VF.EventLink.prototype.setContext = function(meicontext) {
  this.meicontext = meicontext;
}

MEI2VF.EventLink.prototype.getFirstId = function () {
    return this.first_ref.getId( { meicontext:this.meicontext } );  
}

MEI2VF.EventLink.prototype.getLastId = function () {
    return this.last_ref.getId( { meicontext:this.meicontext } );
}

/* 
* EventReference.js
* Author: Zoltan Komives (zolaemil@gmail.com)
* Created: 04.07.2013
* 
* Represents and event with its xmlid, but if the xmlid is not defined, 
* it can also hold the timestamp that can be resolved as soon as the context that 
* holds the event is established. When the tstamp reference is being resolved, 
* the xml:id is calculated using the generic function tstamp2id(), then the xml:id stored, 
* thus marking that the reference is resolved.
*/


MEI2VF.EventReference = function(xmlid) {
  this.xmlid = xmlid;
}

MEI2VF.EventReference.prototype.setId = function(xmlid){
  this.xmlid = xmlid;
}

MEI2VF.EventReference.prototype.setTStamp = function(tstamp){
  this.tstamp = tstamp;
  if (this.xmlid) {
    this.tryResolveReference(true);
  }
}

MEI2VF.EventReference.prototype.tryResolveReference = function(strict) {
  var tstamp = this.tstamp;
  var meicontext = this.meicontext;
  if (!tstamp) throw new MEI2VF.RUNTIME_ERROR('MEI2VF:RERR:BADARG:EventRef001', 'EventReference: tstamp must be set in order to resolve reference.')
  if (this.meicontext) {
    //look up event corresponding to the given tstamp (strictly or losely)
    this.xmlid = MeiLib.tstamp2id(this.tstamp, this.meicontext.layer, this.meicontext.meter);
  } else {
    this.xmlid = null;
  }
}

/**
 * @param params { meicontext, strict }; both parameters are optional; 
 *               meicontext is an obejct { layer, meter }; 
 *               strict is boolean, false if not defined.
 *
 */
MEI2VF.EventReference.prototype.getId = function(params) {
  if (params && params.meicontext) this.setContext(params.meicontext);
  if (this.xmlid) return this.xmlid;
  if (this.tstamp) {
    if (this.meicontext) {
      //look up the closest event to tstamp within this.meicontext and return its ID
      this.tryResolveReference(params && params.strict);
      return this.xmlid;
    }
  } 
  return null;
}

MEI2VF.EventReference.prototype.setContext = function(meicontext) {
  this.meicontext = meicontext;
}/* 
* StaffInfo.js
* Author: Zoltan Komives (zolaemil@gmail.com)
* Created: 03.07.2013
* 
* Contains the staff definition and the rendering information (i.e. what clef modifiers are to be rendered)
*/

MEI2VF.StaffInfo = function(staffdef, w_clef, w_keysig, w_timesig) {
  this.renderWith = { clef: w_clef, keysig: w_keysig, timesig: w_timesig };
  this.staffDef = staffdef;
}

MEI2VF.StaffInfo.prototype.look4changes = function (current_staffDef, new_staffDef) {
  var result = { clef:false, keysig:false, timesig:false };
  if (!current_staffDef && new_staffDef) {
    result.clef = true;
    result.keysig = true;
    result.keysig = true;
    return result;
  } else if (current_staffDef && !new_staffDef) {
    result.clef = false;
    result.keysig = false;
    result.keysig = false;
    return result;
  } else if (!current_staffDef && !new_staffDef) {
    throw new MEI2VF_RUNTIME_ERROR('BadArgument', 'Cannot compare two undefined staff definitions.')
  }
  
  var cmp_attr = function(e1, e2, attr_name) { return $(e1).attr(attr_name) === $(e2).attr(attr_name) };
  
  if (!cmp_attr(current_staffDef, new_staffDef, 'clef.shape') || !cmp_attr(current_staffDef, new_staffDef, 'clef.line')) {
    result.clef = true;
  } 
  if (  (!cmp_attr(current_staffDef, new_staffDef, 'key.pname') || 
         !cmp_attr(current_staffDef, new_staffDef, 'key.accid') || 
         !cmp_attr(current_staffDef, new_staffDef) )
     ) {
    result.keysig = true;
  } 
  if (!cmp_attr(current_staffDef, new_staffDef, 'meter.count') || !cmp_attr(current_staffDef, new_staffDef, 'meter.unit')) {
    result.timesig = true;
  }
  return result;
}


MEI2VF.StaffInfo.prototype.updateDef = function(staffdef) {
  this.renderWith = this.look4changes(this.staffDef, staffdef);
  this.staffDef = staffdef;
}
/* 
* StaveConnector.js
* Author: Zoltan Komives (zolaemil@gmail.com)
* Created: 24.07.2013
* 
* Contains information about a stave connector parsed from the staffGrp elements 
* and their @symbol attributes
*/

MEI2VF.StaveConnector = function(symbol, top_staff_n, bottom_staff_n) {
  this.init(symbol, top_staff_n, bottom_staff_n);
}

MEI2VF.StaveConnector.prototype.init = function(symbol, top_staff_n, bottom_staff_n) {
  this.symbol = symbol;
  this.top_staff_n = top_staff_n;
  this.bottom_staff_n = bottom_staff_n;
}

MEI2VF.StaveConnector.prototype.vexType = function() {
  switch (this.symbol) {
    case 'line': return Vex.Flow.StaveConnector.type.SINGLE;
    case 'brace': return Vex.Flow.StaveConnector.type.BRACE;
    case 'bracket': return Vex.Flow.StaveConnector.type.BRACKET;
    case 'none': return null;
    default: return Vex.Flow.StaveConnector.type.SINGLE;
  }
}
