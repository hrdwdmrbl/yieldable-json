/* **************************************************************************
 *
 * (c) Copyright IBM Corp. 2017
 *
 *  This program and the accompanying materials are made available
 *  under the terms of the Apache License v2.0 which accompanies
 *  this distribution.
 *
 *      The Apache License v2.0 is available at
 *      http://www.opensource.org/licenses/apache2.0.php
 *
 * Contributors:
 *   Multiple authors (IBM Corp.) - initial implementation and documentation
 ***************************************************************************/
'use strict';

const pa = require('./yieldable-parser');
const ps = require('./yieldable-stringify');

/**
 * Checks whether the provided space
 * @param { string or number } space
 * @return { string or number }
 */
const validateSpace = (space) => {
  if (typeof space === 'number') {
    space = Math.round(space);
    if (space >= 1 && space <= 10)
      return space;
    else if (space < 1)
      return 0;
    else
      return 10;
  } else {
    if (space.length <= 10)
      return space;
    else
    return space.substr(0, 9);
  }
};

module.exports = {

  /**
  * Error checking  and call of appropriate functions for JSON parse
  * @param { string } data
  * @param {Object|undefined} options
  * @param { function|array } options.reviver
  * @param { number } options.maxDuration Time allowed to pass before yielding (in milliseconds)
  * @return {Promise}
  */
  parseAsync(data, options = {}) {
    _.defaults(options, {
      reviver: undefined,
      maxDuration: 15
    });
    return pa.parseWrapper(data, options);
  },

  /**
  * Error checking  and call of appropriate functions for JSON stringify API
  * @param { * } data
  * @param {Object|undefined} options
  * @param { function|Array } options.replacer
  * @param { number|string } options.space
  * @param { number } options.maxDuration Time allowed to pass before yielding (in milliseconds)
  * @return {Promise}
  */
  stringifyAsync(data, options = {}) {
    if (options.space) {
      options.space = validateSpace(options.space);
    }

    _.defaults(options, {
      maxDuration: 15, // ms
      replacer: undefined,
      space: undefined
    });

    return ps.stringifyWrapper(data, options);
  },
};
