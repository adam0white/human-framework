/*
WLL - Moving dart game

source code:
(1) https://api.jquery.com/position/
(2) https://api.jquery.com/stop/
(3) https://codepen.io/clairecodes/pen/JZqMRy (for css styling)
*/

///////////////////////////////////  Basic Setup
//
var workerId_fromURL = getParamFromURL( 'PROLIFIC_PID' );
var hitId = getParamFromURL( 'STUDY_ID' );
var browser= get_browser();
var windowDimensionsH = $(window).height()
var windowDimensionsW = $(window).width()
var screenDimensionsH = screen.height
var screenDimensionsW = screen.width
var startExperimentTime = new Date();
// generate random completion code
var confirmationCode = "37FBED4C";
var infix            = "-dia-";
var suffix           = "-a";

var body = document.body.getBoundingClientRect();
// hide and show slides
function show_Slide(id) {
    $(".slide").hide();
    $("#"+id).show();

    // implement example dart movement
    if(id=="intro-5"){
		while(i <= 5){ //we can decide how long we want this to go on (can't be infinitely)
	  		intro_go_right_first(intro_go_left_second);
	  		i += 1;
		}
    }

    // implement checking space and enter key functionality
    if(id=="practice-1"){
    	i=0;
		$("html").keypress(function(event){
			if(event.which=="32"){
				$("#practice-enter").css("visibility", "visible");	
			}
		});

		$("html").keypress(function(event){
			if(event.which=="13"){
				$("#practice-1-next-button").css("visibility", "visible");			
			}
		});		 
    }

    // show main game
    if(id=="game-section"){
    	//console.log("on game-section slide")
		$('#score').text('Current Score: ' + single_trial.total_score);
		play_n_rounds(no_rounds);
    }

};


function submit_preScreening(){
    if($('input[name=pre_attn_check_1]:checked').length > 0
        && $('input[name=pre_attn_check_2]:checked').length > 0){
        
        value_response_1 = $('input[name=pre_attn_check_1]:checked')[0].value;
        value_response_2 = $('input[name=pre_attn_check_2]:checked')[0].value;
        //.log(value_response_1);
        //console.log(value_response_2);
        if(value_response_1=="50" && value_response_2=="Enter /return"){
            show_Slide("intro-final");
        } else{
            document.getElementById('minimum_selection_prescreening').style.visibility="visible";
        }
    } else {
        document.getElementById('minimum_selection_prescreening').style.visibility="visible";
    }    
}


