// structure for computing metrics.
class Metric {
	constructor(name) {
		this.name = name;
		this.percentiles = new Array(100);
		this.max = -1;
		this.min = Number.POSITIVE_INFINITY;
		this.median = 0;
		this.avg = 0;
		this.samples = [];
	}

	getSampleCount (){
		return this.samples.length;
	}

	addSample (lag){
		this.samples.push(lag);
		this.updateMax(lag);
		this.updateMin(lag);
	}

	updateMax (lag){
		this.max = Math.max(this.max, lag);
	}

	updateMin (lag){
		this.min = Math.min(this.min, lag);
	}

	computeAvg () {
		let sum = this.samples.reduce((acc, curr) => acc + curr);
		this.avg = sum/this.samples.length;
	}

	computeMedian (){
		let sz = this.samples.length;
		if ( sz % 2 == 0 ) {
			this.median = ( this.samples[sz/2] + this.samples[1 + sz/2] ) / 2;
		}
		else {
			this.median = this.samples[sz/2];
		}
	}
	
	printResult (){
		console.log(`\n\n ----------- ${this.name} metrics ---------`);

		console.log(`Count : ${this.samples.length}`);
		console.log(`Mean lag(ms) : ${this.avg} ms`);
		console.log(`Median lag(ms) : ${this.median} ms`);
		console.log(`Max lag(ms) : ${this.max} ms`);
		console.log(`Min lag(ms) : ${this.min} ms`);

		console.log('Percentiles: \n');

		for (let i = 0 ; i < this.percentiles.length ; i++ ) {
			if ( (i + 1) % 10 == 0  )
				console.log(`${(i + 1)} percentile :  ${this.percentiles[i]} ms`);
		}
		console.log('\nTop Percentiles: \n');
		for (let i = 89 ; i < this.percentiles.length ; i++ ) {
			console.log(`${(i + 1)} percentile :  ${this.percentiles[i]} ms`);
		}

		console.log('\nBottom Percentiles: \n');
		for (let i = 0 ; i < 10 ; i++ ) {
			console.log(`${(i + 1)} percentile :  ${this.percentiles[i]} ms`);
		}
		
	}

	computePercentiles () {
		// sort the samples in increasing order.
		this.samples.sort((a,b) => { return a - b; });

		let n = this.samples.length;
		for ( let i = 0 ; i < this.percentiles.length ; i++ ) {
			// compute sample value for 10 percentile, 20 percentile....100 percentile.
			let percentile = (i + 1);
			let R = (percentile * n)/100;
			let I = Math.round(R);
			if ( I >= 1 && I < n )
				this.percentiles[i] = ( this.samples[I - 1] + this.samples[I] )/2 ;
			else if ( I == 0 )
				this.percentiles[i] = this.samples[0];
			else {
				this.percentiles[i] = this.samples[n - 1];
			}
		}

		return this.percentiles;
	}

	resetMetric () {
		this.percentiles =  new Array(10);
		this.max = -1;
		this.min = Number.POSITIVE_INFINITY;
		this.median = 0;
		this.avg = 0;
		this.samples = [];
	}
}

module.exports = Metric;