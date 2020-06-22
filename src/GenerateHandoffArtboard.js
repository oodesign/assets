import BrowserWindow from 'sketch-module-web-view'
import { getWebview } from 'sketch-module-web-view/remote'
import { GetRelatedOverrides } from './Helpers';
const Helpers = require("./Helpers");

const webviewIdentifier = 'sketch-assets.webview'
var assetsPage;
var assetsArtboard;
var assetsPageName = "Auto-generated assets";
var assetsArtboardName = "Assets";

var offsetXFactor = 3;
var verticalDistance = 50;
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

function AddText(text, style, x, y, bottomMargin) {
  var textLayer = MSTextLayer.new();
  textLayer.stringValue = text;
  var msColor;
  switch (style) {
    case 1:
      textLayer.setFont(NSFont.fontWithName_size('Arial Bold', 30));
      msColor = MSImmutableColor.colorWithRed_green_blue_alpha(0.4, 0.4, 0.4, 1);
      break;
    case 2:
      textLayer.setFont(NSFont.fontWithName_size('Arial Bold', 22));
      msColor = MSImmutableColor.colorWithRed_green_blue_alpha(0.6, 0.6, 0.6, 1);
      break;
    case 3:
      textLayer.setFont(NSFont.fontWithName_size('Arial', 16));
      msColor = MSImmutableColor.colorWithRed_green_blue_alpha(0.6, 0.6, 0.6, 1);
      break;
  }

  textLayer.setTextColor(msColor);
  textLayer.frame().setX(x);
  textLayer.frame().setY(y);
  assetsArtboard.addLayer(textLayer);
  nextYLocation = y + bottomMargin;
}

function GetOverridePointByLayerID(layerID, availableOverrides) {
  for (var i = 0; i < availableOverrides.length; i++) {
    if (availableOverrides[i].overridePoint().layerID().localeCompare(layerID) == 0)
      return availableOverrides[i].overridePoint();
  }
  return null;
}

