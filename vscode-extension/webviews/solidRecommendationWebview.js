const { formatTextAsHTML, escapeHtml } = require('./../textFormatterToHtml');
const fs = require('fs');
const path = require('path');

/**
 * Отримує HTML-контент для вебв'ю відображення SOLID рекомендацій
 * @param {string} principleCode - Код принципу SOLID
 * @param {string} issue - Опис проблеми
 * @param {string} detailedRecommendation - Детальна рекомендація від AI
 * @returns {string} - HTML-контент
 */
function getSolidRecommendationWebviewContent(principleCode, issue, detailedRecommendation) {
    const cssPath = path.resolve(__dirname, 'css/solidRecommendationStyles.css');
    const styles = fs.readFileSync(cssPath, 'utf-8');
    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Detailed recommendation</title>
                <style>${styles}</style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Detailed recommendation for ${principleCode}</h1>
                        <p>Problem: ${escapeHtml(issue)}</p>
                    </div>
                    <div class="content">
                        ${formatTextAsHTML(detailedRecommendation)}
                    </div>
                </div>
            </body>
            </html>
            `;
}

module.exports = getSolidRecommendationWebviewContent;