import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Process } from '../imports/utils/poisson-process';
import { Restaurants } from '../imports/api/restaurants';
import { Locations } from '../imports/api/locations';
import { Customers } from '../imports/api/customers';
import { Orders } from '../imports/api/orders';
import { Chefs } from '../imports/api/chefs';
import { Drivers } from '../imports/api/drivers';
import { Simulation } from '../imports/api/simulation';

import { Gaussian } from '../imports/utils/gaussian.js';

import './main.html';

Meteor.startup(() => {
    GoogleMaps.load({ v: '3', key: 'AIzaSyCBMhDltGxEUbOWMlSH1_-r0TulIh414gI', libraries: 'visualization,geometry,places' });
});

Template.hello.onCreated(function helloOnCreated() {
    // counter starts at 0
    this.counter = new ReactiveVar(0);
    this.restaurant_id = new ReactiveVar("");

    Meteor.subscribe('orders');
    Meteor.subscribe('customers');
    Meteor.subscribe('restaurants');
    Meteor.subscribe('chefs');
    Meteor.subscribe('drivers');
    Meteor.subscribe('locations');
    Meteor.subscribe('simulation');


});

Template.summary.onCreated(function summaryOnCreated() {
    Meteor.subscribe('orders');

});


var map = null;
var heatMapLayer = null;
var gaussian = new Gaussian(0, 1);
toRad = function(angle) {
    return angle * Math.PI / 180;
};

var point = { lat: 22.5667, lng: 88.3667 };
var markerSize = { x: 22, y: 40 };


Template.map.onCreated(function() {
    GoogleMaps.ready('map', function(aMap) {
        console.log("I'm ready!");
        map = aMap;

        google.maps.Marker.prototype.setLabel = function(label){
            this.label = new MarkerLabel({
                map: this.map,
                marker: this,
                text: label
            });
            this.label.bindTo('position', this, 'position');
        };

        var MarkerLabel = function(options) {
            this.setValues(options);
            this.span = document.createElement('span');
            this.span.className = 'map-marker-label';
        };

        MarkerLabel.prototype = $.extend(new google.maps.OverlayView(), {
            onAdd: function() {
                this.getPanes().overlayImage.appendChild(this.span);
                var self = this;
                this.listeners = [
                    google.maps.event.addListener(this, 'position_changed', function() { self.draw();    })];
            },
            draw: function() {
                var text = String(this.get('text'));
                var position = this.getProjection().fromLatLngToDivPixel(this.get('position'));
                this.span.innerHTML = text;
                this.span.style.left = (position.x - (markerSize.x / 2)) - (text.length * 3) + 10 + 'px';
                this.span.style.top = (position.y - markerSize.y + 40) + 'px';
            }
        });

        heatMapLayer = new google.maps.visualization.HeatmapLayer({
            data:[],
            map:aMap.instance,
            radius: 20
        });

        var now = Date.now();
        var one_hour_ago = new Date(now - 6000);
        let recent_customers = Customers.find({});
        var markers = [];
        var restaurant_markers = [];

        recent_customers.observe({
            "added":function(doc) {
                // Create a marker for this document
                var marker = new google.maps.Marker({
                    draggable: true,
                    animation: google.maps.Animation.DROP,
                    position: new google.maps.LatLng(doc.lat, doc.long),
                    map: map.instance,
                    // We store the document _id on the marker in order
                    // to update the document within the 'dragend' event below.
                    id: document._id,
                    label: ''
                });
                markers.push(marker);
                var latLng = new google.maps.LatLng(doc.lat, doc.long);
                heatMapLayer.getData().push(latLng);
            },
            "removed": function(doc) {
                for(var f=0; f < markers.length; f++) {
                    let m = markers[f];
                    if ((Math.abs(m.position.lat()-doc.lat) < 0.005) && (Math.abs(m.position.lng()-doc.long))< 0.005) {
                        m.setMap(null);
                        markers.splice(f, 1);
                    }
                }
            }
        });

        var open_restaurants = Restaurants.find({"status":"open"});

        open_restaurants.observe({
            "added":function(doc) {

                if (!doc.lat) {
                    let distance_from_center = gaussian.normal_random();
                    let angle = Math.floor(Math.random() * 360);
                    let radAngle = toRad(angle);
                    let x = distance_from_center * Math.cos(radAngle);
                    let y = distance_from_center * Math.sin(radAngle);

                    let location = Locations.findOne({"name":doc.city});
                    doc.lat = location.lat + (x/15);
                    doc.long = location.long +(y/15);

                    Restaurants.update(doc._id, { $set: { lat: doc.lat, long: doc.long }});
                }
                // Create a marker for this document
                var marker = new google.maps.Marker({
                    draggable: true,
                    animation: google.maps.Animation.DROP,
                    position: new google.maps.LatLng(doc.lat, doc.long),
                    map: map.instance,
                    // We store the document _id on the marker in order
                    // to update the document within the 'dragend' event below.
                    id: document._id,
                    label: doc.name
                });
                marker.setIcon('http://maps.google.com/mapfiles/ms/icons/green-dot.png');
                restaurant_markers.push(marker);
                var latLng = new google.maps.LatLng(doc.lat, doc.long);
                //heatMapLayer.getData().push(latLng);
            },
            "removed": function(doc) {
                for(var f=0; f < restaurant_markers.length; f++) {
                    let m = restaurant_markers[f];
                    if ((Math.abs(m.position.lat()-doc.lat) < 0.005) && (Math.abs(m.position.lng()-doc.long))< 0.005) {
                        m.setMap(null);
                        restaurant_markers.splice(f, 1);
                    }
                }
            }
        });

    });
});

