
// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// Author: Cyril Silverman
//
// ## Description
//
// This file implements key signatures. A key signature sits on a stave
// and indicates the notes with implicit accidentals.
Vex.Flow.KeySignature = (function() {
  // MODIFIED: ADDED PARAMETER
  function KeySignature(keySpec, customPadding) {
    // MODIFIED: ADDED PARAMETER
    if (arguments.length > 0) this.init(keySpec, customPadding);
  }

  // Space between natural and following accidental depending
  // on vertical position
  KeySignature.accidentalSpacing = {
    '#': {
      above: 6,
      below: 4
    },
    'b': {
      above: 4,
      below: 7
    },
    'n': {
      above: 3,
      below: -1
    }
  };

  // ## Prototype Methods
  Vex.Inherit(KeySignature, Vex.Flow.StaveModifier, {
    // Create a new Key Signature based on a `key_spec`
    // MODIFIED: ADDED PARAMETER
    init: function(key_spec, customPadding) {
      KeySignature.superclass.init();

      // MODIFIED: added 2 lines
      var padding = customPadding || 10;
      this.setPadding(padding);

      this.glyphFontScale = 38; // TODO(0xFE): Should this match StaveNote?
      this.accList = Vex.Flow.keySignature(key_spec);
    },

    // Add an accidental glyph to the `stave`. `acc` is the data of the
    // accidental to add. If the `next` accidental is also provided, extra
    // width will be added to the initial accidental for optimal spacing.
    addAccToStave: function(stave, acc, next) {
      var glyph_data = Vex.Flow.accidentalCodes(acc.type);
      var glyph = new Vex.Flow.Glyph(glyph_data.code, this.glyphFontScale);

      // Determine spacing between current accidental and the next accidental
      var extra_width = 0;
      if (acc.type === "n" && next) {
        var above = next.line >= acc.line;
        var space = KeySignature.accidentalSpacing[next.type];
        extra_width = above ? space.above : space.below;
      }

      // Set the width and place the glyph on the stave
      glyph.setWidth(glyph_data.width + extra_width);
      this.placeGlyphOnLine(glyph, stave, acc.line);
      stave.addGlyph(glyph);
    },

    // Cancel out a key signature provided in the `spec` parameter. This will
    // place appropriate natural accidentals before the key signature.
    cancelKey: function(spec) {
      // Get the accidental list for the cancelled key signature
      var cancel_accList = Vex.Flow.keySignature(spec);

      // If the cancelled key has a different accidental type, ie: # vs b
      var different_types = this.accList.length > 0 &&
                            cancel_accList[0].type !== this.accList[0].type;

      // Determine how many naturals needed to add
      var naturals = 0;
      if (different_types) {
        naturals = cancel_accList.length;
      } else {
        naturals = cancel_accList.length - this.accList.length;
      }

      // Return if no naturals needed
      if (naturals < 1) return;

      // Get the line position for each natural
      var cancelled = [];
      for (var i = 0; i < naturals; i++) {
        var index = i;
        if (!different_types) {
          index = cancel_accList.length - naturals + i;
        }

        var acc = cancel_accList[index];
        cancelled.push({type: "n", line: acc.line});
      }

      // Combine naturals with main accidental list for the key signature
      this.accList = cancelled.concat(this.accList);

      return this;
    },

    // Add the key signature to the `stave`. You probably want to use the
    // helper method `.addToStave()` instead
    addModifier: function(stave) {
      this.convertAccLines(stave.clef, this.accList[0].type);
      for (var i = 0; i < this.accList.length; ++i) {
        this.addAccToStave(stave, this.accList[i], this.accList[i+1]);
      }
    },

    // Add the key signature to the `stave`, if it's the not the `firstGlyph`
    // a spacer will be added as well.
    addToStave: function(stave, firstGlyph) {
      if (this.accList.length === 0)
        return this;

      if (!firstGlyph) {
        stave.addGlyph(this.makeSpacer(this.padding));
      }

      this.addModifier(stave);
      return this;
    },

    // Apply the accidental staff line placement based on the `clef` and
    // the  accidental `type` for the key signature ('# or 'b').
    convertAccLines: function(clef, type) {
      var offset = 0.0; // if clef === "treble"
      var tenorSharps;
      var isTenorSharps = ((clef === "tenor") && (type === "#")) ? true : false;

      switch (clef) {
        case "bass":
          offset = 1;
          break;
        case "alto":
          offset = 0.5;
          break;
        case "tenor":
          if (!isTenorSharps) {
            offset = -0.5;
          }
          break;
      }

      // Special-case for TenorSharps
      var i;
      if (isTenorSharps) {
        tenorSharps = [3, 1, 2.5, 0.5, 2, 0, 1.5];
        for (i = 0; i < this.accList.length; ++i) {
          this.accList[i].line = tenorSharps[i];
        }
      }
      else {
        if (clef != "treble") {
          for (i = 0; i < this.accList.length; ++i) {
            this.accList[i].line += offset;
          }
        }
      }
    }
  });

  return KeySignature;
}());

/**
 * Create hyphens between the specified annotations.
 *
 * @constructor
 */
