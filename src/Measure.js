var MEI2VF = ( function(m2v, MeiLib, VF, $, undefined) {

    /**
     * @class MEI2VF.Measure
     * @private
     *
     * @constructor
     * @param {Object} config The configuration object
     */
    m2v.Measure = function(config) {
      this.init(config);
    };

    m2v.Measure.prototype = {

      /**
       * initializes the current MEI2VF.Measure object
       * @param {Object} config The configuration object
       */
      init : function(config) {
        var me = this;
        /**
         * @cfg {XMLElement} element the MEI element of the current measure
         */
        me.element = config.element;
        /**
         * @cfg {Number} n The number of the current measure as specified in
         * the MEI document
         */
        me.n = config.n;
        // TODO instead of passing the staff contents in the config object, use a method addToMeasure!?!
        /**
         * @cfg {Array} staffs an array of the staffs in the current
         * measure. Contains
         */
        me.staffs = config.staffs;
        /**
         * @cfg {MEI2VF.StaveVoices} voices The voices of all staffs in the
         * current measure
         */
        me.voices = config.voices;
        /**
         * @cfg {MEI2VF.Connectors} startConnectors an instance of
         * MEI2VF.Connectors handling all left connectors (only the first measure
         * in a system has data)
         */
        me.startConnectors = new m2v.Connectors(config.startConnectorCfg);
        /**
         * @cfg {MEI2VF.Connectors} inlineConnectors an instance of
         * MEI2VF.Connectors handling all right connectors
         */
        me.inlineConnectors = new m2v.Connectors(config.inlineConnectorCfg);

        me.tieElements = config.tieElements;
        me.slurElements = config.slurElements;
        me.hairpinElements = config.hairpinElements;
        /**
         * @cfg {XMLElement[]} tempoElements the MEI tempo elements in the
         * current
         * measure
         */
        me.tempoElements = config.tempoElements;
        /**
         * @cfg {Object} tempoFont the font used for rendering tempo
         * specifications
         */
        me.tempoFont = config.tempoFont;
        /**
         * @cfg {XMLElement[]} rehElements the MEI rehearsal mark elements in the
         * current measure
         */
        me.rehElements = config.rehElements;
        /**
         * @property {Number} maxNoteStartX the maximum note_start_x value of all
         * Vex.Flow.Stave objects in the current measure
         */
        me.maxNoteStartX = 0;
        /**
         * @property {Number} meiW the width attribute of the measure element or
         * null if NaN
         */
        me.meiW = me.readMEIW(me.element);
      },

      /**
       *  reads the width attribute of the specified element and converts it to a
       * number
       * @param {XMLElement} element the element to process
       * @return {Number} the number of the attribute or null if NaN
       */
      readMEIW : function(element) {
        return +element.getAttribute('width') || null;
      },

      /**
       * gets the staffs array of the current measure
       * @return {Array}
       */
      getStaffs : function() {
        return this.staffs;
      },

      /**
       * gets the voices object of the current measure
       * @return {MEI2VF.StaveVoices}
       */
      getVoices : function() {
        return this.voices;
      },

      /**
       * gets the x coordinate of the staff
       * @return {Number}
       */
      getX : function() {
        return this.getFirstDefinedStaff().x;
      },

      /**
       * gets the number of the current staff as specified in the MEI code
       * @return {Number}
       */
      getN : function() {
        return this.n;
      },

      /**
       * gets the first defined staff in the current measure
       * @return {Vex.Flow.Stave}
       */
      getFirstDefinedStaff : function() {
        var me = this, i, j;
        for ( i = 0, j = me.staffs.length; i < j; i += 1) {
          if (me.staffs[i]) {
            return me.staffs[i];
          }
        }
        throw new m2v.RUNTIME_ERROR('ERROR', 'getFirstDefinedStaff(): no staff found in the current measure.');
      },

      /**
       * Adds rehearsal marks encoded in reh elements in the current measure to
       * the corresponding Vex.Flow.Stave object
       */
      addRehearsalMarks : function() {
        var me = this, staff_n, vexStaff, offsetX;
        $.each(me.rehElements, function() {
          staff_n = this.getAttribute('staff');
          vexStaff = me.staffs[staff_n];
          offsetX = (vexStaff.getModifierXShift() > 0) ? -40 : 0;
          vexStaff.modifiers.push(new Vex.Flow.StaveSection($(this).text(), vexStaff.x + offsetX, 0));
        });
      },

      // TODO handle timestamps! (is it necessary to handle tempo element
      // as annotations?)
      // TODO make magic numbers constants
      // TODO move from here
      /**
       * Writes the data of the tempo elements in the current measure to the
       * corresponding Vex.Flow.Stave object
       */
      addTempoToStaves : function() {
        var me = this, offsetX, vexStaff, vexTempo, atts, halfLineDistance;
        $.each(me.tempoElements, function() {
          atts = m2v.Util.attsToObj(this);
          vexStaff = me.staffs[atts.staff];
          halfLineDistance = vexStaff.getSpacingBetweenLines() / 2; 
          vexTempo = new Vex.Flow.StaveTempo({
            name : $(this).text(),
            duration : atts['mm.unit'],
            dots : +atts['mm.dots'],
            bpm : +atts.mm
          }, vexStaff.x, 5);
          if (atts.vo) {
            vexTempo.setShiftY(+atts.vo * halfLineDistance);
          }
          offsetX = (vexStaff.getModifierXShift() > 0) ? -14 : 14;

          // if a staff has a time signature, set the tempo on top of the time
          // signature instead of the first note
          if (vexStaff.hasTimeSig) {
            offsetX -= 24;
          }
          if (atts.ho) {
            offsetX += +atts.ho * halfLineDistance;
          }
          vexTempo.setShiftX(offsetX);
          vexTempo.font = me.tempoFont;
          vexStaff.modifiers.push(vexTempo);
        });
      },

      /**
       * calculates the minimum width of the current measure
       */
      calculateMinWidth : function() {
        var me = this;
        me.calculateMaxNoteStartX();
        me.calculateRepeatPadding();
        /**
         * @property {Number} minVoicesW the minimum width of the voices in the
         * measure
         */
        me.minVoicesW = me.voices.preFormat();
        /**
         * @property {Number} minWidth the minimum width of the measure
         */
        me.minWidth = me.maxNoteStartX + me.minVoicesW + me.repeatPadding;
      },

      /**
       * gets the minimum width of the current measure;
       */
      getMinWidth : function() {
        return this.minWidth;
      },

      /**
       * calculates the maximum note_start_x of all Vex.Flow.Stave objects in the
       * current measure
       */
      calculateMaxNoteStartX : function() {
        var me = this, i, staffs, staff;
        staffs = me.staffs;
        i = staffs.length;
        while (i--) {
          staff = staffs[i];
          if (staff) {
            me.maxNoteStartX = Math.max(me.maxNoteStartX, staff.getNoteStartX());
          }
        }
      },

      /**
       * calculates additional start padding when there are repetition start bars
       * in the current measure
       */
      calculateRepeatPadding : function() {
        var me = this;
        var staff = me.getFirstDefinedStaff();
        /**
         * @property {0|20} repeatPadding additional padding (20px) if the staff
         * does have a left REPEAT_BEGIN barline located to the right of other
         * staff modifiers; 0px in all other cases.
         */
        me.repeatPadding = (staff.modifiers[0].barline == Vex.Flow.Barline.type.REPEAT_BEGIN && staff.modifiers.length > 2) ? 20 : 0;
      },

      // TODO move label attachment somewhere else
      /**
       * Formats the staffs in the current measure: sets x coordinates and adds
       * staff labels
       * @param {Number} x The x coordinate of the the measure
       * @param {String[]} labels The labels of all staves
       */
      format : function(x, labels) {
        var me = this, width = me.w, i = me.staffs.length, staff;
        while (i--) {
          if (me.staffs[i]) {
            staff = me.staffs[i];
            if (labels && typeof labels[i] === 'string') {
              staff.setText(labels[i], VF.Modifier.Position.LEFT, {
                shift_y : -3
              });
            }
            staff.x += x;
            staff.glyph_start_x += x;
            staff.start_x = staff.x + me.maxNoteStartX;
            staff.bounds.x += x;
            staff.setWidth(width);
            staff.modifiers[0].x += x;
            // staff.end_x += x + offsetW;
            // staff.glyph_end_x += x + offsetW;
          }
        }
        me.voices.format(me.getFirstDefinedStaff());
      },

      /**
       * Draws the staffs, voices and connectors in the current measure to a
       * canvas
       * @param {Object} ctx the canvas context
       */
      draw : function(ctx) {
        var me = this, i, staffs, staff;
        staffs = me.staffs;
        i = staffs.length;
        while (i--) {
          staff = staffs[i];
          if (staff) {
            staff.setContext(ctx).draw();
          }
        }
        me.voices.draw(ctx, staffs);
        me.startConnectors.setContext(ctx).draw();
        me.inlineConnectors.setContext(ctx).draw();
      }
    };

    return m2v;

  }(MEI2VF || {}, MeiLib, Vex.Flow, jQuery));
