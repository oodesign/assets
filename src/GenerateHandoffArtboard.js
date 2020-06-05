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

    if (exportableSymbols[i].overrides != null) {
      Helpers.clog("-- Adding instances for style overrides");
      for (var j = 0; j < exportableSymbols[i].overrides.length; j++) {
        var overrideInstance = exportableSymbols[i].symbol.newSymbolInstance();

        AddToHandoffArtboard(overrideInstance, exportableSymbols[i].symbol.name() + "-" + exportableSymbols[i].overrides[j][0].origin + "-" + j, exportableSymbols[i].symbol.frame().width(), exportableSymbols[i].symbol.frame().height());



        for (var k = 0; k < overrideInstance.availableOverrides().length; k++) {
          //Helpers.clog(overrideInstance.availableOverrides()[k].overridePoint().layerID());
          var overrideElement = getOverrideElementByLayerID(overrideInstance.availableOverrides()[k].overridePoint().layerID(), exportableSymbols[i].overrides[j]);
          // Helpers.clog("---- Found override element");
          // Helpers.clog(overrideElement);

          if (overrideElement != null) {
            overrideInstance.setValue_forOverridePoint_(overrideElement.currentValue, overrideInstance.availableOverrides()[k].overridePoint());
          }
        }

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
      Helpers.clog("-- Found " + usedAsOverrides.length + " places where this symbol is used as override");
      for (var l=0;l<usedAsOverrides.length;l++) Helpers.clog(usedAsOverrides[l].name());

      if (instances != null) {
        for (var j = 0; j < instances.length; j++) {
          if (instances[j].style() != null && instances[j].style().fills() != null && instances[j].style().fills().length >= 1) {
            tintFills.push(instances[j].style().fills());
            Helpers.clog("-- Adding " + instances[j].style().fills().length + " tintFills");
          }

          if (instances[j].availableOverrides() != null && instances[j].availableOverrides().length > 0) {
            Helpers.clog("-- Adding " + instances[j].availableOverrides().length + " instance overrides");
            var elementOverrides = [];
            for (var k = 0; k < instances[j].availableOverrides().length; k++) {
              Helpers.clog("--- Adding override element for layer '" + instances[j].availableOverrides()[k].overridePoint().layerName() + "'. LayerID is: " + instances[j].availableOverrides()[k].overridePoint().layerID());
              elementOverrides.push({
                "overridePoint": instances[j].availableOverrides()[k].overridePoint(),
                "layerName": instances[j].availableOverrides()[k].overridePoint().layerName(),
                "layerID": instances[j].availableOverrides()[k].overridePoint().layerID(),
                "defaultValue": instances[j].availableOverrides()[k].defaultValue(),
                "currentValue": instances[j].availableOverrides()[k].currentValue(),
                "origin": "InstanceOverride"
              });
            }

            overrides.push(elementOverrides);
          }
        }
      }

      if (usedAsOverrides != null) {
        for (var j = 0; j < usedAsOverrides.length; j++) {
          if (usedAsOverrides[j].availableOverrides() != null && usedAsOverrides[j].availableOverrides().length > 0) {
            Helpers.clog("-- Adding " + usedAsOverrides[j].availableOverrides().length + " override-instance overrides");
            var elementOverrides = [];
            for (var k = 0; k < usedAsOverrides[j].availableOverrides().length; k++) {

              Helpers.clog("------------- Adding use-as-override. LayerID:" + usedAsOverrides[j].availableOverrides()[k].overridePoint().layerID());
              Helpers.clog("------------- Adding use-as-override. DV:" + usedAsOverrides[j].availableOverrides()[k].defaultValue());
              Helpers.clog("------------- Adding use-as-override. CV:" + usedAsOverrides[j].availableOverrides()[k].currentValue());
              Helpers.clog("-------------");

              elementOverrides.push({
                "overridePoint": usedAsOverrides[j].availableOverrides()[k].overridePoint(),
                "layerName": usedAsOverrides[j].availableOverrides()[k].overridePoint().layerName(),
                "layerID": usedAsOverrides[j].availableOverrides()[k].overridePoint().layerID(),
                "defaultValue": usedAsOverrides[j].availableOverrides()[k].defaultValue(),
                "currentValue": usedAsOverrides[j].availableOverrides()[k].currentValue(),
                "origin": "SymbolAsOverride"
              });
            }

            overrides.push(elementOverrides);
          }
        }
      }

      //overrides = CleanRedundantOverrides(overrides);

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