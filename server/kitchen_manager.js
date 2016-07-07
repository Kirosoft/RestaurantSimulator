/**
 * Created by marknorman on 30/06/2016.
 */

import { KitchenManagers } from '../imports/api/kitchen_managers.js';
import { Orders } from '../imports/api/orders.js';
import { Simulation } from '../imports/api/simulation.js';

export class KitchenManager {

    constructor(kitchenManager) {

        this.kitchenManager = kitchenManager;
        var _self = this;

        KitchenManagers.find({"_id":kitchenManager._id}).observe({
            "changed":function(doc){
                _self.kitchenManager = doc;
            }
        });
        this.client = new StatsD('192.168.99.100', 8125, 'JESim');

        this.tick();
    }

    tick() {
        // decide whether to accept/reject and order and in what order
        // decide to go offline
        // decide when to dispatch delivery batch
        var interval = -Math.log(Math.random()) * 10000;
        var _self = this;

        let max_order_threshold = Simulation.findOne({"name":"order_cancel_threshold"}).value;

        //console.log("Kitchen manager");

        let pendingOrderList = Orders.find({"order_status":1,"restaurant":this.kitchenManager.restaurant});

        let currentOrderQueue = Orders.find({"order_status":2,"restaurant":this.kitchenManager.restaurant});
        let currentOrderQueueCount = currentOrderQueue.count();

        if (currentOrderQueueCount < max_order_threshold) {
            pendingOrderList.forEach(function(doc) {
                Orders.update(doc._id, {$set:{ order_status: 2}});
            });
        } else {
            pendingOrderList.forEach(function(doc) {
                Orders.update(doc._id, {$set:{ order_status: 3}});
                _self.client.count('OrderCancelled', 1);
            });
        }


        Meteor.setTimeout(this.tick.bind(this), interval);

    }

}
