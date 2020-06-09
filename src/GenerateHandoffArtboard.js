import BrowserWindow from 'sketch-module-web-view'
import { getWebview } from 'sketch-module-web-view/remote'
const Helpers = require("./Helpers");

const webviewIdentifier = 'sketch-assets.webview'
var assetsPage;
var assetsArtboard;
var assetsPageName = "Auto-generated assets";
var assetsArtboardName = "Assets";

var offsetXFactor = 3;
var verticalDistance = 100;
var offsetYFactor = 3;
var initialXOffset = 50;
var initialYOffset = 200;
var nextXLocation = 0;
var nextYLocation = 0;

function AddToHandoffArtboard(instance, name, width, height, exportOptions) {
  Helpers.clog("Adding to handoff artboard instance of '" + name + "' - X: " + nextXLocation + " Y: " + nextYLocation + " Width: " + width + " Height: " + height);
  instance.frame().setX(nextXLocation);
  instance.frame().setY(nextYLocation);
  instance.frame().setWidth(width);
  instance.frame().setHeight(height);

  instance.setName(name);
  instance.exportOptions = exportOptions;

  assetsArtboard.addLayer(instance);
}

function GetOverridePointByLayerID(layerID, availableOverrides) {
  for (var i = 0; i < availableOverrides.length; i++) {
    if (availableOverrides[i].overridePoint().layerID().localeCompare(layerID) == 0)
      return availableOverrides[i].overridePoint();
  }
  return null;
}

function AddTitle(assetsArtboard) {
  var title = MSTextLayer.new();
  title.stringValue = "Assets";
  title.setFont(NSFont.fontWithName_size('Arial Bold', 25));
  var msColor = MSImmutableColor.colorWithRed_green_blue_alpha(0.5, 0.5, 0.5, 1);
  title.setTextColor(msColor);
  title.frame().setX(initialXOffset);
  title.frame().setY(50);
  assetsArtboard.addLayer(title);


  var subtitle = MSTextLayer.new();
  subtitle.stringValue = "This artboard is created automatically. Any change done may be overridden when running Sketch Assets";
  subtitle.setFont(NSFont.fontWithName_size('Arial', 16));
  var msColor = MSImmutableColor.colorWithRed_green_blue_alpha(0.6, 0.6, 0.6, 1);
  subtitle.setTextColor(msColor);
  subtitle.frame().setX(initialXOffset);
  subtitle.frame().setY(90);
  assetsArtboard.addLayer(subtitle);
}

