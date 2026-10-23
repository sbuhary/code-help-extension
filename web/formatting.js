'use strict';

// Parse in an inert template, then build a fresh tree containing formatting only.
// No input elements, attributes, URLs, styles or event handlers reach the live DOM.
const CodeHelpFormatting = (() => {
  const allowed = new Set('b strong i em u s del mark small sub sup h1 h2 h3 h4 h5 h6 p br ul ol li pre code blockquote hr div span'.split(' '));
  const discard = new Set('script style iframe frame frameset object embed template noscript svg math form input button textarea select option link meta base img video audio source track canvas'.split(' '));
  const formattingTag = /<\/?(?:b|strong|i|em|u|s|del|mark|small|sub|sup|h[1-6]|p|br|ul|ol|li|pre|code|blockquote|hr|div|span)(?=[\s/>])/i;

  function render(target, text) {
    if (!formattingTag.test(text)) {
      target.classList.remove('formatted');
      target.textContent = text;
      return;
    }
    const document = target.ownerDocument;
    const template = document.createElement('template');
    template.innerHTML = text;
    const result = document.createDocumentFragment();
    function copy(node, parent) {
      if (node.nodeType === 3) {
        parent.appendChild(document.createTextNode(node.textContent));
        return;
      }
      if (node.nodeType !== 1 || node.namespaceURI !== 'http://www.w3.org/1999/xhtml') { return; }
      const name = node.localName;
      if (discard.has(name)) { return; }
      const container = allowed.has(name) ? document.createElement(name) : parent;
      for (const child of node.childNodes) { copy(child, container); }
      if (container !== parent) { parent.appendChild(container); }
    }
    for (const node of template.content.childNodes) { copy(node, result); }
    target.classList.add('formatted');
    target.replaceChildren(result);
  }
  return Object.freeze({ render });
})();

if (typeof module !== 'undefined') { module.exports = CodeHelpFormatting; }
