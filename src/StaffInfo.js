/* 
* StaffInfo.js
* Author: Zoltan Komives (zolaemil@gmail.com)
* Created: 03.07.2013
* 
* Contains the staff definition and the rendering information (i.e. what clef modifiers are to be rendered)
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

MEI2VF.StaffInfo = function(staffdef, w_clef, w_keysig, w_timesig) {
  this.renderWith = { clef: w_clef, keysig: w_keysig, timesig: w_timesig };
  this.staffDef = staffdef;
};

MEI2VF.StaffInfo.prototype.look4changes = function (current_staffDef, new_staffDef) {
  var result = { clef:false, keysig:false, timesig:false };
  if (!current_staffDef && new_staffDef) {
    result.clef = true;
    result.keysig = true;
    result.keysig = true;
    return result;
  } else if (current_staffDef && !new_staffDef) {
    result.clef = false;
    result.keysig = false;
    result.keysig = false;
    return result;
  } else if (!current_staffDef && !new_staffDef) {
    throw new MEI2VF_RUNTIME_ERROR('BadArgument', 'Cannot compare two undefined staff definitions.')
  }
  
  var cmp_attr = function(e1, e2, attr_name) { return $(e1).attr(attr_name) === $(e2).attr(attr_name) };
  
  if (!cmp_attr(current_staffDef, new_staffDef, 'clef.shape') || !cmp_attr(current_staffDef, new_staffDef, 'clef.line')) {
    result.clef = true;
  } 
  if (  (!cmp_attr(current_staffDef, new_staffDef, 'key.pname') || 
         !cmp_attr(current_staffDef, new_staffDef, 'key.accid') || 
         // added 'key.mode' as third parameter; without a third parameter, cmp_attr would 
         // try to compare $(e1).attr(undefined) === $(e2).attr(undefined)
         !cmp_attr(current_staffDef, new_staffDef, 'key.mode') )
     ) {
    result.keysig = true;
  } 
  if (!cmp_attr(current_staffDef, new_staffDef, 'meter.count') || !cmp_attr(current_staffDef, new_staffDef, 'meter.unit')) {
    result.timesig = true;
  }
  return result;
};


MEI2VF.StaffInfo.prototype.updateDef = function(staffdef) {
  this.renderWith = this.look4changes(this.staffDef, staffdef);
  this.staffDef = staffdef;
};
