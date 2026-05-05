require('dotenv').config({ path: '.env.local' });
const TOKEN = process.env.TRADIER_TOKEN;
const ACCOUNT_ID = process.env.TRADIER_ACCOUNT_ID;

async function test() {
  let page = 1;
  let hasMore = true;
  let totalEvents = 0;
  let oldestDate = '9999';
  let newestDate = '0000';
  let qqqCount = 0;
  let sofiCount = 0;

  while(hasMore && page <= 15) {
    const url = `https://api.tradier.com/v1/accounts/${ACCOUNT_ID}/history?start=2025-11-01&limit=500&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' } });
    const data = await res.json();
    let events = data.history?.event || [];
    if (!Array.isArray(events)) events = [events];
    
    totalEvents += events.length;
    
    for (const e of events) {
      if (e.date < oldestDate) oldestDate = e.date;
      if (e.date > newestDate) newestDate = e.date;
      if (e.trade && e.trade.symbol.startsWith('QQQ')) qqqCount++;
      if (e.trade && e.trade.symbol.startsWith('SOFI')) sofiCount++;
    }

    console.log(`Page ${page}: ${events.length} events`);
    if (events.length < 500) hasMore = false;
    else page++;
  }
  console.log(`Total events since Nov 1: ${totalEvents}`);
  console.log(`Oldest: ${oldestDate}, Newest: ${newestDate}`);
  console.log(`QQQ events: ${qqqCount}, SOFI events: ${sofiCount}`);
}
test();
