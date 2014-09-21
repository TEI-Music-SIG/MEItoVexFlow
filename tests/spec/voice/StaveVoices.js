define([
  'm2v/voice/StaveVoices',
], function (StaveVoices, undefined) {

  describe("StaveVoices", function () {

    it('should play well with VexFlow', function () {
      console.log('\n\n*********************************************');
      console.log('\n************ Unit test: StaveVoices *********');

      var Vex = window.Vex;

    var staveVoices = new StaveVoices();

    var canvas = $('<canvas width="500" height="300"/>').get(0);
    $(document.body).append(canvas);

//    Vex.Flow.Test.resizeCanvas(canvas, 500, 300);
    var renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
    var ctx = renderer.getContext();
    // var ctx = Vex.getCanvasContext(canvas);
    ctx.scale(0.9, 0.9);
    ctx.fillStyle = "#221";
    ctx.strokeStyle = "#221";
    ctx.font = "10pt Arial";
    function newNote(note_struct) {
      return new Vex.Flow.StaveNote(note_struct);
    }

    function newAcc(type) {
      return new Vex.Flow.Accidental(type);
    }

    var stave11 = new Vex.Flow.Stave(20, 10, 255).addTrebleGlyph().addTimeSignature("6/8").setContext(ctx).draw();
    var stave21 = new Vex.Flow.Stave(20, 100, 255).addTrebleGlyph().addTimeSignature("6/8").setContext(ctx).draw();
    var stave31 = new Vex.Flow.Stave(20, 200, 255).addClef("bass").addTimeSignature("6/8").setContext(ctx).draw();
    new Vex.Flow.StaveConnector(stave21, stave31).setType(Vex.Flow.StaveConnector.type.BRACE).setContext(ctx).draw();

    var notes11 = [
      newNote({ keys : ["f/4"], duration : "q"}).setStave(stave11),
      newNote({ keys : ["d/4"], duration : "8"}).setStave(stave11),
      newNote({ keys : ["g/4"], duration : "q"}).setStave(stave11),
      newNote({ keys : ["e/4"], duration : "8"}).setStave(stave11).addAccidental(0, newAcc("b"))
    ];
    var notes21 = [
      newNote({ keys : ["d/4"], stem_direction : 1, duration : "8"}).setStave(stave21),
      newNote({ keys : ["d/4"], stem_direction : 1, duration : "8"}).setStave(stave21),
      newNote({ keys : ["d/4"], stem_direction : 1, duration : "8"}).setStave(stave21),
      newNote({ keys : ["d/4"], stem_direction : 1, duration : "8"}).setStave(stave21),
      newNote({ keys : ["e/4"], stem_direction : 1, duration : "8"}).setStave(stave21).addAccidental(0, newAcc("b")),
      newNote({ keys : ["e/4"], stem_direction : 1, duration : "8"}).setStave(stave21).addAccidental(0, newAcc("b"))
    ];
    var notes31 = [
      newNote({ keys : ["a/5"], stem_direction : -1, duration : "8"}).setStave(stave31),
      newNote({ keys : ["a/5"], stem_direction : -1, duration : "8"}).setStave(stave31),
      newNote({ keys : ["a/5"], stem_direction : -1, duration : "8"}).setStave(stave31),
      newNote({ keys : ["a/5"], stem_direction : -1, duration : "8"}).setStave(stave31),
      newNote({ keys : ["a/5"], stem_direction : -1, duration : "8"}).setStave(stave31),
      newNote({ keys : ["a/5"], stem_direction : -1, duration : "8"}).setStave(stave31)
    ];

    var voice11 = new Vex.Flow.Voice(Vex.Flow.Test.Formatter.TIME6_8);
    var voice21 = new Vex.Flow.Voice(Vex.Flow.Test.Formatter.TIME6_8);
    var voice31 = new Vex.Flow.Voice(Vex.Flow.Test.Formatter.TIME6_8);
    voice11.addTickables(notes11);
    voice21.addTickables(notes21);
    voice31.addTickables(notes31);

    var beam21a = new Vex.Flow.Beam(notes21.slice(0, 3));
    var beam21b = new Vex.Flow.Beam(notes21.slice(3, 6));
    var beam31a = new Vex.Flow.Beam(notes31.slice(0, 3));
    var beam31b = new Vex.Flow.Beam(notes31.slice(3, 6));

    // if (options.params.justify > 0) {
    // new Vex.Flow.Formatter().joinVoices( [voice11, voice21, voice31] ).
    // format([voice11, voice21, voice31], options.params.justify);
    // } else {
    // new Vex.Flow.Formatter().joinVoices( [voice11, voice21, voice31] ).
    // format([voice11, voice21, voice31]);
    // }

    // voice11.draw(ctx, stave11);
    // voice21.draw(ctx, stave21);
    // voice31.draw(ctx, stave31);
    // beam21a.setContext(ctx).draw();
    // beam21b.setContext(ctx).draw();
    // beam31a.setContext(ctx).draw();
    // beam31b.setContext(ctx).draw();

    var stave12 = new Vex.Flow.Stave(stave11.width + stave11.x, stave11.y, 250).setContext(ctx).draw()
    var stave22 = new Vex.Flow.Stave(stave21.width + stave21.x, stave21.y, 250).setContext(ctx).draw();
    var stave32 = new Vex.Flow.Stave(stave31.width + stave31.x, stave31.y, 250).setContext(ctx).draw();

    var notes12 = [
      newNote({ keys : ["a/4"], duration : "q"}).setStave(stave12).addAccidental(0, newAcc("b")),
      newNote({ keys : ["b/4"], duration : "8"}).setStave(stave12).addAccidental(0, newAcc("b")),
      newNote({ keys : [
        "c/5",
        "e/5"
      ], stem_direction : -1, duration : "q"}).setStave(stave12). //,
        addAccidental(0, newAcc("b")).addAccidental(1, newAcc("b")),

      newNote({ keys : ["d/5"], stem_direction : -1, duration : "8"}).setStave(stave12)
    ];
    var notes22 = [
      newNote({ keys : [
        "a/4",
        "e/4"
      ], stem_direction : 1, duration : "qd"}).setStave(stave22).addAccidental(0, newAcc("b")).addAccidental(1, newAcc("b")).addDotToAll(),
      newNote({ keys : [
        "c/5",
        "a/4",
        "e/4"
      ], stem_direction : 1, duration : "q"}).setStave(stave22).addAccidental(0, newAcc("b")).addAccidental(1, newAcc("b")),
      newNote({ keys : ["d/5"], stem_direction : 1, duration : "8"}).setStave(stave22).addAccidental(0, newAcc("b"))
    ];
    var notes32 = [
      newNote({ keys : ["a/5"], stem_direction : -1, duration : "8"}).setStave(stave32),
      newNote({ keys : ["a/5"], stem_direction : -1, duration : "8"}).setStave(stave32),
      newNote({ keys : ["a/5"], stem_direction : -1, duration : "8"}).setStave(stave32),
      newNote({ keys : ["a/5"], stem_direction : -1, duration : "8"}).setStave(stave32),
      newNote({ keys : ["a/5"], stem_direction : -1, duration : "8"}).setStave(stave32),
      newNote({ keys : ["a/5"], stem_direction : -1, duration : "8"}).setStave(stave32)
    ];
    var voice12 = new Vex.Flow.Voice(Vex.Flow.Test.Formatter.TIME6_8);
    var voice22 = new Vex.Flow.Voice(Vex.Flow.Test.Formatter.TIME6_8);
    var voice32 = new Vex.Flow.Voice(Vex.Flow.Test.Formatter.TIME6_8);
    voice12.addTickables(notes12);
    voice22.addTickables(notes22);
    voice32.addTickables(notes32);

    // if (options.params.justify > 0) {
    // new Vex.Flow.Formatter().joinVoices([voice12, voice22, voice32]).
    // format([voice12, voice22, voice32], 188);
    // } else {
    // new Vex.Flow.Formatter().joinVoices([voice12, voice22, voice32]).
    // format([voice12, voice22, voice32]);
    // }
    // var beam32a = new Vex.Flow.Beam(notes32.slice(0, 3));
    // var beam32b = new Vex.Flow.Beam(notes32.slice(3, 6));

    // voice12.draw(ctx, stave12);
    // voice22.draw(ctx, stave22);
    // voice32.draw(ctx, stave32);
    // beam32a.setContext(ctx).draw();
    // beam32b.setContext(ctx).draw();

    // ok(true);

    var staves = [];

    staveVoices.reset();
    staveVoices.addVoice(voice11, 1);
    staveVoices.addVoice(voice21, 2);
    staveVoices.addVoice(voice31, 3);
    staveVoices.preFormat();
    staveVoices.format(stave11);

    staves[1] = stave11;
    staves[2] = stave21;
    staves[3] = stave31;
    staveVoices.draw(ctx, staves);

    beam21a.setContext(ctx).draw();
    beam21b.setContext(ctx).draw();
    beam31a.setContext(ctx).draw();
    beam31b.setContext(ctx).draw();

    staveVoices.reset();
    staveVoices.addVoice(voice21, 1);
    staveVoices.addVoice(voice22, 2);
    staveVoices.addVoice(voice32, 3);
    staveVoices.preFormat();
    staveVoices.format(stave21);

    staves[1] = stave12;
    staves[2] = stave22;
    staves[3] = stave32;
    staveVoices.draw(ctx, staves);

    //var beam32a = new Vex.Flow.Beam(notes32.slice(0, 3));
    //var beam32b = new Vex.Flow.Beam(notes32.slice(3, 6));
    //beam32a.setContext(ctx).draw();
    //beam32b.setContext(ctx).draw();

      expect(true).toBe(true);

    });
  });


});