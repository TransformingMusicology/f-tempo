/*******************************************************************************
 * Imports
 ******************************************************************************/
const bodyParser = require('body-parser');
const Color = require('color');
const cp = require('child_process');
const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const mustacheExpress = require('mustache-express');
const path_app = require('path');
const request = require('request');

const utils = require('./static/src/utils.js');

/*******************************************************************************
 * Globals / init
 ******************************************************************************/
const MAWS_DB = './data/latest_maws'; 
//const MAWS_DB = './data/latest_maws_corrIDs_30Sep2019.txt'; 
const DIAT_MEL_DB = './data/latest_diat_mel_strs'; 
//const DIAT_MEL_DB = './data/latest_diat_mel_strs_corrIDs_30Sep2019.txt'; 
const EMO_IDS = []; // all ids in the system
const EMO_IDS_DIAT_MELS = {}; // keys are ids, values are the diat_int_code for that id
const EMO_IDS_MAWS = {}; // keys are ids, values are an array of maws for that id
const MAWS_to_IDS = {}; // keys are maws, values are an array of all ids for which that maw appears
const EMO_IDS_NGRAMS = {}; // keys are ids, values are an array of ngrams for that id
const NGRAMS_to_IDS = {}; // keys are ngrams, values are a array of all ids in whose diat_int_code that ngram appears

const NGRAM_ID_BASE = "./data/ngram_id_dict_";
const ID_NGRAM_BASE = "./data/id_ngram_dict_";

const word_totals = []; // total words per id, used for normalization
const word_ngram_totals = []; // total words per id, used for normalization
const ngr_len = 5;

const app = express();

/*******************************************************************************
 * Setup
 ******************************************************************************/
console.log("\nF-TEMPO server started at "+Date());

load_maws(); // load the MAWS
load_diat_mels(); // load the diatonic melodies

const port = 8000;
app.listen(
    port,
    () => console.log('EMO app listening on port 8000!') // success callback
);

app.engine('html', mustacheExpress()); // render html templates using Mustache
app.set('view engine', 'html');
app.set('views', './templates');

app.use(express.static('static')); // serve static files out of /static
app.use(fileUpload()); // file upload stuff
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

/*******************************************************************************
 * Request handlers
 ******************************************************************************/

app.get('/', function (req, res) {
    res.render('index');
});


app.get('/id_searches', function (req, res) {
    const data = { id_searches: true };
    res.render('index', data);
});

app.get('/code_searches', function (req, res) {
    const data = { code_searches: true };
    res.render('index', data);
});