Vex.Flow.Hyphen = ( function() {
    function Hyphen(config) {
      if (arguments.length > 0)
        this.init(config);
    };

    Hyphen.prototype = {
      init : function(config) {
        /**
         * config is a struct that has:
         *
         *  {
         *    first_annot: Annotation or any other object with an x (and optional
         * y) property,
         *    last_annot: Annotation or any other object with an x (and optional
         * y) property,
         *    NOTE: either first_annot or last_annot must have an y property
         *    (optional) max_hyphen_distance: the maximum distance between two
         * hyphens
         *    (optional) hyphen_width: the width of the hyphen character to draw
         *  }
         *
         **/

        this.max_hyphen_distance = config.max_hyphen_distance || 75;
        this.font = {
          family : "Arial",
          size : 10,
          style : ""
        };

        this.config = config;
        this.context = null;

      },

      setContext : function(context) {
        this.context = context;
        return this;
      },

      setFont : function(font) {
        this.font = font;
        return this;
      },

      renderHyphen : function() {
        var cfg = this.config;
        var ctx = this.context;
        var hyphen_width = cfg.hyphen_width || ctx.measureText('-').width;

        var first = cfg.first_annot;
        var last = cfg.last_annot;

        var start_x = (first.text) ? first.x + first.text_width : first.x;
        var end_x = last.x;

        var distance = end_x - start_x;

        if (distance > hyphen_width) {
          var y = (first.y && last.y) ? (first.y + last.y) / 2 : first.y || last.y;
          var hyphen_count = Math.ceil(distance / this.max_hyphen_distance);
          var single_width = distance / (hyphen_count + 1);
          while (hyphen_count--) {
            start_x += single_width;
            ctx.fillText('-', start_x - hyphen_width / 2, y);
          }
        };
      },

      draw : function() {
        if (!this.context)
          throw new Vex.RERR("NoContext", "No context to render hyphens.");
        var ctx = this.context;
        ctx.save();
        ctx.setFont(this.font.family, this.font.size, this.font.style);
        this.renderHyphen();
        ctx.restore();
        return true;
      }
    };

    return Hyphen;
  }());


// use square breve glyph instead of VexFlow's ||O||
Vex.Flow.durationToGlyph.duration_codes['1/2'].type.n = {code_head : "noteheadDoubleWholeSquare"};

//fallback: remove when the CMN long is implemented in VexFlow
if (!Vex.Flow.durationToTicks.durations['1/4']) {
  Vex.Flow.durationToTicks.durations['1/4'] = Vex.Flow.RESOLUTION / 0.25;
}

// fallback: remove when the CMN long is implemented in VexFlow
if (!Vex.Flow.durationToGlyph.duration_codes['1/4']) {
  Vex.Flow.durationToGlyph.duration_codes['1/4'] = {
    common: {
      head_width: 22,
        stem: false,
        stem_offset: 0,
        flag: false,
        stem_up_extension: -Vex.Flow.STEM_HEIGHT,
        stem_down_extension: -Vex.Flow.STEM_HEIGHT,
        gracenote_stem_up_extension: -Vex.Flow.STEM_HEIGHT,
        gracenote_stem_down_extension: -Vex.Flow.STEM_HEIGHT,
        tabnote_stem_up_extension: -Vex.Flow.STEM_HEIGHT,
        tabnote_stem_down_extension: -Vex.Flow.STEM_HEIGHT,
        dot_shiftY: 0,
        line_above: 0,
        line_below: 0
    },
    type: {
      "n": { // Longa note
        code_head: "noteheadCMNLonga"
      },
      // the following shapes are not supported with longas
      "h": { // Breve note harmonic
        code_head: "v59"
      },
      "m": { // Breve note muted -
        code_head: "vf",
          stem_offset: 0
      },
      "r": { // Breve rest
        code_head: "v31",
          head_width: 24,
          rest: true,
          position: "B/5",
          dot_shiftY: 0.5
      },
      "s": { // Breve note slash -
        // Drawn with canvas primitives
        head_width: 15,
          position: "B/4"
      }
    }
  };
}

