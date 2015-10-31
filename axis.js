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

  $(".rowtoggle").click(function(e) {
    if( $(this).hasClass("success") ) {
      $(this).addClass("danger").removeClass("success");
    } else {
      $(this).addClass("success").removeClass("danger");
    }
  });

});
