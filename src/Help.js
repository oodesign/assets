function report_issue() {
  NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString("https://github.com/oodesign/sketch-assets/issues"));
}

module.exports = { report_issue };

