define([
  'vexflow',
  'vex'
], function (VF, Vex, undefined) {



  VF.Curve.prototype.renderCurve = function (params) {
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
    ctx.bezierCurveTo(first_x + cp_spacing + cps[0].x, first_y + (cps[0].y * params.direction), last_x - cp_spacing +
                                                                                                cps[1].x, last_y +
                                                                                                          (cps[1].y *
                                                                                                           params.direction), last_x, last_y);
    ctx.bezierCurveTo(last_x - cp_spacing + cps[1].x, last_y + ((cps[1].y + thickness) * params.direction), first_x +
                                                                                                            cp_spacing +
                                                                                                            cps[0].x, first_y +
                                                                                                                      ((cps[0].y +
                                                                                                                        thickness) *
                                                                                                                       params.direction), first_x, first_y);
    ctx.stroke();
    ctx.closePath();
    ctx.fill();
  };


  VF.Curve.prototype.draw = function () {
    //#######start addition
    var Curve = VF.Curve;
    //###########end addition


    if (!this.context) {
      throw new Vex.RERR("NoContext", "No context to render tie.");
    }
    var first_note = this.from;
    var last_note = this.to;
    var first_x, last_x, first_y, last_y, stem_direction;

    var metric = "baseY";
    var end_metric = "baseY";
    var position = this.render_options.position;
    var position_end = this.render_options.position_end;

    if (position === Curve.Position.NEAR_TOP) {
      metric = "topY";
      end_metric = "topY";
    }

    if (position_end == Curve.Position.NEAR_HEAD) {
      end_metric = "baseY";
    } else if (position_end == Curve.Position.NEAR_TOP) {
      end_metric = "topY";
    }

    if (first_note) {
      first_x = first_note.getTieRightX();
      stem_direction = first_note.getStemDirection();
      first_y = first_note.getStemExtents()[metric];
    } else {
      // ##### START MODIFICATION
      first_x = last_note.getStave().getSlurStartX();
      // ##### END MODIFICATION
      first_y = last_note.getStemExtents()[metric];
    }

    if (last_note) {
      last_x = last_note.getTieLeftX();
      stem_direction = last_note.getStemDirection();
      last_y = last_note.getStemExtents()[end_metric];
    } else {
      // ##### START MODIFICATION
      last_x = first_note.getStave().getSlurEndX();
      // ##### END MODIFICATION
      last_y = first_note.getStemExtents()[end_metric];
    }

    this.renderCurve({
      first_x : first_x,
      last_x : last_x,
      first_y : first_y,
      last_y : last_y,
      direction : stem_direction * (this.render_options.invert === true ? -1 : 1)
    });
    return true;
  };


});