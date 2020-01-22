//Cosine similarity code (from: 
// https://medium.com/@sumn2u/string-similarity-comparision-in-js-with-examples-4bae35f13968)

//(function () {
    
    function termFreqMap(str) {
        var words = str.split(' ');
        var termFreq = {};
        words.forEach(function(w) {
            termFreq[w] = (termFreq[w] || 0) + 1;
        });
        return termFreq;
    }
    function addKeysToDict(map, dict) {
        for (var key in map) {
            dict[key] = true;
        }
    }
    function termFreqMapToVector(map, dict) {
        var termFreqVector = [];
        for (var term in dict) {
            termFreqVector.push(map[term] || 0);
        }
        return termFreqVector;
    }
    function vecDotProduct(vecA, vecB) {
        var product = 0;
        for (var i = 0; i < vecA.length; i++) {
            product += vecA[i] * vecB[i];
        }
        return product;
    }
    function vecMagnitude(vec) {
        var sum = 0;
        for (var i = 0; i < vec.length; i++) {
            sum += vec[i] * vec[i];
        }
        return Math.sqrt(sum);
    }
    function cosineSimilarity(vecA, vecB) {
        return vecDotProduct(vecA, vecB) / (vecMagnitude(vecA) * vecMagnitude(vecB));
    }
  //  Cosinesimilarity = 
    function textCosineSimilarity(strA, strB) {
        var termFreqA = termFreqMap(strA);
        var termFreqB = termFreqMap(strB);

        var dict = {};
        addKeysToDict(termFreqA, dict);
        addKeysToDict(termFreqB, dict);

        var termFreqVecA = termFreqMapToVector(termFreqA, dict);
        var termFreqVecB = termFreqMapToVector(termFreqB, dict);

        return cosineSimilarity(termFreqVecA, termFreqVecB);
    }
//})();
// End of cosine similarity code


function findAllIndexes(source, find) {
  var result = [];
  for (i = 0; i < source.length-find.length; ++i) {
    if (source.substring(i, i + find.length) == find) {
      result.push(i);
    }
    else result.push(-1);
  }
  return result;
}
function ngram_array(str, n) {
// Returns array of all complete ngrams in str of length n
	if(!str.length) return false;
	ngrams = [];
	if(str.length<n) {
		ngrams.push(str + "%");
	}
	else if (str.length==n) {
		ngrams.push(str);
		}
		else {  
			for(i=0; i+n <= str.length; i++) {
				ngrams.push(str.substr(i,n));
			}
		}
	return ngrams;
}
