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

// Global variables
let num_results = 15; // default
let query_id = "";
let db_name ="";
let highlighted_result_row = 0;
let jaccard = true;
let corpus_search_mode = true; // false when image search mode
let matched_words = []; // Arrays for displaying match stats in result list
let words_in_page = []; // ''
let emo_ids; // Array of page IDs loaded from database on initialisatiom
let user_id; // for identifying user to logs, etc.
let can_store_user_id = false;

//let ngram_search = false;

function get_or_set_user_id() {
    if (storageAvailable('localStorage')) {
        // console.log("Local Storage available!")
        user_id = localStorage.getItem("userID");
        can_store_user_id = true;

        if(!user_id) {
            console.log("Setting new user_id!")
            user_id = uniqueID();
            localStorage.setItem("userID", user_id);
        }
    } else {
        console.log("No Local Storage available! Setting new temporary user_id")
        user_id = uniqueID();
    }
    // console.log("user_id is " + user_id);
}

function load_page_query(id) {
    // $('#search_controls').addClass('d-none');
    // $('#emo_browser_buttons').addClass('d-none');
    clear_result_divs();

    document.getElementById("query_id").value = id;
    image = id + ".jpg";
    document.getElementById("q_page_display").innerHTML = "Query page: " + id;
    document.getElementById("emo_image_display").innerHTML = "<img class='img-fluid' id='query_image' src='http://doc.gold.ac.uk/~mas01tc/new_page_dir_50/"+image+"' role=\"presentation\"/>";
    $('#emo_image_display').zoom();

    // $('#search_controls').removeClass('d-none');
    // $('#emo_browser_buttons').removeClass('d-none');
}

function get_query_from_id(id) {
    for(var i=0;i<emo_ids.length;i++) {
        if((emo_ids[i].startsWith(">"+id))||(emo_ids[i].startsWith(id))) return emo_ids[i];
    }
    return false
}

ngr_len = 5;
// Canvas needs to be created and supplied!
function lineAt(canvas,startx,starty,colour) {
	let h = canvas.height;
	let ctx = canvas.getContext("2d");
	ctx.beginPath();
	ctx.moveTo(startx, starty);
	ctx.lineTo(startx,starty+h) ;
	ctx.strokeStyle = colour;
	ctx.lineWidth = 2;
	ctx.stroke();
}
function display_cosine_sim_line(json) {            
	var results = json;
	var q_str = results[0].codestring;
	for(let q = 1; q < num_results; q++) {
		let progID = 'progress'+q;
		let progRect = document.getElementById(progID).getBoundingClientRect();
		let canWidth = progRect.width;
		let canHeight = progRect.height;
		let canTop = progRect.top;
		let canLeft = progRect.left;
		let canID = 'canvas'+q;
		let canv = document.createElement('canvas');
		canv.id = canID;
		document.getElementById(progID).parentNode.appendChild(canv);
//		document.getElementById(progID).parentNode.insertBefore(canv,document.getElementById(progID).nextSibling);
		canv.style.position="absolute";
		canv.style.zIndex="2";
		canv.width=canWidth;
//		canv.height=canHeight;
		canv.height="5";
		canv.top=(canTop-canHeight)+"px";
		canv.left=canLeft;
		m_str = results[q].codestring;
		var cos_sim = textCosineSimilarity(ngram_array(q_str,ngr_len).join(' '), ngram_array(m_str,ngr_len).join(' '));
		var line_x = cos_sim * canv.width;
		lineAt(canv,line_x,0,"red");
	}
}

// Basic remote search function.
function search(id, jaccard, num_results, ngram_search) {
    search_data = JSON.stringify({ id, jaccard, num_results, threshold, ngram_search});
//console.log(search_data)
    $.ajax({
        url: 'api/query',
        method: 'POST',
        data: search_data,
        contentType: 'application/json',
    }).done(show_results)
      .fail((xhr, status) => alert(status)); // TODO: real error handling!
}

