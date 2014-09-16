/*
* MEItoVexFlow
*
* Author: Richard Lewis Contributors: Zoltan Komives, Raffaele Viglianti
*
* See README for details of this library
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
     * Converts an MEI XML document / document fragment to VexFlow objects and
     * optionally renders it using Raphael or HTML5 Canvas.
     *
     * Usage:
     *
     * - Either pass a config object to the constructor function or (if no config
     * object has been passed) call {@link #initConfig} after construction.
     * - Call {@link #process} to process an MEI XML document
     * - Call {@link #draw} to draw the processed VexFlow objects to a canvas
     *
     * @class MEI2VF.Converter
     *
     * @constructor
     * @param {Object} [config]
     * @chainable
     * @return {MEI2VF.Converter} this
     */
    m2v.Converter = function(config) {
      if (config)
        this.initConfig(config);
      return this;
    };

    m2v.Converter.prototype = {

      BOTTOM : VF.Annotation.VerticalJustify.BOTTOM,

      defaults : {
        /**
         * @cfg {Number} page_width The width of the page
         */
        page_width : 800,
        /**
         * @cfg {Number} page_margin_top The top page margin
         */
        page_margin_top : 60,
        /**
         * @cfg {Number} page_margin_left The left page margin
         */
        page_margin_left : 20,
        /**
         * @cfg {Number} page_margin_right The right page margin
         */
        page_margin_right : 20,
        /**
         * @cfg {Number} systemSpacing The spacing between two staff
         * systems
         */
        systemSpacing : 90,
        /**
         * @cfg {Number} staveSpacing The default spacing between two staffs
         * within a system; overridden by the spacing attribute of a staffDef
         * element in the MEI code
         */
        staveSpacing : 60,
        /**
         * @cfg {Boolean} autoStaveConnectorLine Specifies if a stave connector
         * line is drawn on the left of systems by default; if set to true, the
         * auto line will not appear when staffDef/@symbol="none" is set for the
         * outermost staffDef element
         */
        autoStaveConnectorLine : true,
        /**
         * @cfg {"full"/"abbr"/null} labelMode Specifies the way voice labels are
         * added
         * to staves. Values:
         *
         * - 'full': renders full labels in the first system, abbreviated labels
         * in all following systems
         * - 'abbr': only render abbreviated labels
         * - null or undefined: renders no labels
         */
        labelMode : null, // 'full',
        /**
         * @cfg {Number} maxHyphenDistance The maximum distance (in pixels)
         * between two hyphens in the lyrics lines
         */
        maxHyphenDistance : 75,
        /**
         * @cfg {Object} lyricsFont The font used for rendering lyrics (and
         * hyphens)
         * @cfg {String} lyricsFont.family the font family
         * @cfg {Number} lyricsFont.size the font size
         *
         * NB the weight properties can be used to specify style, weight
         * or both (space separated); some of the objects are passed directly
         * to vexFlow (which requires the name 'weight'), so the name is
         * 'weight'
         */
        lyricsFont : {
          family : 'Times',
          size : 13,
          spacing: 1.3,
        },
        /**
         * @cfg {Object} annotFont the font used for annotations (for example,
         * 'pizz.')
         * @cfg {String} annotFont.family the font family
         * @cfg {Number} annotFont.size the font size
         * @cfg {String} annotFont.weight the font weight
         */
        annotFont : {
          family : 'Times',
          size : 15,
          weight : 'Italic'
        },
        /**
         * @cfg {Object} dynamFont the font used for dynamics
         * @cfg {String} dynamFont.family the font family
         * @cfg {Number} dynamFont.size the font size
         * @cfg {String} dynamFont.weight the font weight
         */
        dynamFont : {
          family : 'Times',
          size : 18,
          weight : 'bold italic'
        },
        /**
         * @cfg {Object} tempoFont The tempo font
         * @cfg {String} tempoFont.family the font family
         * @cfg {Number} tempoFont.size the font size
         * @cfg {String} tempoFont.weight the font weight
         */
        tempoFont : {
          family : "Times",
          size : 17,
          weight : "bold"
        },
        /**
         * @cfg {Object} staff The staff config object passed to each
         * Vex.Flow.Staff
         */
        staff : {
          vertical_bar_width : 20, // 10 // Width around vertical bar end-marker
          top_text_position : 1.5, // 1 // in staff lines
          bottom_text_position : 7.5
        }
      },

      /**
       * initializes the Converter
       * @method initConfig
       * @param {Object} config A config object (optional)
       * @chainable
       * @return {MEI2VF.Converter} this
       */
      initConfig : function(config) {
        var me = this;
        me.cfg = $.extend(true, {}, me.defaults, config);
        /**
         * an instance of MEI2VF.SystemInfo dealing with the system and staff
         * info derived from the MEI data
         * @property {MEI2VF.SystemInfo} systemInfo
         */
        me.systemInfo = new m2v.SystemInfo();

        /**
         * The print space coordinates calculated from the page config.
         * @property {Object} printSpace
         * @property {Number} printSpace.top
         * @property {Number} printSpace.left
         * @property {Number} printSpace.right
         * @property {Number} printSpace.width
         */
        me.printSpace = {
          // substract four line distances (40px) from page_margin_top in order
          // to compensate VexFlow's default top spacing / allow specifying
          // absolute values
          top : me.cfg.page_margin_top - 40,
          left : me.cfg.page_margin_left,
          right : me.cfg.page_width - me.cfg.page_margin_right,
          width : Math.floor(me.cfg.page_width - me.cfg.page_margin_right - me.cfg.page_margin_left) - 1
        };
        return me;

      },

      /**
       * Resets all data. Called by {@link #process}.
       * @method reset
       * @chainable
       * @return {MEI2VF.Converter} this
       */
      reset : function() {
        var me = this;
        me.systemInfo.init(me.cfg, me.printSpace);
        /**
         * @property {MEI2VF.EventLink[][]} unresolvedTStamp2
         */
        me.unresolvedTStamp2 = [];
        /**
         * Contains all {@link MEI2VF.System} objects
         * @property {MEI2VF.System[]} systems
         */
        me.systems = [];
        /**
         * Contains all Vex.Flow.Stave objects. Addressing scheme:
         * [measure_n][staff_n]
         * @property {Vex.Flow.Stave[][]} allVexMeasureStaffs
         */
        me.allVexMeasureStaffs = [];
        /**
         * Contains all Vex.Flow.Beam objects. Data is just pushed in
         * and later processed as a whole, so the array index is
         * irrelevant.
         * @property {Vex.Flow.Beam[]} allBeams
         */
        me.allBeams = [];
        /**
         * Contains all Vex.Flow.Tuplet objects. Data is just pushed in
         * and later processed as a whole, so the array index is
         * irrelevant.
         * @property {Vex.Flow.Tuplet[]} allTuplets
         */
        me.allTuplets = [];
        /**
         * an instance of MEI2VF.Dynamics dealing with and storing all dynamics
         * found in the MEI document
         * @property {MEI2VF.Dynamics} dynamics
         */
        me.dynamics = new m2v.Dynamics(me.systemInfo, me.cfg.dynamFont);
        /**
         * an instance of MEI2VF.Directives dealing with and storing all
         * directives found in the MEI document
         * @property {MEI2VF.Directives} directives
         */
        me.directives = new m2v.Directives(me.systemInfo, me.cfg.annotFont);
        /**
         * an instance of MEI2VF.Fermatas dealing with and storing all
         * fermata elements found in the MEI document (fermata attributes are
         * attached directly to the containing note-like object)
         * @property {MEI2VF.Fermatas} fermatas
         */
        me.fermatas = new m2v.Fermatas(me.systemInfo);

        /**
         * an instance of MEI2VF.Ties dealing with and storing all ties found in
         * the MEI document
         * @property {MEI2VF.Ties} ties
         */
        me.ties = new m2v.Ties(me.systemInfo, me.unresolvedTStamp2);
        /**
         * an instance of MEI2VF.Ties dealing with and storing all slurs found in
         * the MEI document
         * @property {MEI2VF.Ties} slurs
         */
        me.slurs = new m2v.Ties(me.systemInfo, me.unresolvedTStamp2);
        /**
         * an instance of MEI2VF.Hairpins dealing with and storing all hairpins
         * found in the MEI document
         * @property {MEI2VF.Hairpins} hairpins
         */
        me.hairpins = new m2v.Hairpins(me.systemInfo, me.unresolvedTStamp2);
        /**
         * an instance of MEI2VF.Hyphenation dealing with and storing all lyrics
         * hyphens found in the MEI document
         * @property {MEI2VF.Hyphenation} hyphenation
         */
        me.hyphenation = new m2v.Hyphenation(me.cfg.lyricsFont, me.printSpace.right, me.cfg.maxHyphenDistance);
        me.verses = new m2v.Verses(me.cfg.lyricsFont, me.printSpace.right, me.cfg.maxHyphenDistance);
        /**
         * contains all note-like objects in the current MEI document, accessible
         * by their xml:id
         * @property {Object} notes_by_id
         * @property {XMLElement} notes_by_id.meiNote the XML Element of the note
         * @property {Vex.Flow.StaveNote} notes_by_id.vexNote the VexFlow note
         * object
         */
        me.notes_by_id = {};
        /**
         * the number of the current system
         * @property {Number} currentSystem_n
         */
        me.currentSystem_n = 0;
        /**
         * indicates if a system break is currently to be processed
         * @property {Boolean} pendingSystemBreak
         */
        me.pendingSystemBreak = false;
        /**
         * indicates if a system break is currently to be processed
         * @property {Boolean} pendingSectionBreak
         */
        me.pendingSectionBreak = true;
        /**
         * Contains information about the volta type of the current staff. Properties:
         *
         * -  `start` {String} indicates the number to render to the volta. When
         * falsy, it is assumed that the volta does not start in the current
         * measure
         * -  `end` {Boolean} indicates if there is a volta end in the current
         * measure
         *
         * If null, no volta is rendered
         * @property {Object} currentVoltaType
         */
        me.currentVoltaType = null;
        return me;
      },

      /**
       * Calls {@link #reset} and then processes the specified MEI document or
       * document fragment. The generated objects can
       * be processed further or drawn immediately to a canvas via {@link #draw}.
       * @method process
       * @chainable
       * @param {XMLDocument} xmlDoc the XML document
       * @return {MEI2VF.Converter} this
       */
      process : function(xmlDoc) {
        var me = this;
        me.reset();
        me.systemInfo.processScoreDef($(xmlDoc).find('scoreDef')[0]);
        me.processSections(xmlDoc);
        me.directives.createVexFromInfos(me.notes_by_id);
        me.dynamics.createVexFromInfos(me.notes_by_id);
        me.fermatas.createVexFromInfos(me.notes_by_id);
        me.ties.createVexFromInfos(me.notes_by_id);
        me.slurs.createVexFromInfos(me.notes_by_id);
        me.hairpins.createVexFromInfos(me.notes_by_id);
        return me;
      },

      /**
       * Draws the internal data objects to a canvas
       * @method draw
       * @chainable
       * @param ctx The canvas context
       * @return {MEI2VF.Converter} this
       */
      draw : function(ctx) {
        var me = this;
        me.drawSystems(ctx);
        me.drawVexBeams(me.allBeams, ctx);
        me.drawVexTuplets(me.allTuplets, ctx);
        me.ties.setContext(ctx).draw();
        me.slurs.setContext(ctx).draw();
        me.hairpins.setContext(ctx).draw();
        me.verses.drawHyphens(ctx);
        return me;
      },

      /**
       * Returns the width and the height of the area that contains all drawn
       * staves as per the last processing.
       *
       * @method getStaffArea
       * @return {Object} the width and height of the area that contains all
       * staves.
       * Properties: width, height
       */
      getStaffArea : function() {
        var height, i;
        height = this.systemInfo.getCurrentLowestY();
        var allVexMeasureStaffs = this.getAllVexMeasureStaffs();
        var i, k, max_start_x, area_width, staff;
        i = allVexMeasureStaffs.length;
        area_width = 0;
        while (i--) {
          if (allVexMeasureStaffs[i]) {
            max_start_x = 0;
            // get maximum start_x of all staffs in measure
            k = allVexMeasureStaffs[i].length;
            while (k--) {
              staff = allVexMeasureStaffs[i][k];
              if (staff)
                max_start_x = Math.max(max_start_x, staff.getNoteStartX());
            }
            k = allVexMeasureStaffs[i].length;
            while (k--) {
              // get maximum width of all staffs in measure
              staff = allVexMeasureStaffs[i][k];
              if (staff) {
                area_width = Math.max(area_width, max_start_x + staff.getWidth());
              }
            }
          }
        }
        return {
          width : area_width,
          height : height
        };
      },

      /**
       * returns a 2d array of all Vex.Flow.Stave objects, arranged by
       * [measure_n][staff_n]
       * @method getAllVexMeasureStaffs
       * @return {Vex.Flow.Stave[][]} see {@link #allVexMeasureStaffs}
       */
      getAllVexMeasureStaffs : function() {
        return this.allVexMeasureStaffs;
      },

      /**
       * returns all systems created when processing the MEI document
       * @method getSystems
       * @return {MEI2VF.System[]}
       */
      getSystems : function() {
        return this.systems;
      },

      /**
       * returns all note-like objects created when processing the MEI document
       * @method getNotes
       * @return {Object} for the object properties, see {@link #notes_by_id}
       */
      getNotes : function() {
        return this.notes_by_id;
      },

      /**
       * creates in initializes a new {@link MEI2VF.System} and updates the staff
       * modifier infos
       * @method createNewSystem
       */
      createNewSystem : function() {
        var me = this, system, coords;

        m2v.L('Converter.createNewSystem()', '{enter}');

        me.pendingSystemBreak = false;
        me.currentSystem_n += 1;

        coords = {
          x : me.printSpace.left,
          y : (me.currentSystem_n === 1) ? me.printSpace.top : me.systemInfo.getCurrentLowestY() + me.cfg.systemSpacing,
          w : me.printSpace.width
        };

        system = new m2v.System({
          leftMar : me.systemInfo.getLeftMar(),
          coords : coords,
          staffYs : me.systemInfo.getYs(coords.y),
          labels : me.getStaffLabels()
        });

        if (me.pendingSectionBreak) {
          me.pendingSectionBreak = false;
          me.systemInfo.forceSectionStartInfos();
        } else {
          me.systemInfo.forceStaveStartInfos();
        }

        me.hyphenation.addLineBreaks(me.systemInfo.getAllStaffInfos(), {
          system : system
        });

        me.verses.addLineBreaks(me.systemInfo.getAllStaffInfos(), {
          system : system
        });

        me.systems[me.currentSystem_n] = system;
        return system;
      },

      /**
       * @method processSections
       */
      processSections : function(xmlDoc) {
        var me = this;
        $(xmlDoc).find('section').each(function() {
            me.processSection(this);
        });
      },

      /**
       *@method processSection
       */
      processSection : function(element) {
        var me = this, i, j, sectionChildren = $(element).children();
        me.verses.initHyphenations( $(element).find('syl') );
        for ( i = 0, j = sectionChildren.length; i < j; i += 1) {
          me.processSectionChild(sectionChildren[i]);
        }
      },

      /**
       * @method processEnding
       */
      processEnding : function(element) {
        var me = this, i, j, sectionChildren = $(element).children();
        for ( i = 0, j = sectionChildren.length; i < j; i += 1) {
          me.currentVoltaType = {};
          if (i === 0)
            me.currentVoltaType.start = $(element).attr('n');
          if (i === j - 1)
            me.currentVoltaType.end = true;
          me.processSectionChild(sectionChildren[i]);
        }
        me.currentVoltaType = null;
      },

      /**
       * MEI element <b>section</b> may contain (MEI v2.1.0): MEI.cmn: measure
       * MEI.critapp: app MEI.edittrans: add choice corr damage del gap
       * handShift orig reg restore sic subst supplied unclear MEI.shared:
       * annot ending expansion pb sb scoreDef section staff staffDef
       * MEI.text: div MEI.usersymbols: anchoredText curve line symbol
       *
       * Supported elements: <b>measure</b> <b>scoreDef</b> <b>staffDef</b>
       * <b>sb</b>
       * @method processSectionChild
       */
      processSectionChild : function(element) {
        var me = this;
        switch (element.localName) {
          case 'measure' :
            me.processMeasure(element);
            break;
          case 'scoreDef' :
            me.systemInfo.processScoreDef(element);
            break;
          case 'staffDef' :
            me.systemInfo.processStaffDef(element);
            break;
          case 'sb' :
            me.setPendingSystemBreak(element);
            break;
          case 'ending' :
            me.processEnding(element);
            break;
          default :
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.NotSupported', 'Element <' + element.localName + '> is not supported in <section>');
        }
      },

      /**
       * sets the property {@link #pendingSystemBreak} to `true`. When true, a
       * new system will be initialized when {@link #processMeasure} is called
       * the next time.
       * @method setPendingSystemBreak
       */
      setPendingSystemBreak : function() {
        this.pendingSystemBreak = true;
      },

      /**
       * Processes a MEI measure element and calls functions to process a
       * selection of ancestors: .//staff, ./slur, ./tie, ./hairpin, .//tempo
       * @method processMeasure
       * @param {XMLElement} element the MEI measure element
       */
      processMeasure : function(element) {
        var me = this, measure_n, atSystemStart, left_barline, right_barline, system, system_n;

        if (me.pendingSectionBreak || me.pendingSystemBreak) {
          system_n = me.systems.length;
          system = me.createNewSystem();
          atSystemStart = true;
        } else {
          system_n = me.systems.length - 1;
          system = me.systems[system_n];
          atSystemStart = false;
        }

        m2v.L('Converter.processMeasure()', '{enter}');

        measure_n = +element.getAttribute('n');
        left_barline = element.getAttribute('left');
        right_barline = element.getAttribute('right');

        var staffElements = [], dirElements = [], slurElements = [], tieElements = [], hairpinElements = [], tempoElements = [], dynamElements = [], fermataElements = [];

        $(element).find('*').each(function() {
          switch (this.localName) {
            case 'staff':
              staffElements.push(this);
              break;
            case 'dir':
              dirElements.push(this);
              break;
            case 'tie':
              tieElements.push(this);
              break;
            case 'slur':
              slurElements.push(this);
              break;
            case 'hairpin':
              hairpinElements.push(this);
              break;
            case 'tempo':
              tempoElements.push(this);
              break;
            case 'dynam':
              dynamElements.push(this);
              break;
            case 'fermata':
              fermataElements.push(this);
              break;
            default:
              break;
          }
        });

        // the staff objects will be stored in two places:
        // 1) in each MEI2VF.Measure
        // 2) in MEI2VF.Converter.allVexMeasureStaffs
        var staffs = me.initializeMeasureStaffs(system, staffElements, left_barline, right_barline);
        me.allVexMeasureStaffs[measure_n] = staffs;

        var currentStaveVoices = new m2v.StaveVoices();

        $.each(staffElements, function() {
          me.processStaffEvents(staffs, this, measure_n, currentStaveVoices);
        });

        me.directives.createInfos(dirElements, element);
        me.dynamics.createInfos(dynamElements, element);
        me.fermatas.createInfos(fermataElements, element);
        me.ties.createInfos(tieElements, element, me.systemInfo);
        me.slurs.createInfos(slurElements, element, me.systemInfo);
        me.hairpins.createInfos(hairpinElements, element, me.systemInfo);

        system.addMeasure(new m2v.Measure({
          element : element,
          n : measure_n,
          staffs : staffs,
          voices : currentStaveVoices,
          verses : me.verses,
          startConnectorCfg : (atSystemStart) ? {
            labelMode : me.cfg.labelMode,
            models : me.systemInfo.startConnectorInfos,
            staffs : staffs,
            system_n : me.currentSystem_n
          } : null,
          inlineConnectorCfg : {
            models : me.systemInfo.inlineConnectorInfos,
            staffs : staffs,
            barline_l : left_barline,
            barline_r : right_barline
          },
          tempoElements : tempoElements,
          tempoFont : me.cfg.tempoFont
        }));
      },

      /**
       * @method initializeMeasureStaffs
       * @param {MEI2VF.System} system the current system
       * @param {XMLElement[]} staffElements all staff elements in the current
       * measure
       * @param {String} left_barline the left barline
       * @param {String} right_barline the right barline
       */
      initializeMeasureStaffs : function(system, staffElements, left_barline, right_barline) {
        var me = this, staff, staff_n, staffs, isFirst = true, clefOffsets = {}, maxClefOffset = 0, keySigOffsets = {}, maxKeySigOffset = 0;

        staffs = [];

        // first run: create Vex.Flow.Staff objects, store them in the staffs
        // array. Set staff barlines and staff volta. Add clef. Get each staff's
        // clefOffset and calculate the maxClefOffset.
        $.each(staffElements, function() {
          staff_n = +$(this).attr('n');
          if (!staff_n) {
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArgument', 'Cannot render staff without attribute "n".');
          }
          staff = me.createVexStaff(system.getStaffYs()[staff_n]);
          staffs[staff_n] = staff;

          staff.setBegBarType( left_barline ? m2v.tables.barlines[left_barline] : VF.Barline.type.NONE);
          if (right_barline) {
            staff.setEndBarType(m2v.tables.barlines[right_barline]);
          }
          if (isFirst && me.currentVoltaType) {
            me.addStaffVolta(staff);
          }
          me.addStaffClef(staff, staff_n);
          clefOffsets[staff_n] = staff.getModifierXShift();
          maxClefOffset = Math.max(maxClefOffset, clefOffsets[staff_n]);
          isFirst = false;
        });

        // second run: add key signatures; if the clefOffset of a staff is lesser
        // maxClefOffset, add padding to the left of the key signature. Get each
        // staff's keySigOffset and calculate the maxKeySigOffset.
        $.each(staffs, function(i, staff) {
          if (staff) {
            if (clefOffsets[i] !== maxClefOffset) {
              me.addStaffKeySig(staff, i, maxClefOffset - clefOffsets[i] + 10);
            } else {
              me.addStaffKeySig(staff, i);
            }
            keySigOffsets[i] = staff.getModifierXShift();
            maxKeySigOffset = Math.max(maxKeySigOffset, keySigOffsets[i]);
          }
        });

        // third run: add time signatures; if the keySigOffset of a staff is
        // lesser maxKeySigOffset, add padding to the left of the time signature.
        $.each(staffs, function(i, staff) {
          if (staff) {
            if (keySigOffsets[i] !== maxKeySigOffset) {
              me.addStaffTimeSig(staff, i, maxKeySigOffset - keySigOffsets[i] + 15);
            } else {
              me.addStaffTimeSig(staff, i);
            }
          }
        });

        return staffs;
      },

      /**
       * Creates a new Vex.Flow.Stave object at the specified y coordinate. This
       * method sets fixed x coordinates, which will later be substituted in
       * {@link MEI2VF.System#format} - the Vex.Flow.Stave
       * objects must be initialized with some x measurements, but the real
       * values depend on values only available after modifiers, voices etc
       * have been added.
       *
       * @method createVexStaff
       * @param {Number} y the y coordinate of the staff
       * @return {Vex.Flow.Stave} The initialized stave object
       */
      createVexStaff : function(y) {
        var me = this, staff;
        staff = new VF.Stave();
        staff.init(0, y, 1000, me.cfg.staff);
        // temporary; (due to a bug?) in VexFlow, bottom_text_position does
        // not work when it's passed in the config object
        staff.options.bottom_text_position = me.cfg.staff.bottom_text_position;
        return staff;
      },

      /**
       * Adds clef to a Vex.Flow.Staff.
       *
       * @method addStaffClef
       * @param {Vex.Flow.Stave} staff The stave object
       * @param {Number} staff_n the staff number
       */
      addStaffClef : function(staff, staff_n) {
        var me = this, currentStaffInfo, clef;
        currentStaffInfo = me.systemInfo.getStaffInfo(staff_n);
        if (currentStaffInfo.showClefCheck()) {
          clef = currentStaffInfo.getClef();
          staff.addClef(clef.type, clef.size, clef.shift === -1 ? '8vb' : undefined);
        }
      },

      /**
       * Adds a key signature to a Vex.Flow.Staff.
       *
       * @method addStaffKeySig
       * @param {Vex.Flow.Stave} staff The stave object
       * @param {Number} staff_n the staff number
       * @param {Number} padding the additional padding to the left of the
       * modifier
       */
      addStaffKeySig : function(staff, staff_n, padding) {
        var me = this, currentStaffInfo;
        currentStaffInfo = me.systemInfo.getStaffInfo(staff_n);
        if (currentStaffInfo.showKeysigCheck()) {
          // console.log('keysg pd:'+padding);
          staff.addModifier(new Vex.Flow.KeySignature(currentStaffInfo.getKeySpec(), padding));
        }
      },

      /**
       * Adds a time signature to a Vex.Flow.Staff.
       *
       * @method addStaffTimeSig
       * @param {Vex.Flow.Stave} staff The stave object
       * @param {Number} staff_n the staff number
       * @param {Number} padding the additional padding to the left of the
       * modifier
       */
      addStaffTimeSig : function(staff, staff_n, padding) {
        var me = this, currentStaffInfo;
        currentStaffInfo = me.systemInfo.getStaffInfo(staff_n);
        if (currentStaffInfo.showTimesigCheck()) {
          staff.hasTimeSig = true;
          staff.addTimeSignature(currentStaffInfo.getTimeSig(), padding);
        }
      },

      /**
       * Adds a volta to a staff. Currently not working due to the reworking of
       * the measure width calulation (27/4/2014)
       * @method addStaffVolta
       * @experimental
       */
      addStaffVolta : function(staff) {
        var volta = this.currentVoltaType;
        if (volta.start) {
          staff.setVoltaType(Vex.Flow.Volta.type.BEGIN, volta.start + '.', 30);
        } else if (volta.end) {
          //TODO: fix type.BEGIN and type.END interference in vexflow, then remove else!
          //[think through in which cases we actually need type.END]
          staff.setVoltaType(Vex.Flow.Volta.type.END, "", 30);
        } else if (!volta.start && !volta.end) {
          staff.setVoltaType(Vex.Flow.Volta.type.MID, "", 30);
        }
      },

      /**
       * @method getStaffLabels
       */
      getStaffLabels : function() {
        var me = this, labels, i, infos, labelType;
        labels = {};
        if (!me.cfg.labelMode) {
          return labels;
        }
        labelType = (me.cfg.labelMode === 'full' && me.currentSystem_n === 1) ? 'label' : 'labelAbbr';
        infos = me.systemInfo.getAllStaffInfos();
        i = infos.length;
        while (i--) {
          if (infos[i]) {
            labels[i] = infos[i][labelType];
          }
        }
        return labels;
      },

      /**
       * Processes a single stave in a measure
       *
       * @method processStaffEvents
       * @param {Vex.Flow.Stave[]} staffs the staff objects in the current
       * measure
       * @param {XMLElement} staff_element the MEI staff element
       * @param {Number} measure_n the measure number
       * @param {MEI2VF.StaveVoices} currentStaveVoices The current StaveVoices
       * object
       */
      processStaffEvents : function(staffs, staff_element, measure_n, currentStaveVoices) {
        var me = this, staff, staff_n, readEvents, layer_events;

        staff_n = +$(staff_element).attr('n');
        staff = staffs[staff_n];

        readEvents = function() {
          var event = me.processNoteLikeElement(this, staff, staff_n);
          // return event.vexNote;
          return event.vexNote || event;
        };

        $(staff_element).find('layer').each(function() {
          me.resolveUnresolvedTimestamps(this, staff_n, measure_n);
          layer_events = $(this).children().map(readEvents).get();
          currentStaveVoices.addVoice(me.createVexVoice(layer_events, staff_n), staff_n);
        });

      },

      /**
       * Creates a new Vex.Flow.Voice
       * @method createVexVoice
       * @param {Array} voice_contents The contents of the voice, an array of
       * tickables
       * @param {Number} staff_n The number of the enclosing staff element
       * return {Vex.Flow.Voice}
       */
      createVexVoice : function(voice_contents, staff_n) {
        var me = this, voice, meter;
        if (!$.isArray(voice_contents)) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'me.createVexVoice() voice_contents argument must be an array.');
        }
        meter = me.systemInfo.getStaffInfo(staff_n).meter;
        voice = new VF.Voice({
          num_beats : meter.count,
          beat_value : meter.unit,
          resolution : VF.RESOLUTION
        });
        voice.setStrict(false);
        voice.addTickables(voice_contents);
        return voice;
      },

      /**
       * @method resolveUnresolvedTimestamps
       */
      resolveUnresolvedTimestamps : function(layer, staff_n, measure_n) {
        var me = this, refLocationIndex;
        // check if there's an unresolved TStamp2 reference to this location
        // (measure, staff, layer):
        if (isNaN(measure_n))
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.extract_events', '<measure> must have @n specified');
        staff_n = staff_n || 1;
        refLocationIndex = measure_n + ':' + staff_n + ':' + ($(layer).attr('n') || '1');
        if (me.unresolvedTStamp2[refLocationIndex]) {
          $(me.unresolvedTStamp2[refLocationIndex]).each(function(i) {
            this.setContext({
              layer : layer,
              meter : me.systemInfo.getStaffInfo(staff_n).meter
            });
            // TODO: remove eventLink from the list
            me.unresolvedTStamp2[refLocationIndex][i] = null;
          });
          // at this point all references should be supplied with context.
          me.unresolvedTStamp2[refLocationIndex] = null;
        }
      },

      /**
       * processes a note-like element by calling the adequate processing
       * function
       *
       * @method processNoteLikeElement
       * @param {XMLElement} element the element to process
       * @param {Vex.Flow.Stave} staff the VexFlow staff object
       * @param {Number} staff_n the number of the staff as given in the MEI
       * document
       */
      processNoteLikeElement : function(element, staff, staff_n) {
        var me = this;
        switch (element.localName) {
          case 'rest' :
            return me.processRest(element, staff);
          case 'mRest' :
            return me.processmRest(element, staff, staff_n);
          case 'space' :
            return me.processSpace(element, staff);
          case 'note' :
            return me.processNote(element, staff, staff_n);
          case 'beam' :
            return me.processBeam(element, staff, staff_n);
          case 'tuplet' :
            return me.processTuplet(element, staff, staff_n);
          case 'chord' :
            return me.processChord(element, staff, staff_n);
          case 'anchoredText' :
            return;
          default :
            throw new m2v.RUNTIME_ERROR('BadArguments', 'Rendering of element "' + element.localName + '" is not supported.');
        }
      },

      /**
       * @method processNote
       */
      processNote : function(element, staff, staff_n) {
        var me = this, dots, mei_accid, mei_ho, pname, oct, xml_id, mei_tie, mei_slur, mei_staff_n, i, atts, note_opts, note, clef;

        atts = m2v.Util.attsToObj(element);

        dots = +atts.dots;
        mei_accid = atts.accid;
        mei_ho = atts.ho;
        pname = atts.pname;
        oct = atts.oct;
        mei_tie = atts.tie;
        mei_slur = atts.slur;
        mei_staff_n = +atts.staff || staff_n;

        xml_id = MeiLib.XMLID(element);

        try {

          clef = me.systemInfo.getClef(staff_n);

          note_opts = {
            keys : [me.processAttsPitch(element)],
            clef : clef.type,
            duration : me.processAttsDuration(element),
            octave_shift : clef.shift
          };

          me.setStemDir(element, note_opts);
          note = new VF.StaveNote(note_opts);

          if (mei_staff_n === staff_n) {
            note.setStave(staff);
          } else {
            var otherStaff = me.allVexMeasureStaffs[me.allVexMeasureStaffs.length - 1][mei_staff_n];
            if (otherStaff) {
              note.setStave(otherStaff);
            } else {
              throw new m2v.RUNTIME_ERROR('Error', 'Note has staff attribute "' + mei_staff_n + '", but the staff does not exist.');
            }
          }

          me.processSyllables(note, element, staff_n);

          try {
            for ( i = 0; i < dots; i += 1) {
              note.addDotToAll();
            }
          } catch (e) {
            throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the dots of <note>: ' + m2v.Util.attsToString(element));
          }

          if (mei_accid)
            me.processAttrAccid(mei_accid, note, 0);
          if (mei_ho)
            me.processAttrHo(mei_ho, note, staff);

          $.each($(element).find('artic'), function() {
            me.addArticulation(note, this);
          });
          if (atts.fermata) {
            me.fermatas.addFermataToNote(note, atts.fermata);
          }

          // FIXME For now, we'll remove any child nodes of <note>
          $.each($(element).children(), function() {
            $(this).remove();
          });

          // Build a note object that keeps the xml:id

          if (!pname)
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments', 'mei:note must have pname attribute');
          if (!oct)
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments', 'mei:note must have oct attribute');

          if (mei_tie)
            me.processAttrTie(mei_tie, xml_id, pname, oct, staff_n);
          if (mei_slur)
            me.processAttrSlur(mei_slur, xml_id);

          me.notes_by_id[xml_id] = {
            meiNote : element,
            vexNote : note,
            system : me.currentSystem_n
          };

          // return note object
          return {
            vexNote : note,
            id : xml_id
          };

        } catch (e1) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <note>: ' + m2v.Util.attsToString(element) + '\nORIGINAL ERROR MESSAGE: ' + e1.toString());
        }
      },

      /**
       * @method processChord
       */
      processChord : function(element, staff, staff_n) {
        var me = this, i, j, hasDots, children, keys = [], duration, durations = [], durAtt, xml_id, chord, chord_opts, atts, clef;

        children = $(element).children();

        atts = m2v.Util.attsToObj(element);
        durAtt = atts.dur;

        xml_id = MeiLib.XMLID(element);

        hasDots = !!$(element).attr('dots');

        try {
          if (durAtt) {
            duration = me.translateDuration(+durAtt);
          } else {
            for ( i = 0, j = children.length; i < j; i += 1) {
              durations.push(+children[i].getAttribute('dur'));
            }
            duration = me.translateDuration(Math.max.apply(Math, durations));
          }

          for ( i = 0, j = children.length; i < j; i += 1) {
            keys.push(me.processAttsPitch(children[i]));
            // dots.push(+children[i].getAttribute('dots'));
            if (children[i].getAttribute('dots') === '1')
              hasDots = true;
          }

          if (hasDots)
            duration += 'd';

          clef = me.systemInfo.getClef(staff_n);

          chord_opts = {
            keys : keys,
            clef : clef.type,
            duration : duration,
            octave_shift : clef.shift
          };

          me.setStemDir(element, chord_opts);
          chord = new VF.StaveNote(chord_opts);
          chord.setStave(staff);

          var allNoteIndices = [];

          children.each(function(i) {
            me.processNoteInChord(i, this, element, chord, staff_n);
            allNoteIndices.push(i);
          });

          if (hasDots) {
            chord.addDotToAll();
          }
          if (atts.ho) {
            me.processAttrHo(atts.ho, chord, staff);
          }
          if (atts.fermata) {
            me.fermatas.addFermataToNote(chord, atts.fermata);
          }

          me.notes_by_id[xml_id] = {
            meiNote : element,
            vexNote : chord,
            index : allNoteIndices,
            system : me.currentSystem_n
          };

          return {
            vexNote : chord,
            id : xml_id
          };
        } catch (e) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <chord>:' + e.toString());
          // 'A problem occurred processing the <chord>: ' +
          // JSON.stringify($.each($(element).children(), function(i,
          // element) {
          // element.attrs();
          // }).get()) + '. \"' + x.toString() + '"');
        }
      },

      /**
       * @method processNoteInChord
       */
      processNoteInChord : function(i, element, chordElement, chord, staff_n) {
        var me = this, atts, xml_id;

        atts = m2v.Util.attsToObj(element);

        xml_id = MeiLib.XMLID(element);

        if (atts.tie)
          me.processAttrTie(atts.tie, xml_id, atts.pname, atts.oct, staff_n);
        if (atts.slur)
          me.processAttrSlur(atts.slur, xml_id);

        me.notes_by_id[xml_id] = {
          meiNote : chordElement,
          vexNote : chord,
          index : [i],
          system : me.currentSystem_n
        };

        if (atts.accid) {
          me.processAttrAccid(atts.accid, chord, i);
        }
        if (atts.fermata) {
          me.fermatas.addFermataToNote(chord, atts.fermata, i);
        }
      },

      /**
       * @method processRest
       */
      processRest : function(element, staff) {
        var me = this, dur, rest, xml_id, atts;
        try {
          atts = m2v.Util.attsToObj(element);

          dur = me.processAttsDuration(element, true);
          // assign whole rests to the fourth line, all others to the
          // middle line:
          rest = new VF.StaveNote({
            keys : [(dur === 'w') ? 'd/5' : 'b/4'],
            duration : dur + 'r'
          });

          xml_id = MeiLib.XMLID(element);

          if (atts.ho) {
            me.processAttrHo(atts.ho, rest, staff);
          }
          rest.setStave(staff);
          if (atts.dots === '1') {
            rest.addDotToAll();
          }
          if (atts.fermata) {
            me.fermatas.addFermataToNote(rest, atts.fermata);
          }
          me.notes_by_id[xml_id] = {
            meiNote : element,
            vexNote : rest,
            system : me.currentSystem_n
          };
          return {
            vexNote : rest,
            id : xml_id
          };
        } catch (e) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <rest>: ' + m2v.Util.attsToString(element));
        }
      },

      /**
       * @method processmRest
       */
      processmRest : function(element, staff, staff_n) {
        var me = this, mRest, atts, xml_id, meter, duration;

        meter = me.systemInfo.getStaffInfo(staff_n).meter;
        duration = new Vex.Flow.Fraction(meter.count, meter.unit);
        var dur, keys;
        if (duration.value() == 2) {
          dur = m2v.tables.durations['breve'];
          keys = ['b/4'];
        } else if (duration.value() == 4) {
          dur = m2v.tables.durations['long'];
          keys = ['b/4']
        } else {
          dur = 'w';
          keys = ['d/5'];
        }
        try {
          atts = m2v.Util.attsToObj(element);
          mRest = new VF.StaveNote({
            keys : keys,
            duration : dur + 'r',
            duration_override : duration,
            align_center : true
          });

          xml_id = MeiLib.XMLID(element);

          if (atts.ho) {
            me.processAttrHo(atts.ho, mRest, staff);
          }
          if (atts.fermata) {
            me.fermatas.addFermataToNote(mRest, atts.fermata);
          }
          mRest.setStave(staff);
          me.notes_by_id[xml_id] = {
            meiNote : element,
            vexNote : mRest,
            system : me.currentSystem_n
          };
          return {
            vexNote : mRest,
            id : xml_id
          };
        } catch (x) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <mRest>: ' + m2v.Util.attsToString(element));
        }
      },

      /**
       * @method processSpace
       */
      processSpace : function(element, staff) {
        var me = this, space, xml_id;
        try {
          space = new VF.GhostNote({
            duration : me.processAttsDuration(element, true) + 'r'
          });
          space.setStave(staff);
          return {
            vexNote : space
          };
        } catch (e) {
          throw new m2v.RUNTIME_ERROR('BadArguments', 'A problem occurred processing the <space>: ' + m2v.Util.attsToString(element));
        }
      },

      /**
       * @method processBeam
       * @param {XMLElement} element the MEI beam element
       * @param {Vex.Flow.Staff} staff the containing staff
       * @param {Number} the number of the containing staff
       */
      processBeam : function(element, staff, staff_n) {
        var me = this, elements;
        var process = function() {
          // make sure to get vexNote out of wrapped note objects
          var proc_element = me.processNoteLikeElement(this, staff, staff_n);
          return proc_element.vexNote || proc_element;
        };
        elements = $(element).children().map(process).get();
        me.allBeams.push(new VF.Beam(elements));
        return elements;
      },

      /**
       * Processes an MEI <b>tuplet</b>.
       * Supported attributes:
       *
       * - num (3 if not specified)
       * - numbase (2 if not specified)
       * - num.format ('count' if not specified)
       * - bracket.visible (auto if not specified)
       * - bracket.place (auto if not specified)
       *
       * @method processTuplet
       * @param {XMLElement} element the MEI tuplet element
       * @param {Vex.Flow.Staff} staff the containing staff
       * @param {Number} the number of the containing staff
       */
      processTuplet : function(element, staff, staff_n) {
        var me = this, elements, tuplet, bracketVisible, bracketPlace;
        var process = function() {
          // make sure to get vexNote out of wrapped note objects
          var proc_element = me.processNoteLikeElement(this, staff, staff_n);
          return proc_element.vexNote || proc_element;
        };
        elements = $(element).children().map(process).get();

        tuplet = new VF.Tuplet(elements, {
          num_notes : +element.getAttribute('num') || 3,
          beats_occupied : +element.getAttribute('numbase') || 2
        });

        if (element.getAttribute('num.format') === 'ratio') {
          tuplet.setRatioed(true);
        }

        bracketVisible = element.getAttribute('bracket.visible');
        if (bracketVisible) {
          tuplet.setBracketed((bracketVisible === 'true') ? true : false);
        }

        bracketPlace = element.getAttribute('bracket.place');
        if (bracketPlace) {
          tuplet.setTupletLocation((bracketPlace === 'above') ? 1 : -1);
        }

        me.allTuplets.push(tuplet);
        return elements;
      },

      /**
       * @method processAttrAccid
       */
      processAttrAccid : function(mei_accid, vexObject, i) {
        var val = m2v.tables.accidentals[mei_accid];
        if (!val) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadAttributeValue', 'Invalid attribute value: ' + mei_accid);
        }
        vexObject.addAccidental(i, new VF.Accidental(val));
      },

      /**
       * @method processAttrHo
       */
      processAttrHo : function(mei_ho, vexObject, staff) {
        var me = this;
        vexObject.setExtraLeftPx(+mei_ho * staff.getSpacingBetweenLines() / 2);
      },

      /**
       * @method processAttrTie
       */
      processAttrTie : function(mei_tie, xml_id, pname, oct, staff_n) {
        var me = this, i, j;
        for ( i = 0, j = mei_tie.length; i < j; ++i) {
          if (mei_tie[i] === 'i') {
            me.ties.start_tieslur(xml_id, {
              pname : pname,
              oct : oct,
              staff_n: staff_n,
            });
          } else if (mei_tie[i] === 't') {
            me.ties.terminate_tie(xml_id, {
              pname : pname,
              oct : oct,
              staff_n: staff_n,
            });
          }
        }
      },

      /**
       * @method processAttrSlur
       */
      processAttrSlur : function(mei_slur, xml_id) {
        var me = this, tokens;
        if (mei_slur) {
          // create a list of { letter, num }
          tokens = me.parse_slur_attribute(mei_slur);
          $.each(tokens, function() {
            if (this.letter === 'i') {
              me.slurs.start_tieslur(xml_id, {
                nesting_level : this.nesting_level
              });
            } else if (this.letter === 't') {
              me.slurs.terminate_slur(xml_id, {
                nesting_level : this.nesting_level
              });
            }
          });
        }
      },

      /**
       * @method parse_slure_attribute
       */
      parse_slur_attribute : function(slur_str) {
        var result = [], numbered_tokens, numbered_token, i, j, num;
        numbered_tokens = slur_str.split(' ');
        for ( i = 0, j = numbered_tokens.length; i < j; i += 1) {
          numbered_token = numbered_tokens[i];
          if (numbered_token.length === 1) {
            result.push({
              letter : numbered_token,
              nesting_level : 0
            });
          } else if (numbered_token.length === 2) {
            num = +numbered_token[1];
            if (!num) {
              throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:ParseSlur01', "badly formed slur attribute");
            }
            result.push({
              letter : numbered_token[0],
              nesting_level : num
            });
          } else {
            throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.BadArguments:ParseSlur01', "badly formed slur attribute");
          }
        }
        return result;
      },

      /**
       * converts the pitch of an MEI <b>note</b> element to a VexFlow pitch
       *
       * @method processAttsPitch
       * @param {XMLElement} mei_note
       * @return {String} the VexFlow pitch
       */
      processAttsPitch : function(mei_note) {
        var pname, oct;
        pname = $(mei_note).attr('pname');
        oct = $(mei_note).attr('oct');
        if (!pname || !oct) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.MissingAttribute', 'pname and oct attributes must be specified for <note>');
        }
        return pname + '/' + oct;
      },

      /**
       * adds an articulation to a note-like object
       * @method addArticulation
       * @param {Vex.Flow.StaveNote} note the note-like VexFlow object
       * @param {XMLElement} ar the articulation element
       */
      addArticulation : function(note, ar) {
        var vexArtic = new VF.Articulation(m2v.tables.articulations[ar.getAttribute('artic')]);
        var place = ar.getAttribute('place');
        if (place) {
          vexArtic.setPosition(m2v.tables.positions[place]);
        }
        note.addArticulation(0, vexArtic);
      },

      /**
       * @method processSyllables
       */
      processSyllables : function(note, element, staff_n) {
        var me = this, annot, syl, verse, text_line, verse_n, syls;
        // syl = me.processSyllable(element);
        syls = $(element).find('syl');
        $.each(syls, function(i) {
          syl = {
            text : $(this).text(),
            wordpos : $(this).attr('wordpos'),
            verse_n : $(this).parents('verse').attr('n'),
          };
          if (syl) {
            annot = me.createAnnot(syl.text, me.cfg.lyricsFont).
              setVerticalJustification(me.BOTTOM).
              setLineSpacing(me.cfg.lyricsFont.spacing);
            note.addAnnotation(0, annot);
            me.verses.addSyllable(annot, syl.wordpos, syl.verse_n, staff_n)
            if (syl.wordpos) {
              me.hyphenation.addSyllable(annot, syl.wordpos, staff_n);
            }
          }
        });
      },

      // processSyllable : function(mei_note) {
      // var me = this, syl, full_syl = '', dash;
      // syl = $(mei_note).find('syl');
      // $(syl).each(function(i, s) {
      // dash = ($(s).attr('wordpos') === 'i' || $(s).attr('wordpos') === 'm')
      // ?
      // '-' : '';
      // full_syl += (i > 0 ? '\n' : '') + $(s).text() + dash;
      // });
      // return full_syl;
      // },

      // temporarily only handle one syllable per note
      /**
       * @method processSyllable
       */
      processSyllable : function(mei_note) {
        var syl = $(mei_note).find('syl')[0];
        if (syl) {
          return {
            text : $(syl).text(),
            wordpos : $(syl).attr('wordpos'),
            verse_n : $(syl).parents('verse').attr('n'),
          };
        }
      },

      // Support for annotations
      /**
       * @method createAnnot
       */
      createAnnot : function(text, annotFont) {
        return (new VF.Annotation(text)).setFont(annotFont.family, annotFont.size, annotFont.weight);
      },

      /**
       * @method getMandatoryAttr
       */
      getMandatoryAttr : function(element, attribute) {
        var result = $(element).attr(attribute);
        if (!result) {
          throw new m2v.RUNTIME_ERROR('MEI2VF.RERR.MissingAttribute', 'Attribute ' + attribute + ' is mandatory.');
        }
        return result;
      },

      /**
       * @method translateDuration
       */
      translateDuration : function(mei_dur) {
        var result = m2v.tables.durations[mei_dur + ''];
        if (result)
          return result;
        throw new m2v.RUNTIME_ERROR('BadArguments', 'The MEI duration "' + mei_dur + '" is not supported.');
      },

      /**
       * @method processAttsDuration
       */
      processAttsDuration : function(mei_note, noDots) {
        var me = this, dur, dur_attr;

        dur_attr = $(mei_note).attr('dur');
        if (dur_attr === undefined) {
          alert('Could not get duration from:\n' + JSON.stringify(mei_note, null, '\t'));
        }
        dur = me.translateDuration(dur_attr);
        if (!noDots && $(mei_note).attr('dots') === '1')
          dur += 'd';
        return dur;
      },

      /**
       * @method setStemDir
       */
      setStemDir : function(element, optionsObj) {
        var specified_dir = {
        down : VF.StaveNote.STEM_DOWN,
        up : VF.StaveNote.STEM_UP
        }[$(element).attr('stem.dir')];
        if (specified_dir) {
          optionsObj.stem_direction = specified_dir;
        } else {
          optionsObj.auto_stem = true;
        }
      },

      /**
       * @method drawSystems
       */
      drawSystems : function(ctx) {
        var me = this, i = me.systems.length;
        while (i--) {
          if (me.systems[i]) {
            me.systems[i].format(ctx).draw(ctx);
          }
        }
      },

      /**
       * @method drawVexBeams
       */
      drawVexBeams : function(beams, ctx) {
        $.each(beams, function() {
          this.setContext(ctx).draw();
        });
      },
      /**
       * @method drawVexBeams
       */
      drawVexTuplets : function(tuplets, ctx) {
        $.each(tuplets, function() {
          this.setContext(ctx).draw();
        });
      }
    };

    return m2v;

  }(MEI2VF || {}, MeiLib, Vex.Flow, jQuery));
