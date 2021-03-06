// ==UserScript==
// @name         GitHubToCBuilder
// @namespace    https://scand.com/
// @version      0.1.6
// @description  ToC builder for GitHub markdown markup docs (.md and Wiki)
// @author       vkuleshov-sc
// @author       achernyakevich-sc
// @match        https://github.com/*
// @grant        GM_log
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  const getHeaderDepth = headerLine => {
    return headerLine.match(/#+/) ? headerLine.match(/#+/)[0].length : 0;
  }

  const getHeaderText = headerLine => {
    return headerLine.replace(/#+\s+/, '')
                     // For link in header we keep text only (remove URL and brackets) 
                     .replace(/\[(.*?)\]\(.*?\)/g, '$1');
  }

  const getHeaderAnchor = headerText => {
    return '#' + headerText.replace(/ /g, '-').replace(/\t/, '--').replace(/[^\d\w-_#]/g, '').toLowerCase();
  }

  const getHeaderLines = mdText => {
    return mdText.split(/[\r\n]/).
      filter(str => str.match(/^\s{0,3}#+\s+[^\r\n]*/g)).
      map(str => str.trim());
  }

  const getToCForMarkdownMarkupText = mdText => {
    let toc = '';
    let anchors = new Map();
    const headerLines = getHeaderLines(mdText);
    if (headerLines) {
      headerLines.forEach(line => {
        const hDepth = getHeaderDepth(line);
        const hText = getHeaderText(line);
        let hAnchor = getHeaderAnchor(hText);
        // Consider duplicate headers
        const anchorsCount = anchors.get(hAnchor) || 0;
        anchors.set(hAnchor, anchorsCount + 1);
        if (anchorsCount) {
            hAnchor += '-' + anchorsCount;
        }
        toc += `${' '.repeat((hDepth - 1) * 2)}- [${hText}](${hAnchor})\n`;
      });
    }
    return toc;
  }

  const getWikiTextAreaElement = () => {
    return document.getElementById('gollum-editor-body');
  };

  const copyToCForMarkdownMarkupTextToClipboard = () => {
    const textArea = getWikiTextAreaElement();
    if (textArea) {
      GM_setClipboard(getToCForMarkdownMarkupText(textArea.value));
    }
    alert('ToC built from GitHub Wiki page content and copied to the clipboard!');
  };

  const copyToCForSelectedMarkdownMarkupTextToClipboard = () => {
    const selectedText = document.getSelection().toString();
    if (selectedText !== '') {
      GM_setClipboard(getToCForMarkdownMarkupText(selectedText));
      alert('ToC built from selected Markdown Markup and copied to the clipboard!');
    } else {
      alert('Nothing is selected!');
    }
  };

  if (getWikiTextAreaElement()) {
    GM_registerMenuCommand('Build ToC for Wiki content (editor->clipboard)', copyToCForMarkdownMarkupTextToClipboard);
  } else {
    GM_registerMenuCommand('Build ToC for selected Markdown Markup (selection->clipboard)', copyToCForSelectedMarkdownMarkupTextToClipboard);
  }

  // Tests - used only for development, can be commented out or deleted
  (() => {
    const test = ({ input, output, testingFunc }) => {
      if (JSON.stringify(testingFunc(input)) !== JSON.stringify(output)) {
        GM_log(`${testingFunc.name}(${JSON.stringify(input)}) !== ${JSON.stringify(output)}`);
        GM_log(`${testingFunc.name}(${JSON.stringify(input)}) ==  ${JSON.stringify(testingFunc(input))}`);
        alert('Test failed, see details in console');
      }
    };
    const testCases = [
      {
        input: '   123',
        output: 0,
        testingFunc: getHeaderDepth,
      },
      {
        input: '#########################               123',
        output: 25,
        testingFunc: getHeaderDepth,
      },
      {
        input: 'ab(c)?:;\'0!@$-%/\\1_^|23\tDEF',
        output: '#abc0-1_23--def',
        testingFunc: getHeaderAnchor,
      },
      {
        input: '### header1',
        output: 'header1',
        testingFunc: getHeaderText,
      },
      {
        input: '# header1 and some text',
        output: 'header1 and some text',
        testingFunc: getHeaderText,
      },
      {
        input: '# Header with [GitHub](https://github.com/) and [Google](https://google.com/) links',
        output: 'Header with GitHub and Google links',
        testingFunc: getHeaderText,
      },
      {
        input: `# header1\r\n### header2 some text\n## header3\r\n`,
        output: ['# header1', '### header2 some text', '## header3'],
        testingFunc: getHeaderLines,
      },
      {
        input: `s # header1\r\n### header2 some text\n    # not header1\n   # header3 (some text)\n #not header2`,
        output: ['### header2 some text', '# header3 (some text)'],
        testingFunc: getHeaderLines,
      },
      {
        input: `# header1\r\n### header2 some text\n## header3\r\n`,
        output: '- [header1](#header1)\n    - [header2 some text](#header2-some-text)\n  - [header3](#header3)\n',
        testingFunc: getToCForMarkdownMarkupText,
      },
      {
        input: `# header\n## subheader\n# another header\n## subheader\n## header\n### subheader`,
        output: '- [header](#header)\n  - [subheader](#subheader)\n- [another header](#another-header)\n  - [subheader](#subheader-1)\n  - [header](#header-1)\n    - [subheader](#subheader-2)\n',
        testingFunc: getToCForMarkdownMarkupText,
      },
    ];
    testCases.forEach(test);
  })();

})();