function code_search(diat_int_code, jaccard, num_results) {
    search_data = JSON.stringify({ diat_int_code, jaccard, num_results, threshold });
    $.ajax({
        url: 'api/query',
        method: 'POST',
        data: search_data,
        contentType: 'application/json',
    }).done(show_results)
      .fail((xhr, status) => alert(status)); // TODO: real error handling!
}


function search_by_active_query_id(load_query_image=false, ngram_search) {
    query_id = document.getElementById("query_id").value;
    if (load_query_image) {
        load_page_query(query_id);
    }
    search(query_id, jaccard, num_results, ngram_search);
}



function preloadImages(srcs) {
    if (!preloadImages.cache) {
        preloadImages.cache = [];
    }
    var img;
    // leave out srcs[0] as it's the query, and already loaded
    for (var i = 1; i < srcs.length; i++) {
        img = new Image();
        img.src = srcs[i];
        preloadImages.cache.push(img);
    }
}
var imageSrcs = [];

function show_results(json) {
    var result_num = 0;
    var results = json;
    const provide_judgements = $('#provide_judgements').is(':checked');


    if (json.length < 2) {
        console.log("No results for " + query_id + "!")
        document.getElementById("result_id_msg").innerHTML = "<font color='red'>No results!!</font>";        
        return false;
    }

    num_results = results.length;

    let table_html = "<thead><tr><th colspan=3>" + num_results + " results - "
                 + results[0].num_words + " words in query</th></tr>"
                 + "<tr><th>Page ID</th>"
                 + "<th>Match Score</th>";
    if(provide_judgements) {
        table_html += "<th>Judge Match</th>";
    }
        table_html += "</tr></thead>"
                 + "<tbody class='table_body'>";



    for(let q = 0; q < results.length; q++) {
        let rank_factor;

        // NOTE: the else here is wrong if we don't assume that the
        // 0th result is the identity match
        if (jaccard) { rank_factor = 1 - results[q].jaccard; }
        else { rank_factor = results[q].num / results[0].num_words };

        matched_words[q] = results[q].num;
        words_in_page[q] = results[q].num_words;
        var result_row_id = "result_row"+q;
        var target_id = results[q].id;
        var sim_choice_id = "sim_choice"+q;
        var sim_id = "sim"+q;
        //               imageSrcs.push("http://doc.gold.ac.uk/~mas01tc/page_dir/"+results[q].id+".jpg");
        imageSrcs.push("http://doc.gold.ac.uk/~mas01tc/new_page_dir_50/"+results[q].id+".jpg");

        const rank_percentage = (rank_factor * 100).toFixed(2);

        if(corpus_search_mode && results[q].id == query_id) {
            table_html +=
                "<tr class='id_list_name' id='"+result_row_id
                +"' onclick='load_result_image(\""+target_id+"\","+q+","+(rank_factor*100).toFixed(1)+");'>"
//                +"<td text-align='center' style='color:blue'><small>" +target_id+"</small></td>"
                +"<td text-align='center' style='color:blue; font-size: 10px'>" +target_id+"</td>"
          //      + "<td onclick='compare(\""+query_id+"\",\""+results[q].id+"\");'>"
               + "<td>"
                + '<div class="progress">'
                + '<div class="progress-bar" role="progressbar" style="width: ' + rank_percentage + '%;" aria-valuenow="' + rank_percentage + '" aria-valuemin="0" aria-valuemax="100">' + rank_percentage + '</div>'
                + "</td>";
            if (provide_judgements) {
                table_html += "<td id='"+sim_choice_id+"'>"
                   +"<select class='drop_downs'"
                    +"onchange='log_user_choice(\""+query_id+"\",\""
                    +target_id+"\","
                    +q+", \""
                    +db_name+"\");'"
                    +" id='"+sim_id+"'>"
                    +"<option selected' value='0'></option>"
                    +"<option value='notm'>Not music!</option>"
                    +"</select>"
                    +"</td>"
            }
            table_html += "</tr>";

        } else {
            table_html +=
                "<tr class='id_list_name' id='"+result_row_id
                + "' onclick='load_result_image(\""+target_id+"\","+q+","+(rank_factor*100).toFixed(1)+");'>"
//                +"<td text-align='center' style='color:blue'><small>" +target_id+"</small></td>"
                +"<td text-align='center' style='color:blue; font-size: 10px'>" +target_id+"</td>"
         //       + "<td onclick='compare(\""+query_id+"\",\""+results[q].id+"\");'>"
                + "<td>"
                + '<div class="progress" id="progress'+q+'">'
                + '<div class="progress-bar" role="progressbar" style="width: ' + rank_percentage + '%;" aria-valuenow="' + rank_percentage + '" aria-valuemin="0" aria-valuemax="100">' + rank_percentage + '</div>'
                + "</td>"
                + "<td><img class='mag-glass' width='16' height='16' src='img/magnifying-glass.svg' onclick='compare(\""+query_id+"\",\""+results[q].id+"\")'/></td>";
            if (provide_judgements) {
                table_html += "<td id='"+sim_choice_id+"'>"
                    + "<select  class='drop_downs'"
                    + "onchange='log_user_choice(\""+query_id+"\",\""
                    + target_id+"\","
                    + q+", "
                    + "\""+db_name+"\");'"
                    + " id='"+sim_id+"'>"
                    + "<option selected' value='0'></option>"
                    + "<option value='dupl'>Duplicate page</option>"
                    + "<option value='same'>Same music</option>"
                    + "<option value='relv'>Related music</option>"
                    + "<option value='notm'>Not music!</option>"
                    + "</select>"
                    + "</td>";
            }
            table_html += "</tr>";
        }
    }
    preloadImages(imageSrcs);
    table_html += "</tbody>";

    $('#results_table').html(table_html);

    const top_result_id = results[0].id;
    let top_result_rank_factor;
    if (jaccard) { top_result_rank_factor = 1 - results[0].jaccard; }
    else { top_result_rank_factor = results[0].num / results[0].num_words };

    load_result_image(top_result_id, 0, top_result_rank_factor);

   if(query_id.length) {
	   display_cosine_sim_line(json);
	}
}


