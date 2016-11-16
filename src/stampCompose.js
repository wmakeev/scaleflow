'use strict'

const isPromise = require('is-promise')
const MakeCompose = require('make-compose')

const applyMiddleware = require('./applyMiddleware')

module.exports = MakeCompose({
  createFactory (descriptor) {
    const that = this
    return function Stamp (options, ...args) {
      let core = that.createObject(descriptor.methods || {})
      let initializers = (descriptor.initializers || [])
      let middlewares = (descriptor.deepConfiguration || {}).middlewares
      let initializersResult = core

      that.merge(core, descriptor.deepProperties)
      that.assign(core, descriptor.properties)
      Object.defineProperties(core, descriptor.propertyDescriptors || {})

      if (middlewares && middlewares.length !== 0) {
        initializers = initializers.concat([applyMiddleware(...middlewares)])
      }

      if (initializers && initializers.length !== 0) {
        let initializerArgs = [options].concat(args)
        // Core must have same api for all initializers and middlewares
        // allow initializers only mutate existing core object without creating new one
        initializersResult = initializers.reduce((res, initializer) => {
          let applyInitializer = () => initializer.call(core, options,
              { instance: core, stamp: Stamp, args: initializerArgs })
          return isPromise(res)
            ? res.then(applyInitializer)
            : applyInitializer()
        }, null)
      }

      // Wait for async core mutations if Promise
      return isPromise(initializersResult)
        ? initializersResult.then(() => core)
        : core
    }
  }
})
