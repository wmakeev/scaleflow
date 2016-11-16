'use strict'

const stampit = require('stampit')
const isPlainObject = require('lodash.isplainobject')

const stampCompose = require('./stampCompose')

function coreInit (options, { instance }) {
  let currentListeners = []
  let nextListeners = currentListeners

  function ensureCanMutateNextListeners () {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  function subscribe (listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.')
    }

    let isSubscribed = true

    ensureCanMutateNextListeners()
    nextListeners.push(listener)

    return function unsubscribe () {
      if (!isSubscribed) {
        return
      }

      isSubscribed = false

      ensureCanMutateNextListeners()
      let index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  function dispatch (action) {
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
        'Use custom middleware for async actions.'
      )
    }

    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
        'Have you misspelled a constant?'
      )
    }

    let listeners = currentListeners = nextListeners
    for (let i = 0; i < listeners.length; i++) {
      let listener = listeners[i]
      listener(action)
    }

    return action
  }

  return Object.assign(instance, { options: options || {}, dispatch, subscribe })
}

function middleware (...args) {
  return this.deepConfiguration({
    middlewares: args
  })
}

module.exports = stampit({
  staticProperties: {
    compose: stampCompose, // infecting
    middleware
  },
  initializers: [
    coreInit
  ]
})
