/**
 * Created by marknorman on 23/06/2016.
 */


var Process = function (interval, fn) {
    if (typeof interval !== 'number') {
        throw new IntervalError(interval + ' should be a number.');
    }
    if (typeof fn !== 'function') {
        throw new TriggerFunctionError(fn + ' should be a function.');
    }
    if (interval < 0) {
        throw new IntervalError(interval + ' should be a non-negative number.');
    }
    this.interval = interval;
    this.fn = fn;
    this.timeout = null;
};


Process.prototype.start = function () {
    var dt = sample(this.interval);
    var that = this;
    this.timeout = setTimeout(function () {
        that.start();
        that.fn();
    }, dt);
};

Process.prototype.stop = function () {
    clearTimeout(this.timeout);
};



// ****************
// Helper functions
// ****************
var sample = function (mean) {
    // Generate exponentially distributed variate.
    //
    // Inter-arrival times of events in Poisson process
    // are exponentially distributed.
    // mean = 1 / rate
    // Math.log(x) = natural logarithm of x
    return -Math.log(Math.random()) * mean;
};

export var Process;

