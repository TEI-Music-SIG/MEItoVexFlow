/*
* Component of MEItoVexFlow Author: Raffaele Viglianti, 2012
*
* Copyright © 2012, 2013 Richard Lewis, Raffaele Viglianti, Zoltan Komives,
* University of Maryland
*
* Licensed under the Apache License, Version 2.0 (the "License"); you may
* not
* use this file except in compliance with the License. You may obtain a copy
* of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
* WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
* License for the specific language governing permissions and limitations
* under the License.
*/

/**
 * @class MEI2VF
 * @singleton
 * Tables for MEI <-> VexFlow values
 */
var MEI2VF = ( function(m2v, MeiLib, VF, $, undefined) {

    /**
     * @private
     * @property tables
     */
    m2v.tables = {

      accidentals : {
        'n' : 'n',
        'f' : 'b',
        's' : '#',
        'bb' : 'ff',
        'ss' : '##'
      },

      durations : {
        'long' : '1/4',
        'breve' : '1/2',
        '1' : 'w',
        '2' : 'h',
        '4' : 'q',
        '8' : '8',
        '16' : '16',
        '32' : '32',
        '64' : '64'
        // '128': '',
        // '256': '',
        // '512': '',
        // '1024': '',
        // '2048': '',
        // 'maxima': '',
        // 'longa': '',
        // 'brevis': '',
        // 'semibrevis': '',
        // 'minima': '',
        // 'semiminima': '',
        // 'fusa': '',
        // 'semifusa': ''
      },

      positions : {
        'above' : VF.Modifier.Position.ABOVE,
        'below' : VF.Modifier.Position.BELOW
      },

      hairpins : {
        'cres' : VF.StaveHairpin.type.CRESC,
        'dim' : VF.StaveHairpin.type.DECRESC
      },

      articulations : {
        'acc' : 'a>',
        'stacc' : 'a.',
        'ten' : 'a-',
        'stacciss' : 'av',
        'marc' : 'a^',
        // 'marc-stacc':
        // 'spicc':
        // 'doit':
        // 'rip':
        // 'plop':
        // 'fall':
        // 'bend':
        // 'flip':
        // 'smear':
        'dnbow' : 'am',
        'upbow' : 'a|',
        // 'harm':
        'snap' : 'ao',
        // 'fingernail':
        // 'ten-stacc':
        // 'damp':
        // 'dampall':
        // 'open':
        // 'stop':
        // 'dbltongue':
        // 'trpltongue':
        // 'heel':
        // 'toe':
        // 'tap':
        'lhpizz' : 'a+',
        'dot' : 'a.',
        'stroke' : 'a|'
      },
      
      fermata: {
        'above': 'a@a',
        'below': 'a@u'
      },

      barlines : {
        'single' : VF.Barline.type.SINGLE,
        'dbl' : VF.Barline.type.DOUBLE,
        'end' : VF.Barline.type.END,
        'rptstart' : VF.Barline.type.REPEAT_BEGIN,
        'rptend' : VF.Barline.type.REPEAT_END,
        'rptboth' : VF.Barline.type.REPEAT_BOTH,
        'invis' : VF.Barline.type.NONE
      }
    };

    return m2v;

  }(MEI2VF || {}, MeiLib, Vex.Flow, jQuery));
