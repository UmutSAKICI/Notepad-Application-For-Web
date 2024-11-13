document.getElementById("downloadBtn").addEventListener('click', function () {
  var text = document.getElementById("noteDesc").value;
  var blob = new Blob([text], { type: "text/plain" });
  var link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.download = document.getElementById('file-name').value;
  link.click();
});