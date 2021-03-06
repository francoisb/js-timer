"use strict";
define([], function () {
    var
        _autoIncrement = 0,
        _records       = [],
        _timers        = {},
        _callbacks     = {},
        _times         = {},
        _paused        = 'paused',
        _stopped       = 'stopped',
        _started       = 'started';

    function timeout(record) {
        if (record._deleted === null || typeof record._deleted === 'undefined') {
            record.stop();
            for (var i=0; i<_callbacks[record._uid].length; i++) {
                _callbacks[record._uid][i].call(this, record);
            }

            if (record.repeat === true) {
                record.start();
            }
        }
    }

    /**
     * Timer model constructor.
     * If no identifier sets, the autoincrement value will be used.
     *
     * @param   {Object}        data            Optional - The data to hydrate timer with
     */
    function Timer(data) {
        _autoIncrement++;
        if (data) {
            this.fromJson(data);
        }

        this._uid = _autoIncrement;
        if (this.id === undefined) {
            this.id = this._uid;
        }
        this.stop();
        this.unbindAll();
        _records.push(this);
    };
    // Apply constructor.
    Timer.prototype.constructor = Timer;

    /**
     * Return all Timers.
     *
     * @public
     * @static
     * @returns {Array}
     */
    Timer.all = function() {
        return _records;
    };

    /**
     * Return a bunch of timers which match a selector.
     *
     * @public
     * @static
     * @param   {Function}      selector        The selector to apply
     * @returns {Array}
     */
    Timer.select = function(selector) {
        return _records.filter(selector);
    };

    /**
     * Whether a timer exists?
     *
     * @public
     * @static
     * @param   {Integer}       id              The identifier to find
     * @returns {Timer|Null}
     */
    Timer.exists = function(id) {
        var results = this.select(function(record) {
            return record.id === id || record._uid === id;
        });

        if (results.length > 0) {
            return results[0] ;
        } else {
            return null;
        }
    };

    /**
     * Destroy all Timers.
     *
     * @public
     * @static
     * @returns {Self}
     */
    Timer.destroyAll = function() {
        while (_records.length > 0) {
            _records[_records.length - 1].stop();
            _records[_records.length - 1].unbindAll();
            _records[_records.length - 1]._deleted = true;
            _records.pop();
        }
        _records = [];

        return this;
    };

    /**
     * Instance properties.
     */
    Object.defineProperties(Timer.prototype, {
        id: {
            /**
             * Get the identifier.
             *
             * @returns {Integer}
             */
            get: function () {
                return this._id;
            },
            /**
             * Set the identifier.
             *
             * @throws  {Error}         If a Timer already exists with the same identifier value
             * @param   {Integer}       value           The value to set
             * @returns {Self}
             */
            set: function (value) {
                if (value !== this._id) {
                    if (Timer.exists(value)) {
                        throw new Error("There is already a timer with id '" + value + "'");
                    }
                    this._id = value;
                }
                return this;
            }
        },
        delay: {
            /**
             * Get the delay.
             *
             * @returns {Integer|null}
             */
            get: function () {
                if (this._delay === undefined || this._delay === null) {
                    return null;
                }
                return this._delay;
            },
            /**
             * Set the delay.
             *
             * @param   {Integer}       value           The value to set
             * @returns {Self}
             */
            set: function (value) {
                this._delay = parseInt(value);
                if (isNaN(this._delay) || this._delay < 1) {
                    this._delay = null;
                }
                return this;
            }
        },
        status: {
            /**
             * Get the status.
             *
             * @returns {String}
             */
            get: function () {
                if (_timers[this._uid] === null) {
                    if (_times[this._uid].lastRun === null) {
                        return _stopped;
                    } else {
                        return _paused;
                    }
                } else {
                    return _started;
                }
            }
        },
        repeat: {
            /**
             * Whether timer have to repeat or not.
             *
             * @returns {Boolean}
             */
            get: function () {
                if (this._repeat === true) {
                    return true;
                }
                return false;
            },
            /**
             * Set the repeat flag.
             *
             * @param   {Boolean}       value           The value to set
             * @returns {Self}
             */
            set: function (value) {
                try {
                    this._repeat = Boolean(value);
                } catch (e) {
                    this._repeat = false;
                }
                return this;
            }
        }
    });

    /**
     * Destroy the instance.
     *
     * @public
     * @returns {Self}
     */
    Timer.prototype.destroy = function() {
        var length = _records.length;        
        for (var i=0; i++; i<length) {
            if (this.id === _records[i].id) {
                this.stop();
                this.unbindAll();
                this._deleted = true;
                _records.slice(i, 1);
                break;
            }
        }

        this._deleted = true;

        return this;
    };

    /**
     * Start timer.
     *
     * @returns {Self}
     */
    Timer.prototype.start = function() {
        if (this.status === _stopped) {
            var self = this;
            if (this.delay > 0) {
                _times[this._uid].lastRun = new Date();
                _timers[this._uid]        = setTimeout(function() {
                    timeout(self);
                }, this.delay);
            } else {
                timeout(self);
            }
        } else if (this.status === _paused) {
            this.resume();
        }

        return this;
    };

    /**
     * Restart timer.
     *
     * @returns {Self}
     */
    Timer.prototype.restart = function() {
        this.stop();
        this.start();

        return this;
    };

    /**
     * Stop timer.
     *
     * @returns {Self}
     */
    Timer.prototype.stop = function() {
        if (this.status === _started || this.status === _paused) {
            clearTimeout(_timers[this._uid]);
            _timers[this._uid] = null;
            _times[this._uid]  = { lastRun: null, delay: null };
        }
        return this;
    };

    /**
     * Pause timer.
     *
     * @returns {Self}
     */
    Timer.prototype.pause = function() {
        if (this.status === _started) {
            var curTime = new Date();

            clearTimeout(_timers[this._uid]);
            _timers[this._uid]      = null;
            _times[this._uid].delay = this.delay - (curTime.valueOf() - _times[this._uid].lastRun);
        }
        return this;
    };

    /**
     * Resume timer.
     *
     * @returns {Self}
     */
    Timer.prototype.resume = function() {
        if (this.status === _paused) {
            var
                self    = this,
                curTime = new Date();

            if (_times[this._uid].delay > 0) {
                _times[this._uid].lastRun = curTime.valueOf() + _times[this._uid].delay - this.delay;
                _timers[this._uid]        = setTimeout(function() {
                    timeout(self);
                }, _times[this._uid].delay);
            } else {
                timeout(self);
            }
        }
        return this;
    };

    /**
     * Bind a callback.
     *
     * @param   {Function}      callback            The callback to bind
     * @returns {Self}
     */
    Timer.prototype.bind = function(callback) {
        if ('function' !== typeof callback) {
            throw new Error('Not a valid callback');
        }

        _callbacks[this._uid].push(callback);
        return this;
    };

    /**
     * Unbind a callback.
     *
     * @param   {Function}      callback            The callback to unbind
     * @returns {Self}
     */
    Timer.prototype.unbind = function(callback) {
        for (var i in _callbacks[this._uid]) {
            if (callback === _callbacks[this._uid][i]) {
                _callbacks[this._uid].splice(i, 1);
            }
        }

       return this;
    };

    /**
     * Unbind all callbacks.
     *
     * @returns {Self}
     */
    Timer.prototype.unbindAll = function() {
        _callbacks[this._uid] = [];
        return this;
    };

    /**
     * Whether timer is binded or not.
     *
     * @returns {Boolean}
     */
    Timer.prototype.isBinded = function() {
        return _callbacks[this._uid].length > 0;
    };

    /**
     * Return a json representation of the object.
     *
     * @public
     * @returns {Object}
     */
    Timer.prototype.toJson = function() {
        return {
            id:     this.id,
            status: this.status
        };
    };

    /**
     * Update properties from a json object.
     *
     * @public
     * @param   {Object}        values          The values to update
     * @returns {Self}
     */
    Timer.prototype.fromJson = function(values) {
        if (!values) {
            return this;
        }
        for (var key in values) {
            this[key] = values[key];
        }

        return this;
    };

    return Timer;
});
