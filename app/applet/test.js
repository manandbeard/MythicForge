const https = require('https');

https.get('https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/spells-phb.json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    let data = JSON.parse(d);
    let s = data.spell.find(s => s.name === "Fireball");
    console.log("Keys:", Object.keys(s));
    console.log(s.classes);
  });
});
