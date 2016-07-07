/**
 * Created by marknorman on 30/06/2016.
 */

import { Chefs } from '../imports/api/chefs.js';
import { Orders } from '../imports/api/orders.js';


export class Chef {

    constructor(chef) {
        this.chef_id = chef._id;
        this.tick = this.tick.bind(this);
        Meteor.setTimeout(this.tick , -Math.log(Math.random()) * 10000);
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

        this.chef = Chefs.findOne({"_id":this.chef_id});
        //console.log("Chef: "+this.chef._id);

        if (this.chef) {
            if (this.chef.busy == false) {
                // find the orders for this chef
                let pendingOrder = Orders.findOne({"order_status":2,"restaurant":_this.chef.restaurant});

                // allocate the order
                if (pendingOrder != null) {
                    Orders.update(pendingOrder._id, {$set:{ "order_status": 4, "chef":_this.chef._id}});
                    Chefs.update(_this.chef._id, { $set: { "busy":true, "current_order": pendingOrder._id}});
                }
            } else {
                let orderFinished = Orders.findOne({ "order_status": 4, "chef":_this.chef._id});

                if (orderFinished != undefined) {
                    //console.log("ordered prepared");

                    Orders.update(orderFinished._id, {$set:{ "order_status": 5}});
                    Chefs.update(_this.chef._id, { $set: { "busy":false, "current_order": null}});
                }
            }
        }

        Meteor.setTimeout(_this.tick.bind(_this), interval);

    }

}
