/*
 * MEItoVexFlow, Verses class
 *
 * Author: Zoltan Komives
 * Contributor: Alexander Erhard
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
  'mei2vf/lyrics/Hyphenation'
], function (VF, Hyphenation) {

  /**
   * @class MEI2VF.Verses
   * @private
   *
   * @constructor
   * @param {Object} config
   */
  var Verses = function (config) {
    var me = this;
    me.systemVerses = {};
    me.lowestYs = {};
    me.font = config.font;
    me.maxHyphenDistance = config.maxHyphenDistance;
  };

  Verses.prototype = {

    /**
     * @public
     * @param annot
     * @param element
     * @param stave_n
     * @returns {Verses}
     */
    addSyllable : function (annot, element, stave_n) {
      var me = this, verse_n;

      var wordpos = element.getAttribute('wordpos');

      var parentNode = element.parentNode;
      if (parentNode.localName === 'verse' && parentNode.hasAttribute('n')) {
        verse_n = parentNode.getAttribute('n');
      } else {
        verse_n = '1';
      }

      if (!me.systemVerses[stave_n]) {
        me.systemVerses[stave_n] = {};
      }

      if (!me.systemVerses[stave_n][verse_n]) {
        me.systemVerses[stave_n][verse_n] = {
          syllables: [],
          hyphenation : me.newHyphenation()
        };
      }

      me.systemVerses[stave_n][verse_n].syllables.push(annot);

      if (wordpos) {
        me.systemVerses[stave_n][verse_n].hyphenation.addSyllable(annot, wordpos);
      }
      return me;
    },

    /**
     * @public
     */
    getLowestYs : function () {
      return this.lowestYs;
    },

    /**
     * @public
     */
    getLowestY : function (stave_n) {
      return this.lowestYs[stave_n];
    },

    /**
     * @private
     */
    newHyphenation : function () {
      return new Hyphenation(this.font, this.maxHyphenDistance);
    },

    /**
     * @public
     * @returns {Verses}
     */
    format : function () {
      var me = this, stave_n, verse_n, text_line, verse, i, j, lowestY, padding, lowestTextLine;
      var notesInContext;

      padding = 20;

      me.font.size=15;

      var spacing_between_lines = 10;
      var height_in_lines = me.font.size / spacing_between_lines * 1.5;

      for (stave_n in me.systemVerses) {
        text_line = 0;
        lowestTextLine = 0;
        lowestY = -20;

        for (verse_n in me.systemVerses[stave_n]) {
          verse = me.systemVerses[stave_n][verse_n].syllables;
          lowestY += padding;
          // first pass: get lowest y
          for (i = 0, j = verse.length; i < j; i++) {
            verse[i].setTextLine(text_line);

            notesInContext = verse[i].getModifierContext().modifiers.stavenotes;

            if (notesInContext.length > 1) {
              verse[i].setNote(notesInContext[0]);
            }

            // TODO compare lowest Ys


            lowestY = Math.max(lowestY, verse[i].preProcess());

//            lowestTextLine = Math.max(lowestTextLine, verse[i].text_line);
          }
          // second pass: set lowest y
          for (i = 0; i < j; i++) {
            verse[i].setY(lowestY);
//            verse[i].setTextLine(lowestTextLine);
          }
          lowestTextLine += height_in_lines;
        }
        me.lowestYs[stave_n] = lowestY;

      }
      return me;
    },

    /**
     * @public
     * @param ctx
     * @param leftX
     * @param rightX
     * @returns {Verses}
     */
    drawHyphens : function (ctx, leftX, rightX) {
      var me = this, stave_n, verse_n;
      for (stave_n in me.systemVerses) {
        for (verse_n in me.systemVerses[stave_n]) {
          me.systemVerses[stave_n][verse_n].hyphenation.setContext(ctx).draw(leftX, rightX);
        }
      }
      return me;
    }

  };

  return Verses;

});