function CreateHandoffArtboard(context, exportableSymbols) {
  var artboardWidth = 1000;
  var artboardHeight = 100;

  var neededSize = GetArtboardSize(context, exportableSymbols);

  if (neededSize.x > artboardWidth) artboardWidth = neededSize.x;
  if (neededSize.y > artboardHeight) artboardHeight = neededSize.y;

  assetsArtboard = MSArtboardGroup.new();
  assetsArtboard.frame().setX(0);
  assetsArtboard.frame().setY(0);
  assetsArtboard.frame().setWidth(artboardWidth);
  assetsArtboard.frame().setHeight(artboardHeight);
  assetsArtboard.setName(assetsArtboardName);

  AddText("Assets", 1, initialXOffset, 50, 0);
  AddText("This artboard and page are created automatically. Any change done may be overridden when running Assets again.", 3, initialXOffset, 90, 90);

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

function CompareDirectInstances(instanceA, instanceB) {
  var overrideMatches = 0;

  for (var i = 0; i < instanceA.relatedOverrides.length; i++) {
    for (var j = 0; j < instanceB.relatedOverrides.length; j++) {
      if (
        (instanceA.relatedOverrides[i].overridePoint().layerID().localeCompare(instanceB.relatedOverrides[j].overridePoint().layerID()) == 0) &&
        (instanceA.relatedOverrides[i].currentValue().localeCompare(instanceB.relatedOverrides[j].currentValue()) == 0)
      ) {
        overrideMatches++;
      }
    }
  }

  return (overrideMatches == instanceA.relatedOverrides.length);
}

function EqualsToMaster(instance, master) {
  var masterDefinition = {
    "instance": master,
    "relatedOverrides": GetRelatedOverrides(master.availableOverrides(), master.symbolID(), 0, false)
  };
  var areEquals = CompareDirectInstances(instance, masterDefinition);
  return areEquals;
}

function GetDirectInstanceUniqueVariants(variants, master) {
  var uniqueVariants = [];
  var uniqueTints = [];

  for (var i = 0; i < variants.length; i++) {


    var alreadyExists = false;
    for (var j = 0; j < uniqueVariants.length; j++) {
      var comparison = CompareDirectInstances(variants[i], uniqueVariants[j]);
      if (comparison) alreadyExists = true;
    }


    Helpers.clog("Variant '" + variants[i].instance.name() + "' doesn't appear yet in uniqueVariants.")

    if (!alreadyExists) {
      var shouldAdd = !EqualsToMaster(variants[i], master);


      if (shouldAdd) {
        Helpers.clog("Variant '" + variants[i].instance.name() + "' has overrides, and should be added.")
        uniqueVariants.push(variants[i]);
      }
      else {
        Helpers.clog("Variant '" + variants[i].instance.name() + "' doesn't have overrides, and should not be added.")
      }
    }

  }

  for (var i = 0; i < variants.length; i++) {
    Helpers.clog("Processing tints")
    if (variants[i].tints != null) {
      for (var j = 0; j < variants[i].tints.length; j++) {
        try {
          Helpers.clog(variants[i].tints[j])
          var tintColor = variants[i].tints[j].color().immutableModelObject().hexValue().toString();
          if (uniqueTints.indexOf(tintColor) < 0) {
            uniqueVariants.push(variants[i]);
          }
        } catch (e) {
          Helpers.clog("Error processing tint color in getting unique variants.")
        }
      }
    }
  }

  return uniqueVariants;
}

export function GenerateHandoffArtboard(context) {

  Helpers.clog("----- Generate Handoff Artboard -----");

  const options = {
    identifier: webviewIdentifier,
    width: 400,
    height: 400,
    remembersWindowFrame: false,
    show: false,
    titleBarStyle: 'hidden'
  }
  const browserWindow = new BrowserWindow(options);
  const webContents = browserWindow.webContents;

  var counterTotalAssets = 0;

  EstablishAssetsPage(context);
  RemoveExistingAssets(context);

  var exportableLayers = [];
  var foreignLayers = [];
  var localExportableAssets = 0;
  var foreignExportableAssets = 0;

  context.document.currentPage().exportableLayers();
  for (var i = 0; i < context.document.pages().count(); i++) {
    for (var j = 0; j < context.document.pages()[i].exportableLayers().length; j++) {
      exportableLayers.push(context.document.pages()[i].exportableLayers()[j]);
      localExportableAssets++;
    }
  }

  if (Helpers.getLibrariesEnabled()) {
    for (var i = 0; i < context.document.documentData().foreignSymbols().length; i++) {
      if (context.document.documentData().foreignSymbols()[i].symbolMaster().exportOptions().exportFormats().length > 0) {
        exportableLayers.push(context.document.documentData().foreignSymbols()[i].symbolMaster());
        foreignLayers.push(context.document.documentData().foreignSymbols()[i].symbolMaster());
        foreignExportableAssets++;
      }
    }
  }

  browserWindow.loadURL(require('../resources/handoffassets.html'));
  Helpers.clog("Webview called");


  browserWindow.once('ready-to-show', () => {
    browserWindow.show()
  })

  webContents.on('did-finish-load', () => {
    Helpers.clog("Webview loaded");
    webContents.executeJavaScript(`LaunchHandoff(${localExportableAssets},${foreignExportableAssets})`).catch(console.error);
  });

  webContents.on('nativeLog', s => {
    Helpers.clog(s);
  })


  Helpers.clog("There are " + exportableLayers.length + " exportable elements in the document. " + localExportableAssets + " local, and " + foreignExportableAssets + " foreign.");



  webContents.on('ExecuteGenerateHandoff', () => {
    var exportableSymbols = [];
    for (var i = 0; i < exportableLayers.length; i++) {
      var variants = [];

      var progress = Math.floor((i * 100 / exportableLayers.length));
      var message = "Genarating assets...";

      if (exportableLayers.length > 30)
        message = "We're generating assets...<br/>This may take a while... Wanna go get a coffee?"

      webContents.executeJavaScript(`ShowProgress(${progress}, ${JSON.stringify(message)})`).catch(console.error);

      if (exportableLayers[i].class() == "MSSymbolMaster") {
        Helpers.clog("");
        Helpers.clog("-- Processing symbol '" + exportableLayers[i].name() + "'");

        var allInstancesAndOverrides = Helpers.GetAllInstancesAndOverrides(exportableLayers[i]);
        variants = GetDirectInstanceUniqueVariants(allInstancesAndOverrides, exportableLayers[i]);

        Helpers.clog("-- Briefing for " + exportableLayers[i].name() + ". Found variants(unique):" + variants.length + ". Variants(total):" + allInstancesAndOverrides.length);

        exportableSymbols.push({
          "symbol": exportableLayers[i],
          "isForeign": (foreignLayers.indexOf(exportableLayers[i]) >= 0),
          "originalExportOptions": exportableLayers[i].exportOptions(),
          "variants": variants
        });
        counterTotalAssets += (1 + variants.length);
      }
    }

    CreateHandoffArtboard(context, exportableSymbols);
    AddHandoffInstances(context, exportableSymbols, Helpers.getLibrariesEnabled());

    if (counterTotalAssets == 0) {
      context.document.showMessage("Looks like there are no symbols defined as exportable.");
    }
    else {
      context.document.showMessage("Hey ho! We created " + counterTotalAssets + " exportable asset" + ((counterTotalAssets > 1) ? "s" : "") + " for " + exportableLayers.length + " symbol" + ((exportableLayers.length > 1) ? "s" : "") + ".");
    }


    webContents.executeJavaScript(`ShowProgress(100, "Done!")`).catch(console.error);
    onShutdown(webviewIdentifier);
  });

};

function GetArtboardSize(context, exportableSymbols) {

  var neededSize = {
    "x": 1000,
    "y": 1000
  };

  var maxX = 0;

  var anextXLocation = 0;
  var anextYLocation = 0;

  for (var i = 0; i < exportableSymbols.length; i++) {

    anextXLocation += (exportableSymbols[i].symbol.frame().width() * offsetXFactor);

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


function AddHandoffInstances(context, exportableSymbols, addForeignSymbols) {
  Helpers.clog("Add Handoff Instances");

  var localSymbols = exportableSymbols.filter(function (el) {
    return el.isForeign == false
  });

  var foreignSymbols = exportableSymbols.filter(function (el) {
    return el.isForeign == true
  });


  Helpers.clog("Adding local symbols assets.");
  AddText("Local assets", 2, initialXOffset, nextYLocation, 70);
  InsertAssets(localSymbols, initialXOffset, nextYLocation);


  if (addForeignSymbols && foreignSymbols.length > 0) {
    Helpers.clog("Adding foreign symbols assets.");
    AddText("Foreign assets", 2, initialXOffset, nextYLocation, 70);
    InsertAssets(foreignSymbols, initialXOffset, nextYLocation);
  }
  else {
    Helpers.clog("Not adding foreign symbols (per configuration).");
  }

}

function InsertAssets(exportableSymbols, xOffset, yOffset) {

  nextXLocation = xOffset;
  nextYLocation = yOffset;

  for (var i = 0; i < exportableSymbols.length; i++) {

    Helpers.clog("-- Processing symbol:" + exportableSymbols[i].symbol.name());


    Helpers.clog("-- Adding original instance");
    var originalInstance = exportableSymbols[i].symbol.newSymbolInstance();
    AddToHandoffArtboard(originalInstance, exportableSymbols[i].symbol.name(), exportableSymbols[i].symbol.frame().width(), exportableSymbols[i].symbol.frame().height(), exportableSymbols[i].originalExportOptions);

    nextXLocation += (exportableSymbols[i].symbol.frame().width() * offsetXFactor);

    if (exportableSymbols[i].variants != null) {
      Helpers.clog("-- Adding instances for variants");
      for (var j = 0; j < exportableSymbols[i].variants.length; j++) {
        var overrideInstance = exportableSymbols[i].symbol.newSymbolInstance();
        if (exportableSymbols[i].variants[j].tints != null) {
          Helpers.clog("--- Applying tint");
          overrideInstance.style().fills = exportableSymbols[i].variants[j].tints;
        }
        AddToHandoffArtboard(overrideInstance, exportableSymbols[i].symbol.name() + "-directInstance-" + j, exportableSymbols[i].symbol.frame().width(), exportableSymbols[i].symbol.frame().height(), exportableSymbols[i].originalExportOptions);
        for (var k = 0; k < exportableSymbols[i].variants[j].relatedOverrides.length; k++) {
          overrideInstance.setValue_forOverridePoint_(exportableSymbols[i].variants[j].relatedOverrides[k].currentValue(), GetOverridePointByLayerID(exportableSymbols[i].variants[j].relatedOverrides[k].overridePoint().layerID(), overrideInstance.availableOverrides()));
        }
        nextXLocation += (exportableSymbols[i].symbol.frame().width() * offsetXFactor);
      }
    }

    nextXLocation = yOffset;
    nextYLocation += (exportableSymbols[i].symbol.frame().height() + verticalDistance);
    nextXLocation = xOffset;
  }


}

export function onShutdown(webviewID) {
  const existingWebview = getWebview(webviewID)
  if (existingWebview) {
    existingWebview.close()
  }
}