Template.hello.rendered = function() {
};

// Decide when to process an order
// Decide when to send out delivery
// Decide how many delivery drivers
// Decide how many chefs to process orders
// Select location, visibility
// Select marketing campaign
Template.map.helpers({
    mapOptions: function() {
        if (GoogleMaps.loaded()) {
            return {
                center: new google.maps.LatLng(51.5074, 0.1278),
                zoom: 5,
                draggable:true
            };
        }
    }
});

Template.summary.helpers({
    total_orders() {
        return Orders.find({}).count();
    },
    overdue_orders() {
        let max_time = Simulation.findOne({"name":"max_acceptable_order_time"}).value;
        let overdue_orders = Orders.find({"order_status":7,"total_order_time":{$gte:max_time}});
        return overdue_orders.count();
    },
    cancelled_orders() {
        let cancelled_orders = Orders.find({"order_status":3});
        return cancelled_orders.count();
    }
});

Template.summary.events({
    'click input': function(event) {
        var x = $(event.target).is(":checked");
        Session.set("statevalue", x);
        if (x) {
            $('.map-marker-label').css('visibility','visible');
        } else {
            $('.map-marker-label').css('visibility','hidden');
        }
        console.log(Session.get("statevalue"));
    }
});

Template.hello.helpers({
        //
        // // Create a heatmap.
        // var heatmap = new google.maps.visualization.HeatmapLayer({
        //     data: [],
        //     map: map,
        //     radius: 8
        // });
        // var latLng = new google.maps.LatLng(51.5074, 0.1278);
        //
        // heatmap.getData().push(latLng);
    attribute() {
      return this._id;
    },
    counter() {
        return Template.instance().counter.get();
    },
    order_queue_count() {
        let rest_id = Template.instance().restaurant_id.get();
      return Orders.find({"restaurant": rest_id, "order_status":2}).count();
    },
    my_restaurants() {
        let rest =  Restaurants.find({},{sort:{"name":1}});
        return rest;
    },
    restaurant_menu() {
        let rest_id = Template.instance().restaurant_id.get();
        let rest = Restaurants.findOne({"_id":rest_id});
        return rest.menu;
    },
    restaurant_status() {
        let rest_id = Template.instance().restaurant_id.get();
        let rest = Restaurants.findOne({"_id":rest_id});
        return rest.status;
    },
    price() {
        let rest_id = Template.instance().restaurant_id.get();
        let rest = Restaurants.findOne({"_id":rest_id});
        return rest.price_factor;
    },
    reputation() {
        let rest_id = Template.instance().restaurant_id.get();
        let rest = Restaurants.findOne({"_id":rest_id});
        return rest.reputation;
    },
    estimated_delivery() {
        let rest_id = Template.instance().restaurant_id.get();
        let rest = Restaurants.findOne({"_id":rest_id});
        return rest.estimated_delivery_time;
    },
    my_chefs() {
        let rest_id = Template.instance().restaurant_id.get();
        let chefs =  Chefs.find({"restaurant":rest_id});
        return chefs;
    },
    chef_current_order(chef_id) {
        let chef =  Chefs.findOne({"_id":chef_id});
        return chef.current_order || "Idle";
    },
    my_orders() {
        let rest_id = Template.instance().restaurant_id.get();
        let orders = Orders.find({"restaurant":rest_id,"order_status":1});
        console.log("looking for order for restaurant id: "+rest_id);

        return orders;
    },
    my_drivers() {
        let rest_id = Template.instance().restaurant_id.get();
        let drivers = Drivers.find({"restaurant":rest_id});
        return drivers;
    },
    my_drivers_orders(driver_id) {
        let rest_id = Template.instance().restaurant_id.get();
        let driversOrders = Orders.find({"order_status":6, "driver":driver_id});
        return driversOrders;
    },
    kitchen_queue_count() {
        let rest_id = Template.instance().restaurant_id.get();
        return Orders.find({"restaurant":rest_id, "order_status":2}).count();
    },
    accepted_orders() {
        let rest_id = Template.instance().restaurant_id.get();
        return Orders.find({"restaurant":rest_id, "order_status":2})
    },
    cancelled_order_count() {
        let rest_id = Template.instance().restaurant_id.get();
        return Orders.find({"restaurant":rest_id, "order_status":3}).count();
    },
    transit_orders() {
        let rest_id = Template.instance().restaurant_id.get();
        return Orders.find({"restaurant":rest_id, "order_status":6})
    },
    delivery_orders() {
        let rest_id = Template.instance().restaurant_id.get();
        return Orders.find({"restaurant":rest_id, "order_status":5})
    },
    delivered_orders() {
        let rest_id = Template.instance().restaurant_id.get();
        return Orders.find({"restaurant":rest_id, "order_status":7})
    },
    delivered_order_count() {
        let rest_id = Template.instance().restaurant_id.get();
        return Orders.find({"restaurant":rest_id, "order_status":7}).count();
    },
    my_customers() {
        return Customers.find({});
    }
});

Template.hello.events({
  'click button.accept'(event, instance) {
        let order_id = $(event.currentTarget).data("order");
        Orders.update(order_id,{$set:{"order_status":2}});

    },
    'click button.reject'(event, instance) {
        let order_id = $(event.currentTarget).data("order");
        Orders.update(order_id,{$set:{"order_status":3}});
    },
    'click button'(event, instance) {
        instance.counter.set(instance.counter.get() + 1);
    },
    "change #restaurant-select": function (event, instance) {

      instance.restaurant_id.set(Number($(event.currentTarget).val()));
      console.log("restaurant : " + instance.restaurant_id.get());
    // additional code to do what you want with the category
  }
});