app.get('/compare', function (req, res) {

    // q for 'query', m for 'match'
    const q_id = req.query.qid;
    const m_id = req.query.mid;
    
    if(req.query.ng_len) var ngram_length = req.query.ng_len;
    else var ngram_length = ngr_len;

    if (!q_id || !m_id) { return res.status(400).send('q_id and m_id must be provided!'); }

// Get page-images for query and match
    const base_img_url = 'http://doc.gold.ac.uk/~mas01tc/new_page_dir_50/';
    const img_ext = '.jpg';
    const q_jpg_url = base_img_url + q_id + img_ext;
    const m_jpg_url = base_img_url + m_id + img_ext;

//    Get both MEI files
    const base_mei_url = 'http://doc.gold.ac.uk/~mas01tc/EMO_search/new_mei_pages/';
    const mei_ext = '.mei';
    var q_mei_url = base_mei_url + q_id + mei_ext;
    var m_mei_url = base_mei_url + m_id + mei_ext;

    // id_diat_mel_lookup is a file of ids and codestrings
    // this finds the line of the query and result pages
	q_diat_str = EMO_IDS_DIAT_MELS[q_id];
	const m_diat_str = EMO_IDS_DIAT_MELS[m_id];
    if (!q_diat_str) { return res.status(400).send('Could not find melody string for this q_id'); }
    if (!m_diat_str) { return res.status(400).send('Could not find melody string for this m_id'); }
    
	function ngram_string(str, n) {
	// Returns array of ngrams of length n
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
	function isInArray(value, array) {
	  return array.indexOf(value) > -1;
	}
	function exists(search,arr ) {
		return arr.some(row => row.includes(search));
	}

	function allIndexOf(str, findThis) {
		var indices = [];
		for(var pos = str.indexOf(findThis); pos !== -1; pos = str.indexOf(findThis, pos + 1)) {
			indices.push(pos);
		}
		return indices;
	}

	function ngrams_in_common(q_str,m_str,n,query) {
	// Records all locations of each ngram common to query and match
		let q_com_ng_loc = [];
		let m_com_ng_loc = [];
		let q_ngrams = ngram_string(q_str, n);
		let m_ngrams = ngram_string(m_str, n);
		let qcount = mcount = -1;
		let mlocs = [];
		let qlocs = [];
		for(var i=0;i<=q_ngrams.length;i++) {
			qlocs = allIndexOf(m_str,q_ngrams[i]);
			for(j=0;j<=qlocs.length;j++ ) {
				if(qlocs[j]>=0) {
					if(!exists(qlocs[j],q_com_ng_loc)) {
						if(typeof q_com_ng_loc[i] === "undefined") {
							q_com_ng_loc[i]=[];
						}
						var entry = {};
						entry.q_ind = i;
						entry.m_ind = qlocs[j];
						q_com_ng_loc[i].push(entry);
					}
				}
			}
		}
		for( i=0;i<=m_ngrams.length;i++) {
			mlocs = allIndexOf(q_str,m_ngrams[i]);
			for(j=0;j<=mlocs.length;j++ ) {
				if(mlocs[j]>=0) {
					if(!exists(mlocs[j],m_com_ng_loc)) {
						if(typeof m_com_ng_loc[i] === "undefined") {
							m_com_ng_loc[i]=[];
						}
						var entry = {};
						entry.m_ind = i;
						entry.q_ind = mlocs[j];
						m_com_ng_loc[i].push(entry);
					}
				}
			}
		}

		if(query) return q_com_ng_loc.filter(Boolean); //remove null entries
		else return m_com_ng_loc.filter(Boolean); //remove null entries
	}

	var q_comm = ngrams_in_common(q_diat_str,m_diat_str,ngram_length,true);
	var m_comm = ngrams_in_common(q_diat_str,m_diat_str,ngram_length,false);

	const sorted_q_comm = q_comm.sort(function(a, b){return a[0].q_ind - b[0].q_ind});
	const sorted_m_comm = m_comm.sort(function(a, b){return a[0].m_ind - b[0].m_ind});

    // TODO(ra) probably expose this in the frontend like this...
//	const show_top_ngrams = req.body.show_top_ngrams;
//	const show_top_ngrams = true;
    const show_top_ngrams = false;
    const [q_index_to_colour, m_index_to_colour] = generate_index_to_colour_maps(q_diat_str, m_diat_str, show_top_ngrams);

    request(q_mei_url, function (error, response, q_mei) { if (!error && response.statusCode == 200) {
    request(m_mei_url, function (error, response, m_mei) { if (!error && response.statusCode == 200) {
	const  data = {
		q_id,
		m_id,
		q_jpg_url,
		m_jpg_url,
		q_mei: q_mei.replace(/(\r\n|\n|\r)/gm,''), // strip newlines
		m_mei: m_mei.replace(/(\r\n|\n|\r)/gm,''), // strip newlines
		q_diat_str: JSON.stringify(q_diat_str),
		m_diat_str: JSON.stringify(m_diat_str),
		ng_len: ngram_length,
	  }
	res.render('compare', data);
     } else { return res.status(400).send('Could not find the MEI file for m_id'+m_id); }});
    } else { return res.status(400).send('Could not find the MEI file for q_id '+q_id); }});

});

var q_diat_str;
var q_diat_url;

// Returns the number of all emo ids
app.get('/api/num_emo_ids', function (req, res) { res.send(EMO_IDS.length+" pages in database"); });

// Returns an array of all emo ids
app.get('/api/emo_ids', function (req, res) { res.send(EMO_IDS); });

// Handle a query
app.post('/api/query', function (req, res) {
    // Defaults
    let num_results = 20;
    let jaccard = true;
    let threshold = false;
    let ngram = false;

    // Set values if given in query
    if (req.body.jaccard !== undefined) { jaccard = req.body.jaccard; }
    if (req.body.num_results !== undefined) { num_results = req.body.num_results; }
    if (req.body.threshold !== undefined) { threshold = req.body.threshold; }
    if (req.body.ngram_search !== undefined) { ngram = req.body.ngram_search; }
    let result;
    if(req.body.qstring) {
        // console.log('Querying by string...');
        const query = req.body.qstring;
        result = search('words', query, jaccard, num_results, threshold);
    } else if(req.body.id) {
      //   console.log('Querying by id... '+ngram);
        if(ngram) result = search('id', req.body.id, jaccard, num_results, threshold, ngram);
        else result = search('id', req.body.id, jaccard, num_results, threshold);

    } else if(req.body.diat_int_code) {
        result = search_with_code(req.body.diat_int_code, jaccard, num_results, threshold);
    }

    res.send(result);
});

var working_path;
// Handle image uploads
app.post('/api/image_query', function(req, res) {
    if (!req.files) { return res.status(400).send('No files were uploaded.'); }

    // this needs to stay in sync with the name given to the FormData object in the front end
    let user_image = req.files.user_image_file;
    const user_id = req.body.user_id;
    const new_filename = user_image.name.replace(/ /g, '_');

    // TODO: this probably breaks silently if the user uploads two files with the
    // same name -- they'll end up in the working directory, which may cause
    // problems for Aruspix
    
    let next_working_dir;
    const user_path = './run/' + user_id + '/';
    if (fs.existsSync(user_path)){
        dirs = fs.readdirSync(user_path);

        // dirs is an array of strings, which we want to sort as ints
        dirs.sort((a, b) => parseInt(a) - parseInt(b));
        last_dir = parseInt(dirs[dirs.length - 1]);
        next_working_dir = last_dir + 1;
    } else {
        fs.mkdirSync(user_path);
        next_working_dir = 0;
    }

//    const working_path = user_path + next_working_dir + '/';
	working_path = user_path + next_working_dir + '/';
    fs.mkdirSync(working_path);

    // Use the mv() method to save the file there
    user_image.mv(working_path + new_filename, (err) => {
        if (err) { return res.status(500).send(err); }
        else {

		load_current_query_diat_str(working_path +"page.txt");

            // console.log("Uploaded file saved as " + working_path + new_filename);
            const ngram_search = false; // TODO(ra): make this work!
            const result = run_image_query(user_id, new_filename, working_path, ngram_search);
            if (result) { res.send(result); }
            else { return res.status(422).send('Could not process this file.'); }
        }
    });
});

app.post('/api/log', function(req, res) {
    const log_entry = req.body.log_entry;
    const log = req.body.log;
    if (!log_entry) { return res.status(400).send('No report was provided.'); }
    if (!log) { return res.status(400).send('No log was specified.'); }

    fs.appendFileSync('./logs/' + log, log_entry)

    res.send(

`Successfully logged:
    ${log_entry}
to log ${log}.`

    );
});

/*******************************************************************************
 * Query functions
 ******************************************************************************/

// method can be 'id' or 'words'
// query is a string, either holding the id a id+maws line
function search(method, query, jaccard, num_results, threshold, ngram) {
    if (ngram === undefined) { ngram = false; }
//    if(ngram_search == true) {ngram = true};

    if(!query) { // Need to report this back to browser/user
        console.log("No query provided!");
        return false;
    }

    let words;
    if (method === 'id') {
        if (!(query in EMO_IDS_MAWS)) { // TODO: need to report to frontend
 console.log("ID " + query + " not found in " + MAWS_DB);
            return;
        }
 
        words = ngram? EMO_IDS_NGRAMS[query] : EMO_IDS_MAWS[query];
    } else if (method === 'words') {
        parsed_line = parse_id_maws_line(query);
        words = parsed_line.words;
    }

//console.log(ngram? "NGRAM search: " : "MAW search: "+words);
    let signature_to_ids_dict;
    if (ngram) { signature_to_ids_dict = NGRAMS_to_IDS; }
    else { signature_to_ids_dict = MAWS_to_IDS; }

    return get_result_from_words(words, signature_to_ids_dict, jaccard, num_results, threshold, ngram);
}

// ** TODO NB: this only supports MAW-based searches at present
function search_with_code(diat_int_code, jaccard, num_results, threshold) {
    const codestring_path = './run/codestring_queries/';
    let next_working_dir;
    if (!fs.existsSync(codestring_path)){
        fs.mkdirSync(codestring_path);
        next_working_dir = 0;
    } else {
        dirs = fs.readdirSync(codestring_path);
        dirs.sort((a, b) => parseInt(a) - parseInt(b));
        last_dir = parseInt(dirs[dirs.length - 1]);
        next_working_dir = last_dir + 1;
    }
    working_path = codestring_path + next_working_dir + '/';
    if (!fs.existsSync(working_path)){ fs.mkdirSync(working_path); }

    const query_data = cp.execSync('./shell_scripts/codestring_to_maws.sh ' + diat_int_code + ' ' + working_path);
    const query_str = String(query_data); // a string of maws, preceded with an id
    const result = search('words', query_str, jaccard, num_results, threshold);
    return result;
}

// ** TODO NB: this only supports MAW-based searches at present
function run_image_query(user_id, user_image_filename, the_working_path, ngram_search) {
    const jaccard = true; // TODO(ra) should probably get this setting through the POST request, too...
    const num_results = 20; // TODO(ra) should probably get this setting through the POST request, too...
    const threshold = false; // TODO(ra) should probably get this setting through the POST request, too...

    let query_data;
    let query;
    let result;
    if(!ngram_search) {
        try {
            query_data = cp.execSync('./shell_scripts/image_to_maws.sh ' // script takes 2 command line params
                                     + user_image_filename + ' ' + the_working_path);
            query = String(query_data); // a string of maws, preceded with an id
        } catch (err) { return; } // something broke in the shell script...
        result = search('words', query, jaccard, num_results, threshold);
    }
    else {
        try {
            query_data = cp.execSync('./shell_scripts/image_to_ngrams.sh ' + user_image_filename + ' ' + the_working_path + ' ' + '9');
            query = String(query_data);
        } catch (err) { return; } // something broke in the shell script...
        if (query) { result = search('words', query, jaccard, num_results, threshold, true); }
    }

    return result;
}

function get_result_from_words(words, signature_to_ids_dict, jaccard, num_results, threshold, ngram) {
    if (words.length < 6) { // TODO: Need to report to frontend
        // console.log("Not enough words in query.");
        return [];
    }

// Safety check that the words are all unique:    
    const uniq_words = Array.from(new Set(words));
//if(words.length != uniq_words.length) console.log("words and uniq_words don't match.")
    const scores = get_scores(uniq_words, signature_to_ids_dict, ngram);
    const scores_pruned = get_pruned_and_sorted_scores(scores, uniq_words.length, jaccard,ngram);
    const result = gate_scores_by_threshold(scores_pruned, threshold, jaccard, num_results);
    return result;
}

function get_scores(words, signature_to_ids_dict, ngram) {
    var res = false;
    var scores = {};
    for (const word of words) {
        const ids = signature_to_ids_dict[word]
        if (!ids) { continue; }
        for(const id of ids) {
            if (!scores[id]) { scores[id] = 0; }
            scores[id]++;
        }
    }
    return scores;
}

function get_pruned_and_sorted_scores(scores, wds_in_q, jaccard, ngram) {
    var scores_pruned = [];

    // Prune
    for (var id in scores) {
        if (!scores.hasOwnProperty(id)) { continue; }
        const num = scores[id];
        if(num > 1) {
            result = {};

            const num_words = ngram? word_ngram_totals[id] : word_totals[id];
            result.id = id;
            result.num = num;
            result.num_words = num_words;
            result.codestring = EMO_IDS_DIAT_MELS[id];

            result.jaccard = 1 - (num / (num_words + wds_in_q - num));
if((result.jaccard < 0)&&(num > num_words)) console.log("num: "+num+" : num_words: "+num_words+" : jaccard: "+result.jaccard)
            scores_pruned.push(result);
        }
    }

    // Sort
    if (jaccard) {
        // Ascending, as 0 is identity match
        scores_pruned.sort((a, b) => { return a.jaccard - b.jaccard; });
    }
    else {
        // Descending
        scores_pruned.sort((a, b) => { return b.num - a.num; });
    }

    return scores_pruned;
}

function gate_scores_by_threshold(scores_pruned, threshold, jaccard, num_results) {
    // if threshold is set in URL, stop returning results when delta < threshold
    if (threshold) {
        const out_array = [];
        out_array[0] = scores_pruned[0];  // the identity match, or at least the best we have
        for(var p = 1; p < scores_pruned.length; p++) {
            var delta = 0;
            if (jaccard) { delta = jacc_delta(scores_pruned, p); }
            else { delta = scores_pruned[p - 1].num - scores_pruned[p].num; }
            if (threshold == "median") { threshold = 0 + getMedian(scores_pruned, jaccard); }
            if (delta >= threshold) {
                out_array[p] = scores_pruned[p];
                out_array[p].delta = delta;
            } else {
                num_results = p - 1;
                break;
            }
        }
        return out_array;
    } else {
        // return the first num_results results
        return scores_pruned.slice(0, num_results);
    }
}


/*******************************************************************************
 * Data loading
 ******************************************************************************/

function load_maws() { load_file(MAWS_DB, parse_maws_db); }
function load_diat_mels() { load_file(DIAT_MEL_DB, parse_diat_mels_db);}

function parse_maws_db(data_str) {
    const lines = data_str.split("\n");
    console.log(lines.length + " lines of MAWs to read...");

    const no_maws_ids = [];
    const short_maws_ids = [];
    for (const line of lines) {
        if (line) {
            parsed_line = parse_id_maws_line(line);
            const id = parsed_line.id;
            const words = parsed_line.words;

            if (words === undefined) { // TODO(ra): how should we handle these?
                no_maws_ids.push(id);
                continue;
            }

            EMO_IDS.push(id);
            EMO_IDS_MAWS[id] = words;

            if(words.length < 10) {
            	short_maws_ids.push(id);
            	continue;
            }
            word_totals[id] = words.length;
            for (const word of words) {
                if (!MAWS_to_IDS[word]) { MAWS_to_IDS[word] = []; }
                MAWS_to_IDS[word].push(id);
            }
        }
    }

    // fs.writeFile("./run/err.log", no_maws, () => {}); // write out ids with no maws
    // console.log(no_maws);
    // console.log(EMO_IDS);
    // console.log(EMO_IDS_MAWS);
    console.log(EMO_IDS.length + " lines of MAW data loaded!");
    console.log(no_maws_ids.length + " empty lines of MAW data rejected!");
    console.log(short_maws_ids.length + " lines with short MAW data rejected!");
}

function parse_diat_mels_db(data_str) {
    const lines = data_str.split("\n");
    console.log(lines.length + " lines of diatonic melody strings to read...");
    for (const line of lines) {
        if (line) {
            const [id, diat_mels_str] = line.split(/ (.+)/); // splits on first match of whitespace
            EMO_IDS_DIAT_MELS[id] = diat_mels_str;
        }
    }
    console.log(Object.keys(EMO_IDS_DIAT_MELS).length+" Diatonic melody strings loaded!");

	console.time('load_ngrams_from_diat_mels');
	load_ngrams_from_diat_mels(5);
	console.timeEnd('load_ngrams_from_diat_mels');
	
}

function load_ngrams_from_diat_mels (ng_len) {
	for(let id in EMO_IDS_DIAT_MELS) {
		if((typeof EMO_IDS_DIAT_MELS[id] != "undefined")&&(EMO_IDS_DIAT_MELS[id].length > ng_len)) {
			EMO_IDS_NGRAMS[id] = utils.ngram_array_as_set(EMO_IDS_DIAT_MELS[id],ng_len);
		}
	}
	console.log("Generated "+ng_len+"-grams for "+Object.keys(EMO_IDS_NGRAMS).length+" IDs.");
	
	var id_keys = Object.keys(EMO_IDS_NGRAMS);
	var ngram_array = Object.values(EMO_IDS_NGRAMS);
	for(id in id_keys) {
		var ngrams = ngram_array[id];
		word_ngram_totals[id_keys[id]] = ngrams.length;
		
		for (var ngram in ngrams) {
			if(!NGRAMS_to_IDS[ngrams[ngram]]) { 
				NGRAMS_to_IDS[ngrams[ngram]] = [];
			}
			NGRAMS_to_IDS[ngrams[ngram]].push(id_keys[id]);
		}
	}
	console.log("There are "+Object.keys(NGRAMS_to_IDS).length+" unique "+ng_len+"-grams");
	
/*
	// Write out the two arrays to disk
	fs.writeFile(NGRAM_ID_BASE+ng_len+".json",
		JSON.stringify(NGRAMS_to_IDS),
		(err) => {
		  if (err) throw err;
		  console.log('The ngram_id_dict has been saved!');
		}
	);
	fs.writeFile(ID_NGRAM_BASE+ng_len+".json",
		JSON.stringify(EMO_IDS_NGRAMS),
		(err) => {
		  if (err) throw err;
		  console.log('The id_ngram_dict has been saved!');
		}
	);
*/	
}
	
function load_file(file, data_callback) {
    // The 'db' is a text file, where each line is an EMO page ID,
    // followed by the MAWs for that page.

    console.log("Loading " + file);
    fs.readFile(file, 'utf8', (err, data) => {
        if (err) { throw err; }

        if (!data.length) {
            console.log("No data!");
        } else {
            data_callback(data);
        }
    });
}

function load_current_query_diat_str(q_diat_url) { load_file(q_diat_url, get_diat_str); }
function get_diat_str(data_str) {
console.log("url for mel str is "+q_diat_url);
    const lines = data_str.split("\n");
    console.log("Query string loaded!");
    q_diat_str =  lines[1];	// we want the second line of page.txt
}


/*******************************************************************************
 * Helpers
 ******************************************************************************/

function jacc_delta (array, n) {
    return array[n].jaccard - array[n - 1].jaccard;
}

function jacc_delta_log (array, n) {
    return Math.log(array[n].jaccard) - Math.log(array[n - 1].jaccard);
}

function console_sample(array, num, str) {
    console.log("Sampling array " + str + " - " + num + " entries");
    for(var i = 0;i < num;i++) {
        console.log(i + ". " + array[i].id);
    }
}

function getMedian(array, jaccard){
    var values = [];
    if(jaccard == "true") {
        for(let i = 0;i < array.length;i++) {
            values.push(array[i].jaccard);
        }
    }
    else {
        for(let i = 0;i < array.length;i++) {
            values.push(array[i].num);
        }
    }
    values.sort((a, b) => a - b);
    let median = (values[(values.length - 1) >> 1] + values[values.length >> 1]) / 2;
    console.log("Median = " + median);
    return median;
}

function parse_id_maws_line(line) {
    parsed_line = {};

    let [id, maws_str] = line.split(/ (.+)/); // splits on first match of whitespace

    if (id.charAt(0) === '>') { id = id.substring(1); } // remove leading > if it's there
    parsed_line.id = id;

    if (maws_str === undefined) { return parsed_line; }

    const words = maws_str.split(/[ ,]+/).filter(Boolean); // splits rest into words by whitespace
    parsed_line.words = words;
    return parsed_line;
}




// Takes two diatonic melody strings, and returns a pair of arrays
// that maps indicies of the melody to colours,
// if show_top_ngrams,  based on the longest ngrams common to both
// else, based on as much overlapping material as possible
function generate_index_to_colour_maps(q_diat_str, m_diat_str, show_top_ngrams) {
    let q_index_to_colour = [];
    let m_index_to_colour = [];

    if (show_top_ngrams) {
        const q_ngrams = [];
        const min_ngram_len = 3; // expose this as a tunable parameter to the frontend?
        for (let ngram_len = q_diat_str.length;
            ngram_len >= min_ngram_len;
            ngram_len--) {
            for(let i = 0; i + ngram_len <= q_diat_str.length; i++) {
                ngram_dict = {
                    ngram: q_diat_str.substr(i, ngram_len),
                    len: ngram_len,
                    pos: i
                };
                q_ngrams.push(ngram_dict);
            }
        }

        function get_all_substr_positions(str, substr) {
            const positions = [];
            let position = str.indexOf(substr);
            while (position !== -1) {
                positions.push(position);
                position = str.indexOf(substr, position + 1);
            }
            return positions;
        }

        const q_matches = [];
        const m_matches = [];

        for (i = 0; i < q_diat_str.length; i++) {
            q_matches.push(-1);
        }
        for (i = 0; i < m_diat_str.length; i++) {
            m_matches.push(-1);
        }


        // This isn't great -- ideally we want some kind of mix of short and long
        // ngrams that gives maximum coverage over both spaces with the minimal number
        // of ngrams...
        let match_idx = 0;
        for (const ngram_dict of q_ngrams) {
            const match_length = ngram_dict.len;
            const q_pos = ngram_dict.pos;
            const ngram_match_positions = get_all_substr_positions(m_diat_str, ngram_dict.ngram);
            if (ngram_match_positions.length) {
                for (pos of ngram_match_positions) {

                    let clean_match = true;
                    for (i = q_pos; i < q_pos + match_length; i++) {
                        if (q_matches[i] != -1) {
                            clean_match = false;
                            break;
                        }
                    }

                    if (!clean_match) { continue; }

                    for (i = pos; i < pos + match_length; i++) {
                        if (m_matches[i] != -1) {
                            clean_match = false;
                            break;
                        }
                    }

                    if (clean_match) {
                        for (i = q_pos; i < q_pos + match_length; i++) {
                            q_matches[i] = match_idx;
                        }
                        for (i = pos; i < pos + match_length; i++) {
                            m_matches[i] = match_idx;
                        }
                        match_idx++;
                    }

                    // console.log(ngram_dict);
                    // console.log(ngram_match_positions);
                }
            }
        }

        // console.log(q_matches);
        // console.log(m_matches);

        function produce_colour(i) {
            const colours = [
                'red',
                'orange',
                'yellow',
                'lime',
                'teal',
                'green',
                'blue',
                'aqua',
                'purple',
            ]

            if (i < colours.length) {
                const base_colour = colours[i];
                const modified_colour = Color(base_colour);
                return modified_colour.hex();
            }

            // else if (i < colours.length * 2) {
            //     // TODO(ra): make these colors better / more distinct...
            //     const base_colour = colours[i % colours.length];
            //     const modified_colour = Color(base_colour).saturate(.25).darken(.25);
            //     return modified_colour.hex();
            // }

            else { return 'grey'; }
        }


        let num_colours = 0;
        const colour_map = {};
        for (i = -1; i < match_idx; i++) {
            if (i === -1) { colour_map[i] = 'grey'; }
            else {
                colour_map[i] = produce_colour(num_colours);
                num_colours++;
            }
        }

        // console.log(colour_map);

        // TODO(ra): use filter / includes probably
        for (i = 0; i < q_matches.length; i++) {
            const match_idx = q_matches[i];
            q_index_to_colour.push(colour_map[match_idx]);
        }

        for (i = 0; i < m_matches.length; i++) {
            const match_idx = m_matches[i];
            m_index_to_colour.push(colour_map[match_idx]);
        }

    } else {

        const ngr_len = 5;

        q_ngrams = [];
        if(q_diat_str.length < ngr_len) {
            q_ngrams.push(q_diat_str + "%");
        } else if (q_diat_str.length == ngr_len) {
            q_ngrams.push(q_diat_str);
        } else {
            for(i = 0; i + ngr_len <= q_diat_str.length; i++) {
                q_ngrams.push(q_diat_str.substr(i, ngr_len));
            }
        }

        var q_common_ngram_locations = [];
        var m_common_ngram_locations = [];

        for(i = 0; i <= q_ngrams.length; i++) {
            var loc = m_diat_str.indexOf(q_ngrams[i]);
            if(loc >= 0) {
                q_common_ngram_locations.push(i);
                m_common_ngram_locations.push(loc);
            }
        }

        function create_colour_index(diat_mel_str, match_locations, ngr_len, match_colour, normal_colour) {
            let remaining_matched_notes;
            const output_array = [];
            for (let i = 0; i < diat_mel_str.length; i++) {
                if (match_locations.indexOf(i) > -1) {
                    // when we find a new start location
                    // we reset remaining_matched_notes
                    remaining_matched_notes = ngr_len;
                }
                if(remaining_matched_notes) {
                    output_array.push(match_colour);
                    remaining_matched_notes--;
                } else {
                    output_array.push(normal_colour);
                }
            }
            return output_array;
        }

        q_index_to_colour = create_colour_index(q_diat_str, q_common_ngram_locations, ngr_len, 'HotPink', 'Teal');
        m_index_to_colour = create_colour_index(m_diat_str, m_common_ngram_locations, ngr_len, 'LightSalmon', 'Teal');
    }

    return [q_index_to_colour, m_index_to_colour];
}
 