const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const cfg = window.DEMON_CONFIG || {};
const isPhpMode = cfg.MODE === 'php' && !!cfg.API_BASE_URL;
const API_BASE = String(cfg.API_BASE_URL || '').replace(/\/$/, '');

let __firebaseStoreModule = null;
async function demonFirebaseStore(){
  if(!(window.DEMON_FIREBASE && window.DEMON_FIREBASE.ENABLED)) return null;
  if(!__firebaseStoreModule) __firebaseStoreModule = await import('./firebase-store.js?v=10.5');
  return __firebaseStoreModule;
}

const supportedLanguages = ['it','en','es','fr','de','pt','nl','pl','ro','tr','ru','ar','zh','ja','ko'];
const savedLang = localStorage.getItem('demon_lang');
const browserLang = (navigator.language || 'it').slice(0,2).toLowerCase();

const state = {
  lang: supportedLanguages.includes(savedLang) ? savedLang : (supportedLanguages.includes(browserLang) ? browserLang : 'it'),
  products: [], categories: [], category: 'all', search: '', sort: 'recent',
  cart: JSON.parse(localStorage.getItem('demon_cart') || '[]'), config: {}, customCategories: []
};

const dict = {
  it:{searchPlaceholder:'Cerca risorse, script, MLO...',searchShort:'Cerca risorsa...',cart:'Carrello',heroText:'Script, file e pack organizzati in un catalogo veloce, scuro e diretto.',browseStore:'Esplora lo store',premiumLabel:'Premium & Free',instantLabel:'Accesso immediato',categories:'CATEGORIE',legal:'Pubblica esclusivamente contenuti che sei autorizzato a distribuire.',resources:'risorse',sortRecent:'Più recenti',sortPriceAsc:'Prezzo crescente',sortPriceDesc:'Prezzo decrescente',sortName:'Nome A-Z',emptyTitle:'Store in preparazione',emptyText:'Nuovi contenuti Demon Leaks saranno pubblicati qui.',total:'Totale',checkout:'Paga con PayPal.Me',checkoutDone:'Apertura PayPal...',checkoutNote:'I prodotti Premium useranno PayPal.Me. I prodotti gratuiti potranno essere collegati a Linkvertise.',add:'Aggiungi',download:'Scarica',free:'GRATIS',noCart:'Il carrello è vuoto.',added:'Aggiunto al carrello',downloadMissing:'Download non ancora configurato.',paypalMissing:'PayPal.Me non configurato.',statTotal:'RISORSE TOTALI',statFree:'RISORSE FREE',statDownloads:'DOWNLOAD',statPremium:'PREMIUM',all:'Tutti',footer1:'L-STORE svolge esclusivamente il ruolo di developer tecnico del sito. Non gestisce, seleziona, verifica, approva o distribuisce i contenuti pubblicati nello store.',footer2:"La responsabilità per l'utilizzo del sito, i file caricati, i link, le licenze, i diritti d'autore, le vendite, i pagamenti e la distribuzione dei contenuti ricade esclusivamente sul gestore del sito e sugli utenti che li pubblicano o utilizzano.",footer3:'L-STORE si dissocia espressamente da qualsiasi uso illecito, non autorizzato, fraudolento o lesivo dei diritti di terzi effettuato tramite il sito.',catVehicles:'Veicoli',catWeapons:'Armi',catClothes:'Vestiti',catPacks:'Pack'},
  en:{searchPlaceholder:'Search resources, scripts, MLO...',searchShort:'Search resource...',cart:'Cart',heroText:'Scripts, files and packs organized in a fast, dark and direct catalog.',browseStore:'Browse store',premiumLabel:'Premium & Free',instantLabel:'Instant access',categories:'CATEGORIES',legal:'Publish only content you are authorized to distribute.',resources:'resources',sortRecent:'Most recent',sortPriceAsc:'Price low to high',sortPriceDesc:'Price high to low',sortName:'Name A-Z',emptyTitle:'Store under preparation',emptyText:'New Demon Leaks content will be published here.',total:'Total',checkout:'Pay with PayPal.Me',checkoutDone:'Opening PayPal...',checkoutNote:'Premium products use PayPal.Me. Free products may be linked to Linkvertise.',add:'Add',download:'Download',free:'FREE',noCart:'Your cart is empty.',added:'Added to cart',downloadMissing:'Download is not configured yet.',paypalMissing:'PayPal.Me is not configured.',statTotal:'TOTAL RESOURCES',statFree:'FREE RESOURCES',statDownloads:'DOWNLOADS',statPremium:'PREMIUM',all:'All',footer1:'L-STORE acts exclusively as the technical developer of the website and does not manage, select, verify, approve or distribute content published in the store.',footer2:'Responsibility for use of the website, uploaded files, links, licences, copyright, sales, payments and content distribution rests solely with the website operator and the users who publish or use them.',footer3:'L-STORE expressly dissociates itself from any unlawful, unauthorized, fraudulent use or use that infringes third-party rights.',catVehicles:'Vehicles',catWeapons:'Weapons',catClothes:'Clothing',catPacks:'Packs'},
  es:{searchPlaceholder:'Buscar recursos, scripts, MLO...',searchShort:'Buscar recurso...',cart:'Carrito',heroText:'Scripts, archivos y packs organizados en un catálogo rápido, oscuro y directo.',browseStore:'Explorar tienda',premiumLabel:'Premium y Gratis',instantLabel:'Acceso inmediato',categories:'CATEGORÍAS',legal:'Publica únicamente contenido que estés autorizado a distribuir.',resources:'recursos',sortRecent:'Más recientes',sortPriceAsc:'Precio ascendente',sortPriceDesc:'Precio descendente',sortName:'Nombre A-Z',emptyTitle:'Tienda en preparación',emptyText:'Los nuevos contenidos de Demon Leaks aparecerán aquí.',total:'Total',checkout:'Pagar con PayPal.Me',checkoutDone:'Abriendo PayPal...',checkoutNote:'Los productos Premium usan PayPal.Me. Los gratuitos pueden enlazarse a Linkvertise.',add:'Añadir',download:'Descargar',free:'GRATIS',noCart:'El carrito está vacío.',added:'Añadido al carrito',downloadMissing:'Descarga aún no configurada.',paypalMissing:'PayPal.Me no está configurado.',statTotal:'RECURSOS TOTALES',statFree:'RECURSOS GRATIS',statDownloads:'DESCARGAS',statPremium:'PREMIUM',all:'Todos',footer1:'L-STORE actúa exclusivamente como desarrollador técnico del sitio y no gestiona, selecciona, verifica, aprueba ni distribuye los contenidos publicados.',footer2:'La responsabilidad por el uso del sitio, archivos, enlaces, licencias, derechos de autor, ventas, pagos y distribución corresponde únicamente al gestor y a los usuarios.',footer3:'L-STORE se desvincula expresamente de cualquier uso ilícito, no autorizado, fraudulento o lesivo de derechos de terceros.',catVehicles:'Vehículos',catWeapons:'Armas',catClothes:'Ropa',catPacks:'Packs'},
  fr:{searchPlaceholder:'Rechercher ressources, scripts, MLO...',searchShort:'Rechercher...',cart:'Panier',heroText:'Scripts, fichiers et packs dans un catalogue rapide, sombre et direct.',browseStore:'Explorer la boutique',premiumLabel:'Premium & Gratuit',instantLabel:'Accès immédiat',categories:'CATÉGORIES',legal:'Publiez uniquement du contenu que vous êtes autorisé à distribuer.',resources:'ressources',sortRecent:'Plus récents',sortPriceAsc:'Prix croissant',sortPriceDesc:'Prix décroissant',sortName:'Nom A-Z',emptyTitle:'Boutique en préparation',emptyText:'Les nouveaux contenus Demon Leaks seront publiés ici.',total:'Total',checkout:'Payer avec PayPal.Me',checkoutDone:'Ouverture de PayPal...',checkoutNote:'Les produits Premium utilisent PayPal.Me. Les produits gratuits peuvent utiliser Linkvertise.',add:'Ajouter',download:'Télécharger',free:'GRATUIT',noCart:'Votre panier est vide.',added:'Ajouté au panier',downloadMissing:'Téléchargement non configuré.',paypalMissing:'PayPal.Me non configuré.',statTotal:'RESSOURCES TOTALES',statFree:'RESSOURCES GRATUITES',statDownloads:'TÉLÉCHARGEMENTS',statPremium:'PREMIUM',all:'Toutes',footer1:'L-STORE intervient exclusivement comme développeur technique du site et ne gère, sélectionne, vérifie, approuve ou distribue aucun contenu.',footer2:'La responsabilité de l’utilisation du site, des fichiers, liens, licences, droits d’auteur, ventes, paiements et distributions incombe uniquement au gestionnaire et aux utilisateurs.',footer3:'L-STORE se dissocie expressément de toute utilisation illégale, non autorisée, frauduleuse ou portant atteinte aux droits de tiers.',catVehicles:'Véhicules',catWeapons:'Armes',catClothes:'Vêtements',catPacks:'Packs'},
  de:{searchPlaceholder:'Ressourcen, Scripts, MLO suchen...',searchShort:'Ressource suchen...',cart:'Warenkorb',heroText:'Scripts, Dateien und Packs in einem schnellen, dunklen und direkten Katalog.',browseStore:'Store entdecken',premiumLabel:'Premium & Kostenlos',instantLabel:'Sofortiger Zugriff',categories:'KATEGORIEN',legal:'Veröffentliche nur Inhalte, die du verbreiten darfst.',resources:'Ressourcen',sortRecent:'Neueste',sortPriceAsc:'Preis aufsteigend',sortPriceDesc:'Preis absteigend',sortName:'Name A-Z',emptyTitle:'Store wird vorbereitet',emptyText:'Neue Demon-Leaks-Inhalte erscheinen hier.',total:'Gesamt',checkout:'Mit PayPal.Me zahlen',checkoutDone:'PayPal wird geöffnet...',checkoutNote:'Premium-Produkte verwenden PayPal.Me. Kostenlose Produkte können mit Linkvertise verbunden werden.',add:'Hinzufügen',download:'Download',free:'KOSTENLOS',noCart:'Dein Warenkorb ist leer.',added:'Zum Warenkorb hinzugefügt',downloadMissing:'Download noch nicht konfiguriert.',paypalMissing:'PayPal.Me ist nicht konfiguriert.',statTotal:'RESSOURCEN GESAMT',statFree:'KOSTENLOSE RESSOURCEN',statDownloads:'DOWNLOADS',statPremium:'PREMIUM',all:'Alle',footer1:'L-STORE ist ausschließlich technischer Entwickler der Website und verwaltet, wählt, prüft, genehmigt oder verbreitet keine Store-Inhalte.',footer2:'Die Verantwortung für Website-Nutzung, Dateien, Links, Lizenzen, Urheberrechte, Verkäufe, Zahlungen und Verteilung liegt ausschließlich beim Betreiber und den Nutzern.',footer3:'L-STORE distanziert sich ausdrücklich von rechtswidriger, unbefugter, betrügerischer Nutzung oder Verletzungen von Rechten Dritter.',catVehicles:'Fahrzeuge',catWeapons:'Waffen',catClothes:'Kleidung',catPacks:'Packs'},
  pt:{searchPlaceholder:'Pesquisar recursos, scripts, MLO...',searchShort:'Pesquisar recurso...',cart:'Carrinho',heroText:'Scripts, ficheiros e packs num catálogo rápido, escuro e direto.',browseStore:'Explorar loja',premiumLabel:'Premium & Grátis',instantLabel:'Acesso imediato',categories:'CATEGORIAS',legal:'Publique apenas conteúdo que está autorizado a distribuir.',resources:'recursos',sortRecent:'Mais recentes',sortPriceAsc:'Preço crescente',sortPriceDesc:'Preço decrescente',sortName:'Nome A-Z',emptyTitle:'Loja em preparação',emptyText:'Novos conteúdos Demon Leaks serão publicados aqui.',total:'Total',checkout:'Pagar com PayPal.Me',checkoutDone:'Abrindo PayPal...',checkoutNote:'Produtos Premium usam PayPal.Me. Produtos grátis podem ser ligados ao Linkvertise.',add:'Adicionar',download:'Baixar',free:'GRÁTIS',noCart:'O carrinho está vazio.',added:'Adicionado ao carrinho',downloadMissing:'Download ainda não configurado.',paypalMissing:'PayPal.Me não configurado.',statTotal:'RECURSOS TOTAIS',statFree:'RECURSOS GRÁTIS',statDownloads:'DOWNLOADS',statPremium:'PREMIUM',all:'Todos',footer1:'A L-STORE atua exclusivamente como developer técnico do site e não gere, seleciona, verifica, aprova ou distribui os conteúdos publicados.',footer2:'A responsabilidade pelo uso do site, ficheiros, links, licenças, direitos de autor, vendas, pagamentos e distribuição pertence exclusivamente ao gestor e aos utilizadores.',footer3:'A L-STORE dissocia-se expressamente de qualquer utilização ilícita, não autorizada, fraudulenta ou lesiva dos direitos de terceiros.',catVehicles:'Veículos',catWeapons:'Armas',catClothes:'Roupas',catPacks:'Packs'},
  nl:{searchPlaceholder:'Zoek resources, scripts, MLO...',searchShort:'Zoek resource...',cart:'Winkelwagen',heroText:'Scripts, bestanden en packs in een snelle, donkere en directe catalogus.',browseStore:'Bekijk store',premiumLabel:'Premium & Gratis',instantLabel:'Directe toegang',categories:'CATEGORIEËN',legal:'Publiceer alleen inhoud die je mag verspreiden.',resources:'resources',sortRecent:'Nieuwste',sortPriceAsc:'Prijs oplopend',sortPriceDesc:'Prijs aflopend',sortName:'Naam A-Z',emptyTitle:'Store in voorbereiding',emptyText:'Nieuwe Demon Leaks-content verschijnt hier.',total:'Totaal',checkout:'Betalen met PayPal.Me',checkoutDone:'PayPal openen...',checkoutNote:'Premium-producten gebruiken PayPal.Me. Gratis producten kunnen Linkvertise gebruiken.',add:'Toevoegen',download:'Download',free:'GRATIS',noCart:'Je winkelwagen is leeg.',added:'Toegevoegd aan winkelwagen',downloadMissing:'Download nog niet ingesteld.',paypalMissing:'PayPal.Me is niet ingesteld.',statTotal:'TOTAAL RESOURCES',statFree:'GRATIS RESOURCES',statDownloads:'DOWNLOADS',statPremium:'PREMIUM',all:'Alles',footer1:'L-STORE treedt uitsluitend op als technisch ontwikkelaar van de website en beheert, selecteert, controleert, keurt of distribueert geen inhoud.',footer2:'De verantwoordelijkheid voor het gebruik van de website, bestanden, links, licenties, auteursrechten, verkopen, betalingen en distributie ligt uitsluitend bij de beheerder en gebruikers.',footer3:'L-STORE distantieert zich uitdrukkelijk van illegaal, ongeautoriseerd of frauduleus gebruik en van inbreuken op rechten van derden.',catVehicles:'Voertuigen',catWeapons:'Wapens',catClothes:'Kleding',catPacks:'Packs'},
  pl:{searchPlaceholder:'Szukaj zasobów, skryptów, MLO...',searchShort:'Szukaj zasobu...',cart:'Koszyk',heroText:'Skrypty, pliki i pakiety w szybkim, ciemnym i bezpośrednim katalogu.',browseStore:'Przeglądaj sklep',premiumLabel:'Premium i Darmowe',instantLabel:'Natychmiastowy dostęp',categories:'KATEGORIE',legal:'Publikuj wyłącznie treści, które masz prawo rozpowszechniać.',resources:'zasobów',sortRecent:'Najnowsze',sortPriceAsc:'Cena rosnąco',sortPriceDesc:'Cena malejąco',sortName:'Nazwa A-Z',emptyTitle:'Sklep w przygotowaniu',emptyText:'Nowe treści Demon Leaks pojawią się tutaj.',total:'Razem',checkout:'Zapłać przez PayPal.Me',checkoutDone:'Otwieranie PayPal...',checkoutNote:'Produkty Premium korzystają z PayPal.Me. Darmowe mogą korzystać z Linkvertise.',add:'Dodaj',download:'Pobierz',free:'DARMOWE',noCart:'Koszyk jest pusty.',added:'Dodano do koszyka',downloadMissing:'Pobieranie nie jest jeszcze skonfigurowane.',paypalMissing:'PayPal.Me nie jest skonfigurowane.',statTotal:'WSZYSTKIE ZASOBY',statFree:'DARMOWE ZASOBY',statDownloads:'POBRANIA',statPremium:'PREMIUM',all:'Wszystkie',footer1:'L-STORE pełni wyłącznie rolę technicznego developera strony i nie zarządza, nie wybiera, nie weryfikuje, nie zatwierdza ani nie dystrybuuje publikowanych treści.',footer2:'Odpowiedzialność za korzystanie ze strony, pliki, linki, licencje, prawa autorskie, sprzedaż, płatności i dystrybucję ponosi wyłącznie operator i użytkownicy.',footer3:'L-STORE wyraźnie odcina się od wszelkiego nielegalnego, nieautoryzowanego lub oszukańczego użycia oraz naruszeń praw osób trzecich.',catVehicles:'Pojazdy',catWeapons:'Broń',catClothes:'Ubrania',catPacks:'Pakiety'},
  ro:{searchPlaceholder:'Caută resurse, scripturi, MLO...',searchShort:'Caută resursă...',cart:'Coș',heroText:'Scripturi, fișiere și pachete într-un catalog rapid, întunecat și direct.',browseStore:'Explorează magazinul',premiumLabel:'Premium & Gratuit',instantLabel:'Acces imediat',categories:'CATEGORII',legal:'Publică doar conținut pe care ești autorizat să îl distribui.',resources:'resurse',sortRecent:'Cele mai recente',sortPriceAsc:'Preț crescător',sortPriceDesc:'Preț descrescător',sortName:'Nume A-Z',emptyTitle:'Magazin în pregătire',emptyText:'Conținutul nou Demon Leaks va apărea aici.',total:'Total',checkout:'Plătește cu PayPal.Me',checkoutDone:'Se deschide PayPal...',checkoutNote:'Produsele Premium folosesc PayPal.Me. Cele gratuite pot folosi Linkvertise.',add:'Adaugă',download:'Descarcă',free:'GRATUIT',noCart:'Coșul este gol.',added:'Adăugat în coș',downloadMissing:'Descărcarea nu este încă configurată.',paypalMissing:'PayPal.Me nu este configurat.',statTotal:'TOTAL RESURSE',statFree:'RESURSE GRATUITE',statDownloads:'DESCĂRCĂRI',statPremium:'PREMIUM',all:'Toate',footer1:'L-STORE are exclusiv rolul de developer tehnic al site-ului și nu gestionează, selectează, verifică, aprobă sau distribuie conținutul publicat.',footer2:'Responsabilitatea pentru utilizarea site-ului, fișiere, linkuri, licențe, drepturi de autor, vânzări, plăți și distribuție revine exclusiv administratorului și utilizatorilor.',footer3:'L-STORE se disociază în mod expres de orice utilizare ilegală, neautorizată, frauduloasă sau care încalcă drepturile terților.',catVehicles:'Vehicule',catWeapons:'Arme',catClothes:'Îmbrăcăminte',catPacks:'Pachete'},
  tr:{searchPlaceholder:'Kaynak, script, MLO ara...',searchShort:'Kaynak ara...',cart:'Sepet',heroText:'Scriptler, dosyalar ve paketler hızlı, karanlık ve doğrudan bir katalogda.',browseStore:'Mağazayı keşfet',premiumLabel:'Premium & Ücretsiz',instantLabel:'Anında erişim',categories:'KATEGORİLER',legal:'Yalnızca dağıtma yetkiniz olan içerikleri yayınlayın.',resources:'kaynak',sortRecent:'En yeni',sortPriceAsc:'Fiyat artan',sortPriceDesc:'Fiyat azalan',sortName:'Ad A-Z',emptyTitle:'Mağaza hazırlanıyor',emptyText:'Yeni Demon Leaks içerikleri burada yayınlanacak.',total:'Toplam',checkout:'PayPal.Me ile öde',checkoutDone:'PayPal açılıyor...',checkoutNote:'Premium ürünler PayPal.Me kullanır. Ücretsiz ürünler Linkvertise ile bağlanabilir.',add:'Ekle',download:'İndir',free:'ÜCRETSİZ',noCart:'Sepetiniz boş.',added:'Sepete eklendi',downloadMissing:'İndirme henüz ayarlanmadı.',paypalMissing:'PayPal.Me ayarlanmadı.',statTotal:'TOPLAM KAYNAK',statFree:'ÜCRETSİZ KAYNAKLAR',statDownloads:'İNDİRMELER',statPremium:'PREMIUM',all:'Tümü',footer1:'L-STORE yalnızca sitenin teknik geliştiricisi olarak görev yapar; yayınlanan içerikleri yönetmez, seçmez, doğrulamaz, onaylamaz veya dağıtmaz.',footer2:'Site kullanımı, dosyalar, bağlantılar, lisanslar, telif hakları, satışlar, ödemeler ve dağıtımdan yalnızca site yöneticisi ve kullanıcılar sorumludur.',footer3:'L-STORE yasa dışı, yetkisiz, dolandırıcılık amaçlı veya üçüncü taraf haklarını ihlal eden kullanımlardan açıkça uzak durur.',catVehicles:'Araçlar',catWeapons:'Silahlar',catClothes:'Kıyafetler',catPacks:'Paketler'},
  ru:{searchPlaceholder:'Поиск ресурсов, скриптов, MLO...',searchShort:'Поиск ресурса...',cart:'Корзина',heroText:'Скрипты, файлы и паки в быстром, тёмном и удобном каталоге.',browseStore:'Открыть магазин',premiumLabel:'Premium и Бесплатно',instantLabel:'Мгновенный доступ',categories:'КАТЕГОРИИ',legal:'Публикуйте только контент, который вы имеете право распространять.',resources:'ресурсов',sortRecent:'Сначала новые',sortPriceAsc:'Цена по возрастанию',sortPriceDesc:'Цена по убыванию',sortName:'Название А-Я',emptyTitle:'Магазин готовится',emptyText:'Новый контент Demon Leaks появится здесь.',total:'Итого',checkout:'Оплатить через PayPal.Me',checkoutDone:'Открываем PayPal...',checkoutNote:'Premium-продукты используют PayPal.Me. Бесплатные могут использовать Linkvertise.',add:'Добавить',download:'Скачать',free:'БЕСПЛАТНО',noCart:'Корзина пуста.',added:'Добавлено в корзину',downloadMissing:'Ссылка на скачивание ещё не настроена.',paypalMissing:'PayPal.Me не настроен.',statTotal:'ВСЕ РЕСУРСЫ',statFree:'БЕСПЛАТНЫЕ',statDownloads:'СКАЧИВАНИЯ',statPremium:'PREMIUM',all:'Все',footer1:'L-STORE выступает исключительно техническим разработчиком сайта и не управляет, не выбирает, не проверяет, не одобряет и не распространяет опубликованный контент.',footer2:'Ответственность за использование сайта, файлы, ссылки, лицензии, авторские права, продажи, платежи и распространение несут исключительно оператор сайта и пользователи.',footer3:'L-STORE прямо дистанцируется от любого незаконного, несанкционированного, мошеннического использования или нарушения прав третьих лиц.',catVehicles:'Транспорт',catWeapons:'Оружие',catClothes:'Одежда',catPacks:'Паки'},
  ar:{searchPlaceholder:'ابحث عن الموارد والسكربتات و MLO...',searchShort:'ابحث عن مورد...',cart:'السلة',heroText:'سكربتات وملفات وحزم ضمن متجر سريع وداكن ومباشر.',browseStore:'تصفح المتجر',premiumLabel:'مدفوع ومجاني',instantLabel:'وصول فوري',categories:'الفئات',legal:'انشر فقط المحتوى الذي تملك صلاحية توزيعه.',resources:'موارد',sortRecent:'الأحدث',sortPriceAsc:'السعر من الأقل',sortPriceDesc:'السعر من الأعلى',sortName:'الاسم أ-ي',emptyTitle:'المتجر قيد التجهيز',emptyText:'سيتم نشر محتوى Demon Leaks الجديد هنا.',total:'الإجمالي',checkout:'الدفع عبر PayPal.Me',checkoutDone:'جارٍ فتح PayPal...',checkoutNote:'المنتجات المدفوعة تستخدم PayPal.Me، ويمكن ربط المجانية بـ Linkvertise.',add:'إضافة',download:'تنزيل',free:'مجاني',noCart:'السلة فارغة.',added:'تمت الإضافة إلى السلة',downloadMissing:'رابط التنزيل غير مُعد بعد.',paypalMissing:'PayPal.Me غير مُعد.',statTotal:'إجمالي الموارد',statFree:'الموارد المجانية',statDownloads:'التنزيلات',statPremium:'PREMIUM',all:'الكل',footer1:'تعمل L-STORE حصريًا كمطور تقني للموقع ولا تدير أو تختار أو تتحقق أو توافق أو توزع المحتوى المنشور.',footer2:'تقع مسؤولية استخدام الموقع والملفات والروابط والتراخيص وحقوق النشر والمبيعات والمدفوعات والتوزيع حصريًا على مدير الموقع والمستخدمين.',footer3:'تتنصل L-STORE صراحة من أي استخدام غير قانوني أو غير مصرح به أو احتيالي أو منتهك لحقوق الغير.',catVehicles:'مركبات',catWeapons:'أسلحة',catClothes:'ملابس',catPacks:'حزم'},
  zh:{searchPlaceholder:'搜索资源、脚本、MLO...',searchShort:'搜索资源...',cart:'购物车',heroText:'快速、深色、直接的脚本、文件和资源包目录。',browseStore:'浏览商店',premiumLabel:'付费与免费',instantLabel:'即时访问',categories:'分类',legal:'仅发布你有权分发的内容。',resources:'项资源',sortRecent:'最新',sortPriceAsc:'价格从低到高',sortPriceDesc:'价格从高到低',sortName:'名称 A-Z',emptyTitle:'商店准备中',emptyText:'新的 Demon Leaks 内容将在这里发布。',total:'总计',checkout:'使用 PayPal.Me 支付',checkoutDone:'正在打开 PayPal...',checkoutNote:'付费产品使用 PayPal.Me，免费产品可连接 Linkvertise。',add:'添加',download:'下载',free:'免费',noCart:'购物车为空。',added:'已加入购物车',downloadMissing:'下载尚未配置。',paypalMissing:'PayPal.Me 尚未配置。',statTotal:'资源总数',statFree:'免费资源',statDownloads:'下载',statPremium:'PREMIUM',all:'全部',footer1:'L-STORE 仅作为网站技术开发者，不管理、选择、验证、批准或分发商店中发布的内容。',footer2:'网站使用、上传文件、链接、许可、版权、销售、付款及内容分发的责任仅由网站运营者和相关用户承担。',footer3:'L-STORE 明确与任何非法、未经授权、欺诈或侵犯第三方权利的使用行为无关。',catVehicles:'车辆',catWeapons:'武器',catClothes:'服装',catPacks:'资源包'},
  ja:{searchPlaceholder:'リソース、スクリプト、MLOを検索...',searchShort:'リソースを検索...',cart:'カート',heroText:'スクリプト、ファイル、パックを高速でダークなカタログに整理。',browseStore:'ストアを見る',premiumLabel:'Premium & Free',instantLabel:'即時アクセス',categories:'カテゴリー',legal:'配布権限のあるコンテンツのみ公開してください。',resources:'リソース',sortRecent:'新着順',sortPriceAsc:'価格の安い順',sortPriceDesc:'価格の高い順',sortName:'名前 A-Z',emptyTitle:'ストア準備中',emptyText:'新しい Demon Leaks コンテンツはここに公開されます。',total:'合計',checkout:'PayPal.Meで支払う',checkoutDone:'PayPalを開いています...',checkoutNote:'Premium商品はPayPal.Me、無料商品はLinkvertiseに接続できます。',add:'追加',download:'ダウンロード',free:'無料',noCart:'カートは空です。',added:'カートに追加しました',downloadMissing:'ダウンロードはまだ設定されていません。',paypalMissing:'PayPal.Meが設定されていません。',statTotal:'総リソース',statFree:'無料リソース',statDownloads:'ダウンロード',statPremium:'PREMIUM',all:'すべて',footer1:'L-STOREはサイトの技術開発者としてのみ関与し、掲載コンテンツの管理、選定、確認、承認、配布は行いません。',footer2:'サイト利用、ファイル、リンク、ライセンス、著作権、販売、支払い、配布に関する責任はサイト運営者および利用者にあります。',footer3:'L-STOREは違法、無許可、詐欺的な利用、または第三者の権利を侵害する利用から明確に距離を置きます。',catVehicles:'車両',catWeapons:'武器',catClothes:'衣装',catPacks:'パック'},
  ko:{searchPlaceholder:'리소스, 스크립트, MLO 검색...',searchShort:'리소스 검색...',cart:'장바구니',heroText:'스크립트, 파일, 팩을 빠르고 어두운 카탈로그로 정리합니다.',browseStore:'스토어 둘러보기',premiumLabel:'Premium & Free',instantLabel:'즉시 액세스',categories:'카테고리',legal:'배포 권한이 있는 콘텐츠만 게시하세요.',resources:'리소스',sortRecent:'최신순',sortPriceAsc:'가격 낮은순',sortPriceDesc:'가격 높은순',sortName:'이름 A-Z',emptyTitle:'스토어 준비 중',emptyText:'새 Demon Leaks 콘텐츠가 여기에 게시됩니다.',total:'합계',checkout:'PayPal.Me로 결제',checkoutDone:'PayPal 여는 중...',checkoutNote:'Premium 제품은 PayPal.Me를 사용하며 무료 제품은 Linkvertise에 연결할 수 있습니다.',add:'추가',download:'다운로드',free:'무료',noCart:'장바구니가 비어 있습니다.',added:'장바구니에 추가됨',downloadMissing:'다운로드가 아직 설정되지 않았습니다.',paypalMissing:'PayPal.Me가 설정되지 않았습니다.',statTotal:'전체 리소스',statFree:'무료 리소스',statDownloads:'다운로드',statPremium:'PREMIUM',all:'전체',footer1:'L-STORE는 사이트의 기술 개발자 역할만 수행하며 게시 콘텐츠를 관리, 선택, 검증, 승인 또는 배포하지 않습니다.',footer2:'사이트 이용, 파일, 링크, 라이선스, 저작권, 판매, 결제 및 배포에 대한 책임은 전적으로 사이트 운영자와 사용자에게 있습니다.',footer3:'L-STORE는 불법, 무단, 사기성 사용 또는 제3자의 권리를 침해하는 사용과 명확히 무관합니다.',catVehicles:'차량',catWeapons:'무기',catClothes:'의상',catPacks:'팩'}
};

