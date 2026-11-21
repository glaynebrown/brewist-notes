// Offline copy of the app for when there's no internet.
const VERSION = 'bn-v14';
const FILES = [
  './',
  'index.html',
  'style.css?v=12',
  'app.js?v=9',
  'data.js?v=1',
  'manifest.json',
  'apple-touch-icon.png',
  'icon-512.png',
  "img/Recipe_Affogato.webp",
  "img/Recipe_Americano.webp",
  "img/Recipe_Chocolate_Delight.webp",
  "img/Recipe_Chocolate_Latte.webp",
  "img/Recipe_Cinnaberry_Summit.webp",
  "img/Recipe_Cinnabrew.webp",
  "img/Recipe_Cosmos_Cooldown.webp",
  "img/Recipe_Elf_Special.webp",
  "img/Recipe_Espresso.webp",
  "img/Recipe_Garden_Frost.webp",
  "img/Recipe_Iced_Americano.webp",
  "img/Recipe_Iced_Chocolate_Latte.webp",
  "img/Recipe_Iced_Latte.webp",
  "img/Recipe_Iced_Lavender_Latte.webp",
  "img/Recipe_Iced_Mint_Latte.webp",
  "img/Recipe_Iced_Orange_Latte.webp",
  "img/Recipe_Iced_Pumpkin_Latte.webp",
  "img/Recipe_Iced_Strawberry_Latte.webp",
  "img/Recipe_Iced_Vanilla_Latte.webp",
  "img/Recipe_Latte.webp",
  "img/Recipe_Lavender_Blossom.webp",
  "img/Recipe_Lavender_Latte.webp",
  "img/Recipe_Mint_Latte.webp",
  "img/Recipe_Mocha.webp",
  "img/Recipe_Neapolitan.webp",
  "img/Recipe_Orange_Affogato.webp",
  "img/Recipe_Orange_Latte.webp",
  "img/Recipe_Orange_Sunset.webp",
  "img/Recipe_Pretty_in_Pink.webp",
  "img/Recipe_Pumpkin_Latte.webp",
  "img/Recipe_Pumpkin_Spice.webp",
  "img/Recipe_Strawberry_Affogato.webp",
  "img/Recipe_Strawberry_Fresh.webp",
  "img/Recipe_Strawberry_Latte.webp",
  "img/Recipe_Sugar_Rush.webp",
  "img/Recipe_Summer_Farewell.webp",
  "img/Recipe_Sunset_Fresh.webp",
  "img/Recipe_Vanilla_Affogato.webp",
  "img/Recipe_Vanilla_Latte.webp",
  "img/Recipe_Vanilla_Mountain.webp",
  "img/Recipe_Whistle_Stop.webp",
  "img/ing/Cherry.webp",
  "img/ing/Chocolate_Chips.webp",
  "img/ing/Chocolate_Syrup.webp",
  "img/ing/Cinnamon_Sticks.webp",
  "img/ing/Cocoa_Powder.webp",
  "img/ing/Cold_Water.webp",
  "img/ing/Cranberry_Puree.webp",
  "img/ing/Decaf_Beans.webp",
  "img/ing/Gingerbread.webp",
  "img/ing/Hot_Water.webp",
  "img/ing/Ice_Cubes.webp",
  "img/ing/Lavender_Syrup.webp",
  "img/ing/Mint_Leaf.webp",
  "img/ing/Mint_Syrup.webp",
  "img/ing/Oat_Milk.webp",
  "img/ing/Orange_Slices.webp",
  "img/ing/Orange_Syrup.webp",
  "img/ing/Pineapple_Puree.webp",
  "img/ing/Pumpkin_Syrup.webp",
  "img/ing/Sprinkles.webp",
  "img/ing/Strawberry_Ice_Cream.webp",
  "img/ing/Strawberry_Puree.webp",
  "img/ing/Strawberry_Slices.webp",
  "img/ing/Strawberry_Syrup.webp",
  "img/ing/Vanilla_Bean.webp",
  "img/ing/Vanilla_Flower.webp",
  "img/ing/Vanilla_Ice_Cream.webp",
  "img/ing/Vanilla_Syrup.webp",
  "img/ing/Whipped_Cream.webp",
  "img/ing/Whole_Milk.webp",
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first (so uploads show up right away), cached copy when offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match('index.html')))
  );
});
