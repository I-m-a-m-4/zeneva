const https = require('https');
['zp_legal_pages.css', 'zoho_general_pages.css'].forEach(file => {
    https.get('https://www.zohowebstatic.com/sites/zweb/css/product/' + file, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const matches = data.match(/url\(['\"]?([^'\")]*\.(png|jpg|svg))['\"]?\)/gi);
            if (matches) {
                console.log(file, matches.filter(m => m.includes('privacy') || m.includes('badge') || m.includes('sprite') || m.includes('iso') || m.includes('zsb')));
            }
        });
    }).on('error', () => {
        https.get('https://www.zohowebstatic.com/sites/zweb/css/template/' + file, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const matches = data.match(/url\(['\"]?([^'\")]*\.(png|jpg|svg))['\"]?\)/gi);
                if (matches) {
                    console.log(file, matches.filter(m => m.includes('privacy') || m.includes('badge') || m.includes('sprite') || m.includes('iso') || m.includes('zsb')));
                }
            });
        });
    });
});
