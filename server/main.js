import { Meteor } from 'meteor/meteor';
import '../imports/api/orders.js'
import '../imports/api/customers.js'
import '../imports/api/restaurants.js'
import '../imports/api/simulation.js'
import '../imports/api/locations.js'
import { KitchenManagers } from '../imports/api/kitchen_managers.js';
import { Orders } from '../imports/api/orders.js';
import { Restaurants } from '../imports/api/restaurants.js';
import { Customers } from '../imports/api/customers.js';
import { Chefs } from '../imports/api/chefs.js';
import { Drivers } from '../imports/api/drivers.js';
import { Locations } from '../imports/api/locations.js';
import { Simulation } from '../imports/api/simulation.js';
import './initialise_db';

import { OrderGenerator } from './order_generator.js';
import { OrderAllocator } from './order_allocator.js';
import { KitchenManager } from './kitchen_manager.js';
import { Chef } from './chef.js';
import { Driver } from './driver.js';

var kitchen_manager_bots = {};
var chef_bots = {};
var driver_bots = {};
var client = new StatsD('192.168.99.100', 8125, 'JESim');

Meteor.startup(() => {

    // initialise_simulation();
    // initialise_locations();
    // initialise_menus();
    // initialise_restaurants();
    
    Meteor.publish('orders', function ordersPublication() {
        return Orders.find();
    });
    Meteor.publish('restaurants', function restaurantsPublication() {
        return Restaurants.find();
    });
    Meteor.publish('customers', function customersPublication() {
        return Customers.find();
    });
    Meteor.publish('kitchen_managers', function KitchenManagersPublication() {
        return KitchenManagers.find();
    });
    Meteor.publish('chefs', function chefsPublication() {
        return Chefs.find();
    });

    Meteor.publish('drivers', function driversPublication() {
        return Drivers.find();
    });

    Meteor.publish('locations', function locationsPublication() {
        return Locations.find();
    });
    Meteor.publish('simulation', function simulationPublication() {
        return Simulation.find();
    });

    Orders.remove({});
    Customers.remove({});

    // Start the order generator
    var orderAllocator = new OrderAllocator();
    var orderGenerator = new OrderGenerator(orderAllocator);
    orderGenerator.update_rate();

    let kitchen_managers = KitchenManagers.find({});
    KitchenManagers.update({},{$set:{"busy":false,"active":false}});

    kitchen_managers.observe({
       "added":function(doc) {
           kitchen_manager_bots[doc._id] = new KitchenManager(doc);
           KitchenManagers.update(doc._id,{$set:{"busy":false,"active":true}});
        },
        "removed":function(doc) {
            delete kitchen_manager_bots[doc._id];
        }
    });

    let chef_list = Chefs.find({});
    Chefs.update({},{$set:{"active":false,"busy":false}});

    chef_list.observe({
        "added": function(doc) {
            chef_bots[doc._id] = new Chef(doc);
            Chefs.update(doc._id,{$set:{"busy":false,"active":true}});
        },
        "removed":function(doc) {
            delete chef_bots[doc._id];
        }
    });

    let driver_list = Drivers.find({});
    Drivers.update({},{$set:{"active":false,"busy":false}});

    driver_list.observe({
        "added": function(doc) {
            driver_bots[doc._id] = new Driver(doc);
            Drivers.update(doc._id,{$set:{"busy":false,"active":true}});
        },
        "removed": function(doc) {
            delete driver_bots[doc._id];
        }
    });

    Meteor.setInterval(function() {
        var d = new Date();

        console.log(Customers.remove({ "last_order_date": { "$lte": d -6000} }));

    }, 10000);

    let cancelled_orders = Orders.find({"order_status":3}).observe({
        "added":function(doc) {
           client.count('CancelledOrders', 1);
        }
    });

    let max_time = Simulation.findOne({"name":"max_acceptable_order_time"}).value;
    let overdue_orders = Orders.find({"order_status":7,"total_order_time":{$gte:max_time}});

    overdue_orders.observe({
        "added":function(doc) {
            client.count('OverdueOrders', 1);
        }
    });


    // var one_hour_ago = moment().subtract(1,"m").toDate();
    // let recent_customers = Customers.find({"last_order_date":{ "$lte": new Date(Date.now()-60000)}});
    //
    // recent_customers.observe({
    //     "added":function(doc) {
    //         let res = Customers.remove({"_id":doc._id});
    //         console.log("res: "+res);
    //     }
    // });
});
