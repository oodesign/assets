import BrowserWindow from 'sketch-module-web-view'
import { getWebview } from 'sketch-module-web-view/remote'
const Helpers = require("./Helpers");

const webviewIdentifier = 'sketch-assets.webview'
var assetsPage;
var assetsArtboard;
var assetsPageName = "Auto-generated assets";
var assetsArtboardName = "Assets";

var verticalDistance = 100;
var offsetXFactor = 3;
var initialXOffset = 200;
var initialYOffset = 200;
var nextXLocation = 0;
var nextYLocation = 0;

function AddToHandoffArtboard(instance, name, width, height) {
  Helpers.clog("Adding to handoff artboard instance of '" + name + "' - X: " + nextXLocation + " Y: " + nextYLocation + " Width: " + width + " Height: " + height);
  instance.frame().setX(nextXLocation);
  instance.frame().setY(nextYLocation);
  instance.frame().setWidth(width);
  instance.frame().setHeight(height);

  instance.setName(name);

  assetsArtboard.addLayer(instance);
}



function getOverrideElementByLayerID(layerID, overrideElements) {
  for (var i = 0; i < overrideElements.length; i++) {
    if (overrideElements[i].layerID.localeCompare(layerID) == 0)
      return overrideElements[i];
  }
  return null;
}

function AddHandoffInstances(context, exportableSymbols) {
  Helpers.clog("Add Handoff Instances");
  nextXLocation = initialXOffset;
  nextYLocation = initialYOffset;

  for (var i = 0; i < exportableSymbols.length; i++) {
    Helpers.clog("-- Adding original instance");
    var originalInstance = exportableSymbols[i].symbol.newSymbolInstance();
    AddToHandoffArtboard(originalInstance, exportableSymbols[i].symbol.name(), exportableSymbols[i].symbol.frame().width(), exportableSymbols[i].symbol.frame().height());

    nextXLocation += (exportableSymbols[i].symbol.frame().width() * offsetXFactor);

    if (exportableSymbols[i].tintFills != null) {
      Helpers.clog("-- Adding instances for tint fills");
      for (var j = 0; j < exportableSymbols[i].tintFills.length; j++) {
        var tintFillInstance = exportableSymbols[i].symbol.newSymbolInstance();
        tintFillInstance.style().fills = exportableSymbols[i].tintFills[j];
        AddToHandoffArtboard(tintFillInstance, exportableSymbols[i].symbol.name() + "-tint-" + j, exportableSymbols[i].symbol.frame().width(), exportableSymbols[i].symbol.frame().height());
        nextXLocation += (exportableSymbols[i].symbol.frame().width() * offsetXFactor);
      }
    }

    Helpers.clog("");
    Helpers.clog("");

    if (exportableSymbols[i].overrides != null) {
      Helpers.clog("-- ** START DRAWING for overrides ** --");


      for (var j = 0; j < exportableSymbols[i].overrides.length; j++) {
        var shouldBeRemoved = false;

        var overrideInstance = exportableSymbols[i].symbol.newSymbolInstance();
        AddToHandoffArtboard(overrideInstance, exportableSymbols[i].symbol.name() + "-" + exportableSymbols[i].overrides[j].origin + "-" + j, exportableSymbols[i].symbol.frame().width(), exportableSymbols[i].symbol.frame().height());

        if (exportableSymbols[i].overrides[j].key.localeCompare("symbolID") != 0) {

          Helpers.clog(exportableSymbols[i].overrides[j]);
          Helpers.clog(exportableSymbols[i].overrides[j].value);

          for (var l = 0; l < overrideInstance.availableOverrides().length; l++) {
            Helpers.clog("Comparing " + overrideInstance.availableOverrides()[l].overridePoint().layerID() + " vs " + exportableSymbols[i].overrides[j].value);
            if (overrideInstance.availableOverrides()[l].overridePoint().layerID().localeCompare(exportableSymbols[i].overrides[j].key) == 0) {

              Helpers.clog("We've found an avOverride YUJUUU");
              overrideInstance.setValue_forOverridePoint_(exportableSymbols[i].overrides[j].value, overrideInstance.availableOverrides()[l].overridePoint());
            }
          }
        }

        if (shouldBeRemoved) overrideInstance.removeFromParent();
        else
          nextXLocation += (exportableSymbols[i].symbol.frame().width() * offsetXFactor);
      }
    }

    nextXLocation = initialXOffset;
    nextYLocation += verticalDistance;
  }
}

