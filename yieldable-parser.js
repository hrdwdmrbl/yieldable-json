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

class ParseError {
  constructor(m) {
    this.name = 'ParseError';
    this.message = m;
    this.text = parseStr;
  }
}

// Seek to the next character, after skipping white spaces, if any.
const seek = (ch, at) => {
  ch = parseStr.charAt(at);
  at++;
  while (ch && ch <= ' ') {
    seek(ch, at);
  }
  return ch;
};

// Seek to the previous character, required in some special cases.
const unseek = (at) => {
  return parseStr.charAt(--at);
};

// Match 'true', 'false' and  'null' built-ins.
const wordCheck = (ch, at, parseStr) => {
  let word = '';
  do {
    word += ch;
    seek(ch, at);
  } while (ch.match(/[a-z]/i));
  parseStr = parseStr.slice(at - 1);
  at = 0;
  return word;
};

// Process strings specially.
const normalizeUnicodedString = (ch, at) => {
  let inQuotes = ' ';
  const tempIndex = at;
  const index = 0;
  const slash = 0;
  const c = '"';
  while (c) {
    index = parseStr.indexOf('"', tempIndex + 1);
    tempIndex = index;
    ch = parseStr.charAt(tempIndex - 1);
    while (ch === '\\') {
      slash++;
      ch = parseStr.charAt(tempIndex - (slash + 1));
    }
    if (slash % 2 === 0) {
      inQuotes = parseStr.substring(at, index);
      parseStr = parseStr.slice(++index);
      slash = 0;
      break;
    } else
      slash = 0;
  }

  // When parsing string values, look for " and \ characters.
  index = inQuotes.indexOf('\\');
  while (index >= 0) {
    const escapee = {
      '"': '"',
      '\'': '\'',
      '/': '/',
      '\\': '\\',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
    };
    const hex = 0;
    const i = 0;
    let uffff = 0;
    at = index;
    ch = inQuotes.charAt(++at);
    if (ch === 'u') {
      uffff = 0;
      for (i = 0; i < 4; i += 1) {
        hex = parseInt(ch = inQuotes.charAt(++at), 16);
        if (!isFinite(hex)) {
          break;
        }
        uffff = uffff * 16 + hex;
      }
      inQuotes = inQuotes.slice(0, index) +
                 String.fromCharCode(uffff) + inQuotes.slice(index + 6);
      at = index;
    } else if (typeof escapee[ch] === 'string') {
      inQuotes = inQuotes.slice(0, index) +
                 escapee[ch] + inQuotes.slice(index + 2);
      at = index + 1;
    } else
      break;
    index = inQuotes.indexOf('\\', at);
  }
  at = 0;
  return inQuotes;
};

// To hold 'parseYield' genarator function
const yieldBridge = function * (yielding, t0, parseStr) {
  let keyN = 0;
  let at = 0;
  let ch = ' ';
  let word = '';
  yielding = yield* parseYield(t0, parseStr, keyN, at, ch, word);
};

/**
 * If there is a reviver function, we recursively walk the new structure,
 * passing each name/value pair to the reviver function for possible
 * transformation, starting with a temporary root object that holds the result
 * in an empty key. If there is not a reviver function, we simply return the
 * result.
 * @param { object } yieldedObject
 * @param { string } key
 * @return { function } reviver
 */
const revive = (yieldedObject, key) => {
  let v = '';
  const val = yieldedObject[key];
  if (val && typeof val === 'object') {
    for (k in val) {
      if (Object.prototype.hasOwnProperty.call(val, k)) {
        v = revive(val, k);
        if (v !== undefined)
          val[k] = v;
        else
          delete val[k];
      }
    }
  }
  return reviver.call(yieldedObject, key, val);
};

const addup = (numHolder, ch, at) => {
  numHolder += ch;
  seek(ch, at);
};