function CreateHandoffArtboard(context, exportableSymbols) {
  var artboardWidth = 1000;
  var artboardHeight = 100;

  var neededSize = GetArtboardSize(context, exportableSymbols);
  console.log("Artboard needed size is: [" + neededSize.x + "," + neededSize.y + "]");

  if (neededSize.x > artboardWidth) artboardWidth = neededSize.x;
  if (neededSize.y > artboardHeight) artboardHeight = neededSize.y;

  assetsArtboard = MSArtboardGroup.new();
  assetsArtboard.frame().setX(0);
  assetsArtboard.frame().setY(0);
  assetsArtboard.frame().setWidth(artboardWidth);
  assetsArtboard.frame().setHeight(artboardHeight);
  assetsArtboard.setName(assetsArtboardName);

  AddTitle(assetsArtboard);


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

export function ShowAvailableOverrides(context) {
  var element = context.selection[0];
  Helpers.clog("RELATED OVERRIDES");
  var allAvailableOverrides = Helpers.GetRelatedOverrides(element.availableOverrides(), "DDD005ED-9D03-4FCA-A12F-D1AD482E64D6", 0);
  for (var i = 0; i < allAvailableOverrides.length; i++) {
    var avOv = allAvailableOverrides[i];
    Helpers.clog("- Override (" + avOv.class() + ") for element '" + avOv.overridePoint().layerName() + "'. HasOverride:" + avOv.hasOverride() + ". AffectedLayer:" + avOv.affectedLayer().name() + ". Master:" + avOv.master().name());
    Helpers.clog(avOv);
    if (avOv.class() == "MSSymbolOverride") {
      Helpers.clog("-- Symbol override. DV:" + avOv.defaultValue());
      Helpers.clog("-- Symbol override. CV:" + avOv.currentValue());
      Helpers.clog("-- Symbol override. CA:DDD005ED-9D03-4FCA-A12F-D1AD482E64D6");
    }
  }

  Helpers.clog("");
  Helpers.clog("");
}

function CompareVariants(variantA, variantB) {

  var equalOv = 0;
  var processedVariants = 0;

  for (var i = 0; i < variantA.length; i++) {
    if (variantB[i] != null) {
      if (
        variantA[i].overridePoint().layerID().localeCompare(variantB[i].overridePoint().layerID()) == 0 &&
        variantA[i].currentValue().localeCompare(variantB[i].currentValue()) == 0
      ) {
        equalOv++;
      }
      processedVariants++;
    }
  }
  return (equalOv == processedVariants);
}

function GetUniqueVariants2(variants) {
  var uniqueVariants = [];
  var redundantObjects = [];

  for (var i = 0; i < variants.length; i++) {
    if ((i + 1) < variants.length) {
      for (var j = (i + 1); j < variants.length; j++) {
        if (redundantObjects.indexOf(j) < 0) {
          var areEquals = CompareVariants(variants[i].relatedOverrides, variants[j].relatedOverrides);
          if (areEquals)
            redundantObjects.push(j);
        }
      }
    }
  }

  for (var i = 0; i < variants.length; i++) {
    if (redundantObjects.indexOf(i) < 0) {
      uniqueVariants.push(variants[i]);
    }
  }

  return uniqueVariants;
}

function GetUniqueVariants(styleOverrides) {
  var uniqueVariants = [];
  var allAvOverrides = [];

  for (var i = 0; i < styleOverrides.length; i++) {
    for (var j = 0; j < styleOverrides[i].relatedOverrides.length; j++) {
      allAvOverrides.push(styleOverrides[i].relatedOverrides[j]);
    }
  }

  var redundantOverrides = [];

  for (var i = 0; i < allAvOverrides.length; i++) {
    if ((i + 1) < allAvOverrides.length) {
      for (var j = (i + 1); j < allAvOverrides.length; j++) {
        if (redundantOverrides.indexOf(j) < 0) {
          if (
            allAvOverrides[i].overridePoint().layerID().localeCompare(allAvOverrides[j].overridePoint().layerID()) == 0 &&
            allAvOverrides[i].currentValue().localeCompare(allAvOverrides[j].currentValue()) == 0
          ) {
            redundantOverrides.push(j);
          }
        }
      }
    }
  }

  for (var i = 0; i < allAvOverrides.length; i++) {
    if (redundantOverrides.indexOf(i) < 0) {
      uniqueVariants.push(allAvOverrides[i]);
    }
  }

  return uniqueVariants;
}

export function GenerateHandoffArtboard(context) {

  var counterTotalAssets = 0;

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
    var styleOverrides = [];
    var variants = [];

    var instanceOverrideCounter = 0;
    var symbolOverrideCounter = 0;

    if (exportableLayers[i].class() == "MSSymbolMaster") {
      Helpers.clog("");
      Helpers.clog("-- Processing symbol '" + exportableLayers[i].name() + "'");

      var instancesWithTints = Helpers.GetDirectInstancesWithTints(exportableLayers[i]);
      var indirectInstancesOverrides = Helpers.GetInstancesAndRelatedOverrides(exportableLayers[i]);

      Helpers.clog("-- Found " + indirectInstancesOverrides.length + " places where this symbol is used as override (or as part of symbol)");

      if (indirectInstancesOverrides != null) {
        for (var j = 0; j < indirectInstancesOverrides.length; j++) {
          Helpers.clog("Processing indirectInstanceOverrides for instance '" + indirectInstancesOverrides[j].instance.name() + "', that has " + indirectInstancesOverrides[j].relatedOverrides.length + " related overrides.");
          if (indirectInstancesOverrides[j].relatedOverrides.length > 0) {
            styleOverrides.push(indirectInstancesOverrides[j]);
          }

          if (indirectInstancesOverrides[j].instance.symbolMaster().symbolID().localeCompare(exportableLayers[i].symbolID()) == 0) {
            if (indirectInstancesOverrides[j].instance.style() != null && indirectInstancesOverrides[j].instance.style().fills() != null && indirectInstancesOverrides[j].instance.style().fills().length >= 1) {
              if (instancesWithTints.indexOf(indirectInstancesOverrides[j].instance) < 0)
                instancesWithTints.push(indirectInstancesOverrides[j].instance);
            }
          }
        }
      }

      variants = GetUniqueVariants(styleOverrides);

      Helpers.clog("");
      Helpers.clog("Briefing for " + exportableLayers[i].name());
      Helpers.clog("-- Found direct instances with tints:" + instancesWithTints.length);
      Helpers.clog("-- Found variants:" + variants.length);
      Helpers.clog("");

      exportableSymbols.push({
        "symbol": exportableLayers[i],
        "originalExportOptions": exportableLayers[i].exportOptions(),
        "instancesWithTints": instancesWithTints,
        "variants": variants
      });

      counterTotalAssets += (1 + tintFills.length + variants.length);
    }
  }


  CreateHandoffArtboard(context, exportableSymbols);
  AddHandoffInstances(context, exportableSymbols)

  context.document.showMessage("Hey ho! We created " + counterTotalAssets + " exportable assets for " + exportableLayers.length + " different symbols.");


};

