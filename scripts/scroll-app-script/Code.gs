function onOpen() {
  DocumentApp.getUi()
    .createMenu("Bridge")
    .addItem("Start Auto Scroll Tracker", "showSidebar")
    .addToUi();
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle("Bridge Tracker");
  DocumentApp.getUi().showSidebar(html);
}

function scrollToWordInDoc(word) {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  const found = body.findText(word);

  if (!found) return "Word not found: " + word;

  const element = found.getElement();
  const parent = element.getParent();
  const range = doc.newRange().addElement(parent).build();

  doc.setSelection(range); // Scrolls to the paragraph
  return "Scrolled to paragraph containing: " + word;
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const text = params.text;
    PropertiesService.getDocumentProperties().setProperty("MATCH_KEY", text);
    return ContentService.createTextOutput("Stored match: " + text);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message);
  }
}

function getMatchText() {
  return PropertiesService.getDocumentProperties().getProperty("MATCH_KEY") || "";
}
