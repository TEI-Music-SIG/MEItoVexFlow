/*
 * StaffInfo.js Author: Zoltan Komives (zolaemil@gmail.com) Created: 03.07.2013
 *
 * Copyright © 2012, 2013 Richard Lewis, Raffaele Viglianti, Zoltan Komives,
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

var MEI2VF = ( function(m2v, MeiLib, VF, $, undefined) {

    /**
     * @class MEI2VF.StaffInfo
     * Contains the definition and the rendering information (i.e. what
     * clef modifiers are to be rendered) of a single staff
     * @private
     *
     * @constructor
     * @param staffdef
     * @param scoredef
     * @param w_clef
     * @param w_keysig
     * @param w_timesig
     */
    m2v.StaffInfo = function(staffdef, scoredef, w_clef, w_keysig, w_timesig) {
      var me = this;
      me.scoreDefObj = scoredef ? m2v.Util.attsToObj(scoredef) : {};
      me.renderWith = {
        clef : w_clef,
        keysig : w_keysig,
        timesig : w_timesig
      };
      me.spacing = null;
      me.staffDefObj = m2v.Util.attsToObj(staffdef);
      me.updateMeter();
      me.updateStaveLabels();
      me.updateSpacing();
      me.currentClef = me.convertClef();
    };

    m2v.StaffInfo.prototype = {

      updateMeter : function() {
        var me = this;
        if (me.staffDefObj.hasOwnProperty('meter.count') && me.staffDefObj.hasOwnProperty('meter.unit')) {
          me.meter = {
            count : +me.staffDefObj['meter.count'],
            unit : +me.staffDefObj['meter.unit']
          };
        } else if (me.scoreDefObj.hasOwnProperty('meter.count') && me.scoreDefObj.hasOwnProperty('meter.unit')) {
          me.meter = {
            count : +me.scoreDefObj['meter.count'],
            unit : +me.scoreDefObj['meter.unit']
          };
        }
      },

      updateStaveLabels : function() {
        var me = this, label, labelAbbr;
        label = me.staffDefObj.label;
        if ( typeof label === 'string')
          me.label = label;
        labelAbbr = me.staffDefObj['label.abbr'];
        if ( typeof labelAbbr === 'string')
          me.labelAbbr = labelAbbr;
      },

      updateSpacing : function() {
        var me = this, spacing;
        spacing = +me.staffDefObj.spacing;
        if (!isNaN(spacing))
          me.spacing = spacing;
        return me.spacing;
      },

      forceSectionStartInfo : function() {
        var me = this;
        me.renderWith.clef = true;
        me.renderWith.keysig = true;
        me.renderWith.timesig = true;
      },

      forceStaveStartInfo : function() {
        var me = this;
        me.renderWith.clef = true;
        me.renderWith.keysig = true;
      },

      showClefCheck : function() {
        var me = this;
        if (me.renderWith.clef && me.staffDefObj['clef.visible'] !== 'false') {
          me.renderWith.clef = false;
          return true;
        }
      },

      showKeysigCheck : function() {
        var me = this;
        if (me.renderWith.keysig) {
          me.renderWith.keysig = false;
          if (me.staffDefObj['key.sig.show'] !== 'false')
            return true;
        }
      },

      showTimesigCheck : function() {
        var me = this;
        if (me.renderWith.timesig) {
          me.renderWith.timesig = false;
          if (me.staffDefObj['meter.rend'] === 'norm' || me.staffDefObj['meter.rend'] === undefined) {
            return true;
          }
        }
      },

      convertClef : function() {
        var me = this, clef_shape, clef_line, clef_dis, clef_dis_place;
        clef_shape = me.staffDefObj['clef.shape'];
        if (!clef_shape) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.MissingAttribute', 'Attribute clef.shape is mandatory.');
        }
        clef_line = me.staffDefObj['clef.line'];
        clef_dis = me.staffDefObj['clef.dis'];
        clef_dis_place = me.staffDefObj['clef.dis.place'];
        if (clef_shape === 'G' && (!clef_line || clef_line === '2')) {
          if (clef_dis === '8' && clef_dis_place === 'below') {
            return {type: 'treble', shift : -1};
          }
          return {type: 'treble'};
        }
        if (clef_shape === 'F' && (!clef_line || clef_line === '4'))
          return {type: 'bass'};
        if (clef_shape === 'C' && clef_line === '3')
          return {type: 'alto'};
        if (clef_shape === 'C' && clef_line === '4')
          return {type: 'tenor'};
        throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Clef definition is not supported: [ clef.shape="' + clef_shape + '" ' + ( clef_line ? ('clef.line="' + clef_line + '"') : '') + ' ]');
      },

      getClef : function() {
        return this.currentClef;
      },

      getKeySpec : function() {
        var me = this, keyname, key_accid, key_mode;
        if (me.staffDefObj['key.pname'] !== undefined) {
          keyname = me.staffDefObj['key.pname'].toUpperCase();
          key_accid = me.staffDefObj['key.accid'];
          if (key_accid !== undefined) {
            switch (key_accid) {
              case 's' :
                keyname += '#';
                break;
              case 'f' :
                keyname += 'b';
                break;
              default :
                throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.UnexpectedAttributeValue', "Value of key.accid must be 's' or 'f'");
            }
          }
          key_mode = me.staffDefObj['key.mode'];
          if (key_mode !== undefined)
            keyname += (key_mode === 'major') ? '' : 'm';
          return keyname;
        }
        return 'C';
      },

      /**
       * gets the vexFlow time signature from an MEI staffDef element
       *
       * @return {String} the vexFlow time signature or undefined
       */
      getTimeSig : function() {
        var me = this, symbol, count, unit;
        symbol = me.staffDefObj['meter.sym'];
        if (symbol) {
          return (symbol === 'cut') ? 'C|' : 'C';
        }
        count = me.meter.count;
        unit = me.meter.unit;
        return (count && unit) ? count + '/' + unit : undefined;
      },

      updateRenderWith : function(newStaffDef) {
        var me = this, result, hasEqualAtt;

        result = {
          clef : false,
          keysig : false,
          timesig : false
        };

        // if (Object.keys(newStaffDef).length === 0) {
        // return result;
        // }

        hasEqualAtt = function(attr_name) {
          return me.staffDefObj[attr_name] === newStaffDef[attr_name];
        };

        if (!hasEqualAtt('clef.shape') || !hasEqualAtt('clef.line')) {
          result.clef = true;
        }
        if ((!hasEqualAtt('key.pname') || !hasEqualAtt('key.accid') || !hasEqualAtt('key.mode'))) {
          result.keysig = true;
        }
        if (!hasEqualAtt('meter.count') || !hasEqualAtt('meter.unit')) {
          result.timesig = true;
        }

        me.renderWith = result;
      },

      updateDef : function(staffDef, scoreDef) {
        var me = this, newStaffDef;
        newStaffDef = m2v.Util.attsToObj(staffDef);
        me.updateRenderWith(newStaffDef);
        me.staffDefObj = newStaffDef;
        me.scoreDefObj = scoreDef ? m2v.Util.attsToObj(scoreDef) : {};
        me.updateMeter();
        me.updateStaveLabels();
        me.updateSpacing();
        me.currentClef = me.convertClef();
      }
    };

    return m2v;

  }(MEI2VF || {}, MeiLib, Vex.Flow, jQuery));