// generate randome ID
function randId() {
    //http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

function getParamFromURL( name ) {
	name = name.replace(/[\[]/,"\\[").replace(/[\]]/,"\\]");
	var regexS = "[\?&]"+name+"=([^&#]*)";
	var regex = new RegExp( regexS );
	var results = regex.exec( window.location.href );
	if( results == null ){
		return "";
	} else{
		return results[1];
	}
};

function get_browser() {
    var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if(/trident/i.test(M[1])){
        tem=/\brv[ :]+(\d+)/g.exec(ua) || [];
        return {name:'IE',version:(tem[1]||'')};
        }
    if(M[1]==='Chrome'){
        tem=ua.match(/\bOPR|Edge\/(\d+)/)
        if(tem!=null)   {return {name:'Opera', version:tem[1]};}
        }
    M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
    if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
    return {
      name: M[0],
      version: M[1]
    }
 };


function randomIntFromInterval(min,max)
{
  return Math.floor(Math.random()*(max-min+1)+min);
}

function fisher_yates_randomize(array) {
    //source: https://medium.com/@nitinpatel_20236/how-to-shuffle-correctly-shuffle-an-array-in-javascript-15ea3f84bfb
    for(i = array.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * i);
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

var unique_id = "WLL-" + randId();
var participant_data = '';

var up_distance = 0
var up_time = 0
var up_unit = 300;

var H_animation_speed_time = 1000;

/////////////////////////////////// Experiment-specific Setup
//////// Data
var single_trial = {
	hitId:hitId,
    workerId: workerId_fromURL,
    unique_id: unique_id,
	browser: browser.name,
    windowDimensionsH: windowDimensionsH,
    windowDimensionsW: windowDimensionsW, 
    screenDimensionsH: screenDimensionsH,
    screenDimensionsW: screenDimensionsW,
    board_center_x: null,
    board_center_y: null,
    board_bullseye_radius: null,
    board_outerRing_radius: null,
    startExperimentTime: startExperimentTime,
    endExperimentTime:'',
    startTrialTime:'',
    endTrialTime:'',
    confirmationCode: confirmationCode,
    trial_num: 0,
    trial_condition: '',
    trial_duration: 0,
    which_throw:0,
    H_animation_speed_time: H_animation_speed_time,
    arrow_startingDirection:'',
    arrow_H_moving_duration: 0,
    arrow_H_stopping_x: 0,
    arrow_H_stopping_y: 0,
    arrow_V_stopping_x: 0,
    arrow_V_stopping_y: 0,
   	strength_duration: 0,
   	up_distance_traveled:0,
   	up_distance_unit: up_unit,
   	distance_from_radius: 0,
	which_ring:null,
	which_quadrant: null,
   	throw_score: 0,
   	trial_score: 0,
    total_score: 0,
    played_response:[],
    difficulty_response: [],
    press_space_response:[],
    press_enter_response:[],
    dominant_hand_response:[],
    frequency_response:'',
    names_response:'',
	race_response: [],
	gender_response:[],
	education_response:[],
	income_response:[],
	country_response:'',
	age_response:''
}

//////// Trial orders
var no_rounds = 10;
var rounds_played = 0;
var no_throws_per_round = 5;
var ls_starting_direction = ["left", "left", "left", "left", "left", "right", "right", "right", "right", "right"];
fisher_yates_randomize(ls_starting_direction);
//console.log(ls_starting_direction);


//////// Task Setup
var pointSize = 3;
var selection = document.querySelector('.target');
var x = 0;
var y = 0;

function getPosition(callback){
	dart = document.getElementById("dart");
	var rect = dart.getBoundingClientRect();	
	x = rect.left + 17.3;// 50: 10 #game-section left + 40 #slide padding/block left(?); x == the location of the click in the document + the location (relative to the left) of the canvas in the document
	y = rect.top + window.scrollY -1;// +0.7; // 10: #game-section top; y == the location of the click in the document - the location (relative to the top) of the canvas in the document
	console.log("dart left,top:");
	console.log(rect.left,rect.top);
	console.log("dart x,y:");
	console.log(x,y);
	// This method will handle the coordinates and will draw them in the canvas.
	//callback();
	drawCoordinates(x,y);
	evaluateThrow(x,y);
}

function drawCoordinates(pos_x, pos_y){
    //console.log("drawCoordinates:")
	//console.log(pos_x, pos_y);
    var dot_size = 6;
    var div = document.createElement('div');
    div.setAttribute("class", "dart-trace");
    div.setAttribute("id", "dart-trace");
    div.style.backgroundColor = "#87D37C";
    div.style.width = dot_size + "px";
    div.style.height = dot_size + "px";
    div.style.position = "absolute";
    div.style.zIndex = "15";
    div.style.left = (pos_x - dot_size / 2) + "px";
    div.style.top = (pos_y - dot_size / 2) + "px";
    div.style.borderRadius = "50%";
    document.body.appendChild(div); // this line is mysteriously important
    }

function is_inCircle(dart_x, dart_y, inside_bullseye, total_score){
	//coor: Bullseye
	var goldInner = $("#gold-inner").last();
	goldInner_x = goldInner.offset().left + goldInner.width()/2;
	goldInner_y = goldInner.offset().top + goldInner.height()/2;
	bullseye_radius = goldInner.width()/2;

	//coor: White outer ring
	var outerRing = $("#white-outer").last();
	outerRing_x = outerRing.offset().left + outerRing.width()/2;
	outerRing_y = outerRing.offset().top + outerRing.height()/2;
	outerring_radius = outerRing.width()/2;	
	//console.log("outerring_radius: " + outerring_radius)

	//coor: Black outer ring
	var blackRing = $("#black-outer").last();
	blackRing_radius = blackRing.width()/2;		
	//console.log("blackRing_radius: " + blackRing_radius)

	//coor: Blue outer ring
	var blueRing = $("#blue-outer").last();
	blueRing_radius = blueRing.width()/2;
	//console.log("blueRing_radius: " + blueRing_radius)

	//coor: Blue outer ring
	var redRing = $("#red-outer").last();
	redRing_radius = redRing.width()/2;		
	//console.log("redRing_radius: " + redRing_radius)

	// get distance
	distance = Math.sqrt((dart_x-outerRing_x)*(dart_x-outerRing_x) + (dart_y-outerRing_y)*(dart_y-outerRing_y));

	single_trial.board_center_x = outerRing_x
	single_trial.board_center_y = outerRing_y
	single_trial.board_bullseye_radius = bullseye_radius
	single_trial.board_outerRing_radius = outerring_radius
	
	single_trial.distance_from_radius = distance;
    single_trial.arrow_V_stopping_x = dart_x;
    single_trial.arrow_V_stopping_y = dart_y; 

    if (dart_x <= outerRing_x){ // potentially fix the equal sign?
    	if(dart_y <= outerRing_y){ // potentially fix the equal sign?
    		single_trial.which_quadrant = "top-left";
    	} else {
    		single_trial.which_quadrant = "bottom-left";
    	}
    } else {
    	if(dart_y <= outerRing_y){ // potentially fix the equal sign?
    		single_trial.which_quadrant = "top-right";
    	} else {
    		single_trial.which_quadrant = "bottom-right";
    	}    	
    }
    

    // SCORING SYSTEM BASED ON DIFFERENT RINGS
	if(distance <= bullseye_radius){
		// bullseye
		inside_bullseye = true;
		total_score += 50;
		single_trial.throw_score += 50;
		single_trial.total_score += 50;
		single_trial.trial_score += 50;

		single_trial.which_ring = "bullseye";
		//console.log("dart inside BULLSEYE");
		//console.log(total_score);
		$('#score').text('Current Score: ' + single_trial.total_score)
		$('#throw-feedback').text('     + 50');
	} else if (distance > bullseye_radius & distance <= redRing_radius){
		// red outer ring
		total_score += 30;
		single_trial.throw_score += 30;
		single_trial.trial_score += 30;
		single_trial.total_score += 30;
		
		single_trial.which_ring = "red";
		//console.log("dart inside redRing_radius");
		//console.log(total_score);
		$('#score').text('Current Score: ' + single_trial.total_score)
		$('#throw-feedback').text('     + 30');	
	} else if (distance > redRing_radius & distance <= blueRing_radius){
		// blue outer ring
		total_score += 20;
		single_trial.throw_score += 20;
		single_trial.trial_score += 20;
		single_trial.total_score += 20;

		single_trial.which_ring = "blue";
		//console.log("dart inside blueRing_radius");
		//console.log(total_score);
		$('#score').text('Current Score: ' + single_trial.total_score)
		$('#throw-feedback').text('     + 20');	
	} else if (distance > blueRing_radius & distance <= blackRing_radius){
		// black outer ring
		total_score += 10;
		single_trial.throw_score += 10;
		single_trial.trial_score += 10;
		single_trial.total_score += 10;

		single_trial.which_ring = "black";
		//console.log("dart inside blackRing_radius");
		//console.log(total_score);
		$('#score').text('Current Score: ' + single_trial.total_score)
		$('#throw-feedback').text('     + 10');	
	} else if (distance > blackRing_radius & distance <= outerring_radius){
		// white outer ring
		total_score += 5;
		single_trial.throw_score += 5;
		single_trial.trial_score += 5;
		single_trial.total_score += 5;

		single_trial.which_ring = "white";
		//console.log("dart white BOARD");
		//console.log(total_score);
		$('#score').text('Current Score: ' + single_trial.total_score)
		$('#throw-feedback').text('     + 5');	
	} else {
		// outside the board
		total_score += 0;
		single_trial.throw_score += 0;
		single_trial.trial_score += 0;
		single_trial.total_score += 0;

		single_trial.which_ring = "missed";
		$('#score').text('Current Score: ' + single_trial.total_score)
		$('#throw-feedback').text('     + 0');
		//console.log("MISSED")
	}

	single_trial.trial_num = rounds_played;
	single_trial.which_throw = dart_throw;
	single_trial.endTrialTime = new Date();
	single_trial.trial_duration=single_trial.endTrialTime-single_trial.startTrialTime;
}

var inside_bullseye = null;
var total_score = 0
function evaluateThrow(pos_x,pos_y){
	//evaluation
	is_inCircle(pos_x, pos_y, inside_bullseye, total_score);
}

// the moving dart
/*
the dart to be moving left to right and right to left, then stops when there is key press
*/
var i = 0;
var space_clicked = false;
var init_time = new Date();
var time_elapsed = 0;


function intro_go_right_first(callback){
  $( ".dart-example" ).animate({ left: "+=970px" }, H_animation_speed_time);
  callback();
}

function intro_go_left_second(){
    $( ".dart-example" ).animate({ left: "-=970px" }, H_animation_speed_time);	
}

function go_right_first(callback){
	$( ".block" ).animate({ left: "+=970px" }, H_animation_speed_time);
	if (arrow_H_t1==null){
		arrow_H_t1 = (new Date()).getTime();
	}
  //stop listener 
  	$( "html" ).keypress(function(event){
		if(event.which=="32"){
			$( ".block" ).stop();
			if (arrow_H_t2==null){
				arrow_H_t2 = (new Date()).getTime();
			}
		//console.log($( ".block" ).position().left);
			space_clicked = true;
			dart_H = document.getElementById("dart");
			var rect_H = dart_H.getBoundingClientRect();
			single_trial.arrow_H_stopping_x = rect_H.left + 12.5;
			single_trial.arrow_H_stopping_y = rect_H.top + 0.7;	
		}
  	}); 
  	callback();
}

function go_left_second(){
    $( ".block" ).animate({ left: "-=970px" }, H_animation_speed_time);
	$( "html" ).keypress(function(event){
		if(event.which=="32"){
			$( ".block" ).stop();
			if (arrow_H_t2==null){
				arrow_H_t2 = (new Date()).getTime();
			}
			//console.log($( ".block" ).position().left);
			space_clicked = true;
			dart_H = document.getElementById("dart");
			var rect_H = dart_H.getBoundingClientRect();
			single_trial.arrow_H_stopping_x = rect_H.left + 12.5;
			single_trial.arrow_H_stopping_y = rect_H.top + 0.7;		
		}
	}); 
}

function go_right_second(){
  $( ".block" ).animate({ left: "+=970px" }, H_animation_speed_time);
  //stop listener 
  $( "html" ).keypress(function(event){
  		if(event.which=="32"){
			$( ".block" ).stop();
			if (arrow_H_t2==null){
				arrow_H_t2 = (new Date()).getTime();
			}
			//console.log($( ".block" ).position().left);
			space_clicked = true;
			dart_H = document.getElementById("dart");
			var rect_H = dart_H.getBoundingClientRect();
			single_trial.arrow_H_stopping_x = rect_H.left + 12.5;
			single_trial.arrow_H_stopping_y = rect_H.top + 0.7;		
  		}
  }); 
}

function go_left_first(callback){
	if (arrow_H_t1==null){
		arrow_H_t1 = (new Date()).getTime();
	}
    $( ".block" ).animate({ left: "-=970px" }, H_animation_speed_time);
	$( "html" ).keypress(function(event){
		if(event.which=="32"){
			$( ".block" ).stop();
			if (arrow_H_t2==null){
				arrow_H_t2 = (new Date()).getTime();
			}
			//console.log($( ".block" ).position().left);
			space_clicked = true;
			dart_H = document.getElementById("dart");
			var rect_H = dart_H.getBoundingClientRect();
			single_trial.arrow_H_stopping_x = rect_H.left + 12.5;
			single_trial.arrow_H_stopping_y = rect_H.top + 0.7;
		}
	}); 

	callback();
}

var enter_clicked = false;
var arrow_H_t1 = null;
var arrow_H_t2 = null;
var press_t1 = null;
var press_t2 = null;
var duration = 0; // in milliseconds
function get_strength(callback){
	$("html").keydown(function(event){		
		if(event.which=="13"& enter_clicked==false){
			if(space_clicked==true){
				document.getElementById("game-dart-img").className = "jitter-dart";
				if (press_t1 == null){
					press_t1 = (new Date()).getTime();
					//console.log("press_t1: " + press_t1);
				}				
			}
		}				
	});

	$("html").keyup(function(event){
		if(event.which=="13" & enter_clicked==false){
			if(space_clicked==true){
				single_trial.arrow_H_moving_duration = arrow_H_t2 - arrow_H_t1;
				//console.log("arrow H moving duration: " + single_trial.arrow_H_moving_duration);
				document.getElementById("game-dart-img").className = "";
				press_t2 = (new Date()).getTime();
				duration = press_t2 - press_t1;
				enter_clicked=true;
				//console.log(press_t2);
				//console.log(duration/1000); //seconds
				callback();				
			} //else (
				//$("html").off('keyup')
				//);

		}
	})		

}

function go_up(){
	up_distance = up_unit * duration/1000;
	up_time = 150 * up_distance/100;
	//console.log("up_distance: " + up_distance);
	//console.log("up_time: " + up_time);
	$( ".block" ).animate({ top: "-=" + up_distance}, up_time);
	setTimeout(getPosition,up_time+30); //added extra 30ms to correct trace

	setTimeout(function(){
		dart_throw += 1;
		throwed = true;
	   	single_trial.strength_duration = duration;
	   	single_trial.up_distance_traveled = up_distance;
	}, up_time+60);
	setTimeout(function(){
		clear_board();
	}, up_time+2000);
}


var dart_throw = 0;
var throwed = false;
var i = 0

function clear_board(){
    current_trial_data = combineData();
    participant_data = participant_data + current_trial_data;
	//wipe the board
	var element = document.getElementById("dart-trace");
	element.parentNode.removeChild(element);
	//initialize dart position
	document.getElementById("dart").style.top = "580px";
	if (ls_starting_direction[rounds_played] == "left"){
		document.getElementById("dart").style.left = "40px";
	} else {
		document.getElementById("dart").style.left = "1000px";
	}
	
	$('#throw-feedback').text('');
	$("html").off('keydown');
	$("html").off('keyup');
	//allow new round of keypress
	space_clicked = false;
	enter_clicked=false;
	duration = 0;
	up_distance = 0;
	up_time = 0;
	arrow_H_t1 = null;
	arrow_H_t2 = null;
	press_t1 = null;
	press_t2 = null;
	i=0;
	throwed = false;
	x=0;
	y=0;

    single_trial.startTrialTime='';
    single_trial.endTrialTime='';
    single_trial.trial_duration=0;
    single_trial.arrow_startingDirection='';
    single_trial.arrow_H_moving_duration=0;
    single_trial.arrow_H_stopping_x=0;
    single_trial.arrow_H_stopping_y=0;
    single_trial.arrow_V_stopping_x=0;
    single_trial.arrow_V_stopping_y=0;
   	single_trial.strength_duration=0;
   	single_trial.up_distance_traveled=0;
   	single_trial.distance_from_radius=0;
	single_trial.which_ring=null;
	single_trial.which_quadrant=null;
   	single_trial.throw_score=0;

	setTimeout(function(){play_one_round(no_throws_per_round)}, 100);
}

function throw_a_dart(){
	//console.log("i:" + i);
	if(ls_starting_direction[rounds_played] == "left"){
		single_trial.arrow_startingDirection="left";
		while(i <= 5){ //we can decide how long we want this to go on (can't be infinitely)
	  		$(".block").css({left: 40, position:'absolute'});
	  		go_right_first(go_left_second);
	  		//console.log("inside while in throw_a_dart")
	  		i += 1;
		}	
	} else {
		single_trial.arrow_startingDirection="right";
		while(i <= 5){ //we can decide how long we want this to go on (can't be infinitely)
	  		$(".block").css({left: 1000, position:'absolute'});
	  		go_left_first(go_right_second);
	  		//console.log("inside while in throw_a_dart")
	  		i += 1;
		}	
		
	}
	get_strength(go_up);
}


function play_one_round(no_throws_per_round){
	//console.log("inside play_one_round()");
	if(dart_throw < no_throws_per_round){
		document.documentElement.style.cursor = 'none';
		throw_a_dart();
		//console.log("inside dart_throw < no_throw comparison")
	} else {
		display_Distractor();
		document.documentElement.style.cursor = 'auto';

	}
}

function play_n_rounds(no_rounds){
	$("html").on('keypress');
	//console.log("inside play_n_rounds");
	//console.log("rounds_played:" + rounds_played);
	//console.log("no_rounds:" + no_rounds);

	if(rounds_played < no_rounds){
		rounds_played += 1;
		single_trial.startTrialTime = new Date();
		//console.log("inside rounds_played <= no rounds")
		play_one_round(no_throws_per_round);
	}
}

function display_Distractor(){
	if(rounds_played < no_rounds){
		dart_throw=0;
		show_Slide("distractor");
		$('#distractor-total-score').text('Current Score: ' + single_trial.total_score);
		$('#distractor-round-score').text('Score for this round: ' + single_trial.trial_score);
		$('#distractor-which-round').text("You've completed " + rounds_played + ' out of ' + no_rounds + " rounds of the game.");
		single_trial.trial_score=0;
	} else {
		//console.log("inside post attn checks");
		show_Slide("demographic_question");
		$('#final-score-display').text('Congrats! You got ' + single_trial.total_score + ' points !');		
	}
}


function combineData(){
	//console.log("which ring: "+single_trial.which_ring);
	//console.log("which quadrant: "+single_trial.which_quadrant);
	trial_data = unique_id + '\t' +
				workerId_fromURL + '\t' +
				hitId + '\t' +
				browser.name + '\t' +
				windowDimensionsH + '\t' +
				windowDimensionsW + '\t' +
				screenDimensionsH + '\t' +
				screenDimensionsW + '\t' +
				window.scrollY + '\t' +
				window.scrollX + '\t' +
				single_trial.board_center_x + '\t' +
				single_trial.board_center_y + '\t' +
				single_trial.board_bullseye_radius + '\t' +
				single_trial.board_outerRing_radius + '\t' +
				single_trial.startExperimentTime + '\t' +
				"endExperimentTime_NULL" + '\t' +
				single_trial.startTrialTime + '\t' +
				single_trial.endTrialTime + '\t' +
				single_trial.trial_num + '\t' +
				"main" + '\t' +
				single_trial.trial_duration + '\t' +
				single_trial.which_throw + '\t' +
				single_trial.arrow_startingDirection + '\t' +
				H_animation_speed_time + '\t' +
				single_trial.arrow_H_moving_duration + '\t' +
				single_trial.arrow_H_stopping_x + '\t' +
				single_trial.arrow_H_stopping_y + '\t' +
				single_trial.arrow_V_stopping_x + '\t' +
				single_trial.arrow_V_stopping_y + '\t' +
				single_trial.strength_duration + '\t' +
				single_trial.up_distance_traveled + '\t' +
				single_trial.up_distance_unit + '\t' +
				single_trial.distance_from_radius + '\t' +
				single_trial.which_ring + '\t' +
				single_trial.which_quadrant + '\t' +
				single_trial.throw_score + '\t' +
				single_trial.trial_score + '\t' +
				single_trial.total_score + '\t' +
				"played_response_NULL" + '\t' +
				"difficulty_response_NULL" + '\t' +
				"press_space_response_NULL" + '\t' +
    			"press_enter_response_NULL" + '\t' +
    			"dominant_hand_response_NULL" + '\t' +
    			"frequency_response_NULL" + '\t' +
    			"names_response_NULL" + '\t' +
				"race_response_NULL" + '\t' +
				"gender_response_NULL"+ '\t' +
				"education_response_NULL"+ '\t' +
				"income_response_NULL" + '\t' +
				"country_response_NULL" + '\t' +
				"age_response_NULL" + '\t' +
				single_trial.confirmationCode +
				'\n';

    //console.log(trial_data);
    return trial_data;
}

function submit_AttentionCheck(){
    if($('input[name=played_response]:checked').length > 0 &&
       $('input[name=difficulty_response]:checked').length > 0 &&
       $('input[name=press_space_response]:checked').length > 0 &&
       $('input[name=press_enter_response]:checked').length > 0 &&
       $('input[name=dominant_hand_response]:checked').length > 0 &&
       $('#frequency_response').val().length >= 1 &&
       $('#names_response').val().length >= 1 &&
       $('input[name=race_response]:checked').length > 0 &&
       $('input[name=gender_response]:checked').length > 0 &&
       $('input[name=education_response]:checked').length > 0 &&
       $('input[name=income_response]:checked').length > 0 &&
       $('#country_response').val().length >= 2 &&
       $('#age_response').val().length >= 2){
        //get input 

        num_response_0 = $('input[name=played_response]:checked').length;
        for(var i = 0; i < num_response_0; i++){
            single_trial.played_response.push($('input[name=played_response]:checked')[i].value);}

        num_response_1 = $('input[name=difficulty_response]:checked').length;
        for(var i = 0; i < num_response_1; i++){
            single_trial.difficulty_response.push($('input[name=difficulty_response]:checked')[i].value);}

        num_response_press_space = $('input[name=press_space_response]:checked').length;
        for(var i = 0; i < num_response_press_space; i++){
            single_trial.press_space_response.push($('input[name=press_space_response]:checked')[i].value);}

        num_response_press_enter = $('input[name=press_enter_response]:checked').length;
        for(var i = 0; i < num_response_press_enter; i++){
            single_trial.press_enter_response.push($('input[name=press_enter_response]:checked')[i].value);}

        num_response_dominant_hand = $('input[name=dominant_hand_response]:checked').length;
        for(var i = 0; i < num_response_dominant_hand; i++){
            single_trial.dominant_hand_response.push($('input[name=dominant_hand_response]:checked')[i].value);}

        single_trial.frequency_response = $('#frequency_response').val()

        single_trial.names_response = $('#names_response').val()

        num_response_2 = $('input[name=race_response]:checked').length;
        for(var i = 0; i < num_response_2; i++){
            single_trial.race_response.push($('input[name=race_response]:checked')[i].value);}

        num_response_3 = $('input[name=gender_response]:checked').length;
        for(var i = 0; i < num_response_3; i++){
            single_trial.gender_response.push($('input[name=gender_response]:checked')[i].value);}

        num_response_4 = $('input[name=education_response]:checked').length;
        for(var i = 0; i < num_response_4; i++){
            single_trial.education_response.push($('input[name=education_response]:checked')[i].value);}

        num_response_5 = $('input[name=income_response]:checked').length;
        for(var i = 0; i < num_response_5; i++){
            single_trial.income_response.push($('input[name=income_response]:checked')[i].value);}

        single_trial.country_response = $('#country_response').val()

        single_trial.age_response = $('#age_response').val()

        single_trial.endExperimentTime=new Date();

        attention_checks_data = unique_id + '\t' +
								workerId_fromURL + '\t' +
								hitId + '\t' +
								browser.name + '\t' +
								windowDimensionsH + '\t' +
								windowDimensionsW + '\t' +
								screenDimensionsH + '\t' +
								screenDimensionsW + '\t' +
								window.scrollY + '\t' +
								window.scrollX + '\t' +
								"board_center_x_NULL" + '\t' +
								"board_center_y_NULL" + '\t' +
								"board_bullseye_radius_NULL" + '\t' +
								"board_outerRing_radius_NULL" + '\t' +
								single_trial.startExperimentTime + '\t' +
								single_trial.endExperimentTime + '\t' +
								"startTrialTime_NULL" + '\t' +
								"endTrialTime_NULL" + '\t' +
								0  + '\t' +
								"attention_checks" + '\t' +
								"trial_duration_NULL" + '\t' +
								"which_throw_NULL" + '\t' +
								"arrow_startingDirection_NULL" + '\t' +
								"H_animation_speed_time_NULL" + '\t' +
								"arrow_H_moving_duration_NULL" + '\t' +
								"arrow_H_stopping_x_NULL" + '\t' +
								"arrow_H_stopping_y_NULL" + '\t' +
								"arrow_V_stopping_x_NULL" + '\t' +
								"arrow_V_stopping_y_NULL" + '\t' +
								"strength_duration_NULL" + '\t' +
								"up_distance_traveled_NULL" + '\t' +
								"up_distance_unit_NULL" + '\t' +
								"distance_from_radius_NULL" + '\t' +
								"which_ring_NULL" + '\t' +
								"which_quadrant_NULL" + '\t' +
								"throw_score_NULL" + '\t' +
								"trial_score_NULL" + '\t' +
								single_trial.total_score + '\t' +
								single_trial.played_response.join() + '\t' +
								single_trial.difficulty_response.join() + '\t' +
								single_trial.press_space_response.join() + '\t' +
								single_trial.press_enter_response.join() + '\t' +
								single_trial.dominant_hand_response.join() + '\t' +
    							single_trial.frequency_response + '\t' +
    							single_trial.names_response + '\t' +
								single_trial.race_response.join() + '\t' +
								single_trial.gender_response.join() + '\t' +
								single_trial.education_response.join() + '\t' +
								single_trial.income_response.join() + '\t' +
								single_trial.country_response + '\t' +
								single_trial.age_response + '\t' +
								single_trial.confirmationCode;
        
        participant_data = participant_data + attention_checks_data;
        //console.log(participant_data);
        saveData(unique_id, participant_data);

        show_Slide('confirmation_code');
        $("#generated_confirmation_code").html(single_trial.confirmationCode);          
        $("#generated_confirmation_code").show();
    } else {
        document.getElementById('minimum_selection_demographic_question').style.visibility="visible";
    }
}

function saveData(name, data) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "write_data.php");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({filename: name, filedata: data}));
}