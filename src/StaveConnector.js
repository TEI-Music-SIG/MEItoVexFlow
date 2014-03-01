/* 
* StaveConnector.js
* Author: Zoltan Komives (zolaemil@gmail.com)
* Created: 24.07.2013
* 
* Contains information about a stave connector parsed from the staffGrp elements 
* and their @symbol attributes
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

MEI2VF.StaveConnector = function(symbol, top_staff_n, bottom_staff_n) {
  this.init(symbol, top_staff_n, bottom_staff_n);
}

MEI2VF.StaveConnector.prototype.init = function(symbol, top_staff_n, bottom_staff_n) {
  this.symbol = symbol;
  this.top_staff_n = top_staff_n;
  this.bottom_staff_n = bottom_staff_n;
}

MEI2VF.StaveConnector.prototype.vexType = function() {
  switch (this.symbol) {
    case 'line': return Vex.Flow.StaveConnector.type.SINGLE;
    case 'brace': return Vex.Flow.StaveConnector.type.BRACE;
    case 'bracket': return Vex.Flow.StaveConnector.type.BRACKET;
    case 'none': return null;
    default: return Vex.Flow.StaveConnector.type.SINGLE;
  }
}
