import fetch from "node-fetch";

async function run() {
  const res = await fetch("https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/spells-xphb.json");
  const json = await res.json();
  const spells = json.spell.slice(0, 10);
  for (const s of spells) {
    console.log(s.name);
    console.log(JSON.stringify(s.classes));
  }
}
run();
