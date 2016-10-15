'use strict'

const isPromise = require('is-promise')
const isPlainObject = require('lodash.isplainobject')

let ActionTypes = require('./actionTypes')

module.exports = function createCore (options, enhancer) {
  if (typeof options === 'function') {
    enhancer = options
    options = {}
  }
  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    let initCore = core => {
      let action = core.dispatch({
        type: ActionTypes.INIT,
        payload: { options }
      })
      return isPromise(action)
        ? action.then(() => core)
        : core
    }

    let enhancedCore = enhancer(createCore)(options)
    return isPromise(enhancedCore)
      ? enhancedCore.then(initCore)
      : initCore(enhancedCore)
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
    dispatch,
    subscribe
  }
}
