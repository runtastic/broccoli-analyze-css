# broccoli-analyze-css

CSS Analyzer for [Broccoli](https://github.com/joliss/broccoli) based on [analyze-css](https://github.com/macbre/analyze-css) and the analyze-css [grunt-task](https://github.com/DeuxHuitHuit/grunt-contrib-analyze-css).

## Installation

Install with [npm](broccoli). (Make sure you have installed [Node](http://nodejs.org/).)

```
npm i --save-dev broccoli-analyze-css
```

## Example

Make sure that the tree already holds css files as the plugin doesn't analyze .scss, .sass or .less formats.

```javascript
var analyzeCss = require('broccoli-analyze-css');
tree = analyzeCss(tree, options);
```

## License

Copyright (c) 2014 [Shinnosuke Watanabe](https://github.com/shinnn)

Licensed under [the MIT LIcense](./LICENSE).
