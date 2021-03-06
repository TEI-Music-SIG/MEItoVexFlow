/*
 * MEItoVexFlow, Hairpins class
 * (based on meitovexflow.js)
 * Author of reworkings: Alexander Erhard
 *
 * Copyright © 2014 Richard Lewis, Raffaele Viglianti, Zoltan Komives,
 * University of Maryland
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
define([
  'vexflow',
  'vex',
  'common/Logger',
  'common/RuntimeError',
  'mei2vf/Tables',
  'mei2vf/eventlink/EventLinkCollection'
], function (VF, Vex, Logger, RuntimeError, Tables, EventLinkCollection, undefined) {

  /**
   * @class Hairpins
   * @extend EventLinkCollection
   * @private
   *
   * @constructor
   */
  var Hairpins = function (systemInfo, unresolvedTStamp2) {
    this.init(systemInfo, unresolvedTStamp2);
  };

  Vex.Inherit(Hairpins, EventLinkCollection, {

    init : function (systemInfo, unresolvedTStamp2) {
      Hairpins.superclass.init.call(this, systemInfo, unresolvedTStamp2);
    },

    validateAtts : function (atts) {
      if (!atts.form) {
        throw new RuntimeError('@form is mandatory in <hairpin> - make sure the xml is valid.');
      }
    },

    createVexFromInfos : function (notes_by_id) {
      var me = this, f_note, l_note, i, j, model;
      for (i = 0, j = me.allModels.length; i < j; i++) {
        model = me.allModels[i];
        f_note = notes_by_id[model.getFirstId()] || {};
        l_note = notes_by_id[model.getLastId()] || {};

        if (f_note.system !== undefined && l_note.system !== undefined && f_note.system !== l_note.system) {
          me.createSingleHairpin(f_note, {}, model.params, model.getMeiElement());
          me.createSingleHairpin({}, l_note, model.params, model.getMeiElement());
        } else {
          me.createSingleHairpin(f_note, l_note, model.params, model.getMeiElement());
        }
      }
      return this;
    },

    createSingleHairpin : function (f_note, l_note, params, element) {
      var me = this, place, type, vex_options, hairpin;
      place = Tables.positions[params.place];
      type = Tables.hairpins[params.form];


      // TODO read from stave
      var stave_spacing = 10;


      if (!f_note.vexNote && !l_note.vexNote) {
        var param, paramString = '';
        for (param in params) {
          paramString += param + '="' + params[param] + '" ';
        }
        console.log(params);
        Logger.warn('Hairpin could not be processed', 'No haipin start or hairpin end could be found. Hairpin parameters: ' +
                                                      paramString + '. Skipping hairpin.');
        return true;
      }

      hairpin = new VF.StaveHairpin({
        first_note : f_note.vexNote,
        last_note : l_note.vexNote
      }, type);

      vex_options = {
        // processing of @opening skipped for aesthetic reasons
        //height : stave_spacing * (parseFloat(params.opening) || 1),
        height: stave_spacing,
        y_shift : 0,
        left_shift_px : 0,
        right_shift_px : 0
      };

      hairpin.setRenderOptions(vex_options);
      hairpin.setPosition(place);
      hairpin.setMeiElement(element);

      me.allVexObjects.push(hairpin);

    }
  });


  return Hairpins;

});