function compare(a,b) {
    var url="compare?qid="+a+"&mid="+b; 
    window.open(url, "Compare pages","comp_win");
}


function highlight_result_row(rank) {
    let rowID;
    for(var i=0; i < num_results; i++) {
        rowID = "result_row" + i;
        if (document.getElementById(rowID).style != null) {
            document.getElementById(rowID).style.backgroundColor = "White";
        }
    }
    rowID = "result_row" + rank;
    document.getElementById(rowID).style.backgroundColor = "LightPink";
    highlighted_result_row = rank;
}


function load_result_image(id, rank, percent) {
    if (!id) {
        document.getElementById("result_id_msg").innerHTML = "";
        document.getElementById("result_image_display").innerHTML = "";
        return false;
    }
    image = id + ".jpg";

    if (query_id != id) {
        document.getElementById("result_id_msg").innerHTML =
            matched_words[rank]+"/"+words_in_page[rank]+" words in page match the query"; }

    else {
        document.getElementById("result_id_msg").innerHTML = "Query: "+id;
    }

//    document.getElementById("result_image_display").innerHTML = "<img class='img-fluid' id='result_image' src='http://doc.gold.ac.uk/~mas01tc/page_dir_50/"+image+"' />";
    document.getElementById("result_image_display").innerHTML = "<img class='img-fluid' id='result_image' src='http://doc.gold.ac.uk/~mas01tc/new_page_dir_50/"+image+"' />";
    highlight_result_row(rank);
    $('#result_image_display').zoom();
    document.getElementById("query_id").value = id;
    //                load_lyrics(id, false);
}


