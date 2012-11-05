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

// assume the .json files have been converted to .js files loading two
// variables: trained_classifier and trained_features

var classifier = BayesClassifier.restore(trained_classifier);

var NGRAM_SIZE=4;
var features = trained_features;

function instanceToSparseObservation(instance){
    var these_features = {};
    for(var i=0; i<instance.url.length-NGRAM_SIZE; i++){
	var feat = instance.url.substr(i, NGRAM_SIZE);
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

function be_classy(url) {
    return classifier.getSparseClassifications(instanceToSparseObservation(url));
}
