/*
 * (C) Copyright 2014 Alexander Erhard (http://alexandererhard.com/).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
define([
  'vexflow',
  'vex',
  'common/Logger',
  'common/Util',
  'mei2vf/Tables',
  'mei2vf/eventpointer/EventPointerCollection'
], function (VF, Vex, Logger, Util, Tables, EventPointerCollection) {

  /**
   * @class MEI2VF.Arpeggios
   * @extend MEI2VF.EventPointerCollection
   * @private
   *
   * @constructor
   */
  var Arpeggios = function (systemInfo) {
    this.init(systemInfo);
  };

  Vex.Inherit(Arpeggios, EventPointerCollection, {

    init : function (systemInfo, font) {
      Arpeggios.superclass.init.call(this, systemInfo, font);
    },

    addToNote : function(model, note) {
      note.vexNote.addStroke(0, new VF.Stroke(0));
    }

  });

  return Arpeggios;

});