/**
 * Create hyphens between the specified annotations.
 *
 * @constructor
 */
Vex.Flow.Hyphen = ( function() {
    function Hyphen(config) {
      if (arguments.length > 0)
        this.init(config);
    }

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
        }
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

//fallback: remove when the CMN breve (double whole) is implemented in VexFlow
if (!Vex.Flow.durationToTicks.durations['d']) {
  Vex.Flow.durationToTicks.durations['d'] = Vex.Flow.RESOLUTION / 0.5;
}
// fallback: remove when the CMN breve (double whole) is implemented in VexFlow
if (!Vex.Flow.durationToGlyph.duration_codes['d']) {
  Vex.Flow.durationToGlyph.duration_codes['d'] = {
    common : {
      head_width : 20,
      stem : false,
      stem_offset : 0,
      flag : false,
      dot_shiftY : 0,
      line_above : 0,
      line_below : 0
    },
    type : {
      "n" : {// Breve note
        code_head : "noteheadDoubleWholeSquare"
      },
      "h" : {// Whole note harmonic
        code_head : "v46"
      },
      "m" : {// Whole note muted
        code_head : "v92",
        stem_offset : -3
      },
      "r" : {// Breve rest
        code_head : "restDoubleWhole",
        head_width : 12,
        rest : true,
        position : "D/5",
        dot_shiftY : 0.5
      },
      "s" : {// Whole note slash
        // Drawn with canvas primitives
        head_width : 15,
        position : "B/4"
      }
    }
  };
}

//fallback: remove when the CMN long is implemented in VexFlow
if (!Vex.Flow.durationToTicks.durations['l']) {
  Vex.Flow.durationToTicks.durations['l'] = Vex.Flow.RESOLUTION / 0.25;
}

// fallback: remove when the CMN long is implemented in VexFlow
if (!Vex.Flow.durationToGlyph.duration_codes['l']) {
  Vex.Flow.durationToGlyph.duration_codes['l'] = {
    common : {
      head_width : 20,
      stem : false,
      stem_offset : 0,
      flag : false,
      dot_shiftY : 0,
      line_above : 0,
      line_below : 0
    },
    type : {
      "n" : {// Breve note
        code_head : "noteheadQuadWholeSquare"
      },
      "h" : {// Whole note harmonic
        code_head : "v46"
      },
      "m" : {// Whole note muted
        code_head : "v92",
        stem_offset : -3
      },
      "r" : {// Breve rest
        code_head : "restDoubleWhole",
        head_width : 12,
        rest : true,
        position : "D/5",
        dot_shiftY : 0.5
      },
      "s" : {// Whole note slash
        // Drawn with canvas primitives
        head_width : 15,
        position : "B/4"
      }
    }
  };
}


// Bravura glyphs
Vex.Flow.Font.glyphs["gClef"] = {
  "x_min" : 0,
  "x_max" : 948,
  "ha" : 944,
  "o" : "0 0 117 0 1 1 560 560 1 -1 0 -1120 m 948 35 l 948 15 b 693 -328 948 -141 850 -269 b 728 -536 711 -454 728 -536 b 736 -633 734 -571 736 -603 b 489 -920 736 -853 588 -914 b 456 -921 477 -920 466 -921 b 190 -700 225 -921 190 -777 b 196 -650 190 -671 195 -650 b 323 -532 204 -587 259 -536 l 333 -532 b 476 -665 409 -532 469 -592 l 476 -675 b 378 -806 476 -738 435 -788 b 343 -815 365 -812 356 -812 b 330 -826 336 -818 330 -820 b 343 -841 330 -830 335 -836 b 459 -869 372 -862 412 -869 l 486 -869 b 673 -638 503 -869 673 -867 b 665 -543 673 -610 671 -578 l 633 -347 l 626 -347 b 531 -353 595 -351 563 -353 b 10 94 301 -353 36 -245 b 8 136 8 108 8 122 b 445 788 8 406 239 612 l 428 876 b 419 1019 421 925 419 973 b 645 1543 419 1273 511 1484 b 750 1410 645 1543 696 1534 b 811 1141 790 1319 811 1229 b 528 594 811 951 715 767 b 573 354 542 518 557 445 b 591 357 578 357 585 357 l 606 357 b 948 35 785 357 937 216 m 655 1320 b 477 948 545 1315 477 1092 b 480 897 477 930 477 913 b 491 829 480 889 486 862 b 745 1177 641 942 728 1061 b 748 1208 746 1189 748 1198 b 655 1320 748 1284 701 1320 m 120 22 l 120 11 b 531 -302 129 -234 378 -302 b 623 -291 570 -302 602 -298 l 547 157 b 382 -3 455 141 382 95 l 382 -17 b 476 -155 385 -74 448 -143 b 497 -181 487 -161 497 -172 b 480 -192 497 -186 491 -192 b 451 -186 473 -192 463 -190 b 300 0 385 -165 322 -95 b 291 62 294 20 291 41 b 517 344 291 188 391 307 l 482 563 b 120 22 298 427 120 256 m 683 -276 b 833 -64 781 -234 833 -162 l 833 -49 b 609 162 827 69 727 162 l 603 162 b 683 -276 633 4 661 -148 "
};

Vex.Flow.Font.glyphs["gClef8vb"] = {
  "x_min" : 0,
  "x_max" : 937,
  "ha" : 930,
  "o" : "0 0 117 0 1 1 560 560 1 -1 0 -1120 m 937 46 l 937 24 b 685 -316 937 -130 839 -256 b 717 -521 704 -441 717 -521 b 727 -622 724 -557 727 -591 b 533 -896 727 -799 624 -872 b 588 -963 563 -906 588 -928 b 546 -1030 588 -1008 559 -1016 b 535 -1049 538 -1036 535 -1042 b 540 -1070 535 -1054 538 -1061 b 553 -1116 549 -1085 553 -1100 b 493 -1203 553 -1154 531 -1189 b 435 -1211 473 -1211 455 -1211 b 315 -1133 391 -1211 328 -1183 b 314 -1120 314 -1128 314 -1124 b 382 -1030 314 -1082 349 -1040 b 391 -1023 388 -1029 391 -1026 b 388 -1016 391 -1021 389 -1018 b 365 -963 372 -1000 365 -981 b 396 -903 365 -941 377 -918 b 185 -680 213 -879 185 -750 b 190 -634 185 -652 189 -634 b 319 -518 200 -570 252 -521 l 329 -518 b 468 -650 402 -518 462 -578 l 468 -657 b 371 -790 468 -720 428 -770 b 337 -799 360 -797 350 -797 b 326 -809 330 -801 326 -805 b 337 -825 326 -813 329 -818 b 454 -853 367 -846 407 -853 l 476 -853 b 665 -620 493 -853 665 -850 b 657 -526 665 -592 662 -561 l 626 -336 l 617 -336 b 531 -342 589 -339 560 -342 b 7 102 301 -342 35 -237 b 6 144 6 116 6 130 b 435 792 6 414 234 617 l 423 881 b 413 1025 416 930 413 979 b 637 1541 413 1275 501 1483 b 741 1411 637 1541 689 1532 b 801 1142 780 1320 801 1231 b 522 599 801 953 707 773 b 566 363 533 524 550 452 b 585 365 571 365 577 365 l 601 365 b 937 46 777 365 927 225 m 435 -1196 b 484 -1148 462 -1196 484 -1170 b 482 -1130 484 -1142 484 -1135 b 447 -1082 473 -1110 462 -1095 b 426 -1064 440 -1075 430 -1070 b 406 -1053 420 -1061 413 -1053 b 385 -1064 396 -1053 391 -1061 b 379 -1075 382 -1067 379 -1070 b 364 -1117 370 -1085 364 -1102 b 365 -1127 364 -1120 365 -1124 b 435 -1196 374 -1170 409 -1196 m 540 -966 l 540 -956 b 528 -925 540 -944 535 -930 b 473 -903 514 -911 493 -903 b 430 -937 452 -906 433 -914 b 455 -983 430 -956 442 -970 b 490 -1014 465 -993 476 -1005 b 508 -1021 497 -1018 503 -1021 b 540 -966 531 -1021 538 -986 m 648 1322 b 468 946 538 1315 468 1089 b 470 902 468 930 469 916 b 484 833 470 893 476 867 b 736 1179 634 946 717 1063 b 738 1208 738 1189 738 1198 b 648 1322 738 1284 694 1322 m 116 35 l 116 21 b 522 -290 123 -223 370 -290 b 615 -279 561 -290 594 -286 l 540 165 b 375 8 447 150 375 104 l 375 -6 b 468 -143 379 -62 440 -132 b 489 -168 480 -148 489 -160 b 470 -179 489 -175 483 -179 b 442 -175 463 -179 454 -178 b 293 11 379 -153 315 -83 b 286 70 288 31 286 50 b 508 351 286 195 382 315 l 473 568 b 116 35 293 437 116 266 m 675 -262 b 822 -52 770 -221 822 -150 l 822 -36 b 602 171 816 80 717 171 l 596 171 b 675 -262 626 14 652 -137 "
};
Vex.Flow.Font.glyphs["noteheadDoubleWholeSquare"] = {
  "x_min" : 0,
  "x_max" : 746,
  "ha" : 746,
  "o" : "0 0 117 0 1 1 560 560 1 -1 0 -1120 m 724 350 b 746 328 736 350 746 340 l 746 -328 b 724 -350 746 -339 736 -350 b 701 -328 711 -350 701 -339 l 701 -270 b 659 -234 701 -253 683 -234 l 83 -234 b 45 -276 67 -234 45 -256 l 45 -328 b 22 -350 45 -339 35 -350 b 0 -328 10 -350 0 -339 l 0 328 b 22 350 0 340 10 350 b 45 328 35 350 45 340 l 45 260 b 77 218 45 260 64 218 l 659 218 b 701 265 679 218 701 232 l 701 328 b 724 350 701 340 711 350 m 45 18 l 45 -36 b 146 -94 45 -70 83 -94 l 606 -94 b 701 -36 664 -94 701 -77 l 701 28 b 606 78 701 57 664 78 l 139 78 b 45 18 71 78 45 59 "
};
// NOT PART OF BRAVURA:
Vex.Flow.Font.glyphs["noteheadQuadWholeSquare"] = {
  "x_min" : 0,
  "x_max" : 746,
  "ha" : 746,
  // based on the Bravura breve glyph; CHANGES: all values < -1400
  "o" : "0 0 117 0 1 1 560 560 1 -1 0 -1120 " + "m 724 350 " + "b 746 328 736 350 746 340 " + "l 746 -1428 " + "b 724 -1450 746 -1439 736 -1450 " + "b 701 -1428 711 -1450 701 -1439 " + "l 701 -270 " + "b 659 -234 701 -253 683 -234 " + "l 83 -234 " + "b 45 -276 67 -234 45 -256 " + "l 45 -328 " + "b 22 -350 45 -339 35 -350 " + "b 0 -328 10 -350 0 -339 " + "l 0 328 " + "b 22 350 0 340 10 350 " + "b 45 328 35 350 45 340 " + "l 45 260 " + "b 77 218 45 260 64 218 " + "l 659 218 " + "b 701 265 679 218 701 232 " + "l 701 328 " + "b 724 350 701 340 711 350 " + "m 45 18 " + "l 45 -36 " + "b 146 -94 45 -70 83 -94 " + "l 606 -94 " + "b 701 -36 664 -94 701 -77 " + "l 701 28 " + "b 606 78 701 57 664 78 " + "l 139 78 " + "b 45 18 71 78 45 59 "
};
Vex.Flow.Font.glyphs["restDoubleWhole"] = {
  "x_min" : 0,
  "x_max" : 640,
  "ha" : 202,
  "o" : "0 0 133 0 1 1 640 640 2 -2 0 -1280 m 200 24 b 173 0 200 11 189 0 l 26 0 b 0 24 11 0 0 11 l 0 376 b 26 400 0 389 11 400 l 173 400 b 200 376 189 400 200 389 l 200 24 "
};

// fallback: remove when the octave g clef is implemented in VexFlow
Vex.Flow.clefProperties.values.octave = {
  line_shift : 3.5 // 0 for G clef pitches; 3.5 for transposed G clef pitches
};
// fallback: remove when the octave g clef is implemented in VexFlow
Vex.Flow.Clef.types.octave = {
  code : "gClef8vb", // v83: regular g clef
  point : 40, // 38
  line : 3
};
Vex.Flow.Clef.types.treble = {
  code : "gClef",
  point : 40,
  line : 3
};

Vex.Flow.Curve.prototype.renderCurve = function(params) {
  var ctx = this.context;
  var cps = this.render_options.cps;

  var x_shift = this.render_options.x_shift;
  var y_shift = this.render_options.y_shift * params.direction;

  // TODO name variables according to staveTie
  // ################# MODIFICATION (allows to specify y_shift for start & end
  // note separately):
  var y_shift_start = this.render_options.y_shift_start || 0;
  var y_shift_end = this.render_options.y_shift_end || 0;
  var first_x = params.first_x + x_shift;
  var first_y = params.first_y + y_shift + y_shift_start;
  var last_x = params.last_x - x_shift;
  var last_y = params.last_y + y_shift + y_shift_end;
  var thickness = this.render_options.thickness;

  var cp_spacing = (last_x - first_x) / (cps.length + 2);

  ctx.beginPath();
  ctx.moveTo(first_x, first_y);
  ctx.bezierCurveTo(first_x + cp_spacing + cps[0].x, first_y + (cps[0].y * params.direction), last_x - cp_spacing + cps[1].x, last_y + (cps[1].y * params.direction), last_x, last_y);
  ctx.bezierCurveTo(last_x - cp_spacing + cps[1].x, last_y + ((cps[1].y + thickness) * params.direction), first_x + cp_spacing + cps[0].x, first_y + ((cps[0].y + thickness) * params.direction), first_x, first_y);
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

Vex.Flow.Annotation = ( function() {
    function Annotation(text) {
      if (arguments.length > 0)
        this.init(text);
    }

    // To enable logging for this class. Set `Vex.Flow.Annotation.DEBUG` to
    // `true`.
    function L() {
      if (Annotation.DEBUG)
        Vex.L("Vex.Flow.Annotation", arguments);
    }

    // Text annotations can be positioned and justified relative to the note.
    Annotation.Justify = {
      LEFT : 1,
      CENTER : 2,
      RIGHT : 3,
      CENTER_STEM : 4
    };

    Annotation.VerticalJustify = {
      TOP : 1,
      CENTER : 2,
      BOTTOM : 3,
      CENTER_STEM : 4
    };

    Annotation.DEFAULT_FONT_SIZE = 10;

    // ## Prototype Methods
    //
    // Annotations inherit from `Modifier` and is positioned correctly when
    // in a `ModifierContext`.
    var Modifier = Vex.Flow.Modifier;
    Vex.Inherit(Annotation, Modifier, {
      // Create a new `Annotation` with the string `text`.
      init : function(text) {
        Annotation.superclass.init.call(this);

        this.note = null;
        this.index = null;
        this.text_line = 0;
        this.text = text;
        this.justification = Annotation.Justify.CENTER;
        this.vert_justification = Annotation.VerticalJustify.TOP;
        this.font = {
          family : "Arial",
          size : Annotation.DEFAULT_FONT_SIZE,
          weight : ""
        };

        // Line spacing, relative to font size
        this.line_spacing = 1.1; 

        // The default width is calculated from the text.
        this.setWidth(Vex.Flow.textWidth(text));
      },

      setLineSpacing : function(spacing) {
        this.line_spacing = spacing;
        return this;
      },

      // Return the modifier type. Used by the `ModifierContext` to calculate
      // layout.
      getCategory : function() {
        return "annotations";
      },

      // Set the vertical position of the text relative to the stave.
      setTextLine : function(line) {
        this.text_line = line;
        return this;
      },

      // Set font family, size, and weight. E.g., `Arial`, `10pt`, `Bold`.
      setFont : function(family, size, weight) {
        this.font = {
          family : family,
          size : size,
          weight : weight
        };
        return this;
      },

      // Set vertical position of text (above or below stave). `just` must be
      // a value in `Annotation.VerticalJustify`.
      setVerticalJustification : function(just) {
        this.vert_justification = just;
        return this;
      },

      // Get and set horizontal justification. `justification` is a value in
      // `Annotation.Justify`.
      getJustification : function() {
        return this.justification;
      },
      setJustification : function(justification) {
        this.justification = justification;
        return this;
      },

      // Render text beside the note.
      draw : function() {
        if (!this.context)
          throw new Vex.RERR("NoContext", "Can't draw text annotation without a context.");
        if (!this.note)
          throw new Vex.RERR("NoNoteForAnnotation", "Can't draw text annotation without an attached note.");

        var start = this.note.getModifierStartXY(Modifier.Position.ABOVE, this.index);

        // We're changing context parameters. Save current state.
        this.context.save();
        this.context.setFont(this.font.family, this.font.size, this.font.weight);
        var text_width = this.context.measureText(this.text).width;

        // Estimate text height to be the same as the width of an 'm'.
        //
        // This is a hack to work around the inability to measure text height
        // in HTML5 Canvas (and SVG).
        var text_height = this.context.measureText("M").width;
        var x, y;

        if (this.justification == Annotation.Justify.LEFT) {
          x = start.x;
        } else if (this.justification == Annotation.Justify.RIGHT) {
          x = start.x - text_width;
        } else if (this.justification == Annotation.Justify.CENTER) {
          x = start.x - text_width / 2;
        } else/* CENTER_STEM */
        {
          x = this.note.getStemX() - text_width / 2;
        }

        var stem_ext, spacing, font_scale;
        var has_stem = this.note.hasStem();
        var stave = this.note.getStave();

        // The position of the text varies based on whether or not the note
        // has a stem.
        if (has_stem) {
          stem_ext = this.note.getStemExtents();
          spacing = stave.getSpacingBetweenLines();
        }

        font_scale = this.font.size / Annotation.DEFAULT_FONT_SIZE * this.line_spacing;
        if (this.vert_justification == Annotation.VerticalJustify.BOTTOM) {
          y = stave.getYForBottomText(this.text_line, font_scale);
          if (has_stem) {
            var stem_base = (this.note.getStemDirection() === 1 ? stem_ext.baseY : stem_ext.topY);
            y = Math.max(y, stem_base + ( spacing * (this.text_line + 1) * font_scale + ( spacing * (this.text_line) ) ) );
          }
        } else if (this.vert_justification == Annotation.VerticalJustify.CENTER) {
          var yt = this.note.getYForTopText(this.text_line) - 1;
          var yb = stave.getYForBottomText(this.text_line);
          y = yt + (yb - yt ) / 2 + text_height / 2;
        } else if (this.vert_justification == Annotation.VerticalJustify.TOP) {
          y = Math.min(stave.getYForTopText(this.text_line), this.note.getYs()[0] - 10);
          if (has_stem) {
            y = Math.min(y, (stem_ext.topY - 5) - (spacing * this.text_line));
          }
        } else/* CENTER_STEM */
        {
          var extents = this.note.getStemExtents();
          y = extents.topY + (extents.baseY - extents.topY) / 2 + text_height / 2;
        }

        // ############# ADDITON #############
        this.x = x;
        this.y = y;
        this.text_height = text_height;
        this.text_width = text_width;

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

Vex.Flow.StaveTie = ( function() {
  /**
   * Create a new tie from the specified notes. The notes must
   * be part of the same line, and have the same duration (in ticks).
   *
   * @constructor
   * @param {!Object} notes The notes to tie up.
   * @param {!String} text
   */
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

      // ADDITION:
      setDir : function(dir) {
        this.curvedir = dir;
      },

      getDir : function() {
        return this.curvedir;
      },

      renderTie : function(params) {
        if (params.first_ys.length === 0 || params.last_ys.length === 0)
          throw new Vex.RERR("BadArguments", "No Y-values to render");

        // ADDITION:
        if (this.curvedir) {
          params.direction = (this.curvedir === 'above') ? -1 : 1;
        } else {
          this.curvedir = params.direction;
        }

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
