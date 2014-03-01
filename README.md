# MEItoVexFlow

A JavaScript library which provides a function for converting MEI
<http://music-encoding.org/> encoded music notation into drawing
instructions for the VexFlow <http://vexflow.com/> music notation
rendering library.

## Build

To build MEItoVexFlow, you'll need Node.js and npm. In the main directory run:

`$ npm install`
`$ bower install`

...and you're set! Now, to build run:

`$ grunt`

## Usage

The library provides the function `render_notation` which takes four
arguments:

 - `score` should be a markup fragment containing the MEI

 - `target` should be an HTML <canvas> element onto which the notation
   will be drawn

 - `width` should be the width of the canvas (optional)

 - `height` should be the height of the canvas (optional)

For sample function calls see the test cases in the 'tests' directory! 

## MeiLib.js 

A JavaScript library offering methods to manipulate MEI.

As part of the MEI2VexFlow project, MeiLib.js has been created to offer a 
set of VexFlow-independent methods, such as calculating timestamp
value for a given musical event, or parsing information related to the 
Critical Apparatus MEI module.

For more information about the functions in MeiLib.js see the documentation 
comments within the source file meilib.js

## Dependencies

 - Any browser in which this code is used must have the VexFlow and
   jQuery libraries loaded.
 - MEI2VexFlow uses MeiLib.js to convert timestamp values into xml:id values, 
   therefore it cannot run without it, on the other hand,
 - MeiLib.js can work independently from MEI2VexFlow. To use MeiLib.js on 
   its own, simply download or reference the meilib.js file!


## Limitations

Only a small subset of MEI has so far been implemented. Many
conventional aspects of common practice notation have been ignored
(such as repeat accidentals, stem directions). It's also important to
remember that VexFlow is a moving target, it's in constant development
and so this code could break at any time.

## Contributing

If you'd like to contribute to MEItoVexFlow, please do! This project is young and there is a lot to fix, so we don't have real style guidelines for now. However, before sending a pull request, make sure that the tests are still working. 

## Licence

Copyright © 2012, 2013 Richard Lewis, Raffaele Viglianti, Zoltan Komives,
University of Maryland

Licensed under the Apache License, Version 2.0 (the "License"); you
may not use this file except in compliance with the License.  You may
obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied.  See the License for the specific language governing
permissions and limitations under the License.
