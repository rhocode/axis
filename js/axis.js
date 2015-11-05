

var tutorID = -1; //Local tracking of tutor numbers

function createButton(id) {
  return '<button id="' + id + '" type="button" class="btn btn-xs btn-success enterqueue" \
      title="Enter Queue">\
      <span class="glyphicon glyphicon glyphicon-time" aria-hidden="true"></span>\
      </button>'
}
function encodeRFC5987ValueChars (str) {
    return encodeURIComponent(str).
        // Note that although RFC3986 reserves "!", RFC5987 does not,
        // so we do not need to escape it
        replace(/['()]/g, escape). // i.e., %27 %28 %29
        replace(/\*/g, '%2A').
            // The following are not required for percent-encoding per RFC5987, 
            // so we can allow for a little better readability over the wire: |`^
            replace(/%(?:7C|60|5E)/g, unescape);
}

function isNumeric(num){
    return !isNaN(num)
}

function sendLoginAttempt(query){
    $.ajax({
        url: "http://d.rhocode.com:5000/login.html" + query,
        data: {},
        type: "GET",
        crossDomain: true,
        dataType: "jsonp",
        success: function (data) {
            if(data.status == 'success') {
              tutorID = data.tutorcode;
              $("#serverresponselogin").html("Sign-in successful! Welcome " + $("#name").val() + '! Your tutor code is <b>' + data.tutorcode + '</b>.');
              populateTable();
            } else {
              $("#serverresponselogin").text("Sign-in failed.");
            }
            
        },
        error: function (xhr, status) {
            $("#serverresponselogin").text("Server might be offline. Please contact aafu@ucdavis.edu!");
        },
        complete: function (xhr, status) {
            console.log("complete");
        }
    });
}

function sendKeepAlive(tutorid){
    if (tutorid == -1)
      return;
    $.ajax({
        url: "http://d.rhocode.com:5000/keepalive.html?tutorid=" + String(tutorid),
        data: {},
        type: "GET",
        crossDomain: true,
        dataType: "jsonp",
        success: function (data) {
            if (data.status != 'success') {
                $("#serverresponselogin").text("Your session has expired. Please relog.");
                $('#signin').modal('show');
            }       
        },  
        error: function (xhr, status) {

        },
        complete: function (xhr, status) {
            console.log("Keepalive Sent.");
        }
    });
}

function populateTuteeTable(){
    $.ajax({
        url: "http://d.rhocode.com:5000/tutoredsubjs.html?",
        data: {},
        type: "GET",
        crossDomain: true,
        dataType: "jsonp",
        success: function (data) {
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
        error: function (xhr, status) {

        },
        complete: function (xhr, status) {
            console.log("Table populated.");
        }
    });
}


function populateTable(){
    $.ajax({
        url: "http://d.rhocode.com:5000/table.html",
        data: {},
        type: "GET",
        crossDomain: true,
        dataType: "jsonp",
        success: function (data) {
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
        error: function (xhr, status) {
        },
        complete: function (xhr, status) {
            console.log("complete");
        }
    });
}


function submitSignIn(dropdown) {
      //input validation
    var valid = 0;
    var query = "?name=";
    // REALLY BAD INPUT VALIDATION
    if (!$("#name").val()) {
      $("#name").parent('div').addClass("has-error");
    } else {
      $("#name").parent('div').removeClass("has-error");
      valid++;
      query += encodeRFC5987ValueChars($("#name").val());
    }
    
    if (dropdown) {
      if (!$("#num").val() || !isNumeric($("#num").val())) {
        $("#num").parent('div').addClass("has-error");
      } else {
        $("#num").parent('div').removeClass("has-error");
        valid++;
        query += "&num=" + encodeRFC5987ValueChars($("#num").val());
      }
    } else {
      if (!$("#location").val()) {
        $("#location").parent('div').addClass("has-error");
      } else {
        $("#location").parent('div').removeClass("has-error");
        valid++;
        query += "&loc=" + encodeRFC5987ValueChars($("#location").val());
      }
    }

    var format = /^[0-9]+[a-zA-Z]*[\s]*([\s,]+[0-9]+[a-zA-Z]*)*$/i;
    if (!$("#subject").val() ||  !format.test( $("#subject").val() ) ) {
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
      sendLoginAttempt(query);
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
  var dropdown = true;
  
  // dropdown changer
  
  populateTable();

  setInterval(function(){
    populateTable();
  }, 60000);

  setInterval(function(){
    sendKeepAlive(tutorID);
  }, 300000);

  $('#refreshtable').click(function() {
      $('#refreshicon').addClass('fa-spin-custom');
      var button =  $(this);
      button.prop('disabled', true).css('cursor','default');
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

  $("#tsubmit").click(function(e) {

  var valid = 0; // counts # of form arguments
  var query = "?name=";

  if (!$("#tname").val()) {
    $("#tname").parent('div').addClass("has-error");
  } 
  else {
      $("#tname").parent('div').removeClass("has-error");
      valid++;
      query += encodeRFC5987ValueChars($("#tname").val());
    }

    if (dropdown) {
      if (!$("#tnum").val() || !isNumeric($("#tnum").val())) {
        $("#tnum").parent('div').addClass("has-error");
      } else {
        $("#tnum").parent('div').removeClass("has-error");
        valid++;
        query += "&num=" + encodeRFC5987ValueChars($("#tnum").val());
      }
    } else {
      if (!$("#tlocation").val()) {
        $("#tlocation").parent('div').addClass("has-error");
      } else {
        $("#tlocation").parent('div').removeClass("has-error");
        valid++;
        query += "&loc=" + encodeRFC5987ValueChars($("#tlocation").val());
      }
    }

    query += "&sub="
    var subs = 0; //counts # of subjects needs tutoring for.
    // $('#tutoringsubjectbody tr').each(function() {
    //   //check the buttons to see if they are checked
    //   //count the # of buttons
    //   query += encodeRFC5987ValueChars($("#button").closest("div").attr("id"));
    //   // ^^^ Adds the id of the closest value to the button, theoretically the 
    //   // class
    // }

    if (!subs) {
      $("#tutoringsubjectbody").parent('div').addClass("has-error");
    } else {
      $("#tutoringsubjectbody").parent('div').removeClass("has-error");
      valid++;
    }

    if (valid == 4) {
      //do submit
      console.log("we good");
      console.log(query);
      // sendTutoreeAttempt(query); Tutoree send attempt needed?
    } else {
      console.log("nice try kid");
    }

  });

  $(document).on('click', '.enterqueue', function(e){
      console.log('hidden');
      $('#signup').modal('hide');
      $('#signin').modal('hide');
      $('#queue').modal('show');
      var tr_id = $(this).closest('div[id]');
      enQueue(tr_id)
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
      console.log(e.keyCode == 13);
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

function enQueue(class) {
  $.ajax({
    url:"http://d.rhocode.com:5000/",
    data: {},
    type: "GET",
    crossDomain: true,
    dataType: "jsonp",
    success: function (data) {
      $("#displaymodalText").html("You have been successfully queued");
    },
    error: function (xhr, status) {
    },
    complete: function (xhr, status) {
      console.log("complete");
    }

  });

}
