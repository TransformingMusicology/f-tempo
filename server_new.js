/*
This version of server.js loads a single json data file from its path (argument 1)
 and starts an express server on a specified port (argument 2).
*/

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
const utils = require('./static/src/utils.js');
const jq = require('./static/ext/jquery.min.js');
var	argv = require('minimist')(process.argv.slice(2));

const D_MBS_ID_PATHS = [];

var test = false;
var MAWS_DB = './data/latest_maws'; 

// var DIAT_MEL_DB = './data/latest_diat_mel_strs'; 
//var DIAT_MEL_DB = '/storage/ftempo/locations/all/codestrings'; 

const EMO_IDS = []; // all ids in the system

// FIXME!! We need to have the diat_mel_str for each id loaded into EMO_IDS_DIAT_MELS list
// (see codestring_server.js) but at present we don't have the
// diat_mel_str data pre-segmented like the MAWs; this needs to be done offline
//const EMO_IDS_DIAT_MELS = {}; // keys are ids, values are the diat_int_code for that id

const EMO_IDS_MAWS = {}; // keys are ids, values are an array of maws for that id
const MAWS_to_IDS = {}; // keys are maws, values are an array of all ids for which that maw appears
const EMO_IDS_NGRAMS = {}; // keys are ids, values are an array of ngrams for that id
const NGRAMS_to_IDS = {}; // keys are ngrams, values are a array of all ids in whose diat_int_code that ngram appears

const NGRAM_ID_BASE = "./data/ngram_id_dict_";
const ID_NGRAM_BASE = "./data/id_ngram_dict_";

var TP_JPG_LIST = "../static/src/jpg_list.txt";
const tp_jpgs = []; // URLs to title-pages (NB only for D-Mbs!)

const word_totals = []; // total words per id, used for normalization
const word_ngram_totals = []; // total words per id, used for normalization
const ngr_len = 5;

const app = express();
var ARG_LIST = [];

if(argv._.length) {
	ARG_LIST = argv._; // Arguments on command-line
}
else {
	console.log("No arguments provided!! Aborting!")
	process.exit(1);
}
var maws_db = ARG_LIST[0];
var port = ARG_LIST[1];
var path = require('path');
var source = path.basename(maws_db);

// Record this server start in the segment-server list
// NB the list needs to be cleared before any of the servers are started!
fs.appendFileSync("seg_server_list", source+" "+port+"\n");

var cors = require('cors');
app.use(cors());

/**/
// Set up middleware so external queries go to server's localhost
// Middleware for distributing search to multiple ports (see multi_search)
const {createProxyMiddleware} = require('http-proxy-middleware');
// TODO! Get this working right!
//app.use('/api/query_'+port, createProxyMiddleware({ target: 'http://127.0.0.1:'+port+'/api/query' }));
app.use('/api/query_'+port, createProxyMiddleware({ target: 'http://127.0.0.1:'+port+'/api/query', changeOrigin: true, pathRewrite: rewriteFunction }));

function rewriteFunction(path, req){
 return 'localhost:8000/api/query_'+port; // or whatever the localhost path should be
}

const BASE_IMG_URL = 'http://f-tempo-mbs.rism-ch.org/img/jpg/';
const BASE_MEI_URL = 'http://f-tempo-mbs.rism-ch.org/img/mei/';


/*******************************************************************************
 * Setup
 ******************************************************************************/
console.time("Full startup time");
console.log("F-TEMPO server started on port "+port+" at "+Date());

//load_file(TP_JPG_LIST,parse_tp_jpgs);

function parse_tp_jpgs(data_str) {
        let lines = data_str.split("\n");
    for (let line of lines) {
	var linecount;
        if (line) {
		tp_jpgs.push(line);
        }
    }
    console.log(port+": "+Object.keys(tp_jpgs).length+" title-page urls loaded!");
}

// CHANGE_ME!!
load_file(maws_db, parse_maws_db,source);

// CHANGE_ME!!
//load_diat_mels();
//	load_file(diat_mel_db, parse_diat_mels_db, DB_PREFIX_LIST[m]);

