/* 
* EventReference.js
* Author: Zoltan Komives (zolaemil@gmail.com)
* Created: 04.07.2013
* 
* Represents and event with its xmlid, but if the xmlid is not defined, 
* it can also hold the timestamp that can be resolved as soon as the context that 
* holds the event is established. When the tstamp reference is being resolved, 
* the xml:id is calculated using the generic function tstamp2id(), then the xml:id stored, 
* thus marking that the reference is resolved.
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


MEI2VF.EventReference = function(xmlid) {
  this.xmlid = xmlid;
}

MEI2VF.EventReference.prototype.setId = function(xmlid){
  this.xmlid = xmlid;
}

MEI2VF.EventReference.prototype.setTStamp = function(tstamp){
  this.tstamp = tstamp;
  if (this.xmlid) {
    this.tryResolveReference(true);
  }
}

MEI2VF.EventReference.prototype.tryResolveReference = function(strict) {
  var tstamp = this.tstamp;
  var meicontext = this.meicontext;
  if (!tstamp) throw new MEI2VF.RUNTIME_ERROR('MEI2VF:RERR:BADARG:EventRef001', 'EventReference: tstamp must be set in order to resolve reference.')
  if (this.meicontext) {
    //look up event corresponding to the given tstamp (strictly or losely)
    this.xmlid = MeiLib.tstamp2id(this.tstamp, this.meicontext.layer, this.meicontext.meter);
  } else {
    this.xmlid = null;
  }
}

/**
 * @param params { meicontext, strict }; both parameters are optional; 
 *               meicontext is an obejct { layer, meter }; 
 *               strict is boolean, false if not defined.
 *
 */
MEI2VF.EventReference.prototype.getId = function(params) {
  if (params && params.meicontext) this.setContext(params.meicontext);
  if (this.xmlid) return this.xmlid;
  if (this.tstamp) {
    if (this.meicontext) {
      //look up the closest event to tstamp within this.meicontext and return its ID
      this.tryResolveReference(params && params.strict);
      return this.xmlid;
    }
  } 
  return null;
}

MEI2VF.EventReference.prototype.setContext = function(meicontext) {
  this.meicontext = meicontext;
}
