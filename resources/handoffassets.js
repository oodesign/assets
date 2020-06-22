// disable the context menu (eg. the right click menu) to have a more native feel
document.addEventListener('contextmenu', (e) => {
  //e.preventDefault()
})
var globalMergeSession;
var globalSymbolDisplayed = 0;
var isLoadingSymbolData = false;
var globalNumberOfSymbolsInDocument = 0;
var globalNumberOfSymbolsInLibraries = 0;
var globalView = 1;

window.LaunchHandoff = (numberOfLocalSymbols, numberOfLibrarySymbols) => {
  globalNumberOfSymbolsInDocument = numberOfLocalSymbols;
  globalNumberOfSymbolsInLibraries = numberOfLibrarySymbols;

  if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', GenerateHandoff);
  } else {
    GenerateHandoff();
  }
}

window.GenerateHandoff = () => {
  window.postMessage("nativeLog", "WV - GenerateHandoff");

  setTimeout(function () {
    var message = "Generating assets";
    window.ShowProgress(0, message);
    window.postMessage('ExecuteGenerateHandoff');
  }, 300);
}


window.ShowProgress = (progress, message) => {
  document.getElementById('progressLayer').className = "progressCircle offDownCenter fadeIn";
  document.getElementById('progressCircle').className = "rowAuto alignFullCenter item progress-" + progress;
  document.getElementById('loadingMessage').innerHTML = message;
};


