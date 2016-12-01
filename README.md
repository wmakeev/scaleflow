# ScaleFlow

[![npm](https://img.shields.io/npm/v/scaleflow.svg?maxAge=2592000&style=flat-square)](https://www.npmjs.com/package/scaleflow)
[![Travis](https://img.shields.io/travis/wmakeev/scaleflow.svg?maxAge=2592000&style=flat-square)](https://travis-ci.org/wmakeev/scaleflow)
[![Coveralls](https://img.shields.io/coveralls/wmakeev/scaleflow.svg?maxAge=2592000&style=flat-square)](https://coveralls.io/github/wmakeev/scaleflow)
[![Gemnasium](https://img.shields.io/gemnasium/wmakeev/scaleflow.svg?maxAge=2592000&style=flat-square)](https://gemnasium.com/github.com/wmakeev/scaleflow)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)

> ScaleFlow is simple framework based on [Stamp Specification](https://github.com/stampit-org/stamp-specification) and Redux like [data flow](http://redux.js.org/docs/basics/DataFlow.html)

## Install

```
$ npm install scaleflow
```

## Usage

```js
const { Core } = require('scaleflow')

const loggerInitializer = (options, { instance }) => {
  return Object.assign(instance, {
    log: (...args) => instance.dispatch({
      type: 'LOG',
      payload: [`${options.name || 'LOG'}:`].concat(args)
    })
  })
}

const loggerMiddleware = core => next => action => {
  if (action.type === 'LOG') {
    console.log(...action.payload)
  }
  return next(action)
}

let MyCore = Core
  .init(loggerInitializer)
  .middleware(loggerMiddleware)

let myCore = MyCore({ name: 'MyCore' })

myCore.log('Hello world!') // MyCore: Hello world!
```

## API

TODO

## License

[MIT © Viatliy V. Makeev](../LICENSE)
