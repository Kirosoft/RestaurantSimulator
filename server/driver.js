/**
 * Created by marknorman on 30/06/2016.
 */

import { Drivers } from '../imports/api/drivers.js';
import { Orders } from '../imports/api/orders.js';


export class Driver {

    constructor(driver) {
        this.driver_id = driver._id;
        this.tick = this.tick.bind(this);
        Meteor.setTimeout(this.tick , -Math.log(Math.random()) * 10000);
        this.minBatch = 1+Math.floor(Math.random()*5);
        this.client = new StatsD('192.168.99.100', 8125, 'JESim');
    }

    tick() {
        // decide whether to accept/reject and order and in what order
        // decide to go offline
        // decide when to dispatch delivery batch
        // decide whether to accept/reject and order and in what order
        // decide to go offline
        // decide when to dispatch delivery batch
        var interval = -Math.log(Math.random()) * 10000;
        var _this = this;

        this.driver = Drivers.findOne({"_id":this.driver_id});
        //console.log("driver: "+this.driver._id);

        if (this.driver) {

            if (this.driver.busy == false) {

                // find the orders for this driver
                let pendingDelivery = Orders.find({"order_status":5,"restaurant":_this.driver.restaurant},{"limit":_this.minBatch});

                if (pendingDelivery.count() >= this.minBatch) {
                    pendingDelivery.forEach(function(order) {
                        Orders.update(order._id, {$set:{ "order_status": 6, "driver":_this.driver._id,
                                    "min_batch": _this.minBatch}});
                    });
                    Drivers.update(_this.driver._id, { $set: { "busy":true, "current_order": pendingDelivery._id}});
                }
            } else {
                let deliveryFinished = Orders.find({ "order_status": 6, "driver":_this.driver._id});
                let remainingCount = deliveryFinished.count();

                if (remainingCount >= 1) {
                    //console.log("ordered delivered");

                    let firstOrder = deliveryFinished.fetch()[0];
                    let delivery_time = Date.now();
                    let order = Orders.findOne(firstOrder._id);
                    
                    let total_order_time = delivery_time - order.order_date;
                    Orders.update(firstOrder._id, {$set:{ "order_status": 7,
                        "delivery_date": delivery_time,"total_order_time":total_order_time}});
                    _this.client.count('OrderDelivered', 1);

                    if (remainingCount == 1) {
                        _this.minBatch = 1+Math.floor(Math.random()*4);
                        Drivers.update(_this.driver._id, { $set: { "busy":false, "current_order": null,
                            "min_batch": _this.minBatch}});
                    }
                }
            }
        }

        Meteor.setTimeout(_this.tick.bind(_this), interval);

    }

}