// Load emo_ids at startup
function get_emo_ids(){
    $.ajax({
        type: "GET",
        url: "api/emo_ids",
        success: (db_emo_ids) => {
            emo_ids = db_emo_ids;
            // console.log(emo_ids);
        }
    });
}

/*********** Utility functions: ***********/
function storageAvailable(type) {
    try {
        var storage = window[type],
            x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            storage.length !== 0;
    }
}
function getFormattedDate() {
    var date = new Date();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    month = (month < 10 ? "0" : "") + month;
    day = (day < 10 ? "0" : "") + day;
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;
    var str = date.getFullYear() + "-" + month + "-" + day + "_" +  hour + ":" + min + ":" + sec;
    return str;
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// From: https://gist.github.com/gordonbrander/2230317
function uniqueID(){
    function chr4(){
        return Math.random().toString(16).slice(-4);
    }
    return chr4() + chr4() +
        '-' + chr4() +
        '-' + chr4() +
        '-' + chr4() +
        '-' + chr4() + chr4() + chr4();
}

function log_user_choice(query_id,target_id,result_num,database) {
    var the_time = getFormattedDate();
    var sim_id="sim"+result_num;
    var sim_choice = document.getElementById(sim_id).value;
    var log_entry = the_time+"\t";
    if(can_store_user_id) {
        log_entry += localStorage.getItem("userID");
    }
    else {
        log_entry += user_id;
    }
    log_entry += "\t"
        +query_id + "\t"
        +target_id + "\t"
        +sim_choice + "\t"
        + database + "\t"
        + 'rank: ' + result_num + ": " + (jaccard ? 'Jaccard distance' : 'Basic')
        + "\n";

    $.ajax({
        type: "POST",
        url: "api/log",
        data: {
            log_entry: log_entry,
            log: 'user_choice.log'
        },
        dataType:'TEXT',
        success: function(response){
            console.log(response);
        }
    });
}

// Server-side - user need never be aware of this; log needs to be on remote server - see log_search_problem.php
function log_search_problem(query_id,message,database) {
    var the_time = getFormattedDate();
    var log_entry = the_time+"\t";
    if(can_store_user_id) {
        log_entry += localStorage.getItem("userID");
    }
    else {
        log_entry += user_id;
    }
    log_entry += "\t" +query_id+"\t" + database+"\t" + message;
    $.ajax({
        type: "POST",
        url: "api/log",
        data: {
            log_entry: log_entry,
            log: 'search_problems.log'
        },
        dataType:'TEXT',
        success: function(response){
            console.log(response);
        }
    });
}

// Client-side UI stuff
function checkKey(e) {
    
    e = e || window.event;
    var shiftDown = e.shiftKey;

    if([13, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }

    if (e.keyCode == '38' || e.keyCode == '40') {
        // highlighting stuff
        let result_row = "result_row";

        if (e.keyCode == '38') {    // up arrow
            if(highlighted_result_row > 0) {
                result_row += highlighted_result_row - 1;
            } else {
                return;
            }
        } else if (e.keyCode == '40') {    // down arrow
            if (highlighted_result_row < num_results - 1) {
                result_row += highlighted_result_row + 1;
            } else {
//                result_row += 0; // is this a typo?
                result_row = "result_row0";
            }
        }
        document.getElementById(result_row).click();
        return;
    }
    if (e.keyCode == '37') {    // left arrow - Search previous page/book
        (shiftDown)? find_book_id(false) : find_page_id(false);
        query_id = document.getElementById("query_id").value;
    } else if (e.keyCode == '39') {    // right arrow - Search next page/book
        (shiftDown)? find_book_id(true) : find_page_id(true);
        query_id = document.getElementById("query_id").value;
    } else if (e.keyCode == '220') { // '\' for random query
        document.getElementById("query_id").value = emo_ids[getRandomIntInclusive(0, emo_ids.length)];
        query_id = document.getElementById("query_id").value;    
        load_page_query(query_id);
    } else if (e.keyCode == '13') { // enter to search
        query_id = document.getElementById("query_id").value;
        ngram_search = change_search_method();
        search_by_active_query_id(true, ngram_search);

    }    
}

// Unused??
var dl_text =  "";
// Unused??
function PreviewText() {
    var oFReader = new FileReader();
    oFReader.readAsText(document.getElementById("uploadText").files[0]);
    oFReader.onload = function (oFREvent) {
        dl_text = document.getElementById("uploadTextValue").value = oFREvent.target.result;
        // We now have it so can delete the hidden input value
        document.getElementById("uploadTextValue").value = "";
    };
};



// Client-side, though this needs to interact with server, as book data will be on server, not client
// Book IDs are always at the beginning of the ID, following the library RISM siglum, which is itself followed by the first underscore char.
// However, their format varies from library to library, so we need to take care of this.

function find_book_id(next) {
    var this_id = document.getElementById("query_id").value;
    if(this_id == null) return false;
    else {
        for(var i=0;i<emo_ids.length;i++) {
            if((emo_ids[i].startsWith(">"+this_id))||(emo_ids[i].startsWith(this_id))) {
                break;
            }
        }
        if(((i==0)&&(!next))||((i==emo_ids.length)&&(next))) return;
        // now find next/prev item starting with a different id
        var this_book = "";
        var id_segs =  this_id.split("_");
        var seg_from_end = this_id.startsWith("PL-Wn")? 2 : 3;
        if(this_id.startsWith("F-Pn")) {
        	if((p = this_id.indexOf("-0-")) >= 0) {
        		seg_from_end = this_id.length - p + 1;
        	}
		console.log("length: "+this_id.length+" p: "+p)
       }
//        for(j=0;j<id_segs.length-3;j++) this_book+=id_segs[j]+"_";
        for(j=0;j<id_segs.length-seg_from_end;j++) this_book+=id_segs[j]+"_";
        this_book+=id_segs[j];
        var new_id = "";
        var new_book = "";
        if(next) {
            for(;i<emo_ids.length;i++) {
                new_book = "";
                new_id = emo_ids[i].split(/[ ,]+/).filter(Boolean)[0];
                id_segs =  new_id.split("_");
//                for(j=0;j<id_segs.length-3;j++) new_book+=id_segs[j]+"_";
                for(j=0;j<id_segs.length-seg_from_end;j++) new_book+=id_segs[j]+"_";
                new_book+=id_segs[j];
                if(new_book.startsWith(">")) new_book = new_book.substring(1);
                if(new_book != this_book) {
                    break;
                }
            }
        }
        else {
            for(;i>0;i--) {
                // FIXME - stand by for messy recursion!!
                new_book = "";
                new_id = emo_ids[i].split(/[ ,]+/).filter(Boolean)[0];
                id_segs =  new_id.split("_");
//                for(j=0;j<id_segs.length-3;j++) new_book+=id_segs[j]+"_";
                for(j=0;j<id_segs.length-seg_from_end;j++) new_book+=id_segs[j]+"_";
                new_book+=id_segs[j];
                if(new_book.startsWith(">")) new_book = new_book.substring(1);
                if(new_book != this_book) {
                    // now we are at last image of the previous book,
                    // so find the book before that one
                    // and go to next image - it will be the first of the book we want!
                    this_book = new_book;
                    for(;i>0;i--) {
                        new_book = "";
                        new_id = emo_ids[i].split(/[ ,]+/).filter(Boolean)[0];
                        id_segs =  new_id.split("_");
//                        for(j=0;j<id_segs.length-3;j++) new_book+=id_segs[j]+"_";
                        for(j=0;j<id_segs.length-seg_from_end;j++) new_book+=id_segs[j]+"_";
                        new_book+=id_segs[j];
                        if(new_book.startsWith(">")) new_book = new_book.substring(1);
                        if(new_book != this_book) {
                            if(i>0) i++; //Don't go to next if at first
                            new_id = emo_ids[i].split(/[ ,]+/).filter(Boolean)[0];
                            break;
                        }
                    }
                    break;
                }
            }
        }
    }
    new_id = emo_ids[i].split(/[ ,]+/).filter(Boolean)[0];
    if(new_id.startsWith(">")) new_id = new_id.substring(1);
//    document.getElementById("query_id").value = new_id;

    query_id = new_id;
    load_page_query(new_id);
}


function find_page_id(next) {
    var this_id = document.getElementById("query_id").value;
    if(this_id == null) return false;
    else {
        for(var i=0;i<=emo_ids.length;i++) {
            if((emo_ids[i].startsWith(">"+this_id))||(emo_ids[i].startsWith(this_id))) {
                break;
            }
        }
        if(((i==0)&&(!next))||((i==emo_ids.length)&&(next))) return;
        var new_id = "";
        if(next) {
            new_id = emo_ids[i+1].split(/[ ,]+/).filter(Boolean)[0];
        }
        else {
            new_id = emo_ids[i-1].split(/[ ,]+/).filter(Boolean)[0];
        }
    }
    if(new_id.startsWith(">")) new_id = new_id.substring(1);
//    document.getElementById("query_id").value = new_id;

    query_id = new_id;
    load_page_query(new_id)
}


function basename(path) {
    return path.replace(/\\/g,'/').replace(/.*\//, '');
}


function clear_result_divs() {
    const result_div_ids = ['results_table', 'result_image_display', 'result_id_msg'];
    for (const id of result_div_ids) { $('#' + id).empty(); }
}


/*******************************************************************************
 * Browsing EMO
 ******************************************************************************/

function show_example(example_id){
    load_page_query(example_id);
    search(example_id, jaccard, num_results);
    $('#examples_div').collapse('hide');
}


/*******************************************************************************
 * Image upload
 ******************************************************************************/


function validate_file_upload() {
    const files = $('#user_image_file')[0].files;

    if (files.length === 0) {
        alert('Select a file to upload.');
        return;
    } else if (files.length > 1) {
        alert('You can only upload 1 file.');
        return;
    }

    const user_image_file = files[0];
    
    // TODO(ra) more validation - filetype etc.

    return user_image_file;
}


function show_user_image(user_image_file) {
    const reader = new FileReader();
    reader.onload = () => {
        const user_image = $('<img>', { id: 'user_image',
                                        class: 'img-fluid',
                                        src: reader.result });
        $('#user_image_display').empty();
        $('#user_image_display').prepend(user_image);
        $('#user_image_display').zoom();
    };
    reader.readAsDataURL(user_image_file);
}


function submit_upload_form(user_image_file) {
    const formData = new FormData();
    formData.append('user_image_file', user_image_file, user_image_file.name);
    formData.append('user_id', user_id);
    $.ajax({
        url: 'api/image_query',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
    }).done((data) => {
        $('#uploading_status').empty();
        show_results(data);
    }).fail((xhr, status) => {
        $('#uploading_status').empty();
        alert(status)
    });
}


/*******************************************************************************
 * Search settings
 ******************************************************************************/

var threshold = false;
var search_threshold = 0.05; //default
function change_num_res() {
    if (document.getElementById("res_disp_select").value == "Best") {
        threshold = search_threshold;
    } else {
        num_results = document.getElementById("res_disp_select").value;
        threshold = false;
    }

    if (!$('#results_table').is(':empty')) { search_by_active_query_id(); }
}

function change_search_method() {
    const search_select = document.getElementById('search_select');
    const v = search_select.options[search_select.selectedIndex].value;
    if (v == 1) { ngram_search = true; }
    else { ngram_search = false; }

//    if (!$('#results_table').is(':empty')) { search_by_active_query_id(); ngram_search}
	return ngram_search;
}

function change_ranking_method() {
    const ranking_select = document.getElementById('ranking_select');
    const v = ranking_select.options[ranking_select.selectedIndex].value;
    if (v == 0) { jaccard = true; }
    else { jaccard = false; }

    if (!$('#results_table').is(':empty')) { search_by_active_query_id(); }
}

function set_corpus_search_mode() {
    // console.log('search with corpus');
    clear_result_divs();
    $('#emo_browser_col').removeClass('d-none');
    $('#image_upload_col').addClass('d-none');
    $('#search_controls').removeClass('d-none');
    $('#corpus_search_link').addClass('active');
    $('#image_search_link').removeClass('active');
    $('#code_search_link').removeClass('active');
    $('#examples_container').removeClass('d-none');
    corpus_search_mode = true;
}

function set_image_search_mode() {
    // console.log('search with images!');
    clear_result_divs();
    $('#emo_browser_col').addClass('d-none');
    $('#image_upload_col').removeClass('d-none');
    $('#corpus_search_link').removeClass('active');
    $('#image_search_link').addClass('active');
    $('#code_search_link').removeClass('active');
    $('#search_controls').addClass('d-none');
    $('#examples_container').addClass('d-none');
    corpus_search_mode = false;
}

/**/
function set_code_search_mode() {
    // console.log('search with code!');
    clear_result_divs();
    $('#emo_browser_col').addClass('d-none');
    $('#image_upload_col').addClass('d-none');
    $('#corpus_search_link').removeClass('active');
    $('#image_search_link').removeClass('active');
    $('#code_search_link').addClass('active');
    $('#search_controls').addClass('d-none');
    $('#examples_container').addClass('d-none');
    corpus_search_mode = false;
}



/*******************************************************************************
 * Start 
 ******************************************************************************/


function add_examples_list() {
    const examples = [
        ['GB-Lbl_K2h7_092_1', 	"Different editions of Berchem, 'O s'io potessi donna' (<i>Cantus</i>)"],
        ['GB-Lbl_A360a_005_0', "Very different editions of Striggio, 'Alma reale' (<i>Canto</i>)"],
        ['GB-Lbl_K3k19_012_1',  "Lassus, 'Susanna faire' (<i>Cantus</i>) and the original French chanson"],
        ['GB-Lbl_K3k19_014_0',  "Marenzio, 'I must depart all haples' (<i>Cantus</i>), and: (a) the original Italian madrigal; (b) the <i>Quinto</i> part of the latter. (The English <i>Quintus</i> part is ranked no. 9)"],
        ['GB-Lbl_A324c_048_1',  "Nanino, 'Morir non puo'l mio core' (<i>Alto</i>) and the English version (<i>Contratenor</i>) - note the two extra notes at the beginning"],
        ['GB-Lbl_K3k12_010_0',  "Marenzio, 'Sweet hart arise' (<i>Superius</i>), and the English version (<i>Canto</i>); the Italian <i>Quinto</i> part is ranked at 3 and the English <i>Medius</i> at 8"],
        ['GB-Lbl_B270b_035_1',  "Marenzio, 'Dhe se potessi' (<i>Basso</i>), and its <i>Tenor</i> part at rank 3; the <i>Cantus</i> part is at rank 5"],
        ['GB-Lbl_K9a10_023_0', "Morales, 'Magnificat Sexti toni' (choirbook); ranks 2 & 3 are different voice-parts from the work"],
        ['GB-Lbl_A19_004_0',    "End of Clemens non Papa, 'Pater peccavi' and beginning of its <i>Secunda pars</i>, 'Quanti mercanarii' (<i>Tenor</i>); 'Pater peccavi' is at rank 2"],
        ['GB-Lbl_K3e1_061_1',  "Clemens non Papa, 'Angelus domini' (<i>Bassus</i>); another edition at rank 2; <i>Tenor</i> part at rank 3; another edition of <i>Bassus</i> at rank 5"],
        ['GB-Lbl_K2a4_072_1',  "Lassus, Psalm 11, 'Pourquoy font bruit' (<i>Contratenor</i>), and the chanson on which it is based, 'Las me faut', ranked at 2; at ranks 3 & 4 are the two pages of another edition of the chanson"],
        ['GB-Lbl_A569c_024_0', "Willaert, 'Recercar quinto', was also published in a transposed version  (GB-Lbl_K3b4_013_0) as well as at the original pitch (GB-Lbl_K3b4_020_0)"],
         ['GB-Lbl_K8f10_134_1', "Anonymous <i>lauda</i>, 'Ecco care sorelle' (<i>Cantus</i> and <i>Tenor</i> parts on same page!) is actually a close version of Verdelot, 'Fedel' e bel cagnuolo' (<i>Cantus</i> at rank 2; <i>Tenor</i> at rank 3)"],
        ['GB-Lbl_A569c_013_1', "'Recercar undecimo' (<i>Canto</i>), by <i>Incerto Autore</i>; at rank 2 is Damianus, 'In die tribulationis' (scholars disagree about the identity of this composer); <i>Basso</i> part of the recercar at rank 3"],
        ['D-Bsb_Parangon_03_1543_inv_060_0', "Arcadelt, 'Vous perdez temps' (Tenor); turns out to be musically identical to his madrigal, 'Non ch'io, non voglio' (K2h3_031_1)"],
    ];


    const $examples_table = $('#examples_table');
    for (const example of examples) {
        const [id, note] = example;

        const $row = $('<tr></tr>');
        $examples_table.append($row);

        const show_example_call = `show_example('${id}')`;
        const id_link = `<a href="#" onclick='show_example("${id}")'>View</a>`;
        const $id_cell = $('<td>' + id_link + '</td>')
        $row.append($id_cell);

        const $note_cell = $('<td>' + note + '</td>')
        $row.append($note_cell);
    }
}

$(document).ready(() => {
    
    get_or_set_user_id();
    get_emo_ids();
    add_examples_list();

    $('#image_display').zoom();
    $('#result_image_display').zoom();


    // TODO(ra): this really wants refactoring. ugh.
    $('#search_button').click(() => {
        query_id = document.getElementById("query_id").value;
        load_page_query(query_id);
        search(query_id,jaccard,num_results, change_search_methods);       
    });

    $('#search_by_id_button').click(() => {
        query_id = document.getElementById("query_id").value;
        load_page_query(query_id);
   //     search(query_id,jaccard,num_results, ngram_search);
        search(query_id,jaccard,num_results, change_search_method());
    });

    $('#search_by_code_button').click(() => {
        document.getElementById("emo_browser_col").style.visibility = "hidden";
        query_code = document.getElementById("query_code").value.trim();
//        load_page_query(query_id);
        if(!query_code.length) alert("You must enter some code!")
        else code_search(query_code,jaccard,num_results);
    });

    $('#random_page_button').click(() => {
        document.getElementById("query_id").value = emo_ids[getRandomIntInclusive(0, emo_ids.length)];
        query_id = document.getElementById("query_id").value;
load_page_query(query_id);
    });

    $('#uploadForm').on('change', (event) => {
        clear_result_divs();
        const user_image_file = validate_file_upload();
        show_user_image(user_image_file);
    });

    $('#uploadForm').on('submit', (event) => {
        event.preventDefault();
        $('#uploading_status').text('Uploading...');
        const user_image_file = validate_file_upload();
        if (user_image_file) { submit_upload_form(user_image_file); }
    });

    const initial_page_id = 'GB-Lbl_K2h7_092_1'
    load_page_query(initial_page_id);
    
});