Vex.Flow.Font.glyphs["noteheadDoubleWholeSquare"] = {
  "x_min" : 0,
  "x_max" : 746,
  "ha" : 746,
  "o" : "0 0 117 0 1 1 560 560 1 -1 0 -1120 m 724 350 b 746 328 736 350 746 340 l 746 -328 b 724 -350 746 -339 736 -350 b 701 -328 711 -350 701 -339 l 701 -270 b 659 -234 701 -253 683 -234 l 83 -234 b 45 -276 67 -234 45 -256 l 45 -328 b 22 -350 45 -339 35 -350 b 0 -328 10 -350 0 -339 l 0 328 b 22 350 0 340 10 350 b 45 328 35 350 45 340 l 45 260 b 77 218 45 260 64 218 l 659 218 b 701 265 679 218 701 232 l 701 328 b 724 350 701 340 711 350 m 45 18 l 45 -36 b 146 -94 45 -70 83 -94 l 606 -94 b 701 -36 664 -94 701 -77 l 701 28 b 606 78 701 57 664 78 l 139 78 b 45 18 71 78 45 59 "
};
// NOT PART OF BRAVURA:
Vex.Flow.Font.glyphs["noteheadCMNLonga"] = {
  "x_min" : 0,
  "x_max" : 746,
  "ha" : 746,
  // based on the Bravura breve glyph; CHANGES: all values < -1400
  "o" : "0 0 117 0 1 1 560 560 1 -1 0 -1120 " + "m 724 350 " + "b 746 328 736 350 746 340 " + "l 746 -1428 " + "b 724 -1450 746 -1439 736 -1450 " + "b 701 -1428 711 -1450 701 -1439 " + "l 701 -270 " + "b 659 -234 701 -253 683 -234 " + "l 83 -234 " + "b 45 -276 67 -234 45 -256 " + "l 45 -328 " + "b 22 -350 45 -339 35 -350 " + "b 0 -328 10 -350 0 -339 " + "l 0 328 " + "b 22 350 0 340 10 350 " + "b 45 328 35 350 45 340 " + "l 45 260 " + "b 77 218 45 260 64 218 " + "l 659 218 " + "b 701 265 679 218 701 232 " + "l 701 328 " + "b 724 350 701 340 711 350 " + "m 45 18 " + "l 45 -36 " + "b 146 -94 45 -70 83 -94 " + "l 606 -94 " + "b 701 -36 664 -94 701 -77 " + "l 701 28 " + "b 606 78 701 57 664 78 " + "l 139 78 " + "b 45 18 71 78 45 59 "
};


Vex.Flow.Curve.prototype.renderCurve = function(params) {
  var ctx = this.context;
  var cps = this.render_options.cps;

  var x_shift = this.render_options.x_shift;
  var y_shift = this.render_options.y_shift * params.direction;

  // TODO name variables according to staveTie
  // START MODIFICATION (allows to specify y_shift for start & end
  // note separately):
  var y_shift_start = this.render_options.y_shift_start || 0;
  var y_shift_end = this.render_options.y_shift_end || 0;
  var first_x = params.first_x + x_shift;
  var first_y = params.first_y + y_shift + y_shift_start;
  var last_x = params.last_x - x_shift;
  var last_y = params.last_y + y_shift + y_shift_end;
  // END MODIFICATION

  var thickness = this.render_options.thickness;

  var cp_spacing = (last_x - first_x) / (cps.length + 2);

  ctx.beginPath();
  ctx.moveTo(first_x, first_y);
  ctx.bezierCurveTo(first_x + cp_spacing + cps[0].x,
      first_y + (cps[0].y * params.direction),
      last_x - cp_spacing + cps[1].x,
      last_y + (cps[1].y * params.direction),
      last_x, last_y);
  ctx.bezierCurveTo(last_x - cp_spacing + cps[1].x,
      last_y + ((cps[1].y + thickness) * params.direction),
      first_x + cp_spacing + cps[0].x,
      first_y + ((cps[0].y + thickness) * params.direction),
      first_x, first_y);
  ctx.stroke();
  ctx.closePath();
  ctx.fill();
};

// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
//
// ## Description
//
// This file implements text annotations as modifiers that can be attached to
// notes.
//
// See `tests/annotation_tests.js` for usage examples.

