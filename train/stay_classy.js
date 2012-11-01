/*
  Copyright (C) 2012, Pablo Ariel Duboue

  This file is part of URL Classy.

  URL Classy is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  URL Classy is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with URL Classy.  If not, see <http://www.gnu.org/licenses/>.
*/

var lazy = require("../lib/lazy"),
fs   = require("fs"),
apparatus = require("../lib/apparatus/index.js");

var NGRAM_SIZE=3;

// initialize the classifier
var classifier = new apparatus.BayesClassifier();
var features = {};

function instanceToObservation(instance){
    var these_features = {};
    for(var i=0; i<instance.url.length-NGRAM_SIZE; i++){
	var feat = instance.url.substr(i, i+NGRAM_SIZE);
	these_features[feat] = 1;
	features[feat] = 1;
    }

    var observation = new Array();
    for(var feat in features){
	if(feat in these_features){
	    observation.push(1);
	}else{
	    observation.push(0);
	}
    }
    return observation;
}

var test = [];
var train_size = 0;

// for each line in the training file
new lazy(fs.createReadStream('../dmoz/two_cats_urls.tsv'))
    .lines
    .forEach(function(line){
	var parts = line.toString().split("\t");
        var classy = parts[0]+"-"+parts[1];
        var instance = { 'classy': classy,
                         'url' : parts[2] };
        if(Math.random() < 0.1){
	    test.push(instance);
        }else{
	    // update the classifier
	    classifier.addExample(instanceToObservation(instance), instance.classy);
	    train_size++;
	}
    })
    .join(function(nothing){
	console.log('Training on '+train_size+'...');
	classifier.train();
	console.log('Writing...');
	// save classifier
	fs.writeFile('classifier.json', JSON.stringify(classifier), 'utf8', 
		     function(err){ if(err){ console.log(err) } });
	fs.writeFile('features.json', JSON.stringify(features), 'utf8', 
		     function(err){ if(err){ console.log(err) } });
	// test
	console.log('Evaluating...');
	var correct = 0;
	for(var i=0; i<test.length; i++){
	    var classy = classifier.classify(instanceToObservation(test[i]));
	    if(Math.random() < 0.1) {
                console.log("For URL: "+test[i].url+" target: "+test[i].classy+" predicted: "+classy);
            }
	    if(classy === test[i].classy){
		correct++;
	    }
	}
	console.log("Accuracy: "+(correct * 1.0 / (test.length)));

    });