function GetArtboardSize(context, exportableSymbols) {

  var neededSize = {
    "x": 0,
    "y": 0
  };

  var maxX = 0;

  var anextXLocation = 0;
  var anextYLocation = 0;

  for (var i = 0; i < exportableSymbols.length; i++) {

    var rowX = 0;
    var rowHeight = 0;

    anextXLocation += (exportableSymbols[i].symbol.frame().width() * offsetXFactor);
    if (exportableSymbols[i].instancesWithTints != null) {
      for (var j = 0; j < exportableSymbols[i].instancesWithTints.length; j++) {
        anextXLocation += (exportableSymbols[i].symbol.frame().width() * offsetXFactor);
      }
    }

    if (exportableSymbols[i].variants != null) {
      for (var j = 0; j < exportableSymbols[i].variants.length; j++) {
        anextXLocation += (exportableSymbols[i].symbol.frame().width() * offsetXFactor);
      }
    }

    if (anextXLocation > maxX) maxX = anextXLocation;

    anextXLocation = 0;

    anextYLocation += exportableSymbols[i].symbol.frame().height() + verticalDistance;
  }

  neededSize.x = maxX + (initialXOffset * 2);
  neededSize.y = anextYLocation + (initialYOffset * 2);

  return neededSize;

}


function AddHandoffInstances(context, exportableSymbols) {
  Helpers.clog("Add Handoff Instances");
  nextXLocation = initialXOffset;
  nextYLocation = initialYOffset;

  for (var i = 0; i < exportableSymbols.length; i++) {
    Helpers.clog("-- Adding original instance");
    var originalInstance = exportableSymbols[i].symbol.newSymbolInstance();
    AddToHandoffArtboard(originalInstance, exportableSymbols[i].symbol.name(), exportableSymbols[i].symbol.frame().width(), exportableSymbols[i].symbol.frame().height(), exportableSymbols[i].originalExportOptions);

    nextXLocation += (exportableSymbols[i].symbol.frame().width() * offsetXFactor);

    if (exportableSymbols[i].instancesWithTints != null) {
      Helpers.clog("-- Adding instances for tint fills");
      for (var j = 0; j < exportableSymbols[i].instancesWithTints.length; j++) {
        var tintFillInstance = exportableSymbols[i].symbol.newSymbolInstance();
        tintFillInstance.style().fills = exportableSymbols[i].instancesWithTints[j].style().fills();
        AddToHandoffArtboard(tintFillInstance, exportableSymbols[i].symbol.name() + "-tint-" + j, exportableSymbols[i].symbol.frame().width(), exportableSymbols[i].symbol.frame().height(), exportableSymbols[i].originalExportOptions);
        nextXLocation += (exportableSymbols[i].symbol.frame().width() * offsetXFactor);
      }
    }


    if (exportableSymbols[i].variants != null) {
      Helpers.clog("-- Adding instances for overrides");

      for (var j = 0; j < exportableSymbols[i].variants.length; j++) {


        var overrideInstance = exportableSymbols[i].symbol.newSymbolInstance();
        AddToHandoffArtboard(overrideInstance, exportableSymbols[i].symbol.name() + "-override-" + j, exportableSymbols[i].symbol.frame().width(), exportableSymbols[i].symbol.frame().height(), exportableSymbols[i].originalExportOptions);

        overrideInstance.setValue_forOverridePoint_(exportableSymbols[i].variants[j].currentValue(), GetOverridePointByLayerID(exportableSymbols[i].variants[j].overridePoint().layerID(), overrideInstance.availableOverrides()));

        nextXLocation += (exportableSymbols[i].symbol.frame().width() * offsetXFactor);
      }
    }

    nextXLocation = initialXOffset;
    nextYLocation += (exportableSymbols[i].symbol.frame().height() + verticalDistance);
  }
}

export function onShutdown(webviewID) {
  const existingWebview = getWebview(webviewID)
  if (existingWebview) {
    existingWebview.close()
  }
}