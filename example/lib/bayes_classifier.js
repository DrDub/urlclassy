/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/


var BayesClassifier = function() {
    Classifier.call(this);
    this.classFeatures = {};
    this.classTotals = {};
    this.totalExamples = 1; // start at one to smooth
};

BayesClassifier.prototype = Object.create(Classifier.prototype, {
    constructor: {
	value: BayesClassifier,
	enumerable: false,
	writable: true,
	configurable: true
    }
});

function addExample(observation, label) {     
    if(!this.classFeatures[label]) {
        this.classFeatures[label] = {};
        this.classTotals[label] = 1; // give an extra for smoothing
    }
     
    var i = observation.length;
    this.totalExamples++;
    this.classTotals[label]++;

    while(i--) {
	if(observation[i]) {
            if(this.classFeatures[label][i]) {
		this.classFeatures[label][i]++;
            } else {
		// give an extra for smoothing
		this.classFeatures[label][i] = 2;
            }
	}
    }
}

function addSparseExample(observation, label) {     
    if(!this.classFeatures[label]) {
        this.classFeatures[label] = {};
        this.classTotals[label] = 1; // give an extra for smoothing
    }
     
    this.totalExamples++;
    this.classTotals[label]++;

    for(var key in observation){
        if(this.classFeatures[label][key]) {
	    this.classFeatures[label][key]++;
        } else {
	    // give an extra for smoothing
	    this.classFeatures[label][key] = 1.0001;
        }
    }
}

function train() {
    
}

function probabilityOfClass(observation, label) {
    var prob = 0;
    var i = observation.length;

    while(i--) {
	if(observation[i]) {
	    // default to 1 for smoothing
            var count = this.classFeatures[label][i] || 0.0001; 

	    // numbers are tiny, add logs rather than take product
            prob += Math.log(count / this.classTotals[label]);
	}
    };

    // p(C) * unlogging the above calculation P(X|C)
    prob = (this.classTotals[label] / this.totalExamples) * Math.exp(prob);
    
    return prob;
}

function getClassifications(observation) {
    var classifier = this;
    var labels = [];
    
    for(var className in this.classFeatures) {
	labels.push({label: className,
	      value: classifier.probabilityOfClass(observation, className)});
    }
    
    labels.sort(function(x, y) {return y.value - x.value});
    return labels;
}

function restore(classifier) {
     classifier = Classifier.restore(classifier);
     classifier.__proto__ = BayesClassifier.prototype;
     
     return classifier;
}

BayesClassifier.prototype.addExample = addExample;
BayesClassifier.prototype.addSparseExample = addSparseExample;
BayesClassifier.prototype.train = train;
BayesClassifier.prototype.getClassifications = getClassifications;
BayesClassifier.prototype.probabilityOfClass = probabilityOfClass;

BayesClassifier.restore = restore;