app.engine('html', mustacheExpress()); // render html templates using Mustache
app.set('view engine', 'html');
app.set('views', './templates');

// Test getting a codestring from id "D-Mbs_bsb00071943_00075"
// NB Made this synchronous to ensure it works on startup - probably unecessary otherwise
//const request = require('request'); // for asynchronous http requests
const request = require('sync-request'); // for synchronous http requests - NB different syntax!
var test_id = "D-Mbs_bsb00071943_00075";

function get_codestring(id) {
//	console.log("Seeking codestring for "+id)
	var codestring_found = "";
	var options = { json: {id: id} };
	var res=request("POST", "http://localhost:8500/api/id", options);
	codestring_found = res.getBody('utf8');
	return codestring_found;
}

app.use(express.static('static')); // serve static files out of /static

app.use(fileUpload()); // file upload stuff
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.listen(
    port,
    () => console.log('F-TEMPO server listening on port '+port+'!') // success callback
);

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

var q_Mbs = false;
var m_Mbs = false;
var q_diat_str;
var q_diat_url;
app.get('/compare', function (req, res) {

    // q for 'query', m for 'match'
    const q_id = req.query.qid;
    const m_id = req.query.mid;
    
    if(req.query.ng_len) var ngram_length = req.query.ng_len;
    else var ngram_length = ngr_len;

    if (!q_id || !m_id) { return res.status(400).send('q_id and m_id must be provided!'); }

    // Because D-Mbs MEI files are stored locally, we need to load them differently than those from URLs
    // q_Mbs and m_Mbs are globals
    if (parse_id(q_id).RISM == "D-Mbs")  q_Mbs = true;
    if (parse_id(m_id).RISM == "D-Mbs")  m_Mbs = true;

// Get page-images for query and match
    const img_ext = '.jpg';
    const base_img_url = BASE_IMG_URL;
    const q_jpg_url = base_img_url + q_id + img_ext;
    const m_jpg_url = base_img_url + m_id + img_ext;

//    Get both MEI files
    const mei_ext = '.mei';
    const base_mei_url = BASE_MEI_URL;
    var q_mei_url = base_mei_url + q_id + mei_ext;
    var m_mei_url = base_mei_url + m_id + mei_ext;

    //EMO_IDS_DIAT_MELS lists ids and codestrings;
    // this finds the line of the query and result pages
//    const q_diat_str = EMO_IDS_DIAT_MELS[q_id];
//    const m_diat_str = EMO_IDS_DIAT_MELS[m_id];
// Get the codestrings from the codestring server:
    const q_diat_str = get_codestring(q_id);
    const m_diat_str = get_codestring(m_id);
    if (!q_diat_str) { return res.status(400).send('Could not find melody string for this q_id '+q_id); }
    if (!m_diat_str) { return res.status(400).send('Could not find melody string for this m_id: '+m_id); }
    
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

	let q_mei = "";
	let m_mei = "";
	var ok = false;
console.log(port+": Getting query MEI "+q_mei_url+" from server")
	if(q_Mbs) {
//		q_mei = load_mei(q_mei_url);
		q_mei = load_file_sync(q_mei_url);
		if(!q_mei.length) return res.status(400).send('Could not find the MEI file '+q_mei_url);
	}
	else {
		request(q_mei_url, function (error, response, q_mei) { 
			if (!error && response.statusCode == 200) {
				ok = true;
			}
			else  return res.status(400).send('Could not find the MEI file '+q_mei_url);
		});
	}
console.log(port+": Done\nGetting match MEI "+m_mei_url+" from server")
	if(m_Mbs) {
//		m_mei = load_mei(m_mei_url);
		m_mei = load_file_sync(m_mei_url);
		if(!m_mei.length) return res.status(400).send('Could not find the MEI file '+m_mei_url);
	}
	else {
		request(m_mei_url, function (error, response, m_mei) { 
			if (!error && response.statusCode == 200) {
				ok = true;
			}
			else  return res.status(400).send('Could not find the MEI file '+q_mei_url);
		});
	}
console.log(port+": Done")
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
});


