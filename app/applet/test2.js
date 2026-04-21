const fs = require('fs');
fetch('https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/spells-phb.json').then(r=>r.json()).then(d => {
   const spell = d.spell.find(s=>s.name === 'Fireball');
   console.log(spell);
});
