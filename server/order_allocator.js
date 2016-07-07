/**
 * Created by marknorman on 27/06/2016.
 */

import { Locations } from '../imports/api/locations.js'
import { MenuChoices } from '../imports/api/menu_choices.js';
import { Restaurants } from '../imports/api/restaurants.js';
import { Orders } from '../imports/api/orders.js';
import { Customers } from '../imports/api/customers.js';

import { Gaussian } from '../imports/utils/gaussian.js';

toRad = function(angle) {
    return angle * Math.PI / 180;
};

export class OrderAllocator {

    constructor() {
        // Start the order allocation engine
        this.gaussian = new Gaussian(0, 1);
        this.price_factor_profile = new Gaussian(1,0.05);
        this.leadtime_profile = new Gaussian(1,0.05);
        this.reputation_profile = new Gaussian(3,1);
        this.mean_delivery_time=70;

        this.client = new StatsD('192.168.99.100', 8125, 'JESim');
    }

    new_order() {

        //this.client.count('NewOrder', 1);

        // total population
        let totalPopulation = 0;
        let populationTable = Locations.find().map(function(city) {
            city.run_min = totalPopulation;
            totalPopulation += city.population;
            city.run_max = totalPopulation;
            return city;
        });

        // pick a citizen at random
        let citizen = Math.floor(Math.random() * (totalPopulation));

        // find the citizen location
        let city = populationTable.filter(function(city) {
            if (citizen > city.run_min && citizen < city.run_max) {
                return 1;
            }
            else return 0;
        })[0];

        //console.log("new order from: "+city.name);

        // 0 is the center, distribute demand from the center out
        let distance_from_center = this.gaussian.normal_random();
        let angle = Math.floor(Math.random() * 360);

        // find a customer or create a new one

        //TODO
        //Customers.findAll({"distance_from_center", min:, max});
        let radAngle = toRad(angle);
        let x = distance_from_center * Math.cos(radAngle);
        let y = distance_from_center * Math.sin(radAngle);

        //console.log("Customer at pos x: "+x*10+", y: "+y*10);

        // menu choice
        let totalChoices = 0;
        let menuChoicesTable = MenuChoices.find().map(function(choice) {
            choice.min = totalChoices;
            totalChoices += choice.value;
            choice.max = totalChoices;
            return choice;
        });

        let randomChoice = Math.floor(Math.random() * (totalChoices));

        let menuChoice = menuChoicesTable.filter(function(choice) {
            if (randomChoice >= choice.min && randomChoice < choice.max) {
                return 1;
            }
            else return 0;
        })[0];

        //console.log("Menu choice: "+menuChoice.name);

        // decide price sensitivty
        let price_factor = this.price_factor_profile.normal_random();
        //console.log("price_factor: "+price_factor);

        // max lead time
        let max_leadtime = this.leadtime_profile.normal_random()*this.mean_delivery_time;
        //console.log("leadtime_factor: "+max_leadtime);

        // minimum restaurant reputation
        let min_reputation = this.reputation_profile.normal_random();
        //console.log("min reputation: "+min_reputation);

        // TODO: pick a restaurant
        let restaurantShortList = Restaurants.find({"status":"open",
            "estimated_delivery_time": {"$lte":max_leadtime},
            "reputation": {"$gte":min_reputation},
            "menu":menuChoice.name,
            "city":city.name,
            "price_factor":{"$lte":price_factor}
            });


        Customers.insert({"name":"cust"+Math.floor(Math.random()*1000000),
                        "lat":city.lat+(y/15), "long":city.long+(x/15),
                        "last_order_date": Date.now(), "restaurant":""});

        if (restaurantShortList.count() > 0) {
            // select a random restaurant fom the list
            let index = Math.floor(Math.random() * (restaurantShortList.count()));
            // insert order in db
            let selectedRestaurant = restaurantShortList.fetch()[index];
            //console.log("restaurant found: "+selectedRestaurant.name);
            let doc = {"restaurant":selectedRestaurant._id,"order_date":Date.now(),
                "menu":menuChoice.name,"estimated_delivery_time":selectedRestaurant.estimated_delivery_time,
                "cust_x":x*10, "cust_y":y*10,"cust_angle":angle,"cust_distance_from_center":distance_from_center,
                "order_status":1, chef:null, "lat":city.lat+(y/15),"long":city.long+(x/15)};
            Orders.insert(doc);
            this.client.count('RestaurantFound', 1);
            this.client.count('Restaurant', 1);
            this.client.count(city.name, 1);
            this.client.count(menuChoice.name,1);

        } else {
            this.client.count('RestaurantNotFound', 1);
            //console.log("restaurant not found");
            this.client.count(city.name, 1);
            this.client.count(menuChoice.name,1);
        }

    }
}
