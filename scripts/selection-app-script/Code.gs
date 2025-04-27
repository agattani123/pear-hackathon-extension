function onOpen() {
  DocumentApp.getUi()
    .createMenu("Bridge")
    .addItem("Start Live Selection Tracker", "showSidebar")
    .addToUi();
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("Sidebar")
    .setTitle("Bridge: Selection Watcher");
  DocumentApp.getUi().showSidebar(html);
}

function getSelectedText() {
  const doc = DocumentApp.getActiveDocument();
  const selection = doc.getSelection();

  if (!selection) return "";

  const ranges = selection.getRangeElements();
  let selectedText = "";

  for (let i = 0; i < ranges.length; i++) {
    const rangeElement = ranges[i];
    if (rangeElement.getElement().getType() === DocumentApp.ElementType.TEXT) {
      const text = rangeElement.getElement().asText();

      const start = rangeElement.isPartial() ? rangeElement.getStartOffset() : 0;
      const end = rangeElement.isPartial()
        ? rangeElement.getEndOffsetInclusive()
        : text.getText().length - 1;

      selectedText += text.getText().substring(start, end + 1);
    }
  }

  return selectedText;
}
