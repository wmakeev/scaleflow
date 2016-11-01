'use strict'

const isPlainObject = require('lodash.isplainobject')

module.exports = function createCore (options, enhancer) {
  if (typeof options === 'function') {
    enhancer = options
    options = {}
  }
  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    return enhancer(createCore)(options)
  }
  if (!options) {
    options = {}
  }

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

  return {
    options,
    dispatch,
    subscribe
  }
}
