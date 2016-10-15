/*
 * scaleflow
 * wmakeev/scaleflow
 *
 * Copyright (c) 2015, Vitaliy V. Makeev
 * Licensed under MIT.
 */

let applyMiddleware = require('./applyMiddleware')
let applyPlugin = require('./applyPlugin')
let createCore = require('./createCore')
let ActionTypes = require('./actionTypes')
let composeAsync = require('./composeAsync')

module.exports = {
  ActionTypes, applyMiddleware, applyPlugin, createCore, composeAsync
}
