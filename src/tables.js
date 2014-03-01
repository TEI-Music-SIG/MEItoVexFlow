/***
* Component of MEItoVexFlow
* Author: Raffaele Viglianti, 2012
*  
* Tables for MEI <-> VexFlow values
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
***/

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

mei2vexflowTables.barlines = {
	'single'   : Vex.Flow.Barline.type.SINGLE,
	'dbl'      : Vex.Flow.Barline.type.DOUBLE,
	'end'      : Vex.Flow.Barline.type.END,
	'rptstart' : Vex.Flow.Barline.type.REPEAT_BEGIN,
	'rptend'   : Vex.Flow.Barline.type.REPEAT_END,
	'rptboth'  : Vex.Flow.Barline.type.REPEAT_BOTH,
	'invis'    : Vex.Flow.Barline.type.NONE
};

