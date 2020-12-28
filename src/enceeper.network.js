//
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Our basic network library on top of jQuery.ajax
//
// Copyright (C) 2019 Vassilis Poursalidis (poursal@gmail.com)
//
// This program is free software: you can redistribute it and/or modify it under the terms of the
// GNU General Public License as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
// even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
//
// You should have received a copy of the GNU General Public License along with this program. If
// not, see <https://www.gnu.org/licenses/>.
//

// Check our requirements
if (typeof module === 'object') {
  // eslint-disable-next-line
  var jQuery = require('jquery')
}

if (typeof enceeper !== 'object') {
  throw new Error('You need to include the enceeper base file!')
}
if (typeof InvalidArgumentException === 'undefined') {
  throw new Error('You need to include the enceeper exceptions JS file!')
}
if (typeof jQuery !== 'function') {
  throw new Error('You need to include the jQuery JS file!')
}

// The basic network library
enceeper.network = function (baseUrl, successCallback, failureCallback) {
  // This is the constructor
  if (typeof baseUrl !== 'string') {
    throw new InvalidArgumentException('The base URL is required and must be a string in order to make HTTP calls.')
  }

  // Auth variables
  this._authHeader = 'X-Enceeper-Auth'
  this._authToken = null

  this._baseUrl = baseUrl
  this._successCallback = successCallback
  this._failureCallback = failureCallback
}

enceeper.network.prototype = {
  call: function (type, url, json, successCallback, failureCallback) {
    const self = this
    const requestTypes = ['GET', 'POST', 'PUT', 'DELETE']
    let typeUpper = null
    let jsonBody = null

    successCallback = successCallback || this._successCallback
    failureCallback = failureCallback || this._failureCallback

    if (typeof type !== 'string') {
      throw new InvalidArgumentException('The type is required and must be a string to make HTTP calls.')
    } else {
      typeUpper = type.toUpperCase()
      if (!requestTypes.includes(typeUpper)) {
        throw new InvalidArgumentException('The type must be one of the following: GET, POST, PUT or DELETE.')
      }

      if (typeUpper === 'POST' || typeUpper === 'PUT') {
        jsonBody = JSON.stringify(json)
      }
    }
    if (typeof url !== 'string') {
      throw new InvalidArgumentException('The URL is required and must be a string in order to make HTTP calls.')
    }
    if ((typeUpper === 'POST' || typeUpper === 'PUT') && typeof json !== 'object') {
      throw new InvalidArgumentException('The JSON is required and must be an object in order to make HTTP calls.')
    }
    if (typeof successCallback !== 'function') {
      throw new InvalidArgumentException('The success callback is required and must be a function to make HTTP calls.')
    }
    if (typeof failureCallback !== 'function') {
      throw new InvalidArgumentException('The failure callback is required and must be a function to make HTTP calls.')
    }

    jQuery.ajax({
      type: type,
      contentType: 'application/json;charset=utf-8',
      beforeSend: function (request) {
        if (self._authToken !== null) {
          request.setRequestHeader(self._authHeader, self._authToken)
        }
      },
      url: this._baseUrl + url,
      data: jsonBody,
      success: function (data, textStatus, jqXHR) {
        successCallback(data)
      },
      error: function (jqXHR, textStatus, errorThrown) {
        let errorMessage

        if (typeof jqXHR.responseJSON !== 'undefined' &&
                        typeof jqXHR.responseJSON.errorMessage !== 'undefined') {
          errorMessage = jqXHR.responseJSON.errorMessage
        } else {
          errorMessage = 'General network error'
        }

        failureCallback(jqXHR.status, errorMessage)
      }
    })
  },

  // Set the auth token
  setAuthToken: function (authToken) {
    if (typeof authToken !== 'string') {
      throw new InvalidArgumentException('The authentication token must be a string.')
    }

    this._authToken = authToken
  },

  // Reset the auth token
  resetAuthToken: function () {
    this._authToken = null
  }
}
