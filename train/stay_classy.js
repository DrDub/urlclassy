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
urlparse = require("url"),
apparatus = require("../lib/apparatus/index.js");

var HOST_NGRAM_SIZE=4;
var PATH_NGRAM_SIZE=4;

// initialize the classifier
var host_classifier = new apparatus.BayesClassifier();
var host_features = { 'LENGTH' : 0 };

var path_classifier = new apparatus.BayesClassifier();
var path_features = { 'LENGTH' : 0 };

function strToSparseObservation(string, ngram_size, features){
    var these_features = {};
    for(var i=0; i<string.length-ngram_size; i++){
	var feat = string.substr(i, ngram_size);
	if(feat in features){
	    these_features[features[feat]] = 1;
	}else{
	    features[feat] = features.LENGTH;
	    these_features[features.LENGTH] = 1;
	    features.LENGTH++;
	}
    }

    return these_features;
}

var test = [];
var train_size = 0;
var in_training = {};
var line_counter = 0;

// for each line in the training file
new lazy(fs.createReadStream('../dmoz/two_cats_urls.tsv'))
    .lines
    .forEach(function(line){
	// first pass, train the path classifier
	var parts = line.toString().split("\t");
        var classy = parts[0]; //+"-"+parts[1];
	if(parts[2].indexOf(':') == -1)
	    parts[2] = "http://" + parts[2];
	var parsed = urlparse.parse(parts[2]);
        var instance = { 'classy': classy,
                         'url' : parts[2],
		         'host' : parsed.hostname, 'path' : parsed.path };
        if(Math.random() < 0.1){
	    if(instance.host === undefined){
		console.log("instance.host undefined '"+line.toString()+"'");
		return line_counter++;
	    }
	    test.push(instance);
        }else{
	    // update the classifier
	    in_training[line_counter] = 1;
	    if(Math.random() < 1.0){
		if(instance.path !== undefined)
		    path_classifier.addSparseExample(strToSparseObservation(instance.path, PATH_NGRAM_SIZE, path_features), 
						     instance.classy);
		train_size++;
		if(train_size % 100000 == 0){
		    console.log(train_size);
		}
	    }
	}
	line_counter++;
    })
    .join(function(nothing){
	console.log('Prunning...');
	path_classifier.pruneFeatures();
	console.log('Training on '+train_size+'...');
	path_classifier.train();
	console.log('Writing...');
	// save classifier

	fs.writeFileSync('path_classifier.json', JSON.stringify(path_classifier), 'utf8', 
		     function(err){ if(err){ console.log(err) } });
	fs.writeFileSync('path_features.json', JSON.stringify(path_features), 'utf8', 
		     function(err){ if(err){ console.log(err) } });

	// test
	console.log('Evaluating...');
	var correct = 0;
	for(var i=0; i<test.length; i++){
	    var classy = test[i].path === undefined ? "UNKNOWN" : path_classifier.sparseClassify(strToSparseObservation(test[i].path, PATH_NGRAM_SIZE, path_features));
	    if(Math.random() < 0.01) {
                //console.log("For URL: "+test[i].url+" target: "+test[i].classy+" predicted: "+classy);
		//var classes = classifier.getSparseClassifications(strToSparseObservation(test[i].path, PATH_NGRAM_SIZE, path_features));
		//console.log("Classes: "+JSON.stringify(classes));
            }
	    if(classy === test[i].classy){
		correct++;
	    }
	}
	console.log("Path Accuracy: "+(correct * 1.0 / (test.length)));

	// final training
	line_counter = 0;
	train_size = 0;
	new lazy(fs.createReadStream('../dmoz/two_cats_urls.tsv'))
	    .lines
	    .forEach(function(line){
		// second pass, train the host classifier
		if(!in_training[line_counter])
		    return line_counter++;

		if(Math.random() < 1.0){
		    var parts = line.toString().split("\t");
		    var classy = parts[0]; //+"-"+parts[1];
		    if(parts[2].indexOf(':') == -1)
			parts[2] = "http://" + parts[2];
		    var parsed = urlparse.parse(parts[2]);
		    var instance = { 'classy': classy,
				     'url' : parts[2],
				     'host' : parsed.hostname, 'path' : parsed.path };
		    
		    if(instance.host === undefined)
			return console.log(line.toString());
		    
		    var path_predicted = "PATH" +
			(instance.path === undefined ? "UNKNOWN" :
			 path_classifier.sparseClassify(strToSparseObservation(instance.path, 
									       PATH_NGRAM_SIZE, path_features)));
		    if(!(path_predicted in host_features)){
			host_features[path_predicted] = host_features.LENGTH;
			host_features.LENGTH++;
		    }

		    var sparseExample = strToSparseObservation(instance.host, HOST_NGRAM_SIZE, host_features);
		    sparseExample[host_features[path_predicted]] = 1;
		    
		    host_classifier.addSparseExample(sparseExample, instance.classy);
		    train_size++;
		    if(train_size % 100000 == 0){
			console.log(train_size);
		    }
		}
		line_counter++;
	    })
	    .join(function(nothing){
		console.log('Prunning...');
		host_classifier.pruneFeatures();
		console.log('Training on '+train_size+'...');
		host_classifier.train();
		console.log('Writing...');
		// save classifier
		
		fs.writeFileSync('host_classifier.json', JSON.stringify(host_classifier), 'utf8', 
				 function(err){ if(err){ console.log(err) } });
		fs.writeFileSync('host_features.json', JSON.stringify(host_features), 'utf8', 
				 function(err){ if(err){ console.log(err) } });

		// test
		console.log('Evaluating...');
		var correct = 0;
		for(var i=0; i<test.length; i++){
		    var path_predicted = "PATH" + 
			(test[i].path === undefined ? "UNKNOWN" :
			 path_classifier.sparseClassify(strToSparseObservation(test[i].path, PATH_NGRAM_SIZE, path_features)));
		    var observation = strToSparseObservation(test[i].host, HOST_NGRAM_SIZE, host_features);
		    observation[host_features[path_predicted]] = 1;
		    
		    var classy = host_classifier.sparseClassify(observation);
		    if(Math.random() < 0.01) {
			//console.log("For URL: "+test[i].url+" target: "+test[i].classy+" predicted: "+classy);
			//var classes = classifier.getSparseClassifications(strToSparseObservation(test[i]));
			//console.log("Classes: "+JSON.stringify(classes));
		    }
		    if(classy === test[i].classy){
			correct++;
		    }
		}
		console.log("Accuracy: "+(correct * 1.0 / (test.length)));
	    });
    });

