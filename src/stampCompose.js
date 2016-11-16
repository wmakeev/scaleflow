'use strict'

const isPromise = require('is-promise')
const isObject = require('lodash.isobject')
const isFunction = require('lodash.isfunction')
const MakeCompose = require('make-compose')

const composeAsync = require('./composeAsync')

module.exports = MakeCompose({
  createFactory (descriptor) {
    const that = this
    return function Stamp (options, ...args) {
      let core = that.createObject(descriptor.methods || {})
      let initializersResult

      that.merge(core, descriptor.deepProperties)
      that.assign(core, descriptor.properties)
      Object.defineProperties(core, descriptor.propertyDescriptors || {})

      if (descriptor.initializers && descriptor.initializers.length !== 0) {
        let initializerArgs = [options].concat(args)
        // Core must have same api for all initializers and middlewares
        // allow initializers only mutate existing core object without creating new one
        initializersResult = descriptor.initializers.reduce((res, initializer) => {
          let applyInitializer = () => initializer.call(core, options,
              { instance: core, stamp: Stamp, args: initializerArgs })
          return isPromise(res)
            ? res.then(applyInitializer)
            : applyInitializer()
        }, null)
      }

      let applyMiddleware = () => {
        if (descriptor.middlewares && descriptor.middlewares.length !== 0) {
          let chain = descriptor.middlewares.map(middleware => middleware(core))
          let dispatch = composeAsync(...chain)(core.dispatch)
          Object.assign(core, { dispatch })
        }
        return core
      }

      return isPromise(initializersResult)
        ? initializersResult.then(applyMiddleware)
        : applyMiddleware()
    }
  },

  mergeComposable (dstDescriptor, srcComposable) {
    const srcDescriptor = (srcComposable && srcComposable.compose) || srcComposable
    if (!this.isDescriptor(srcDescriptor)) { return dstDescriptor }

    const combineObjectProperty = (propName, action) => {
      if (!isObject(srcDescriptor[propName])) { return }
      if (!isObject(dstDescriptor[propName])) dstDescriptor[propName] = {}
      action(dstDescriptor[propName], srcDescriptor[propName])
    }

    const combineArrayProperty = (propName, action) => {
      if (!Array.isArray(srcDescriptor[propName])) { return }
      if (!Array.isArray(dstDescriptor[propName])) dstDescriptor[propName] = []
      action(dstDescriptor[propName], srcDescriptor[propName])
    }

    const applyAction = (dst, src) => {
      dst.push.apply(dst, src.filter(isFunction))
    }

    combineObjectProperty('methods', this.assign)
    combineObjectProperty('properties', this.assign)
    combineObjectProperty('deepProperties', this.merge)
    combineObjectProperty('propertyDescriptors', this.assign)
    combineObjectProperty('staticProperties', this.assign)
    combineObjectProperty('staticDeepProperties', this.merge)
    combineObjectProperty('staticPropertyDescriptors', this.assign)
    combineObjectProperty('configuration', this.assign)
    combineObjectProperty('deepConfiguration', this.merge)
    combineArrayProperty('initializers', applyAction)
    combineArrayProperty('middlewares', applyAction)

    return dstDescriptor
  }
})
