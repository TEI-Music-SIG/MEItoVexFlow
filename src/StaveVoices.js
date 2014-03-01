/* 
* StaveVoices.js
* Author: Zoltan Komives (zolaemil@gmail.com)
* Created: 25.07.2013
* 
* Stores all voices in a given measure along with the respective staff id.
* Passes all voices to Vex.Flow.Formatter and calls joinVoices, then draws all voices.
* 
* Copyright © 2012, 2013 Richard Lewis, Raffaele Viglianti, Zoltan Komives,
* University of Maryland
* 
* Licensed under the Apache License, Version 2.0 (the "License"); you
* may not use this file except in compliance with the License.  You may
* obtain a copy of the License at
* 
*    http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
* implied.  See the License for the specific language governing
* permissions and limitations under the License.
*/


MEI2VF.StaffVoice = function(voice, staff_n) {
  this.voice = voice;
  this.staff_n = staff_n;
}

MEI2VF.StaveVoices = function() {
  this.all_voices = new Array();
}
MEI2VF.StaveVoices.prototype.addStaffVoice = function(staffVoice) {
  this.all_voices.push(staffVoice);
}

MEI2VF.StaveVoices.prototype.addVoice = function(voice, staff_n) {
  this.addStaffVoice(new MEI2VF.StaffVoice(voice, staff_n));
}

MEI2VF.StaveVoices.prototype.reset = function() {
  this.all_voices = [];
}

MEI2VF.StaveVoices.prototype.format = function(width) {
  var voices = $.map(this.all_voices, function(staffVoice, i) {
    return staffVoice.voice;
  });
  new Vex.Flow.Formatter().format(voices, width);
}

MEI2VF.StaveVoices.prototype.draw = function (context, staves) {
  var all_voices = this.all_voices;
  var staffVoice;
  for (var i=0; i<all_voices.length; ++i) {
    staffVoice = all_voices[i];
    staffVoice.voice.draw(context, staves[staffVoice.staff_n]);
  }
}
