/**
 * Created by marknorman on 06/07/2016.
 */

import { KitchenManagers } from '../imports/api/kitchen_managers.js';
import { Restaurants } from '../imports/api/restaurants.js';
import { Customers } from '../imports/api/customers.js';
import { Chefs } from '../imports/api/chefs.js';
import { Drivers } from '../imports/api/drivers.js';
import { Locations } from '../imports/api/locations.js';
import { Simulation } from '../imports/api/simulation.js';
import { MenuChoices } from '../imports/api/menu_choices.js';

initialise_simulation = function() {

    Simulation.upsert({"_id":1}, {"name":"week_day_multiplier","value":[1,1,1,1,1,1,1]});
    Simulation.upsert({"_id":2}, {"name":"hour_multiplier","value":[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]});
    Simulation.upsert({"_id":3}, {"name":"month_day_multiplier","value":[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]});
    Simulation.upsert({"_id":4}, {"name":"generate_orders","value":true});
    Simulation.upsert({"_id":5}, {"name":"max_acceptable_order_time","value":20000});
    Simulation.upsert({"_id":6}, {"name":"order_cancel_threshold","value":5});
    Simulation.upsert({"_id":7}, {"name":"simulation_multiplier","value":10});

};

initialise_locations = function() {
    Locations.upsert({"_id":1},{"name":"Birmingham","population":2453700,'lat':52.489471,'long':-1.898575});
    Locations.upsert({"_id":2},{"name":"Manchester","population":1903100,'lat':53.483959,'long':-2.244644});
    Locations.upsert({"_id":3},{"name":"Glasgow","population":11057600,'lat':55.8642,'long':-4.2518});
    Locations.upsert({"_id":4},{"name":"Newcastle","population":837500,'lat':54.9783,'long':-1.6178});
    Locations.upsert({"_id":5},{"name":"Sheffield","population":818800,'lat':53.3811,'long':-1.4701});
    Locations.upsert({"_id":6},{"name":"Liverpool","population":793100,'lat':53.4084,'long':-2.9916});
    Locations.upsert({"_id":7},{"name":"Leeds","population":761500,'lat':53.8008,'long':-1.5491});
    Locations.upsert({"_id":8},{"name":"Bristol","population":428234,'lat':51.4545,'long':-2.5879});
    Locations.upsert({"_id":9},{"name":"london","population":8674000,'lat':51.5074,'long':-0.1278});
};


initialise_menus = function() {
    MenuChoices.upsert({"_id":1},{"name":"indian",'value':25});
    MenuChoices.upsert({"_id":2},{"name":"burgers+kebabs",'value':6});
    MenuChoices.upsert({"_id":3},{"name":"pizza",'value':13});
    MenuChoices.upsert({"_id":4},{"name":"fish+chips",'value':17});
    MenuChoices.upsert({"_id":5},{"name":"other",'value':6});
    MenuChoices.upsert({"_id":6},{"name":"chinese",'value':33});
};

initialise_restaurants = function() {

    for (var f = 0; f < 100; f++) {
        build_restaurant(f);
    }
};

let driver_id = 0;
let chef_id = 0;

build_restaurant = function(id) {
    let estimated_delivery_time = 30 + (Math.random()*60);
    let reputation = Math.min(3.5 + (Math.random()*3.0),5);
    let price_factor = (0.5+Math.random()*1.0);
    let menus = MenuChoices.find({}).fetch();
    let menu_choice_index = Math.floor(Math.random() * (menus.length));
    let menu_choice = menus[menu_choice_index].name;
    let cities = Locations.find({}).fetch();
    let city_choice_index = Math.floor(Math.random() * (cities.length));
    let city = cities[city_choice_index].name;
    let name = city+"-"+menu_choice+id;
    let num_drivers = 1+Math.floor(Math.random() * (4));
    let num_chefs = 1+Math.floor(Math.random() * (4));

    Restaurants.upsert({"_id":id},{"name":name,'menu':menu_choice,'city':city, "estimated_delivery_time":estimated_delivery_time,"reputation":reputation, "price_factor":price_factor,"status":"open"});
    KitchenManagers.upsert({"_id":id},{"name":"km1","restaurant":id});

    for (let i = 0; i < num_drivers; i++) {
        Drivers.upsert({"_id":driver_id},{"name":"driver"+driver_id,"restaurant":id, "busy":"false","min_batch":1});
        driver_id++;
    }
    for (let i = 0; i < num_chefs; i++) {
        Chefs.upsert({"_id": chef_id}, {"name": "chef"+chef_id, "restaurant": id, "busy":"false"});
        chef_id++;
    }
};