Vex.Flow.Annotation = (function() {
  function Annotation(text) {
    if (arguments.length > 0) this.init(text);
  }
  Annotation.CATEGORY = "annotations";

  // To enable logging for this class. Set `Vex.Flow.Annotation.DEBUG` to `true`.
  function L() { if (Annotation.DEBUG) Vex.L("Vex.Flow.Annotation", arguments); }

    // START ADDITION
    Annotation.DEFAULT_FONT_SIZE = 10;
    // END ADDITION

  // Text annotations can be positioned and justified relative to the note.
  Annotation.Justify = {
    LEFT: 1,
    CENTER: 2,
    RIGHT: 3,
    CENTER_STEM: 4
  };

  Annotation.VerticalJustify = {
    TOP: 1,
    CENTER: 2,
    BOTTOM: 3,
    CENTER_STEM: 4
  };

  // Arrange annotations within a `ModifierContext`
  Annotation.format = function(annotations, state) {
    if (!annotations || annotations.length === 0) return false;

    var text_line = state.text_line;
    var max_width = 0;

    // Format Annotations
    var width;
    for (var i = 0; i < annotations.length; ++i) {
      var annotation = annotations[i];
      annotation.setTextLine(text_line);
      width = annotation.getWidth() > max_width ?
              annotation.getWidth() : max_width;
      text_line++;
    }

    state.left_shift += width / 2;
    state.right_shift += width / 2;
    return true;
  }

  // ## Prototype Methods
  //
  // Annotations inherit from `Modifier` and is positioned correctly when
  // in a `ModifierContext`.
  var Modifier = Vex.Flow.Modifier;
  Vex.Inherit(Annotation, Modifier, {
    // Create a new `Annotation` with the string `text`.
    init: function(text) {
      Annotation.superclass.init.call(this);

      this.note = null;
      this.index = null;
      this.text_line = 0;
      this.text = text;
      this.justification = Annotation.Justify.CENTER;
      this.vert_justification = Annotation.VerticalJustify.TOP;
      this.font = {
        family: "Arial",
          // START MODFICATION
          size : Annotation.DEFAULT_FONT_SIZE,
          // END MODIFICATION
          weight : ""
        };

        // START ADDITION
        // Line spacing, relative to font size
        this.line_spacing = 1.1;
        // END ADDITiON

        // The default width is calculated from the text.
        this.setWidth(Vex.Flow.textWidth(text));
      },

      // START ADDITION
      setLineSpacing : function(spacing) {
        this.line_spacing = spacing;
        return this;
      },
      // END ADDITiON

    // Set the vertical position of the text relative to the stave.
    setTextLine: function(line) { this.text_line = line; return this; },

    // Set font family, size, and weight. E.g., `Arial`, `10pt`, `Bold`.
    setFont: function(family, size, weight) {
      this.font = { family: family, size: size, weight: weight };
      return this;
    },

    // Set vertical position of text (above or below stave). `just` must be
    // a value in `Annotation.VerticalJustify`.
    setVerticalJustification: function(just) {
      this.vert_justification = just;
      return this;
    },

    // Get and set horizontal justification. `justification` is a value in
    // `Annotation.Justify`.
    getJustification: function() { return this.justification; },
    setJustification: function(justification) {
      this.justification = justification; return this; },

    // Render text beside the note.
    draw: function() {
      if (!this.context) throw new Vex.RERR("NoContext",
        "Can't draw text annotation without a context.");
      if (!this.note) throw new Vex.RERR("NoNoteForAnnotation",
        "Can't draw text annotation without an attached note.");

      var start = this.note.getModifierStartXY(Modifier.Position.ABOVE,
        this.index);

      // We're changing context parameters. Save current state.
      this.context.save();
      this.context.setFont(this.font.family, this.font.size, this.font.weight);
      var text_width = this.context.measureText(this.text).width;

      // Estimate text height to be the same as the width of an 'm'.
      //
      // This is a hack to work around the inability to measure text height
      // in HTML5 Canvas (and SVG).
      var text_height = this.context.measureText("m").width;
      var x, y;

      if (this.justification == Annotation.Justify.LEFT) {
        x = start.x;
      } else if (this.justification == Annotation.Justify.RIGHT) {
        x = start.x - text_width;
      } else if (this.justification == Annotation.Justify.CENTER) {
        x = start.x - text_width / 2;
      } else /* CENTER_STEM */ {
        x = this.note.getStemX() - text_width / 2;
      }

      var stem_ext, spacing;
      var has_stem = this.note.hasStem();
      var stave = this.note.getStave();

      // The position of the text varies based on whether or not the note
      // has a stem.
      if (has_stem) {
        stem_ext = this.note.getStem().getExtents();
        spacing = stave.getSpacingBetweenLines();
      }

        // START ADDITION
        font_scale = this.font.size / Annotation.DEFAULT_FONT_SIZE * this.line_spacing;
        // END ADDITION

      if (this.vert_justification == Annotation.VerticalJustify.BOTTOM) {
        y = stave.getYForBottomText(this.text_line);
        if (has_stem) {
          var stem_base = (this.note.getStemDirection() === 1 ? stem_ext.baseY : stem_ext.topY);

            // START MODIFICATION
            y = Math.max(y, stem_base + ( spacing * (this.text_line + 1) * font_scale + ( spacing * (this.text_line) ) ) );
            // END MODIFICATION
        }
      } else if (this.vert_justification ==
                 Annotation.VerticalJustify.CENTER) {
        var yt = this.note.getYForTopText(this.text_line) - 1;
        var yb = stave.getYForBottomText(this.text_line);
        y = yt + ( yb - yt ) / 2 + text_height / 2;
      } else if (this.vert_justification ==
                 Annotation.VerticalJustify.TOP) {
        y = Math.min(stave.getYForTopText(this.text_line), this.note.getYs()[0] - 10);
        if (has_stem) {
          y = Math.min(y, (stem_ext.topY - 5) - (spacing * this.text_line));
        }
      } else /* CENTER_STEM */{
        var extents = this.note.getStemExtents();
        y = extents.topY + (extents.baseY - extents.topY) / 2 +
            text_height / 2;
      }

        // START ADDITION
        this.x = x;
        this.y = y;
        this.text_height = text_height;
        this.text_width = text_width;
        // END ADDITION

        L("Rendering annotation: ", this.text, x, y);
        this.context.fillText(this.text, x, y);
        this.context.restore();
      }
    });

    return Annotation;
  }());

// VexFlow - Music Engraving for HTML5
// Copyright Mohit Muthanna 2010
//
// This class implements varies types of ties between contiguous notes. The
// ties include: regular ties, hammer ons, pull offs, and slides.

/**
 * Create a new tie from the specified notes. The notes must
 * be part of the same line, and have the same duration (in ticks).
 *
 * @constructor
 * @param {!Object} context The canvas context.
 * @param {!Object} notes The notes to tie up.
 * @param {!Object} Options
 */