/**
  * This function parses the current string and returns the JavaScript
  * Object, through recursive method, and yielding back occasionally
  * based on the intensity parameter.
  * @return { object } returnObj
  */
 const parseYield = function * (t0, parseStr, keyN, at, ch, word) {
  let key = '';
  const returnObj = {};
  const returnArr = [];
  let v = '';
  const inQuotes = '';
  let num = 0;
  let numHolder = '';

  // Handle premitive types. eg: JSON.parse(21)
  if (typeof parseStr === 'number' || typeof parseStr === 'boolean' ||
      parseStr === null) {
    parseStr = '';
    return text;
  } else if (typeof parseStr === 'undefined') {
    parseStr = undefined;
    return text;
  } else if (parseStr.charAt(0) === '[' && parseStr.charAt(1) === ']') {
    parseStr = '';
    return [];
  } else if (parseStr.charAt(0) === '{' && parseStr.charAt(1) === '}') {
    parseStr = '';
    return {};
  } else {
    // Yield the parsing work after the maxDuration has passed
    const t1 = Date.now();
    if (t1 - t0 > maxDuration) {
      yield;
    }
    // Common case: non-premitive types.
    if (keyN !== 1)
      seek(ch, at);
    switch (ch) {
      case '{':
      // Object case
        seek(ch, at);
        if (ch === '}') {
          parseStr = parseStr.slice(at);
          at = 0;
          return returnObj;
        }
        do {
          if (ch !== '"')
            seek(ch, at);
          keyN = 1;
          key = yield *parseYield(t0, parseStr);
          keyN = 0;
          seek(ch, at);
          returnObj[key] = yield *parseYield(t0, parseStr);
          seek(ch, at);
          if (ch === '}') {
            parseStr = parseStr.slice(at);
            at = 0;
            return returnObj;
          }
        } while (ch === ',');
        return new ParseError('Bad object');
      case '[':
      // Array case
        seek(ch, at);
        if (ch === ']') {
          parseStr = parseStr.slice(at);
          at = 0;
          return returnArr;
        }
        ch = unseek(at);
        do {
          v = yield *parseYield(t0, parseStr);
          returnArr.push(v);
          seek(ch, at);
          if (ch === ']') {
            parseStr = parseStr.slice(at);
            at = 0;
            return returnArr;
          }
        } while (ch === ',');
        return new ParseError('Bad array');
      case '"':
        parseStr = parseStr.slice(at - 1);
        at = 0;
        if (parseStr.charAt(0) === '"' && parseStr.charAt(1) === '"') {
          parseStr = parseStr.slice(2);
          at = 0;
          return inQuotes;
        } else {
          seek(ch, at);
          return normalizeUnicodedString();
        }
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
      case '-':
        if (ch === '-') {
          addup(numHolder, ch, at);
        }
        do {
          addup(numHolder, ch, at);
          if (ch === '.' || ch === 'e' || ch === 'E' ||
            ch === '-' || ch === '+' ||
            (ch >= String.fromCharCode(65) &&
            ch <= String.fromCharCode(70)))
            addup(numHolder, ch, at);
        } while (isFinite(ch) && ch !== '');
        num = Number(numHolder);
        parseStr = parseStr.slice(at - 1);
        at = 0;
        return num;
      case 't':
        word = wordCheck(ch, at, parseStr);
        if (word === 'true')
          return true;
        else return new ParseError('Unexpected character');
      case 'f':
        word = wordCheck(ch, at, parseStr);
        if (word === 'false')
          return false;
        else return new ParseError('Unexpected character');
      case 'n':
        word = wordCheck(ch, at, parseStr);
        if (word === 'null')
          return null;
        else return new ParseError('Unexpected character');
      default:
        return new ParseError('Unexpected character');
    }
  }
};

/**
 * This method parses a JSON text to produce an object or array.
 * It can throw a SyntaxError exception, if the string is malformed.
 * @param { string } text
 * @param { Object } options
 * @param { function|array } options.reviver
 * @param { number } options.maxDuration Time allowed to pass before yielding (in milliseconds)
 */
const parseWrapper = (parseStr, options) => {
  const t0 = Date.now();

  let yielding = '';
  const rs = yieldBridge(yielding, t0, parseStr);
  let gen = rs.next();

  return new Promise((resolve, reject) => {
    const yieldCPU = () => {
      setImmediate(() => {
        gen = rs.next();

        if (gen.done === true) {
          const isEmpty = (value) => {
            if (value.charAt(0) === '}' || value.charAt(0) === ']') {
              value = value.substring(1, value.length);
            }
            return typeof value === 'string' && !value.trim();
          };
          if (typeof yielding === 'undefined') {
            return reject(new ParseError('Unexpected Character'));
          } else if (yielding instanceof ParseError) {
            return reject(yielding);
          } else if (!isEmpty(parseStr)) {
            return reject(new ParseError('Unexpected Character'));
          } else {
            if (typeof reviver === 'function') {
              const result = revive({'': yielding}, '');
              return resolve(result);
            } else {
              return resolve(yielding);
            }
          }
        } else {
          yieldCPU();
        }
      });
    };
  });
};

exports.parseWrapper = parseWrapper;
