const ipc = require('electron').ipcRenderer;


// While ipc.sendSync() would be better for logging, using it kills AngularJS's $apply()
const log = (type, data, level) => ipc.send(`log-${type}`, data, level);

// Logging helpers
const log_entry            = (msg, level) => log('entry',            msg, level);
const log_info             = (msg, level) => log('info',             msg, level);
const log_event            = (msg, level) => log('event',            msg, level);
const log_game             = (msg, level) => log('game',             msg, level);
const log_warning          = (msg, level) => log('warning',          msg, level);
const log_error            = (msg, level) => log('error',            msg, level);
const log_fatal            = (msg, level) => log('fatal',            msg, level);
const log_debug            = (msg, level) => log('debug',            msg, level);
const log_verbose          = (msg, level) => log('verbose',          msg, level);
const log_important        = (msg, level) => log('important',        msg, level);
const log_update           = (msg, level) => log('update',           msg, level);
const log_end              = (msg, level) => log('end',              msg, level);
const log_raw              = (msg, level) => log('raw',              msg, level);
// Indenting functions
const log_indent           = (num, level) => log('indent',           num, level);
const log_outdent          = (num, level) => log('outdent',          num, level);
// Logging helpers (single-indent)
log_indent.entry     = (msg, level) => log('indent-entry',     msg, level); // Indenting and outdenting here triples
log_indent.info      = (msg, level) => log('indent-info',      msg, level); // the number of ipc calls, so the added
log_indent.event     = (msg, level) => log('indent-event',     msg, level); // ipc catches in browser/main are worth
log_indent.game      = (msg, level) => log('indent-game',      msg, level); // the extra lines of code.
log_indent.warning   = (msg, level) => log('indent-warning',   msg, level);
log_indent.error     = (msg, level) => log('indent-error',     msg, level);
log_indent.fatal     = (msg, level) => log('indent-fatal',     msg, level);
log_indent.debug     = (msg, level) => log('indent-debug',     msg, level);
log_indent.verbose   = (msg, level) => log('indent-verbose',   msg, level);
log_indent.important = (msg, level) => log('indent-important', msg, level);
log_indent.update    = (msg, level) => log('indent-update',    msg, level);
log_indent.end       = (msg, level) => log('indent-end',       msg, level);
log_indent.raw       = (msg, level) => log('indent-raw',       msg, level);
// Array of log levels
const log_levels = ipc.sendSync('log-levels');



module.exports = {
  entry:      log_entry,
  info:       log_info,
  event:      log_event,
  game:       log_game,
  warning:    log_warning,
  error:      log_error,
  fatal:      log_fatal,
  debug:      log_debug,
  verbose:    log_verbose,
  important:  log_important,
  update:     log_update,
  end:        log_end,
  raw:        log_raw,

  levels:     log_levels,

  indent:     log_indent,
  outdent:    log_outdent
};