//
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Invalid argument and state exceptions
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

function InvalidArgumentException (message) {
  this.message = message
  // Use V8's native method if available, otherwise fallback
  if ('captureStackTrace' in Error) { Error.captureStackTrace(this, InvalidArgumentException) } else { this.stack = (new Error()).stack }
}

InvalidArgumentException.prototype = Object.create(Error.prototype)
InvalidArgumentException.prototype.name = 'InvalidArgumentException'
InvalidArgumentException.prototype.constructor = InvalidArgumentException

function InvalidStateException (message) {
  this.message = message
  // Use V8's native method if available, otherwise fallback
  if ('captureStackTrace' in Error) { Error.captureStackTrace(this, InvalidStateException) } else { this.stack = (new Error()).stack }
}

InvalidStateException.prototype = Object.create(Error.prototype)
InvalidStateException.prototype.name = 'InvalidStateException'
InvalidStateException.prototype.constructor = InvalidStateException