// Returns the number of all emo ids
// NB FOR THIS DATA-SEGMENT ONLY!!
app.get('/api/num_emo_ids', function (req, res) { res.send(EMO_IDS.length+" pages in database"); });

// Returns an array of all emo ids
// NB FOR THIS DATA-SEGMENT ONLY!!
app.get('/api/emo_ids', function (req, res) { res.send(EMO_IDS); });

// Returns an array of MAWs for requested ID
// if it is in THIS DATA-SEGMENT
// else just returns false - ?? - OR do nothing
app.post('/api/maws_from_id', function (req, res) { 

	let id = req.body.id;
//console.log(port+": MAWs request for " + id)
//console.log(port+" Request body: " + JSON.stringify(req.body))
//	if(id == undefined) return false;
	let result = EMO_IDS_MAWS[id];
	if(typeof result != "undefined") {
	//	console.log(port+": found result: "+ result)
		res.send(JSON.stringify(result));
	}
	else res.send("");
//	else return false;
});

// Handle a query
app.post('/api/query', function (req, res) {

console.log(port+" Request body: " + JSON.stringify(req.body))

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

    let result={};
    if(req.body.qstring) {
        // console.log('Querying by string...');
        const query = req.body.qstring;
        result = search('words', query, jaccard, num_results, threshold, ngram);
    } else if(req.body.id) {
        if(ngram) result = search('id', req.body.id, jaccard, num_results, threshold, ngram);
        else result = search('id', req.body.id, jaccard, num_results, threshold, ngram);
    } else if(req.body.codestring) {
        console.log("codestring is: " +req.body.codestring)
        result = search_with_code(req.body.codestring, jaccard, num_results, threshold, ngram);
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
// query is a string, either holding the id or a id+maws line
function search(method, query, jaccard, num_results, threshold, ngram, codestring) {
    if (ngram === undefined) { ngram = false; }

    if(!query) { // Need to report this back to browser/user
        console.log(port+": No query provided!");
        return false;
    }
    else {
    		console.log("Request "+method)
    }
    let words;
    if (method === 'id') { 
	    return search_with_code(codestring, jaccard, num_results, threshold);
    } 
    else if (method === 'words') {
        parsed_line = parse_id_maws_line(query);
        words = parsed_line.words;
    }

// Get the list we need to search for candidate IDs from the selected collections
// MAWS_to_IDS was already updated to reflect selection, so we can use that
    let signature_to_ids_dict;
    if (ngram) { signature_to_ids_dict = NGRAMS_to_IDS; }
    else { signature_to_ids_dict = MAWS_to_IDS; }
    return get_result_from_words(words, signature_to_ids_dict, jaccard, num_results, threshold, ngram);
}

// ** TODO NB: this only supports MAW-based searches at present
function search_with_code(diat_int_code, jaccard, num_results, threshold) {
    const codestring_path = './run/codestring_queries/'+port+"/";
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
console.log("Set up working directory: "+working_path);
//    const query_data = cp.execSync('../shell_scripts/codestring_to_maws.sh ' + diat_int_code + ' ' + working_path);
    const query_data = cp.execSync('./shell_scripts/codestring_to_maws.sh ' + diat_int_code + ' ' + working_path);
    const query_str = String(query_data); // a string of maws, preceded with an id
    var result = search('words', query_str, jaccard, num_results, threshold);
fs.appendFileSync(working_path+"/log",result)
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
//console.time("search");

// Safety check that the words are all unique:    
    const uniq_words = Array.from(new Set(words));
    const scores = get_scores(uniq_words, signature_to_ids_dict, ngram);
//console.time("pruning")
    const scores_pruned = get_pruned_and_sorted_scores(scores, uniq_words.length, jaccard,ngram);
//console.timeEnd("pruning")
    const result = gate_scores_by_threshold(scores_pruned, threshold, jaccard, num_results);
//console.timeEnd("search");
    return result;
}

function get_scores(words, signature_to_ids_dict, ngram) {
    var res = false;
    var scores = {};
//console.time("get_scores")
    for (const word of words) {
        const ids = signature_to_ids_dict[word]
        if (!ids) { continue; }
        for(const id of ids) {
		   if (!scores[id]) { scores[id] = 0; }
		   scores[id]++;
        }
    }
//console.timeEnd("get_scores");
    return scores;
}

function get_pruned_and_sorted_scores(scores, wds_in_q, jaccard, ngram) {
    var scores_pruned = [];

    // Prune
    for (var id in scores) {
        if (!scores.hasOwnProperty(id)) { continue; }
 //       if(! PAGES_TO_SEARCH.filter(e=>e.id===id).length>0) {continue;}
        const num = scores[id];
        if(num > 1) {
            result = {};

            const num_words = ngram? word_ngram_totals[id] : word_totals[id];
            result.id = id;
            result.num = num;
            result.num_words = num_words;
//            result.codestring = get_codestring(id);
//            result.codestring = "codestring coming soon ..."
//            result.codestring = EMO_IDS_DIAT_MELS[id];

            result.jaccard = 1 - (num / (num_words + wds_in_q - num));
//if((result.jaccard < 0)&&(num > num_words)) console.log(port+": "+id+" : num: "+num+" : num_words: "+num_words+" : jaccard: "+result.jaccard+" : codestring: "+result.codestring)
if((result.jaccard < 0)&&(num > num_words)) console.log(port+": "+id+" : num: "+num+" : num_words: "+num_words+" : jaccard: "+result.jaccard)
            scores_pruned.push(result);
        }
    }
//console.time("sort")
    // Sort
    if (jaccard) {
        // Ascending, as 0 is identity match
        scores_pruned.sort((a, b) => { return a.jaccard - b.jaccard; });
    }
    else {
        // Descending
        scores_pruned.sort((a, b) => { return b.num - a.num; });
    }
//console.timeEnd("sort")
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

function load_maws() { load_file(MAWS_DB, parse_maws_db,"basic"); }
//function load_diat_mels() { load_file(DIAT_MEL_DB, parse_diat_mels_db,"all");}

function ensureKey(key, dataset){
 if(!(key in dataset)) dataset[key] = {};
 return dataset[key];
}

var DB_OBJ_LIST = {};
function parse_maws_db(data_str,source) {
    var data_obj = JSON.parse(data_str);
    
//    let lines = data_str.split("\n");
    let IDs = Object.keys(data_obj);
    let words_array = Object.values(data_obj);
    console.log(port+": "+IDs.length + " lines of MAWs to read from "+source+" ...");
    
    const no_maws_ids = [];
    const short_maws_ids = [];
    var line_count = 0;
    for(var i=0;i<IDs.length;i++) {
            const id = IDs[i];
            const words = words_array[i];
            if (words === undefined) { // TODO(ra): how should we handle these?
                no_maws_ids.push(id);
                continue;
            }
            var item = parse_id(id);
            
            EMO_IDS.push(id);

/*            
            EMO_IDS_MAWS[id] = words; 
            if(words.length < 10) {
            	short_maws_ids.push(id);
            	continue;
            }
            var coll = ensureKey(item.RISM,DB_OBJ_LIST);
            var book = ensureKey(item.book,coll);
            var page = ensureKey(item.page,book);
            book[item.page] = words;

            word_totals[id] = words.length;
            for (const word of words) {
                if (!MAWS_to_IDS[word]) { MAWS_to_IDS[word] = []; }
                MAWS_to_IDS[word].push(id);
            }
*/

	var uniq_words = Array.from(new Set(words));

           EMO_IDS_MAWS[id] = uniq_words;
            if(uniq_words.length < 10) {
            	short_maws_ids.push(id);
            	continue;
            }
            var coll = ensureKey(item.RISM,DB_OBJ_LIST);
            var book = ensureKey(item.book,coll);
            var page = ensureKey(item.page,book);
            book[item.page] = uniq_words;
            word_totals[id] = uniq_words.length;
            for (const word of uniq_words) {
                if (!MAWS_to_IDS[word]) { MAWS_to_IDS[word] = []; }
                MAWS_to_IDS[word].push(id);
            }
            
      	  line_count++;
        }        
        process.stdout.write((("  "+line_count/IDs.length)*100).toFixed(2)+"%"+"\r") 
    }

function load_ngrams_from_diat_mels (ng_len) {
/*
	for(let id in EMO_IDS_DIAT_MELS) {
		if((typeof EMO_IDS_DIAT_MELS[id] != "undefined")&&(EMO_IDS_DIAT_MELS[id].length > ng_len)) {
			EMO_IDS_NGRAMS[id] = utils.ngram_array_as_set(EMO_IDS_DIAT_MELS[id],ng_len);
		}
	}
	var id_total = Object.keys(EMO_IDS_NGRAMS).length;
	var id_count = 0;
	console.log(port+": Generated "+ng_len+"-grams for "+id_total+" IDs.");
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
		id_count++;
		process.stdout.write((("  "+id_count/id_total)*100).toFixed(2)+"%"+"\r") 
	}
	console.log(port+": There are "+Object.keys(NGRAMS_to_IDS).length+" unique "+ng_len+"-grams");
*/
/*
	// Write out the two arrays to disk
	fs.writeFile(NGRAM_ID_BASE+ng_len+".json",
		JSON.stringify(NGRAMS_to_IDS),
		(err) => {
		  if (err) throw err;
		  console.log(port+': The ngram_id_dict has been saved!');
		}
	);
	fs.writeFile(ID_NGRAM_BASE+ng_len+".json",
		JSON.stringify(EMO_IDS_NGRAMS),
		(err) => {
		  if (err) throw err;
		  console.log(port+': The id_ngram_dict has been saved!');
		}
	);
*/
}

function load_file(file, data_callback,source) {
//    console.log(port+": Loading " + file);
    fs.readFile(file, 'utf8', (err, data) => {
        if (err) { throw err; }

        if (!data.length) {
            console.log(port+": No data!");
        } else {
            data_callback(data,source);
        }
    });
}

function load_file_sync(file) {
	if(file.startsWith("http")) {
		var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
		var request = new XMLHttpRequest();
		request.open('GET', file, false);  // `false` makes the request synchronous
		request.send(null);
		if (request.status === 200) {
		  return request.responseText;
		}
	}
	else {
//	console.log(port+": Loading " + file + " synchronously");
		var data = fs.readFileSync(file, 'utf8');
	}
//	console.log(port+"    "+data.length);
	return data;
}

function load_current_query_diat_str(q_diat_url) { load_file(q_diat_url, get_diat_str); }

function load_image_query_diat_str(q_diat_url) {
	var datastr = load_file_sync(q_diat_url); 
	get_diat_str(datastr);
}

function get_diat_str(data_str) {
console.log(port+": url for mel str is "+q_diat_url);
    const lines = data_str.split("\n");
    console.log(port+": Query string loaded!");
    q_diat_str =  lines[1];	// we want the second line of page.txt
}

function load_mei(url) { load_file(url, get_mei); }
function get_mei(data_str) {
console.log(port+": url for mei is "+url);
    console.log(port+": Query string loaded!");
    return data_str
}


/*******************************************************************************
 * Helpers
 ******************************************************************************/

function get_page_words(id) {  // returns the list (object) of MAWs for a page specified by id
	var parsed_id = parse_id(id);
	var collection = parsed_id.RISM;
	var book = parsed_id.book;
	var page = parsed_id.page;
	var page_obj = {};
	page_obj.id = id;
	page_obj.words = DB_OBJ_LIST[collection][book][page];
	return page_obj;
}
function get_book_words(id) {  // returns array of all the page-objects of the book identified in id
// !! NB The book-naming is broken for F-Pn ids, since they named the images in a bizarre way!!
// Usage: works with either
//	 get_book_words("GB-Lbl_A103_2_050_1") -- useful for 'this book' searches from GUI
// or get_book_words("GB-Lbl_A103_2")
	var parsed_id = parse_id(id);
	var collection = parsed_id.RISM;
	var book = parsed_id.book;
	var book_arr = [];
	var pages=Object.keys(DB_OBJ_LIST[collection][book])
	for(var i=0;i<pages.length;i++) {
		var page_obj={};
		page_obj.id = collection+"_"+book+"_"+pages[i];
		page_obj.words = DB_OBJ_LIST[collection][book][pages[i]];
		book_arr.push(page_obj);
	}
	return book_arr;
}
function get_RISM_words(id) {  // returns array of all page-objects of all books in collection identified in id
// Usage: works with either
//	 get_RISM_words("GB-Lbl_A103_2_050_1") -- useful for 'this collection' searches from GUI
// or get_RISM_words("GB-Lbl_A103_2")
// or get_RISM_words("GB-Lbl")
	var parsed_id = parse_id(id);
	var collection = parsed_id.RISM;
	var coll_arr = [];
	var books=Object.keys(DB_OBJ_LIST[collection]);
	for (var j=0;j<books.length;j++) {
		var pages=Object.keys(DB_OBJ_LIST[collection][books[j]])
		for (var i=0;i<pages.length;i++) {
			var page_obj={};
			page_obj.id = collection+"_"+books[j]+"_"+pages[i];
			page_obj.words = DB_OBJ_LIST[collection][books[j]][pages[i]];			
			coll_arr.push(page_obj);
		}
	}
	return coll_arr;
}
function get_multiple_RISM_words (RISM_array) { // takes array of RISM sigla strings
// Usage: get_multiple_RISM_words(["GB-Lbl","D-Mbs"])
	var full_array = [];
	for(var i=0;i<RISM_array.length;i++) {
		full_array = full_array.concat(get_RISM_words(RISM_array[i]));		
	}
	return full_array;
}
function get_all_words() { // returns array of id/MAW objects for all pages of all books
	all_words_arr = [];
	var collections = Object.keys(DB_OBJ_LIST);
	for(var i=0;i<collections.length;i++) {
		var books = Object.keys(DB_OBJ_LIST[collections[i]]);
		for(j=0;j<books.length;j++) {
			var pages=Object.keys(DB_OBJ_LIST[collections[i]][books[j]])
			for (var k=0;k<pages.length;k++) {
				var page_obj={};
				page_obj.id = collections[i]+"_"+books[j]+"_"+pages[k];
				page_obj.words = DB_OBJ_LIST[collections[i]][books[j]][pages[i]];			
				all_words_arr.push(page_obj);
			}
		}
	}
	return all_words_arr;
}

// Get library siglum, book siglum and page_code from id
// The book siglum is the section of the id following the RISM siglum
// NB The style of underscore-separation differs between collections
function parse_id(id) {
	let parsed_id = {};
	let segment = id.split("_");   
// The library RISM siglum is always the prefix to the id,
// followed by the first underscore in the id.
	parsed_id.RISM=segment[0];
	switch (parsed_id.RISM) {
		case "D-Mbs":
		case "PL-Wn":
			parsed_id.book = segment[1];
			parsed_id.page = segment[2];
			break;
        	case "F-Pn":
        	case "GB-Lbl": 
			if (segment.length == 4) { 
				parsed_id.book = segment[1];
				parsed_id.page = segment[2]+"_"+segment[3];
			  }
			  else {
				parsed_id.book = segment[1]+"_"+segment[2];
				parsed_id.page = segment[3]+"_"+segment[4];
			  }          
			break;
		case "D-Bsb":
			if(segment.length == 6) {
				parsed_id.book = segment[1]+"_"+segment[2]+"_"+segment[3];
				parsed_id.page = segment[4]+"_"+segment[5];	
			}
			if(segment.length == 7) {
				parsed_id.book = segment[1]+"_"+segment[2]+"_"+segment[3];
				parsed_id.page = segment[4]+"_"+segment[5]+"_"+segment[6];	
			}
	}   
	return parsed_id;
}

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
