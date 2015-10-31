$(document).ready(function() {

  // set defaults
  $("#locationform").hide();
  $("#locationdropdown").val("computer");
  var dropdown = true;

  // dropdown changer
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

  // form submission
  $("#submit").click(function(e) {
    //input validation
    var valid = 0;
    // REALLY BAD INPUT VALIDATION
    if (!$("#name").val()) {
      $("#name").parent('div').addClass("has-error");
    } else {
      $("#name").parent('div').removeClass("has-error");
      valid++;
    }

    if (dropdown) {
      if (!$("#num").val()) {
        $("#num").parent('div').addClass("has-error");
      } else {
        $("#num").parent('div').removeClass("has-error");
        valid++;
      }
    } else {
      if (!$("#location").val()) {
        $("#location").parent('div').addClass("has-error");
      } else {
        $("#location").parent('div').removeClass("has-error");
        valid++;
      }
    }

    if (!$("#subject").val()) {
      $("#subject").parent('div').addClass("has-error");
    } else {
      $("#subject").parent('div').removeClass("has-error");
      valid++;
    }
    if (!$("#password").val()) {
      $("#password").parent('div').addClass("has-error");
    } else {
      $("#password").parent('div').removeClass("has-error");
      valid++;
    }


    if (valid == 4) {
      //do submit
      console.log("we good");
    } else {
      console.log("nice try");
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
