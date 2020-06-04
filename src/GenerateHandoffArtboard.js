import BrowserWindow from 'sketch-module-web-view'
import { getWebview } from 'sketch-module-web-view/remote'
const Helpers = require("./Helpers");

const webviewIdentifier = 'sketch-assets.webview'
var assetsPage;
var assetsArtboard;
var assetsPageName = "Auto-generated assets";
var assetsArtboardName = "Assets";

function CreatePage(context) {
  var artboardWidth = 1000;
  var artboardHeight = 600;

  for (var i = 0; i < context.document.pages().count(); i++) {
    var pagename = context.document.pages()[i].name().toString();
    if (pagename.localeCompare(assetsPageName) == 0) {
      assetsPage = context.document.pages()[i];
    }
  }

  if (assetsPage == null) {
    assetsPage = context.document.addBlankPage();
    assetsPage.setName(assetsPageName);
  }

  var removeArtboards = [];
  for (var i = 0; i < assetsPage.artboards().count(); i++) {
    removeArtboards.push(assetsPage.artboards()[i]);
  }
  for (var i = 0; i < removeArtboards.length; i++) {
    removeArtboards[i].removeFromParent();
  }


  assetsArtboard = MSArtboardGroup.new();
  assetsArtboard.frame().setX(0);
  assetsArtboard.frame().setY(0);
  assetsArtboard.frame().setWidth(artboardWidth);
  assetsArtboard.frame().setHeight(artboardHeight);
  assetsArtboard.setName(assetsArtboardName);

  var layer = MSTextLayer.new();
  layer.stringValue = "This artboard is created automatically. Any change done may be overridden when running Sketch Assets";
  layer.frame().setX(50);
  layer.frame().setY(50);
  assetsArtboard.addLayer(layer);
  assetsPage.addLayer(assetsArtboard);

}

export function GenerateHandoffArtboard(context) {

  Helpers.clog("----- Generate Handoff Artboard -----");

  var exportableLayers = [];
  context.document.currentPage().exportableLayers();
  for (var i = 0; i < context.document.pages().count(); i++) {
    for (var j = 0; j < context.document.pages()[i].exportableLayers().length; j++) {
      exportableLayers.push(context.document.pages()[i].exportableLayers()[j]);
    }
  }

  Helpers.clog("There are " + exportableLayers.length + " exportable elements in the whole document.");
  var exportableSymbols = [];
  for (var i = 0; i < exportableLayers.length; i++) {
    var tintFills = [];
    if (exportableLayers[i].class() == "MSSymbolMaster") {
      Helpers.clog("-- Adding symbol '" + exportableLayers[i].name() + "'");

      var instances = Helpers.getSymbolInstances(context, exportableLayers[i]);
      var overrides = Helpers.getSymbolOverrides(context, exportableLayers[i]);
      Helpers.clog("Found " + instances.length + " instances");
      Helpers.clog("Found " + overrides.length + " overrides");

      if (instances != null) {
        for (var j = 0; j < instances.length; j++) {
          if (instances[j].style() != null && instances[j].style().fills() != null && instances[j].style().fills().length >= 1) {
            tintFills.push(instances[j].style().fills()[0]);
            Helpers.clog("Adding " + instances[j].style().fills().length + " tintFills");
          }
          Helpers.clog(instances[j].overrides());
        }
      }


      exportableSymbols.push({
        "symbol": exportableLayers[i],
        "originalExportOptions": exportableLayers[i].exportOptions(),
        "tintFills": tintFills
      });
    }
  }

  CreatePage(context);

  context.document.showMessage("Wooo, this is cool.");


};

export function onShutdown(webviewID) {
  const existingWebview = getWebview(webviewID)
  if (existingWebview) {
    existingWebview.close()
  }
}