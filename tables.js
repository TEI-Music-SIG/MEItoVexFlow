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

