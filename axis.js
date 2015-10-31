$(document).ready(function() {

  $("#locationform").hide();

  $("#locationdropdown").change(function() {
    if ($("#locationdropdown").val() == "location") {
      $("#locationform").show();
      $("#computerform").hide();
    } else {
      $("#locationform").hide();
      $("#computerform").show();
    }
  });

});
