var socket = io.connect('http://d.rhocode.com:5000'); //SocketIO Connection

var tutorID = -1; //Local tracking of tutor numbers
var tuteeID = -1;
var tutorRoom = -1;
var tuteeClass = "";
var in_queue = false;

function createButton(id) {
    return '<button id="' + id + '" type="button" class="btn btn-xs btn-success enterqueue" \
	title="Enter Queue">\
	<span class="glyphicon glyphicon glyphicon-time" aria-hidden="true"></span>\
	</button>'
}

function encodeRFC5987ValueChars(str) {
    return encodeURIComponent(str).
        // Note that although RFC3986 reserves "!", RFC5987 does not,
        // so we do not need to escape it
    replace(/['()]/g, escape). // i.e., %27 %28 %29
    replace(/\*/g, '%2A').
        // The following are not required for percent-encoding per RFC5987, 
        // so we can allow for a little better readability over the wire: |`^
    replace(/%(?:7C|60|5E)/g, unescape);
}

function isNumeric(num) {
    return !isNaN(num)
}


function setupTutor(tid, name, location, subjects) {
	socket.emit('tutor_setup', {'name' : name, 'location' : location, 'tid' : tid, 'subjects' : subjects})
	$("#tuteesign").hide();
	$("#tutorsign").hide();
}

socket.on('no_tutees', function(data) {
		console.log('Waiting game.')
        tutorRoom = data.data;
		$('#tutor_text_status').text('No tutees at this time. You\'ve joined room ' + data.data + '.');

});


socket.on('found_tutee', function(data) {
		console.log('Found Tutee!');
		$('#tutor_text_status').text('Your tutee is ' + unescape(data['tuteeName']) + ' in ' + unescape(data['tuteeLocation']));
		setTimeout(function() {
      $("#nextOrStart").removeClass('disabled');
    }, 1000);
});


socket.on('found_tutor', function(data) {
		$('#tutorname').text(unescape(data['name']));
		$('#tutorlocation').text(unescape(data['location']));
		$('#loadingqueue').fadeOut();
		$('#foundqueue').fadeIn();
		console.log(unescape(data['name']));
		console.log(data['location']);
		in_queue = false;
});


socket.on('tutee_queue_status', function(data) {
		console.log(data.status);
        console.log(data.tid);
        console.log(data.myclass);
		$(queuestatus2).text(data.status);
        tuteeID = data.tid;
        tuteeClass = data.myclass;
});



socket.on('tutor_connected', function(data) {
	if (data['status'] == 'success') {
		console.log('Tutor has been added.');
		$('#tutor-control-panel').fadeIn();
		$('#tutor_text_status').text('You are connected!');
	} else {
		console.log('Tutor could not be added.');
	}
    // if ($("#nextOrStart").hasClass('disabled'))
    //   return;
    // $('#tutor_text_status').text('You are connected!');



 //    $("#nextOrStart").bind( "click", function() {
 //      $('#tutor_text_status').text('Looking for someone to tutor...');
 //      $("#nextOrStart").text('Next Person').addClass('disabled');
 //      socket.emit('can_tutor');
 //      console.log("CLICKEDDDDDDD");

	// }
	
 //    });
});

    // socket.on('found_tutee', function() {
    //     $('#tutor_text_status').text('Your tutee should be arriving shortly.');
    //     $("#nextOrStart").removeClass('disabled');
    // });




function enQueue(myclass, name, location) {
		in_queue = true;
    console.log(myclass.slice(12));
    // var socket = io.connect('http://d.rhocode.com:5000');
    // socket.on('connect', function() {
    $('#foundqueue').hide();
    $('#loadingqueue').show();
    console.log('We waiting in queue now!')
    socket.emit('tutee_setup', {
        'tuteeClass': myclass.slice(12), 'tuteeName': name, 'tuteeLocation' : location
    });
    // });

    // socket.on('tutors_for_subj', function(dat) {
    //     console.log('Got number of tutors!')
    //     $('#queuestatus1').text('Tutors here: ' + dat['tutors']);
    //     socket.emit('wait_spot');
    // });

    // socket.on('found_tutor', function(data) {
    //     console.log('Got a tutor!')
    //     $('#loadingqueue').fadeOut();
    //     $('#foundqueue').fadeIn();

    //     // text('Tutors here: ' + data['tutors']);
    // });
    // // $.ajax({
    // //   url:"http://d.rhocode.com:5000/enterQueue.html?class=" + myclass.slice(12),
    // //   data: {},
    // //   type: "GET",
    // //   crossDomain: true,
    // //   dataType: "jsonp",
    // //   success: function (data) {
    // //     // $("#displaymodalText").text("You have been successfully queued");
    // //   },
    // //   error: function (xhr, status) {
    // //   },
    // //   complete: function (xhr, status) {
    // //     console.log("complete");
    // //   }
    // // });

}

$(window).bind('beforeunload', function(){
    if( tutorID != -1 || in_queue ){
        return "You are leaving the tutoring page. If you are a tutor, your session will be destroyed. If you are waiting in queue, you will be removed. Are you sure you want to exit?"
    }
});

function sendLoginAttempt(query, name, location) {
    $.ajax({
        url: "http://d.rhocode.com:5000/login.html" + query,
        data: {},
        type: "GET",
        crossDomain: true,
        dataType: "jsonp",
        success: function(data) {
            if (data.status == 'success') {
                tutorID = data.tutorcode;
                $("#serverresponselogin").html("Sign-in successful! Welcome " + $("#name").val() + '! Your tutor code is <b>' + data.tutorcode + '</b>.');
                populateTable();
                setupTutor(tutorID, name, location, data.subjects);
            } else {
                $("#serverresponselogin").text("Sign-in failed.");
            }

        },
        error: function(xhr, status) {
            $("#serverresponselogin").text("Server might be offline. Please contact aafu@ucdavis.edu!");
        },
        complete: function(xhr, status) {

        }
    });
}

function sendKeepAlive(tutorid) {
    if (tutorid == -1)
        return;
    $.ajax({
        url: "http://d.rhocode.com:5000/keepalive.html?tutorid=" + String(tutorid),
        data: {},
        type: "GET",
        crossDomain: true,
        dataType: "jsonp",
        success: function(data) {
            if (data.status != 'success') {
                $("#serverresponselogin").text("Your session has expired. Please relog.");
                $('#signin').modal('show');
            }
        },
        error: function(xhr, status) {

        },
        complete: function(xhr, status) {
            console.log("Keepalive Sent.");
        }
    });
}

function populateTuteeTable() {
    $.ajax({
        url: "http://d.rhocode.com:5000/tutoredsubjs.html?",
        data: {},
        type: "GET",
        crossDomain: true,
        dataType: "jsonp",
        success: function(data) {
            var $data = $('<div>');
            var numitems = 0;
            $.each(data.data, function(i, item) {
                numitems++;
                var $tr = $('<tr id=\'class-' + item.subject + '\'>').append(
                    $('<td>').text(item.subject),
                    $('<td>').text(item.queue),
                    $('<td>').html($.parseHTML(createButton('enter-queue-' + item.subject)))
                );
                $data.append($tr);
            });
            if (numitems == 0)
                $data.append($.parseHTML('<tr><td>There are no tutored classes at this time.</td><td/><td/></tr>'));
            $('#tutoringsubjectbody').html($data.html());
        },
        error: function(xhr, status) {

        },
        complete: function(xhr, status) {
            console.log("Table populated.");
        }
    });
}


function populateTable() {
    $.ajax({
        url: "http://d.rhocode.com:5000/table.html",
        data: {},
        type: "GET",
        crossDomain: true,
        dataType: "jsonp",
        success: function(data) {
            console.log(data);
            var $data = $('<div>');
            var numitems = 0;
            $.each(data.data, function(i, item) {
                numitems++;
                var $tr = $('<tr id=\'' + item.tutorID + '\'>').append(
                    $('<td>').text(item.name),
                    $('<td>').text(item.location),
                    $('<td>').text(item.subjects)
                );
                $data.append($tr);
            });
            if (numitems == 0)
                $data.append($.parseHTML('<tr><td>There are no tutors at this time.</td><td/><td/></tr>'));
            $('#tutorbody').html($data.html());
        },
        error: function(xhr, status) {},
        complete: function(xhr, status) {
            console.log("complete");
        }
    });
}


function submitSignIn(dropdown) {
    //input validation
    var valid = 0;
    var query = "?name=";
    var name, location;

    if (!$("#name").val()) {
        $("#name").parent('div').addClass("has-error");
    } else {
        $("#name").parent('div').removeClass("has-error");
        valid++;
        name = encodeRFC5987ValueChars($("#name").val());
        query += name;
    }

    if (dropdown) {
        if (!$("#num").val() || !isNumeric($("#num").val())) {
            $("#num").parent('div').addClass("has-error");
        } else {
            $("#num").parent('div').removeClass("has-error");
            valid++;
            location = encodeRFC5987ValueChars($("#num").val());
            query += "&num=" + location;
        }
    } else {
        if (!$("#location").val()) {
            $("#location").parent('div').addClass("has-error");
        } else {
            $("#location").parent('div').removeClass("has-error");
            valid++;
            location = encodeRFC5987ValueChars($("#location").val());
            query += "&loc=" + location;
        }
    }

    var format = /^[0-9]+[a-zA-Z]*[\s]*([\s,]+[0-9]+[a-zA-Z]*)*$/i;
    if (!$("#subject").val() || !format.test($("#subject").val())) {
        $("#subject").parent('div').addClass("has-error");
    } else {
        $("#subject").parent('div').removeClass("has-error");
        valid++;
        query += "&sub=" + encodeRFC5987ValueChars($("#subject").val());
    }
    if (!$("#password").val()) {
        $("#password").parent('div').addClass("has-error");
    } else {
        $("#password").parent('div').removeClass("has-error");
        valid++;
        query += "&pass=" + encodeRFC5987ValueChars($("#password").val());
    }

    if (valid == 4) {
        //do submit
        console.log("we good");
        console.log(query);
        sendLoginAttempt(query, name, location);
    } else {
        console.log("nice try kid");
    }

}

$(document).ready(function() {
    // set defaults
    $('[data-toggle="tooltip"]').tooltip();
    sleep.prevent();
    $("#locationform").hide();
    $("#locationdropdown").val("computer");
    $("#tlocationform").hide();
    $("#tlocationdropdown").val("tcomputer");

    $("#nextOrStart").bind("click", function() {
    	if ($(this).hasClass('disabled'))
    		return;
    	$('#tutor_text_status').text('Looking for someone to tutor...');
    	$("#nextOrStart").text('Next Person').addClass('disabled');
	  	// socket.emit('can_tutor');
	  	console.log("Next person activated.");

       socket.emit('ready_to_tutor');
		});

    $("#exitqueue").bind( "click", function() {
        if (tuteeID != -1) {
          // socket.emit('force_tutee_remove', {'myclass' : tuteeClass, 'tuteeID' : tuteeID});  
          socket.emit('force_tutee_remove', {'tuteeID' : tuteeID, 'myclass' : tuteeClass})
          console.log("Removed tutee");
        }     
    });

    $("#disconnect").bind( "click", function() {
        if (tutorID != -1) {
          socket.emit('force_tutor_remove', {'tutorRoom' : tutorRoom})
        }     
    });


    var dropdown = true;
    var tdropdown = true;

    // dropdown changer




    populateTable();

    setInterval(function() {
        populateTable();
    }, 60000);

    setInterval(function() {
        sendKeepAlive(tutorID);
    }, 300000);

    $('#refreshtable').click(function() {
        $('#refreshicon').addClass('fa-spin-custom');
        var button = $(this);
        button.prop('disabled', true).css('cursor', 'default');
        populateTable();
        setTimeout(function() {
            button.prop('disabled', false);
            $('#refreshicon').removeClass('fa-spin-custom');
        }, 3000);
    });

    $("#locationdropdown").change(function() {
        if ($("#locationdropdown").val() == "location") {
            dropdown = false;
            $("#locationform").show();
            $("#computerform").hide();
        } else {
            dropdown = true;
            $("#locationform").hide();
            $("#computerform").show();
        }
    });

    $("#tlocationdropdown").change(function() {
        if ($("#tlocationdropdown").val() == "tlocation") {
            tdropdown = false;
            $("#tlocationform").show();
            $("#tcomputerform").hide();
        } else {
            tdropdown = true;
            $("#tlocationform").hide();
            $("#tcomputerform").show();
        }
    });



    $(document).on('click', '.enterqueue', function(e) {
  		var tr_id = $(this).attr('id');
      var valid = 0; // counts # of form arguments
      var name, location;
      if (!$("#tname").val()) {
          $("#tname").parent('div').addClass("has-error");
      } else {
          $("#tname").parent('div').removeClass("has-error");
          valid++;
          name = encodeRFC5987ValueChars($("#tname").val());
      }

      if (dropdown) {
          if (!$("#tnum").val() || !isNumeric($("#tnum").val())) {
              $("#tnum").parent('div').addClass("has-error");
          } else {
              $("#tnum").parent('div').removeClass("has-error");
              valid++;
              location = encodeRFC5987ValueChars($("#tnum").val());
          }
      } else {
          if (!$("#tlocation").val()) {
              $("#tlocation").parent('div').addClass("has-error");
          } else {
              $("#tlocation").parent('div').removeClass("has-error");
              valid++;
              location = encodeRFC5987ValueChars($("#tlocation").val());
          }
      }

      if (valid != 2)
      	return;

      $('#signup').modal('hide');
      $('#signin').modal('hide');
      $('#queue').modal('show');
      
      enQueue(tr_id, name, location);
    });


    $('#queue').modal({
        backdrop: 'static',
        keyboard: false,
        show: false
    })

    // form submission
    $("#ttsignup").click(function(e) {
        populateTuteeTable();
    });

    $("#submit").click(function(e) {
        submitSignIn(dropdown);
    });

    $('#signin').keypress(function(e) {
        if (e.keyCode == 13) {
            submitSignIn();
        }
    });

    // row toggle
    $(".rowtoggle").click(function(e) {
        if ($(this).hasClass("success")) {
            $(this).addClass("danger").removeClass("success");
            //send to server BUSY
        } else {
            $(this).addClass("success").removeClass("danger");
            //send to server AVAILABLE
        }
    });

});