const t = (key) => (dict[state.lang] && dict[state.lang][key]) || dict.en[key] || dict.it[key] || key;
const localeMap = {it:'it-IT',en:'en-GB',es:'es-ES',fr:'fr-FR',de:'de-DE',pt:'pt-PT',nl:'nl-NL',pl:'pl-PL',ro:'ro-RO',tr:'tr-TR',ru:'ru-RU',ar:'ar-SA',zh:'zh-CN',ja:'ja-JP',ko:'ko-KR'};

function money(cents){
  const value=Number(cents||0);
  if(value<=0)return 'FREE';
  return new Intl.NumberFormat(
    localeMap[state.lang]||'it-IT',
    {style:'currency',currency:'EUR'}
  ).format(value/100);
}
function translate(){
  $$('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  $$('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder));
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
}
function toast(message){
  const el = $('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(window.__demonToast); window.__demonToast = setTimeout(()=>el.classList.remove('show'),2200);
}
function apiUrl(path){ return API_BASE + path; }
async function api(path,opt){
  const response = await fetch(apiUrl(path),opt); const body = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(body.error || 'API error'); return body;
}

const categoryDefs = [
  ['FiveM','◆'],['Gamemode','◫'],['Scripts','⌘'],['MLO','▦'],['HUD','◉'],
  ['Veicoli','◆'],['Armi','✦'],['Vestiti','♢'],['Pack','▣']
];
function categoryDisplay(name){
  const n = String(name || 'Scripts').toLowerCase();
  if(n === 'veicoli' || n === 'vehicles') return t('catVehicles');
  if(n === 'armi' || n === 'weapons') return t('catWeapons');
  if(n === 'vestiti' || n === 'clothing' || n === 'clothes') return t('catClothes');
  if(n === 'pack' || n === 'packs') return t('catPacks');
  return name;
}
function slugify(value){ return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function buildCategories(products){
  const counts = {};
  for(const p of products){ const slug=slugify(p.category_slug || p.category || 'scripts'); counts[slug]=(counts[slug]||0)+1; }
  const cats=[{slug:'all',name:t('all'),icon:'◎',count:products.length}];
  for(const [name,icon] of categoryDefs){ const slug=slugify(name); cats.push({slug,name:categoryDisplay(name),icon,count:counts[slug]||0}); }
  for(const custom of (state.customCategories||[])){ const raw=String(custom||'').trim(); if(!raw) continue; const slug=slugify(raw); if(!cats.some(c=>c.slug===slug)) cats.push({slug,name:raw,icon:'◇',count:counts[slug]||0}); }
  for(const p of products){
    const raw=String(p.category_name || p.category || '').trim(); if(!raw) continue;
    const slug=slugify(p.category_slug || raw); if(!cats.some(c=>c.slug===slug)) cats.push({slug,name:raw,icon:'◇',count:counts[slug]||0});
  }
  return cats;
}
async function loadLocalCatalog(){
  try{ const r=await fetch('./catalog.json',{cache:'no-store'}); if(!r.ok) return []; const data=await r.json(); return Array.isArray(data)?data:[]; }catch{return [];}
}
async function loadConfig(){
  if(isPhpMode){
    state.config = await api('/api/config');
  }else{
    state.config={storeName:'Demon Leaks',discordInviteUrl:cfg.DISCORD_INVITE_URL||'',paypalMeHandle:cfg.PAYPAL_ME_HANDLE||'italiaroleplay2026'};
    try{
      const mod=await demonFirebaseStore();
      const remote=mod ? await mod.loadFirebaseSettings() : null;
      if(remote){
        if(remote.storeName) state.config.storeName=remote.storeName;
        if(remote.discordInviteUrl) state.config.discordInviteUrl=remote.discordInviteUrl;
        if(remote.paypalMeHandle) state.config.paypalMeHandle=remote.paypalMeHandle;
        if(Array.isArray(remote.categories)) state.customCategories=remote.categories;
      }
    }catch(error){console.warn('[DEMON] Firebase settings fallback:',error);}
  }
  document.title=state.config.storeName||'Demon Leaks';
  for(const id of ['#heroDiscord']){
    const a=$(id); if(state.config.discordInviteUrl) a.href=state.config.discordInviteUrl; else a.style.display='none';
  }
}
async function loadEverything(){
  if(isPhpMode){
    state.products=await api('/api/products');
    state.categories=buildCategories(state.products);renderCategories();renderProducts();renderStats();return;
  }
  let mod=null;
  try{mod=await demonFirebaseStore()}catch(error){console.warn('[DEMON] Firebase module:',error)}
  const cached=mod?.loadCachedCatalog?.()||[];
  if(cached.length){state.products=cached;state.categories=buildCategories(state.products);renderCategories();renderProducts();renderStats()}
  if(mod){
    try{
      const remote=await Promise.race([mod.loadFirebaseCatalog(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('Firebase timeout')),6500))]);
      if(Array.isArray(remote)){state.products=remote;state.categories=buildCategories(state.products);renderCategories();renderProducts();renderStats()}
    }catch(error){console.warn('[DEMON] Firebase catalog fallback:',error)}
  }
  if(!state.products.length){state.products=await loadLocalCatalog();state.categories=buildCategories(state.products);renderCategories();renderProducts();renderStats()}
}
function renderStats(){
  const products=state.products;
  const rows=[
    ['◆',products.length,t('statTotal')],
    ['●',products.filter(p=>Number(p.price_cents||0)===0).length,t('statFree')],
    ['↓',products.reduce((n,p)=>n+Number(p.downloads||0),0),t('statDownloads')],
    ['✦',products.filter(p=>Number(p.price_cents||0)>0).length,t('statPremium')]
  ];
  $('#stats').innerHTML=rows.map((x,i)=>`<div class="stat" style="animation-delay:${i*.07}s"><div class="sicon">${x[0]}</div><div><b>${x[1]}</b><small>${x[2]}</small></div></div>`).join('');
}
function renderCategories(){
  const nav=$('#categories'); nav.innerHTML='';
  state.categories.forEach(c=>{
    const li=document.createElement('li'); const a=document.createElement('a'); a.href='#catalog'; a.className=state.category===c.slug?'active':'';
    const icon=document.createElement('span'); icon.className='cat-icon'; icon.textContent=c.icon;
    const name=document.createElement('span'); name.className='links_name'; name.textContent=c.slug==='all'?t('all'):categoryDisplay(c.name);
    const count=document.createElement('b'); count.className='cat-count'; count.textContent=c.count;
    a.append(icon,name,count); a.onclick=(e)=>{e.preventDefault();state.category=c.slug;renderCategories();renderProducts();}; li.appendChild(a);nav.appendChild(li);
  });
}
function productText(p,field){
  const translated=p.translations?.[state.lang]?.[field]; return translated || p[field] || (field==='title'?p.name:'');
}
function filteredProducts(){
  let list=[...state.products];
  if(state.category!=='all') list=list.filter(p=>slugify(p.category_slug||p.category||'')===state.category);
  if(state.search){ const q=state.search.toLocaleLowerCase(); list=list.filter(p=>`${productText(p,'title')} ${productText(p,'description')} ${p.category||''}`.toLocaleLowerCase().includes(q)); }
  if(state.sort==='price-asc') list.sort((a,b)=>Number(a.price_cents||0)-Number(b.price_cents||0));
  if(state.sort==='price-desc') list.sort((a,b)=>Number(b.price_cents||0)-Number(a.price_cents||0));
  if(state.sort==='name') list.sort((a,b)=>productText(a,'title').localeCompare(productText(b,'title'),localeMap[state.lang]));
  return list;
}
function fallback(){ const d=document.createElement('div');d.className='fallback';d.innerHTML='<b>DEMON</b>';return d; }
function productImage(p){
  const url=p.image_url||p.image||''; if(!url) return fallback();
  const img=document.createElement('img');img.src=url;img.alt=productText(p,'title')||'Demon Leaks';img.loading='lazy';img.decoding='async';img.onerror=()=>img.replaceWith(fallback());return img;
}
function renderProducts(){
  const products=filteredProducts(),grid=$('#products');grid.innerHTML='';$('#resultCount').textContent=products.length;$('#emptyState').classList.toggle('hidden',products.length>0);
  products.forEach((p,index)=>{
    const title=productText(p,'title')||'Demon Resource',descText=productText(p,'description')||'Demon Leaks resource',price=Number(p.price_cents||0);
    const card=document.createElement('article');card.className='product-card';card.style.animationDelay=`${Math.min(index,8)*.06}s`;
    card.dataset.resourceId=String(p.id||'');
    card.tabIndex=-1;

    if(p.id){
      const resourceLink=document.createElement('a');
      resourceLink.className='resource-card-native-link';
      resourceLink.href=`./resource.html?id=${encodeURIComponent(p.id)}`;
      resourceLink.setAttribute('aria-label',`Apri ${title}`);
      const cacheResource=()=>{
        try{sessionStorage.setItem(`demon_resource_cache_${p.id}`,JSON.stringify(p))}catch{}
      };
      resourceLink.addEventListener('pointerdown',cacheResource,{passive:true});
      resourceLink.addEventListener('click',cacheResource);
      card.appendChild(resourceLink);
    }
    const media=document.createElement('div');media.className='card-media';media.appendChild(productImage(p));
    const badge=document.createElement('div');badge.className='badge '+(price===0?'free':'');badge.textContent=price===0?'FREE':(p.badge||'PREMIUM');media.appendChild(badge);
    const body=document.createElement('div');body.className='card-body';
    const cat=document.createElement('div');cat.className='category-pill';cat.textContent=categoryDisplay(p.category_name||p.category||'Scripts');
    const h=document.createElement('h3');h.textContent=title;const desc=document.createElement('p');desc.textContent=descText;
    const foot=document.createElement('div');foot.className='card-foot';const priceEl=document.createElement('div');priceEl.className='price'+(price===0?' free':'');priceEl.textContent=money(price);
    const actions=document.createElement('div');actions.className='card-actions';let btn;
    if(price===0){
      btn=document.createElement('button');
      btn.type='button';
      btn.dataset.demonDownload=String(p.id||'');
      btn.onclick=(e)=>e.stopPropagation();
    }else{
      btn=document.createElement('button');
      btn.type='button';
      btn.onclick=(e)=>{
        e.stopPropagation();
        addCart({...p,id:p.id||title,title,price_cents:price,image_url:p.image_url||p.image||''});
      };
    }
    btn.className='small-btn primary btn-sand';const label=document.createElement('span');label.textContent=price===0?t('download'):t('add');btn.appendChild(label);actions.appendChild(btn);foot.append(priceEl,actions);body.append(cat,h,desc,foot);card.append(media,body);grid.appendChild(card);
  });
}
function addCart(p){
  if(!state.cart.some(x=>x.id===p.id)) state.cart.push({id:p.id,title:p.title,price_cents:p.price_cents,image_url:p.image_url});
  saveCart();toast(t('added'));
}
function saveCart(){localStorage.setItem('demon_cart',JSON.stringify(state.cart));renderCart();}
function renderCart(){
  const list=$('#cartItems');list.innerHTML='';$('#cartCount').textContent=state.cart.length;$('#cartTotal').textContent=money(state.cart.reduce((s,p)=>s+Number(p.price_cents||0),0));
  if(!state.cart.length){list.innerHTML=`<div class="cart-empty">🛒<br><br>${t('noCart')}</div>`;return;}
  state.cart.forEach(p=>{
    const row=document.createElement('div');row.className='cart-row';const img=document.createElement(p.image_url?'img':'div');img.className='cart-thumb';if(p.image_url)img.src=p.image_url;
    const info=document.createElement('div');const b=document.createElement('b');b.textContent=p.title;const sm=document.createElement('small');sm.textContent=money(p.price_cents);info.append(b,sm);
    const rm=document.createElement('button');rm.className='remove-cart';rm.type='button';rm.textContent='×';rm.onclick=()=>{state.cart=state.cart.filter(x=>x.id!==p.id);saveCart();};row.append(img,info,rm);list.appendChild(row);
  });
}
function checkout(){
  const btn=$('#checkoutBtn');
  if(btn.classList.contains('processing')) return;

  if(window.DEMON_DISCORD_CONNECTED!==true){
    toast('Accedi con Discord prima di procedere al pagamento.');
    if(typeof window.DEMON_REQUIRE_DISCORD==='function')window.DEMON_REQUIRE_DISCORD();
    return;
  }

  const hasItems=state.cart.length>0;
  const total=state.cart.reduce((s,p)=>s+Number(p.price_cents||0),0)/100;
  const handle=state.config.paypalMeHandle||cfg.PAYPAL_ME_HANDLE||'italiaroleplay2026';
  const popup=(hasItems&&handle)?window.open('about:blank','_blank'):null;

  btn.classList.remove('done');
  btn.classList.add('processing');

  setTimeout(()=>{
    btn.classList.remove('processing');
    btn.classList.add('done');

    if(!hasItems){
      $('.order-label',btn).textContent=t('noCart');
      toast(t('noCart'));
    }else if(!handle){
      $('.order-label',btn).textContent=t('paypalMissing');
      toast(t('paypalMissing'));
    }else{
      const url=`https://paypal.me/${encodeURIComponent(handle)}/${total.toFixed(2)}EUR`;
      $('.order-label',btn).textContent=t('checkoutDone');
      if(popup){popup.opener=null;popup.location.href=url;}else{toast(url);}
    }

    setTimeout(()=>{
      btn.classList.remove('done');
      $('.order-label',btn).textContent=t('checkout');
    },1350);
  },8100);
}
function openCart(value=true){$('#cartDrawer').classList.toggle('open',value);$('#cartBackdrop').classList.toggle('hidden',!value);$('#cartDrawer').setAttribute('aria-hidden',String(!value));}