Vex.Flow.StaveTie = ( function() {
    function StaveTie(notes, text) {
      if (arguments.length > 0)
        this.init(notes, text);
    }


    StaveTie.prototype = {
      init : function(notes, text) {
        /**
         * Notes is a struct that has:
         *
         *  {
         *    first_note: Note,
         *    last_note: Note,
         *    first_indices: [n1, n2, n3],
         *    last_indices: [n1, n2, n3]
         *  }
         *
         **/
        this.notes = notes;
        this.context = null;
        this.text = text;

        this.render_options = {
          cp1 : 8, // Curve control point 1
          cp2 : 12, // Curve control point 2
          text_shift_x : 0,
          first_x_shift : 0,
          last_x_shift : 0,
          y_shift : 7,
          tie_spacing : 0,
          font : {
            family : "Arial",
            size : 10,
            style : ""
          }
        };

        this.font = this.render_options.font;
        this.setNotes(notes);
      },

      setContext : function(context) {
        this.context = context;
        return this;
      },
      setFont : function(font) {
        this.font = font;
        return this;
      },

      /**
       * Set the notes to attach this tie to.
       *
       * @param {!Object} notes The notes to tie up.
       */
      setNotes : function(notes) {
        if (!notes.first_note && !notes.last_note)
          throw new Vex.RuntimeError("BadArguments", "Tie needs to have either first_note or last_note set.");

        if (!notes.first_indices)
          notes.first_indices = [0];
        if (!notes.last_indices)
          notes.last_indices = [0];

        if (notes.first_indices.length != notes.last_indices.length)
          throw new Vex.RuntimeError("BadArguments", "Tied notes must have similar" + " index sizes");

        // Success. Lets grab 'em notes.
        this.first_note = notes.first_note;
        this.first_indices = notes.first_indices;
        this.last_note = notes.last_note;
        this.last_indices = notes.last_indices;
        return this;
      },

      /**
       * @return {boolean} Returns true if this is a partial bar.
       */
      isPartial : function() {
        return (!this.first_note || !this.last_note);
      },

      // START ADDITION
      setDir : function(dir) {
        this.curvedir = dir;
      },

      getDir : function() {
        return this.curvedir;
      },
      // END ADDITION

      renderTie : function(params) {
        if (params.first_ys.length === 0 || params.last_ys.length === 0)
          throw new Vex.RERR("BadArguments", "No Y-values to render");

        // START ADDITION
        if (this.curvedir) {
          params.direction = (this.curvedir === 'above') ? -1 : 1;
        } else {
          this.curvedir = params.direction;
        }
        // END ADDITION

        var ctx = this.context;
        var cp1 = this.render_options.cp1;
        var cp2 = this.render_options.cp2;

        if (Math.abs(params.last_x_px - params.first_x_px) < 10) {
          cp1 = 2;
          cp2 = 8;
        }

        var first_x_shift = this.render_options.first_x_shift;
        var last_x_shift = this.render_options.last_x_shift;
        var y_shift = this.render_options.y_shift * params.direction;

        for (var i = 0; i < this.first_indices.length; ++i) {
          var cp_x = ((params.last_x_px + last_x_shift) + (params.first_x_px + first_x_shift)) / 2;
          var first_y_px = params.first_ys[this.first_indices[i]] + y_shift;
          var last_y_px = params.last_ys[this.last_indices[i]] + y_shift;

          if (isNaN(first_y_px) || isNaN(last_y_px))
            throw new Vex.RERR("BadArguments", "Bad indices for tie rendering.");

          var top_cp_y = ((first_y_px + last_y_px) / 2) + (cp1 * params.direction);
          var bottom_cp_y = ((first_y_px + last_y_px) / 2) + (cp2 * params.direction);

          ctx.beginPath();
          ctx.moveTo(params.first_x_px + first_x_shift, first_y_px);
          ctx.quadraticCurveTo(cp_x, top_cp_y, params.last_x_px + last_x_shift, last_y_px);
          ctx.quadraticCurveTo(cp_x, bottom_cp_y, params.first_x_px + first_x_shift, first_y_px);

          ctx.closePath();
          ctx.fill();
        }
      },

      renderText : function(first_x_px, last_x_px) {
        if (!this.text)
          return;
        var center_x = (first_x_px + last_x_px) / 2;
        center_x -= this.context.measureText(this.text).width / 2;

        this.context.save();
        this.context.setFont(this.font.family, this.font.size, this.font.style);
        this.context.fillText(this.text, center_x + this.render_options.text_shift_x, (this.first_note || this.last_note).getStave().getYForTopText() - 1);
        this.context.restore();
      },

      draw : function() {
        if (!this.context)
          throw new Vex.RERR("NoContext", "No context to render tie.");
        var first_note = this.first_note;
        var last_note = this.last_note;
        var first_x_px, last_x_px, first_ys, last_ys, stem_direction;

        if (first_note) {
          first_x_px = first_note.getTieRightX() + this.render_options.tie_spacing;
          stem_direction = first_note.getStemDirection();
          first_ys = first_note.getYs();
        } else {
          first_x_px = last_note.getStave().getTieStartX();
          first_ys = last_note.getYs();
          this.first_indices = this.last_indices;
        }

        if (last_note) {
          last_x_px = last_note.getTieLeftX() + this.render_options.tie_spacing;
          stem_direction = last_note.getStemDirection();
          last_ys = last_note.getYs();
        } else {
          last_x_px = first_note.getStave().getTieEndX();
          last_ys = first_note.getYs();
          this.last_indices = this.first_indices;
        }

        this.renderTie({
          first_x_px : first_x_px,
          last_x_px : last_x_px,
          first_ys : first_ys,
          last_ys : last_ys,
          direction : stem_direction
        });

        this.renderText(first_x_px, last_x_px);
        return true;
      }
    };

    return StaveTie;
  }());

