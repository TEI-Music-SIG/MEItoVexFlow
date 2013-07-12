/* 
* EventLink.js
* Author: Zoltan Komives (zolaemil@gmail.com)
* Created: 04.07.2013
* 
* Represents a link between two MEI events. The link is represented by two references: 
*  1. reference to start event, 
*  2. reference to end event.
* 
* 
*/

MEI2VF.EventLink = function(first_id, last_id, link_cond) {
  this.first_ref = new MEI2VF.EventReference(first_id);
  this.last_ref = new MEI2VF.EventReference(last_id);
  this.linkCond = link_cond;
}

/**
 * @param hairpinparams is an object { place, form }.
 */
MEI2VF.EventLink.prototype.setHairpinParams = function (hairpinparams) {
  this.hairpinParams = hairpinparams;
}

MEI2VF.EventLink.prototype.setFirstRef = function (first_ref) {
  this.first_ref = first_ref;
}

MEI2VF.EventLink.prototype.setLastRef = function (last_ref) {
  this.last_ref = last_ref;
}

MEI2VF.EventLink.prototype.setFirstId = function(id) {
  this.first_ref.setId(id);
}

MEI2VF.EventLink.prototype.setLastId = function(id) {
  this.last_ref.setId(id);
}

MEI2VF.EventLink.prototype.setFirstTStamp = function (tstamp) {
  this.first_ref.setTStamp(tstamp);
}

MEI2VF.EventLink.prototype.setLastTStamp = function (tstamp2) {
  this.last_ref.setTStamp(tstamp2);
}

MEI2VF.EventLink.prototype.setContext = function(meicontext) {
  this.meicontext = meicontext;
}

MEI2VF.EventLink.prototype.getFirstId = function () {
    return this.first_ref.getId( { meicontext:this.meicontext } );  
}

MEI2VF.EventLink.prototype.getLastId = function () {
    return this.last_ref.getId( { meicontext:this.meicontext } );
}

