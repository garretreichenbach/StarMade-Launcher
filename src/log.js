/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
'use strict';

const fs   = require('fs');
const path = require('path');


let log_descriptor   = null;
let log_level        = 0;
let log_indent_level = 0;

const levels = {
  normal:  0,
  error:   0,
  fatal:   0,
  info:    0,
  event:   0,
  warning: 0,
  game:    3,
  debug:   5,
  verbose: 10
};

const prefixes = {
  normal:    "         ",
  important: "  !!!!   ",
  game:      " [game]  ",
  info:      "  info   ",
  event:     "  event  ",
  warning:   " warning ",
  error:     "  error  ",
  fatal:     "**FATAL**",
  debug:     " (debug) ",
  verbose:   "(verbose)",
  meta:      " (meta)  ",
  update:    " updater ",
  end:       " --end-- ",
  raw:       ""
};


// For alignment
const timestamp_padding = new Array(
                      // Length of the timestring + some for excess padding
                      ((new Date().toLocaleTimeString()).length + 2)+1
                    ).join(" ");


// Returns a right-padded timestamp in the (locale-dependent) format: "3:36:45 PM  "
const timestamp = function() {
  let stamp  = new Date().toLocaleTimeString();            // Get the timestamp string
  return stamp += timestamp_padding.substring(stamp.length);  // Append remaining padding
};


// returns (" | " * log_indent_level)
const indenting = function() {
  let str  = "";
  if (log_indent_level > 0) {
    for (let x = 1, end = log_indent_level, asc = 1 <= end; asc ? x <= end : x >= end; asc ? x++ : x--) { str += " | "; }
  }
  return str;
};


const prefix = function(type) {
  if (type === "raw") { return ""; }
  return `  ${prefixes[type]}    ${indenting()}`;  // two leading spaces because of timestamp padding
};



const open_logfile = function() {
  let method = "";
  if (log_descriptor !== null) {
    // Already open?  Close and re-open for appending
    fs.closeSync(log_descriptor);
    method = "a";
  } else {
    // Otherwise: create/overwrite
    method = "w";
  }

  log_descriptor = fs.openSync( path.join(".", "launcher.log"), method );
  log_raw(`${new Date}\n`);
  return log_meta(`Opened log file for ${method==="w" ? "writing" : "appending"}.`);
};



// This is where the magic happens.
const log = function(str,  level,  type) {
  // Enforce log-level
  let bytes, data;
  if (level == null) { level = 0; }
  if (type == null) { type = "normal"; }
  if (level > log_level) { return; }

  if (log_descriptor === null) {
    open_logfile();
  }

  try {
    console.log(prefix(type) + str);

    data  = "";
    if (type !== "raw") { data += timestamp() + prefix(type); }
    data += str;
    if ((type !== "raw")  &&  !data.endsWith("\n")) { data += "\n"; }

    return bytes = fs.writeSync(log_descriptor, data);

  } catch (e) {
    // Should catch other filesystem errors here
    open_logfile();
    try {
      // This assumes `data` is the cause.
      this.warning("Could not write to log.  Attempting re-write.", 0);
      return bytes = fs.writeSync(log_descriptor, data);
    } catch (error) {
      e = error;
      open_logfile();
      return this.error("Re-write failed.  Log entry lost.", 0);
    }
  }
};



// Helper functions
const log_entry     = function(str, level)  { if (level == null) { level = levels.normal; } return log(str, level, "normal"); };
const log_info      = function(str, level)    { if (level == null) { level = levels.info; } return log(str, level, "info"); };
const log_event     = function(str, level)   { if (level == null) { level = levels.event; } return log(str, level, "event"); };
const log_game      = function(str, level)    { if (level == null) { level = levels.game; } return log(str, level, "game"); };
const log_warning   = function(str, level) { if (level == null) { level = levels.warning; } return log(str, level, "warning"); };
const log_error     = function(str, level)  { if (level == null) { level = levels.normal; } return log(str, level, "error"); };
const log_fatal     = function(str, level)  { if (level == null) { level = levels.normal; } return log(str, level, "fatal"); };
const log_debug     = function(str, level)   { if (level == null) { level = levels.debug; } return log(str, level, "debug"); };
const log_verbose   = function(str, level) { if (level == null) { level = levels.verbose; } return log(str, level, "verbose"); };
const log_important = function(str, level)  { if (level == null) { level = levels.normal; } return log(str, level, "important"); };
const log_update    = function(str, level)  { if (level == null) { level = levels.normal; } return log(str, level, "update"); };
const log_end       = function(str, level)  { if (level == null) { level = levels.normal; } return log(str, level, "end"); };
var log_raw       = function(str, level)  { if (level == null) { level = levels.normal; } return log(str, level, "raw"); };
var log_meta      = function(str, level) { if (level == null) { level = levels.verbose; } return log(str, level, "meta"); };