let debounce;
function setSearch(value){
  clearTimeout(debounce);debounce=setTimeout(()=>{state.search=value.trim();$('#searchInput').value=value;$('#sideSearch').value=value;$('#modernSearch').classList.toggle('has-value',!!value);renderProducts();},130);
}
function initModernSearch(){
  const shell=$('#modernSearch'),input=$('#searchInput'),toggle=$('#searchToggle'),clear=$('#searchClear');
  const open=()=>{shell.classList.add('active');setTimeout(()=>input.focus(),110);};
  toggle.addEventListener('click',open);
  input.addEventListener('focus',()=>shell.classList.add('active'));
  input.addEventListener('input',e=>{shell.classList.toggle('has-value',!!e.target.value);setSearch(e.target.value);});
  input.addEventListener('blur',()=>setTimeout(()=>{if(!input.value&&!shell.matches(':hover'))shell.classList.remove('active');},170));
  clear.addEventListener('click',()=>{input.value='';shell.classList.remove('has-value');setSearch('');input.focus();});
}
function bindRevealOnScroll(){
  if(!('IntersectionObserver' in window)) return;
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('reveal');io.unobserve(entry.target);}}),{threshold:.08});
  $$('.product-card,.stat').forEach(el=>io.observe(el));
}
async function init(){
  try{translate();$('#languageSelect').value=state.lang;await loadConfig();await loadEverything();}catch(error){console.error(error);toast('Demon Leaks: loading error');}
  renderCart();initModernSearch();bindRevealOnScroll();
}

$('#sideSearch').addEventListener('input',e=>setSearch(e.target.value));
$('#sortSelect').addEventListener('change',e=>{state.sort=e.target.value;renderProducts();});
$('#languageSelect').addEventListener('change',e=>{
  state.lang=e.target.value;localStorage.setItem('demon_lang',state.lang);translate();state.categories=buildCategories(state.products);renderCategories();renderStats();renderProducts();renderCart();
});
$('#cartBtn').addEventListener('click',()=>openCart(true));
$('#cartClose').addEventListener('click',()=>openCart(false));
$('#cartBackdrop').addEventListener('click',()=>openCart(false));
$('#checkoutBtn').addEventListener('click',checkout);
document.addEventListener('keydown',e=>{if(e.key==='Escape')openCart(false);});

init();
