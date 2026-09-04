/* config.js — единственное место, где меняются внешние адреса.
   Видео героя лежит НЕ в репозитории: оно платится и раздаётся со стороны
   клиента (Selectel Object Storage + CDN). Пока heroVideo пуст, страница
   играет локальный запасной файл video/hero.webm. */

window.SITE_CONFIG = {
  // Пример: "https://<контейнер>.selcdn.ru/hero.webm" или адрес CDN-ресурса.
  heroVideo: "",
  // mp4/H.264 для Safari до 16 и старых Android. Оставьте пустым, если нет.
  heroVideoMp4: "",
  // Запасной файл в репозитории. Играет, если оба адреса выше пусты или
  // недоступны. Держите его лёгким (сейчас 1,3 МБ).
  heroVideoFallback: "video/hero.webm",
  heroPoster: "img/hero-poster.jpg"
};