// Only log entries with this log-level or below.
const set_level = function(level) {
  log_level = level;
  let level_name = null;
  for (var key in levels) {
    var val = levels[key];
    if (val===level) { if (!level_name) { level_name = `${key} (${val})`; } }
  }
  if (!level_name) { level_name = level; }
  return log_raw(`Logging level: ${level_name}\n\n`);
};


// Returns current log indent level
const indent_level    = () => log_indent_level;

// Increases log indent (with optional log-level)
const log_indent = function(n, level) {
  if (n == null) { n = 1; }
  if (level == null) { level = 0; }
  if (level > log_level) { return; }
  return log_indent_level += n;
};


// Decreases log indent (with optional log-level)
const log_outdent = function(n, level) {
  if (n == null) { n = 1; }
  if (level == null) { level = 0; }
  if (level > log_level) { return; }
  return log_indent_level  = Math.max(0, log_indent_level-n);
};


// Helper functions (single-indent)
log_indent.entry     = function(str, level) { log_indent();  log_entry(str, level);  return log_outdent(); };
log_indent.info      = function(str, level) { log_indent();  log_info(str, level);  return log_outdent(); };
log_indent.event     = function(str, level) { log_indent();  log_event(str, level);  return log_outdent(); };
log_indent.game      = function(str, level) { log_indent();  log_game(str, level);  return log_outdent(); };
log_indent.warning   = function(str, level) { log_indent();  log_warning(str, level);  return log_outdent(); };
log_indent.error     = function(str, level) { log_indent();  log_error(str, level);  return log_outdent(); };
log_indent.fatal     = function(str, level) { log_indent();  log_fatal(str, level);  return log_outdent(); };
log_indent.debug     = function(str, level) { log_indent();  log_debug(str, level);  return log_outdent(); };
log_indent.verbose   = function(str, level) { log_indent();  log_verbose(str, level);  return log_outdent(); };
log_indent.important = function(str, level) { log_indent();  log_important(str, level);  return log_outdent(); };
log_indent.update    = function(str, level) { log_indent();  log_update(str, level);  return log_outdent(); };
log_indent.end       = function(str, level) { log_indent();  log_end(str, level);  return log_outdent(); };
log_indent.raw       = function(str, level) { log_indent();  log_raw(str, level);  return log_outdent(); };
log_indent.meta      = function(str, level) { log_indent();  log_meta(str, level);  return log_outdent(); };




module.exports = {
  // Constants
  levels,           // Log-level constants
  prefixes,         // Log-level prefixes

  // Functions
  entry:         log_entry,        // Normal entry
  info:          log_info,         // Info   entry
  event:         log_event,        // Event  entry
  game:          log_game,         // Used for captured game output (log-level 3)
  warning:       log_warning,      // Achtung
  error:         log_error,        // Normal error
  fatal:         log_fatal,        // Fatal  error
  debug:         log_debug,        // Log-level 5
  verbose:       log_verbose,      // Log-level 10
  important:     log_important,
  update:        log_update,       // Used by the self-updater
  end:           log_end,          // The beginning of the end
  raw:           log_raw,          // No timestamp, newlines, etc.

  indent_level,     // Returns current indent level
  indent:        log_indent,       // indent(num=1, level=normal) plus indent.<entry_type>() single-indent helper functions
  outdent:       log_outdent,      // outdent(num=1, level=normal)

  set_level        // Sets log-level
};