// Vex Flow
// Mohit Muthanna <mohit@muthanna.com>
//
// Copyright Mohit Cheppudira 2010

/** @constructor */
Vex.Flow.Stave = (function() {
  function Stave(x, y, width, options) {
    if (arguments.length > 0) this.init(x, y, width, options);
  }

  var THICKNESS = (Vex.Flow.STAVE_LINE_THICKNESS > 1 ?
                   Vex.Flow.STAVE_LINE_THICKNESS : 0);
  Stave.prototype = {
    init: function(x, y, width, options) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.start_x = this.getGlyphStartX();
      this.end_x = this.getGlyphEndX();
      this.context = null;
      this.glyphs = [];
      this.end_glyphs = [];
      this.modifiers = [];  // non-glyph stave items (barlines, coda, segno, etc.)
      this.measure = 0;
      this.clef = "treble";
      this.font = {
        family: "sans-serif",
        size: 8,
        weight: ""
      };
      this.options = {
        vertical_bar_width: 10,       // Width around vertical bar end-marker
        glyph_spacing_px: 10,
        num_lines: 5,
        fill_style: "#999999",
        spacing_between_lines_px: 10, // in pixels
        space_above_staff_ln: 4,      // in staff lines
        space_below_staff_ln: 4,      // in staff lines
        top_text_position: 1          // in staff lines
      };
      this.bounds = {x: this.x, y: this.y, w: this.width, h: 0};
      Vex.Merge(this.options, options);

      this.resetLines();

      this.modifiers.push(
        new Vex.Flow.Barline(Vex.Flow.Barline.type.SINGLE, this.x)); // beg bar
      this.modifiers.push(
        new Vex.Flow.Barline(Vex.Flow.Barline.type.SINGLE,
            this.x + this.width)); // end bar
    },

    getGlyphStartX: function() {
      return this.x + 5;
    },

    getGlyphEndX: function() {
      return this.x + this.width;
    },

    resetLines: function() {
      this.options.line_config = [];
      for (var i = 0; i < this.options.num_lines; i++) {
        this.options.line_config.push({visible: true});
      }
      this.height = (this.options.num_lines + this.options.space_above_staff_ln) *
                    this.options.spacing_between_lines_px;
      this.options.bottom_text_position = this.options.num_lines + 1;
    },

    setNoteStartX: function(x) { this.start_x = x; return this; },
    getNoteStartX: function() {
      var start_x = this.start_x;

      // Add additional space if left barline is REPEAT_BEGIN and there are other
      // start modifiers than barlines
      if (this.modifiers[0].barline == Vex.Flow.Barline.type.REPEAT_BEGIN &&
          this.modifiers.length > 2)
        start_x += 20;
      return start_x;
    },

    getNoteEndX: function() { return this.end_x; },
    getTieStartX: function() { return this.start_x; },
    getTieEndX: function() { return this.x + this.width; },
    setContext: function(context) { this.context = context; return this; },
    getContext: function() { return this.context; },

    setX: function(x) {
      var i;
      var dx = (typeof this.x == "number") ? x - this.x : 0;
      console.log('dx: ' + dx.toString());
      this.x = x;
      this.bounds.x = x;
      this.start_x += dx;
      for (i = 0; i < this.modifiers.length; i++) {
        this.modifiers[i].x = x;
      }
      return this;
    },

    getX: function() { return this.x; },
    getNumLines: function() { return this.options.num_lines; },
    setNumLines: function(lines) {
      this.options.num_lines = parseInt(lines, 10);
      this.resetLines();
      return this;
    },
    setY: function(y) { this.y = y; return this; },

    setWidth: function(width) {
      this.width = width;
      this.end_x = this.getGlyphEndX();

      // reset the x position of the end barline
      this.modifiers[1].setX(this.end_x);
      return this;
    },

    getWidth: function() {
      return this.width;
    },

    setMeasure: function(measure) { this.measure = measure; return this; },

    // Bar Line functions
    setBegBarType: function(type) {
      // Only valid bar types at beginning of stave is none, single or begin repeat
      if (type == Vex.Flow.Barline.type.SINGLE ||
          type == Vex.Flow.Barline.type.REPEAT_BEGIN ||
          type == Vex.Flow.Barline.type.NONE) {
        this.modifiers[0] = new Vex.Flow.Barline(type, this.x);
      }
      return this;
    },

    setEndBarType: function(type) {
      // Repeat end not valid at end of stave
      if (type != Vex.Flow.Barline.type.REPEAT_BEGIN)
        this.modifiers[1] = new Vex.Flow.Barline(type, this.x + this.width);
      return this;
    },

    /**
     * Gets the pixels to shift from the beginning of the stave
     * following the modifier at the provided index
     * @param  {Number} index The index from which to determine the shift
     * @return {Number}       The amount of pixels shifted
     */
    getModifierXShift: function(index) {
      if (typeof index === 'undefined') index = this.glyphs.length -1;
      if (typeof index !== 'number') new Vex.RERR("InvalidIndex",
        "Must be of number type");

      var x = this.getGlyphStartX();
      var bar_x_shift = 0;

      for (var i = 0; i < index + 1; ++i) {
        var glyph = this.glyphs[i];
        x += glyph.getMetrics().width;
        bar_x_shift += glyph.getMetrics().width;
      }

      // Add padding after clef, time sig, key sig
      if (bar_x_shift > 0) bar_x_shift += this.options.vertical_bar_width + 10;

      return bar_x_shift;
    },

    // Coda & Segno Symbol functions
    setRepetitionTypeLeft: function(type, y) {
      this.modifiers.push(new Vex.Flow.Repetition(type, this.x, y));
      return this;
    },

    setRepetitionTypeRight: function(type, y) {
      this.modifiers.push(new Vex.Flow.Repetition(type, this.x, y) );
      return this;
    },

    // Volta functions
    setVoltaType: function(type, number_t, y) {
      this.modifiers.push(new Vex.Flow.Volta(type, number_t, this.x, y));
      return this;
    },

    // Section functions
    setSection: function(section, y) {
      this.modifiers.push(new Vex.Flow.StaveSection(section, this.x, y));
      return this;
    },

    // Tempo functions
    setTempo: function(tempo, y) {
      this.modifiers.push(new Vex.Flow.StaveTempo(tempo, this.x, y));
      return this;
    },

    // Text functions
    setText: function(text, position, options) {
      this.modifiers.push(new Vex.Flow.StaveText(text, position, options));
      return this;
    },

    getHeight: function() {
      return this.height;
    },

    getSpacingBetweenLines: function() {
      return this.options.spacing_between_lines_px;
    },

    getBoundingBox: function() {
      return new Vex.Flow.BoundingBox(this.x, this.y, this.width, this.getBottomY() - this.y);
      // body...
    },

    getBottomY: function() {
      var options = this.options;
      var spacing = options.spacing_between_lines_px;
      var score_bottom = this.getYForLine(options.num_lines) +
                         (options.space_below_staff_ln * spacing);

      return score_bottom;
    },

    getBottomLineY: function() {
      return this.getYForLine(this.options.num_lines);
    },

    getYForLine: function(line) {
      var options = this.options;
      var spacing = options.spacing_between_lines_px;
      var headroom = options.space_above_staff_ln;

      var y = this.y + ((line * spacing) + (headroom * spacing)) -
              (THICKNESS / 2);

      return y;
    },

    getYForTopText: function(line, font_scale) {
      var l = line || 0;
      var scale = font_scale || 1;
      return this.getYForLine(-(l * scale) - this.options.top_text_position);
    },

    getYForBottomText: function(line, font_scale) {
      var l = line || 0;
      var scale = font_scale || 1;
      return this.getYForLine(this.options.bottom_text_position + (l * scale));
    },

    getYForNote: function(line) {
      var options = this.options;
      var spacing = options.spacing_between_lines_px;
      var headroom = options.space_above_staff_ln;
      var y = this.y + (headroom * spacing) + (5 * spacing) - (line * spacing);

      return y;
    },

    getYForGlyphs: function() {
      return this.getYForLine(3);
    },

    addGlyph: function(glyph) {
      glyph.setStave(this);
      this.glyphs.push(glyph);
      this.start_x += glyph.getMetrics().width;
      return this;
    },

    addEndGlyph: function(glyph) {
      glyph.setStave(this);
      this.end_glyphs.push(glyph);
      this.end_x -= glyph.getMetrics().width;
      return this;
    },

    addModifier: function(modifier) {
      this.modifiers.push(modifier);
      modifier.addToStave(this, (this.glyphs.length === 0));
      return this;
    },

    addEndModifier: function(modifier) {
      this.modifiers.push(modifier);
      modifier.addToStaveEnd(this, (this.end_glyphs.length === 0));
      return this;
    },

    addKeySignature: function(keySpec) {
      this.addModifier(new Vex.Flow.KeySignature(keySpec));
      return this;
    },

    addClef: function(clef, size, annotation) {
      this.clef = clef;
      this.addModifier(new Vex.Flow.Clef(clef, size, annotation));
      return this;
    },

    addEndClef: function(clef, size, annotation) {
      this.addEndModifier(new Vex.Flow.Clef(clef, size, annotation));
      return this;
    },

    addTimeSignature: function(timeSpec, customPadding) {
      this.addModifier(new Vex.Flow.TimeSignature(timeSpec, customPadding));
      return this;
    },

    addEndTimeSignature: function(timeSpec, customPadding) {
      this.addEndModifier(new Vex.Flow.TimeSignature(timeSpec, customPadding));
    },

    addTrebleGlyph: function() {
      this.clef = "treble";
      this.addGlyph(new Vex.Flow.Glyph("v83", 40));
      return this;
    },

    /**
     * All drawing functions below need the context to be set.
     */
    draw: function() {
      if (!this.context) throw new Vex.RERR("NoCanvasContext",
        "Can't draw stave without canvas context.");

      var num_lines = this.options.num_lines;
      var width = this.width;
      var x = this.x;
      var y;
      var glyph;

      // Render lines
      for (var line=0; line < num_lines; line++) {
        y = this.getYForLine(line);

        this.context.save();
        this.context.setFillStyle(this.options.fill_style);
        this.context.setStrokeStyle(this.options.fill_style);
        if (this.options.line_config[line].visible) {
          this.context.fillRect(x, y, width, Vex.Flow.STAVE_LINE_THICKNESS);
        }
        this.context.restore();
      }

      // Render glyphs
      x = this.getGlyphStartX();
      for (var i = 0; i < this.glyphs.length; ++i) {
        glyph = this.glyphs[i];
        if (!glyph.getContext()) {
          glyph.setContext(this.context);
        }
        glyph.renderToStave(x);
        x += glyph.getMetrics().width;
      }

      // Render end glyphs
      x = this.getGlyphEndX();
      for (i = 0; i < this.end_glyphs.length; ++i) {
        glyph = this.end_glyphs[i];
        if (!glyph.getContext()) {
          glyph.setContext(this.context);
        }
        x -= glyph.getMetrics().width;
        glyph.renderToStave(x);
      }

      // Draw the modifiers (bar lines, coda, segno, repeat brackets, etc.)
      for (i = 0; i < this.modifiers.length; i++) {
        // Only draw modifier if it has a draw function
        if (typeof this.modifiers[i].draw == "function")
          this.modifiers[i].draw(this, this.getModifierXShift());
      }

      // Render measure numbers
      if (this.measure > 0) {
        this.context.save();
        this.context.setFont(this.font.family, this.font.size, this.font.weight);
        var text_width = this.context.measureText("" + this.measure).width;
        y = this.getYForTopText(0) + 3;
        this.context.fillText("" + this.measure, this.x - text_width / 2, y);
        this.context.restore();
      }

      return this;
    },

    // Draw Simple barlines for backward compatability
    // Do not delete - draws the beginning bar of the stave
    drawVertical: function(x, isDouble) {
      this.drawVerticalFixed(this.x + x, isDouble);
    },

    drawVerticalFixed: function(x, isDouble) {
      if (!this.context) throw new Vex.RERR("NoCanvasContext",
        "Can't draw stave without canvas context.");

      var top_line = this.getYForLine(0);
      var bottom_line = this.getYForLine(this.options.num_lines - 1);
      if (isDouble)
        this.context.fillRect(x - 3, top_line, 1, bottom_line - top_line + 1);
      this.context.fillRect(x, top_line, 1, bottom_line - top_line + 1);
    },

    drawVerticalBar: function(x) {
      this.drawVerticalBarFixed(this.x + x, false);
    },

    drawVerticalBarFixed: function(x) {
      if (!this.context) throw new Vex.RERR("NoCanvasContext",
        "Can't draw stave without canvas context.");

      var top_line = this.getYForLine(0);
      var bottom_line = this.getYForLine(this.options.num_lines - 1);
      this.context.fillRect(x, top_line, 1, bottom_line - top_line + 1);
    },

    /**
     * Get the current configuration for the Stave.
     * @return {Array} An array of configuration objects.
     */
    getConfigForLines: function() {
      return this.options.line_config;
    },

    /**
     * Configure properties of the lines in the Stave
     * @param line_number The index of the line to configure.
     * @param line_config An configuration object for the specified line.
     * @throws Vex.RERR "StaveConfigError" When the specified line number is out of
     *   range of the number of lines specified in the constructor.
     */
    setConfigForLine: function(line_number, line_config) {
      if (line_number >= this.options.num_lines || line_number < 0) {
        throw new Vex.RERR("StaveConfigError",
          "The line number must be within the range of the number of lines in the Stave.");
      }
      if (!line_config.hasOwnProperty('visible')) {
        throw new Vex.RERR("StaveConfigError",
          "The line configuration object is missing the 'visible' property.");
      }
      if (typeof(line_config.visible) !== 'boolean') {
        throw new Vex.RERR("StaveConfigError",
          "The line configuration objects 'visible' property must be true or false.");
      }

      this.options.line_config[line_number] = line_config;

      return this;
    },

    /**
     * Set the staff line configuration array for all of the lines at once.
     * @param lines_configuration An array of line configuration objects.  These objects
     *   are of the same format as the single one passed in to setLineConfiguration().
     *   The caller can set null for any line config entry if it is desired that the default be used
     * @throws Vex.RERR "StaveConfigError" When the lines_configuration array does not have
     *   exactly the same number of elements as the num_lines configuration object set in
     *   the constructor.
     */
    setConfigForLines: function(lines_configuration) {
      if (lines_configuration.length !== this.options.num_lines) {
        throw new Vex.RERR("StaveConfigError",
          "The length of the lines configuration array must match the number of lines in the Stave");
      }

      // Make sure the defaults are present in case an incomplete set of
      //  configuration options were supplied.
      for (var line_config in lines_configuration) {
        // Allow 'null' to be used if the caller just wants the default for a particular node.
        if (!lines_configuration[line_config]) {
          lines_configuration[line_config] = this.options.line_config[line_config];
        }
        Vex.Merge(this.options.line_config[line_config], lines_configuration[line_config]);
      }

      this.options.line_config = lines_configuration;

      return this;
    }
  };

  return Stave;
}());