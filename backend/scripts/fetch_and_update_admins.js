#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

// Parse command-line arguments manually
const argv = {};
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    argv[key] = value || true;
  } else if (arg.startsWith('-')) {
    const key = arg.substring(1);
    argv[key] = true;
  }
}

(async () => {
  const baseUrl = process.env.BACKEND_URL || argv.url || 'https://vitalfit.uy';
  const adminsPath = path.join(__dirname, '..', 'src', 'data', 'admins.json');
  const backupPath = adminsPath + '.bak-' + Date.now();
  const reportPath = argv.report || path.join(__dirname, 'fetch_and_update_admins.report.json');
  const useLocal = argv.local || argv.l || false;
  const delayMs = Number(argv.delay || 150);
  const dryRun = argv['dry-run'] || argv.dry || false;

  // Passwords list
  const passwords = [
    "47747144","51129663","58936275","50308462","48574007","50757546","53876957",
    "47688201","49073769","41103029","48975996","46835984","44780753","48855227",
    "48637639","47857763","47228722","50937328","28976411","56180660","48521618",
    "44615512","48676267","58368991","25098000","46706006","49961120","40024703",
    "33079173","51062201","45818462","48889294","51050993","47309302","63264112",
    "51747691","19471408","41688136","52915467","17759276","54452061","54892469",
    "48223472","49787110","56398459","47600932","44636960","56123119","16242008",
    "55563704","41687875","51565758","53843928","41572137","17281308","47416195",
    "50357394","49738777","53256818","46774576","403363365","52467959","48820240",
    "48926804","44363331","4073818579","19274939","95049165","40657217","66937247",
    "47199399","50914483","48766200","58500440","46791348","46434578","42759087",
    "43345702","28818390","49055620","17079604","46554407","53326162","18118984",
    "45826081","52644212","43573923","45520859","49000283","55078428","51351012",
    "36416685","49180972","48828929","28754673","51083687","55126988","38677661",
    "14987018","51215923","30968002","27796525","44402018","34515625","43103560",
    "37244166","51298474","43810935","42383965","52626634","49058707","45877381",
    "49258563","49996674","54195774","30830106","40401349","34753338","48904703",
    "47786841","45876387","40984436","46775172","34587721","47965908","33712278",
    "42742428","55302673","33464601","36846256","28966452","64044630","18427854",
    "47804465","18654849","49068584","45310727","43063839","44983163","47091464",
    "50941509","50900296","64055988","47826704","44260832","42311568","48378275",
    "49355789","56988969","48326357","54687810","45261508","43828231","28233065",
    "47397420","13260279","48574007","45640932","44598992","48756150","50847545",
    "38224127","28518582","14848563","46775188","35589514","45326570","13241807",
    "27247427","52413851","47669889","52246002","49283120","38487466","47621380",
    "46389866","45861174","52328363","54068292","43774175","48929975","60448919",
    "44709959","49149653","47452248","49297527","422262559","46757077","52446909",
    "51010208","61747984","58728094","50515837","48435637","17724506","47560342",
    "57802556","54959837","44367616","51881685","19799628","50504567","29509324",
    "56988947","34599590","18243402","34821888","51068681","27966031","54591657",
    "15074141","40866408","52079281","50320212","49374850","40899277","44153481",
    "38858776","48391342","54070174","52111697","47570793","51713000"
  ];

  const report = { updated: [], skipped: [], errors: [] };

  try {
    const raw = await fs.readFile(adminsPath, 'utf8');
    const admins = JSON.parse(raw);

    // Backup
    await fs.writeFile(backupPath, JSON.stringify(admins, null, 2), 'utf8');
    console.log('Backup written to', backupPath);

    // If local hashing requested, prepare bcrypt
    let bcrypt = null;
    const saltRounds = Number(argv.salt || 12);
    if (useLocal) {
      try {
        bcrypt = require('bcrypt');
      } catch (e) {
        console.error('bcrypt not available. Install it in backend dependencies or run without --local.');
        process.exit(1);
      }
    }

    for (const pw of passwords) {
      try {
        let hash = null;

        if (useLocal) {
          hash = await bcrypt.hash(String(pw), saltRounds);
        } else {
          const res = await fetch(`${baseUrl}/api/createPassword`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw }),
          });

          if (!res.ok) {
            const text = await res.text();
            report.skipped.push({ pw, reason: `HTTP ${res.status}: ${text}` });
            console.error(`[${pw}] Request failed:`, res.status, text);
            await new Promise((r) => setTimeout(r, delayMs));
            continue;
          }

          const data = await res.json();
          hash = data && data.hash;
          if (!hash) {
            report.skipped.push({ pw, reason: 'No hash returned' });
            console.error(`[${pw}] No hash returned:`, JSON.stringify(data));
            await new Promise((r) => setTimeout(r, delayMs));
            continue;
          }
        }

        // Find by username OR ci field
        const idx = admins.findIndex((a) => String(a.username) === String(pw) || String(a.ci || '') === String(pw));
        if (idx === -1) {
          report.skipped.push({ pw, reason: 'No matching admins.json entry' });
          console.warn(`[${pw}] No matching admin entry found in admins.json`);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        if (!dryRun) {
          admins[idx].password = hash;
        }
        report.updated.push({ pw, username: admins[idx].username, index: idx });
        console.log(`[${pw}] Updated admins.json entry for username=${admins[idx].username}`);

        await new Promise((r) => setTimeout(r, delayMs));
      } catch (err) {
        console.error(`[${pw}] Error:`, err && err.message ? err.message : err);
        report.errors.push({ pw, error: err && err.message ? err.message : String(err) });
      }
    }

    if (!dryRun) {
      await fs.writeFile(adminsPath, JSON.stringify(admins, null, 2), 'utf8');
      console.log('admins.json updated successfully');
    } else {
      console.log('Dry run: admins.json not written');
    }

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log('Report written to', reportPath);
  } catch (err) {
    console.error('Fatal error:', err && err.message ? err.message : err);
    process.exit(1);
  }

})();
