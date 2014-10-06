'use strict';

var analyzer   = require('analyze-css');

var chalk      = require('chalk');
var Filter     = require('broccoli-filter');
var findup     = require('findup-sync');
var fs         = require('fs');
var helpers    = require('broccoli-kitchen-sink-helpers');
var mapSeries  = require('promise-map-series')
var mkdirp     = require('mkdirp');
var path       = require('path');
var walkSync   = require('walk-sync');
var _          = require('lodash');
var mapSeries  = require('promise-map-series');

AnalyzeCss.prototype = Object.create(Filter.prototype);
AnalyzeCss.prototype.constructor = AnalyzeCss;
function AnalyzeCss (inputTree, options) {
  if (!(this instanceof AnalyzeCss)) return new AnalyzeCss(inputTree, options);
  options = options || {};

  this.inputTree = inputTree;
  this.log       = true;
  this.hasErrors = false;
};

AnalyzeCss.prototype.extensions = ['css'];
// AnalyzeCss.prototype.targetExtension = 'analyze-css.js';

AnalyzeCss.prototype.write = function (readTree, destDir) {

  var self          = this
  self._errors      = [];
  self._errorLength = 0;

  return readTree(this.inputTree).then(function (srcDir) {
    var paths = walkSync(srcDir)
    if (!self.config) {
      var analyzeCssPath  = self.analyzeCssJSONPath || path.join(srcDir, self.analyzeCssJSONRoot || '');
      self.config = self.getConfig(analyzeCssPath);
    }


    return mapSeries(paths, function (relativePath) {
      if (relativePath.slice(-1) === '/') {
        mkdirp.sync(destDir + '/' + relativePath)
      } else {
        if (self.canProcessFile(relativePath)) {
          return self.processAndCacheFile(srcDir, destDir, relativePath)
        } else {
          helpers.copyPreserveSync(
            srcDir + '/' + relativePath, destDir + '/' + relativePath)
        }
      }
    })
  })
  .finally(function() {
    self.end();
  })
};

AnalyzeCss.prototype.getConfig = function(rootPath) {
  if (!rootPath) { rootPath = process.cwd(); }
  var analyzeCssJSONPath = findup('analyze-css.json', {cwd: rootPath, nocase: true});
  if (analyzeCssJSONPath) {
    var config = fs.readFileSync(analyzeCssJSONPath, {encoding: 'utf8'});
    try {
      return JSON.parse(this.stripComments(config));
    } catch (e) {
      console.error(chalk.red('Error occured parsing cofeelint.json.'));
      console.error(e.stack);
      return null;
    }
  }
};

AnalyzeCss.prototype.stripComments = function(string) {
  string = string || "";

  string = string.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\//g, "");
  string = string.replace(/\/\/[^\n\r]*/g, ""); // Everything after '//'

  return string;
};

AnalyzeCss.prototype.analyzeResults = function(file, results) {
  var stats = {};
  var metrics = results.metrics;
  var count = 0;
  var self = this;

  console.log('\n');

  _.forOwn(self.config.thresholds, function (limit, name) {
    if (limit !== null && limit !== undefined) {
      var value = metrics[name];
      if (value === undefined) {
        console.log(chalk.yellow('\nMetric ' + name + ' was not found'));
      } else {
        count++;
        stats[name] = {
          result: value,
          ratio: Math.min(1, limit === value || value === 0 ? 1 : limit / value)
        };
      }
    }
  });
  
  var avg = _.reduce(stats, function (sum, stat, key) {
      return sum + stat.ratio;
  }, 0) / count;
  
  self.hasErrors = self.hasErrors || avg < self.config.error;
  
  var chalks = self.getChalks(avg);
  
  console.log('\n'+chalks.font(self.pad(file)) + chalks.bg(self.pad(avg.toFixed(2), 8, true)));
  
  if (self.config.outputMetrics) {
    _.forOwn(stats, function (stat, name) {
      if (self.config.outputMetrics === 'warn' || self.config.outputMetrics === 'error') {
         if (self.config[self.config.outputMetrics] <= stat.ratio) {
           return;
         }
      }

      var chalks = self.getChalks(stat.ratio);
      
      console.log(
        chalks.font(self.pad('  ' + name)) + 
        chalks.bg(self.pad(stat.ratio.toFixed(2), 8, true)) +
        '  ' + stat.result + ' / ' + self.config.thresholds[name]
      );
    });
  }
};

AnalyzeCss.prototype.processString = function (content, relativePath) {
  var self = this;

  if (content != '') {
    new analyzer(content, self.config.analyzecss, function (err, results) {
      if (err) {
        console.error(err.message);
        return;
      }

      self.analyzeResults(relativePath, results);
    });
  }
};

AnalyzeCss.prototype.pad = function(s, limit, right) {
  if (s === undefined) {
    s = '';
  }
  limit = limit || this.config.padLimit;
  for (var x = s.length || 0; x < limit; x++) {
    s = !right ? (s + '.') : (' ' + s);
  }
  return s;
};

AnalyzeCss.prototype.end = function() {
  if (this.hasErrors) {
    console.error(chalk.red('\n\nAnalyzed CSS. You have errorz!!! ¯\\_(ツ)_/¯\n\n'));
  } else {
    console.log(chalk.green('\n\nAnalyzed CSS. No errorz, today is good day!\n\n')); 
  }
};

AnalyzeCss.prototype.getChalks = function(value) {
  var color = 'green';
  if (value < this.config.error) {
    color = 'red';
  } else if (value < this.config.warn) {
    color = 'yellow';
  }  
  return {
    font: chalk[color],
    bg: chalk['bg' + (color.charAt(0).toUpperCase() + color.slice(1))]
  };
};

module.exports = AnalyzeCss;