function CreateHandoffArtboard(context, exportableSymbols) {
  var artboardWidth = 1000;
  var artboardHeight = (exportableSymbols.length * verticalDistance) + initialYOffset;

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

function EstablishAssetsPage(context) {
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
}

function RemoveExistingAssets(context) {
  var removeArtboards = [];
  for (var i = 0; i < assetsPage.artboards().count(); i++) {
    removeArtboards.push(assetsPage.artboards()[i]);
  }
  for (var i = 0; i < removeArtboards.length; i++) {
    removeArtboards[i].removeFromParent();
  }
}

function CompareOverrides(overrideA, overrideB) {
  var equalOv = 0;
  for (var i = 0; i < overrideA.length; i++) {
    if (
      overrideA[i].layerID.localeCompare(overrideB[i].layerID) == 0 &&
      overrideA[i].currentValue.localeCompare(overrideB[i].currentValue) == 0
    ) {
      equalOv++;
    }
  }

  return (equalOv == overrideA.length);
}

function CleanRedundantOverrides(overrides) {
  Helpers.clog("Cleaning redundant overrides");
  var uniqueOverrides = [];
  var differentThanOrigin = [];
  var redundantObjects = [];

  //Remove overrides that are not overrides, because have default value
  var sameAsOrigin = [];
  for (var i = 0; i < overrides.length; i++) {
    var equalOv = 0;
    for (var j = 0; j < overrides[i].length; j++) {
      if (overrides[i][j].defaultValue.localeCompare(overrides[i][j].currentValue) == 0)
        equalOv++;
    }

    if (equalOv == overrides[i].length)
      sameAsOrigin.push(i);
  }

  for (var i = 0; i < overrides.length; i++) {
    if (sameAsOrigin.indexOf(i) < 0) {
      differentThanOrigin.push(overrides[i]);
    }
  }

  Helpers.clog("-- We found " + sameAsOrigin.length + " overrides that were equal to original:" + sameAsOrigin);

  //Remove redundant overrides
  for (var i = 0; i < differentThanOrigin.length; i++) {
    if ((i + 1) < differentThanOrigin.length) {
      for (var j = (i + 1); j < differentThanOrigin.length; j++) {
        if (redundantObjects.indexOf(j) < 0) {
          var areEquals = CompareOverrides(differentThanOrigin[i], differentThanOrigin[j]);
          if (areEquals)
            redundantObjects.push(j);
        }
      }
    }
  }

  Helpers.clog("-- We found " + redundantObjects.length + " overrides that were redundant:" + redundantObjects);

  for (var i = 0; i < differentThanOrigin.length; i++) {
    if (redundantObjects.indexOf(i) < 0) {
      uniqueOverrides.push(differentThanOrigin[i]);
    }
  }

  Helpers.clog("There were " + overrides.length + " overrides, but only " + uniqueOverrides.length + " unique ones.");

  return uniqueOverrides;
}

function OverrideIsIncluded(defOverride, overrides) {
  var isInArray = false;
  for (var i = 0; i < overrides.length; i++) {
    if (
      overrides[i].key.localeCompare(defOverride.key) == 0 &&
      overrides[i].value.localeCompare(defOverride.value) == 0
    ) {
      isInArray = true;
    }
  }
  return isInArray;
}

export function GenerateHandoffArtboard(context) {

  Helpers.clog("----- Generate Handoff Artboard -----");

  EstablishAssetsPage(context);

  RemoveExistingAssets(context);

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
    var overrides = [];

    if (exportableLayers[i].class() == "MSSymbolMaster") {
      Helpers.clog("-- Adding symbol '" + exportableLayers[i].name() + "'");

      var instances = Helpers.getSymbolInstances(context, exportableLayers[i]);
      var usedAsOverrides = Helpers.getSymbolOverrides(context, exportableLayers[i]);
      Helpers.clog("-- Found " + instances.length + " instances");
      Helpers.clog("-- Found " + usedAsOverrides.length + " places where this symbol is used as override (or as part of symbol)");
      for (var l = 0; l < usedAsOverrides.length; l++) Helpers.clog(usedAsOverrides[l].name());


      if (instances != null) {
        for (var j = 0; j < instances.length; j++) {
          Helpers.clog("Instance overrides");
          Helpers.clog(instances[j].overrides());
          Helpers.clog(instances[j].overrides().count());


          if (instances[j].overrides() != null && instances[j].overrides().count() > 0) {

            for (var key in instances[j].overrides()) {
              Helpers.clog("key is:" + key);
              Helpers.clog(instances[j].overrides()[key]);

              if (key.localeCompare("symbolID") != 0) {
                var defOverride = {
                  "key": key,
                  "value": instances[j].overrides()[key],
                  "origin": "Instance"
                };

                if (!OverrideIsIncluded(defOverride, overrides)) {
                  overrides.push(defOverride);
                }
              }
            }
          }
        }
      }

      if (usedAsOverrides != null) {
        for (var j = 0; j < usedAsOverrides.length; j++) {
          Helpers.clog("UsedAsOverrides overrides");

          if (usedAsOverrides[j].overrides() != null && usedAsOverrides[j].overrides().count() > 0) {


            Helpers.clog(usedAsOverrides[j].overrides());

            for (var key in usedAsOverrides[j].overrides()) {
              var shouldAdd = true;
              for (var overrideKey in usedAsOverrides[j].overrides()[key]) {
                if (overrideKey.localeCompare("symbolID") == 0) {
                  Helpers.clog("==> Overrides  symbolID is: " + usedAsOverrides[j].overrides()[key][overrideKey]);
                  Helpers.clog("==> Ref Master symbolID is: " + exportableLayers[i].symbolID());

                  if (usedAsOverrides[j].overrides()[key][overrideKey].localeCompare(exportableLayers[i].symbolID()) != 0)
                    shouldAdd = false;
                }

                if (overrideKey.localeCompare("symbolID") != 0) {
                  if (shouldAdd) {

                    Helpers.clog(usedAsOverrides[j].overrides()[key][overrideKey]);
                    Helpers.clog(" - Adding override element: parent key is:" + key);
                    Helpers.clog(" - Adding override element: overrideKey:" + overrideKey);
                    Helpers.clog(" - Adding override element: value:" + usedAsOverrides[j].overrides()[key][overrideKey]);
                    Helpers.clog(" - Adding override element: value:" + usedAsOverrides[j].overrides()[key][overrideKey]);
                    var defOverride = {
                      "key": overrideKey,
                      "value": usedAsOverrides[j].overrides()[key][overrideKey],
                      "origin": "SymbolOverride"
                    };

                    if (!OverrideIsIncluded(defOverride, overrides)) {
                      overrides.push(defOverride);
                    }
                  }
                }
              }
            }
          }
        }
      }

      //overrides = CleanRedundantOverrides(overrides, exportableLayers[i]);


      Helpers.clog("This is the final overrides list");
      Helpers.clog(overrides);

      exportableSymbols.push({
        "symbol": exportableLayers[i],
        "originalExportOptions": exportableLayers[i].exportOptions(),
        "tintFills": tintFills,
        "overrides": overrides
      });
    }
  }

  CreateHandoffArtboard(context, exportableSymbols);
  AddHandoffInstances(context, exportableSymbols)

  context.document.showMessage("Wooo, this is cool.");


};

export function onShutdown(webviewID) {
  const existingWebview = getWebview(webviewID)
  if (existingWebview) {
    existingWebview.close()
  }
}