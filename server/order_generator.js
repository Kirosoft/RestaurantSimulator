/**
 * Created by marknorman on 23/06/2016.
 */
import {Simulation}  from '../imports/api/simulation.js'


Date.prototype.isLeapYear = function () {
    var year = this.getFullYear();
    if ((year & 3) != 0) return false;
    return ((year % 100) != 0 || (year % 400) == 0);
};

// Get Day of Year
Date.prototype.getDOY = function () {

    var dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var mn = this.getMonth();
    var dn = this.getDate();
    var dayOfYear = dayCount[mn] + dn;
    if (mn > 1 && this.isLeapYear()) dayOfYear++;
    return dayOfYear;
};

export class OrderGenerator {

    constructor(order_allocator) {
        this.update_rate = this.update_rate.bind(this);
        this.tick = this.tick.bind(this);
        this.order_allocator = order_allocator;

        this.update_rate();
        this.tick();
    }

    update_rate() {

        var now = new Date();
        var simulation_multiplier = Simulation.findOne({"name":"simulation_multiplier"});
        var simulation_multiplier_value = simulation_multiplier.value;

        var week_day_multipliers = Simulation.findOne({"name": "week_day_multiplier"});
        var week_day_multiplier = week_day_multipliers.value[now.getDay()];

        var hour_multipliers = Simulation.findOne({"name":"hour_multiplier"});
        var hour_multiplier =  hour_multipliers.value[now.getHours()];

        var month_day_multipliers = Simulation.findOne({"name":"month_day_multiplier"});
        var month_day_multiplier = month_day_multipliers.value[now.getDate()];
        
        //doy_multiplier = Simulation.findOne({"year_day": Date.getDOY()}, "doy_multiplier") || 1;

        this.aggregateRate = simulation_multiplier_value * week_day_multiplier * hour_multiplier * month_day_multiplier;

        Meteor.setTimeout(this.update_rate, 5000);
    }

    tick() {
        var interval = -Math.log(Math.random()) * this.aggregateRate*1000;
        //console.log("order");

        var order_generator = Simulation.findOne({"name":"generate_orders"});
        if (order_generator && order_generator.value) {
            this.order_allocator.new_order();
        }

        Meteor.setTimeout(this.tick,interval);
    }
}