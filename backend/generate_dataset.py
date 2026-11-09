"""
Script to generate a rich dataset of 150+ realistic dishes across 16 global cuisines
with authentic venues, diverse users, ratings, comments, high-res Unsplash food photos,
and 5D flavor fingerprints (spice, acid, umami, sweet, texture).
"""
import json
import uuid

# 1. Users
USERS = [
    ("user_spice_scout", "chili_hunter", "Maya Lin", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", "Chasing Scoville units and Sichuan peppercorns.", 0.92, 0.45, 0.70, 0.15, 0.65),
    ("user_umami_hound", "broth_boss", "Kenji Sato", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", "Obsessed with deep broths, dry-aged meats, and fermented koji.", 0.25, 0.35, 0.96, 0.20, 0.75),
    ("user_sweet_tooth", "pastry_pete", "Pete Dubois", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", "Dessert first. Passionate about pastries, caramel, and chocolate.", 0.08, 0.40, 0.30, 0.94, 0.70),
    ("user_acid_fanatic", "citrus_seeker", "Elena Ramos", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", "Ceviche, tomatillo, pickles, and bright fermentation.", 0.55, 0.95, 0.50, 0.20, 0.60),
    ("user_texture_junkie", "crunch_curator", "Marcus Vance", "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150", "If it doesn’t have crunch, snap, or chew, send it back.", 0.40, 0.45, 0.60, 0.25, 0.95),
    ("user_comfort_eater", "carb_enthusiast", "Sophie Martin", "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150", "Wood-fired pizzas, hearty pasta bowls, and cozy warm bread.", 0.20, 0.30, 0.85, 0.40, 0.70),
    ("user_global_forager", "nomad_fork", "Zainab Al-Hassan", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150", "Always hunting street food alleys from Bangkok to Oaxaca.", 0.75, 0.75, 0.80, 0.35, 0.80),
    ("user_pure_carnivore", "smoke_master", "Colt Harrison", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150", "14-hour briskets, charcoal-grilled galbi, and prime rib.", 0.50, 0.20, 0.95, 0.20, 0.65)
]

# 2. Venues (25 global venues)
VENUES = [
    ("v_tokyo_01", "Tokyo", "Ramen Kobo Ichiryu", "Shibuya, Tokyo", 35.6580, 139.7016),
    ("v_tokyo_02", "Tokyo", "Sushi Ginza Onodera", "Ginza, Tokyo", 35.6710, 139.7650),
    ("v_cdmx_01", "Mexico City", "Taquería El Pastorcito", "Condesa, Mexico City", 19.4124, -99.1711),
    ("v_cdmx_02", "Mexico City", "Restaurante Pujol", "Polanco, Mexico City", 19.4326, -99.1912),
    ("v_nyc_01", "New York", "Trattoria Bella Napoli", "West Village, New York", 40.7336, -74.0027),
    ("v_nyc_02", "New York", "Joe's Famous Smashburgers", "Lower East Side, New York", 40.7209, -73.9893),
    ("v_bkk_01", "Bangkok", "Som Tum Jay So", "Silom, Bangkok", 13.7259, 100.5284),
    ("v_bkk_02", "Bangkok", "Raan Jay Fai Crab Shack", "Phra Nakhon, Bangkok", 13.7525, 100.5048),
    ("v_paris_01", "Paris", "Pâtisserie Céleste", "Le Marais, Paris", 48.8575, 2.3580),
    ("v_paris_02", "Paris", "Bistrot Paul Bert", "11th Arrondissement, Paris", 48.8510, 2.3850),
    ("v_delhi_01", "New Delhi", "Spice Route Rasoi", "Connaught Place, New Delhi", 28.6315, 77.2167),
    ("v_delhi_02", "New Delhi", "Bukhara Tandoor Room", "Chanakyapuri, New Delhi", 28.5950, 77.1720),
    ("v_seoul_01", "Seoul", "Mapo BBQ House", "Hongdae, Seoul", 37.5563, 126.9236),
    ("v_seoul_02", "Seoul", "Gwangjang K-Street Food", "Jongno, Seoul", 37.5701, 126.9998),
    ("v_austin_01", "Austin", "Oak & Ember Smokehouse", "East Austin, Austin", 30.2625, -97.7214),
    ("v_beirut_01", "Beirut", "Cedar & Olive Mezze", "Gemmayzeh, Beirut", 33.8969, 35.5131),
    ("v_lima_01", "Lima", "Cevichería del Pacífico", "Miraflores, Lima", -12.1217, -77.0305),
    ("v_addis_01", "Addis Ababa", "Lucy Habesha Kitchen", "Bole, Addis Ababa", 9.0054, 38.7850),
    ("v_hanoi_01", "Hanoi", "Phở Gia Truyền Bát Đàn", "Old Quarter, Hanoi", 21.0341, 105.8475),
    ("v_chengdu_01", "Chengdu", "Sichuan Pepper House", "Jinjiang, Chengdu", 30.6570, 104.0660),
    ("v_rome_01", "Rome", "Da Enzo al 29", "Trastevere, Rome", 41.8870, 12.4780),
    ("v_madrid_01", "Madrid", "Mercado de San Miguel Tapas", "Centro, Madrid", 40.4154, -3.7090),
    ("v_athens_01", "Athens", "O Kostas Souvlaki", "Syntagma, Athens", 37.9750, 23.7310),
    ("v_havana_01", "Miami", "Calle Ocho Cantina", "Little Havana, Miami", 25.7650, -80.2150),
    ("v_kingston_01", "Kingston", "Scotchies Jerk Pit", "St Andrew, Kingston", 18.0179, -76.8099)
]

# 3. High quality food photo pool (verified Unsplash direct food photos)
IMAGES = [
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80", # Ramen
    "https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&auto=format&fit=crop&q=80", # Spicy noodles
    "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&auto=format&fit=crop&q=80", # Tacos
    "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80", # Mexican tacos
    "https://images.unsplash.com/photo-1621996346565-e3d5d6281093?w=800&auto=format&fit=crop&q=80", # Pasta
    "https://images.unsplash.com/photo-1541256942802-7b2996a603c7?w=800&auto=format&fit=crop&q=80", # Thai curry
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80", # Pastry/croissant
    "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80", # Indian curry
    "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80", # Fried chicken
    "https://images.unsplash.com/photo-1535399831370-9992d7b27a3c?w=800&auto=format&fit=crop&q=80", # Seafood/ceviche
    "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80", # Asian broth
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80", # Fresh salad
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop&q=80", # Sushi platter
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80", # Healthy bowl
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80", # BBQ Skewers
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80", # Mediterranean salad
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80", # Biryani rice
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80", # Burger
    "https://images.unsplash.com/photo-1574484284002-952d92456975?w=800&auto=format&fit=crop&q=80", # Salmon plate
    "https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=800&auto=format&fit=crop&q=80", # Pizza
    "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80", # Gourmet burger
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=80", # Curry bowl
    "https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=800&auto=format&fit=crop&q=80", # Chocolate dessert
    "https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&auto=format&fit=crop&q=80", # Seafood paella
    "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800&auto=format&fit=crop&q=80", # Meatballs
    "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop&q=80", # Grilled fish
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80", # Steak
    "https://images.unsplash.com/photo-1514944298352-1fc5d045d625?w=800&auto=format&fit=crop&q=80", # Dim sum
    "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=80", # Ice cream
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&auto=format&fit=crop&q=80"  # Cheeseburger
]

# 4. Catalog of 150 authentic dishes across 16 cuisines
RAW_DISHES = [
    # ── Japanese (12) ──
    ("Truffle Tonkotsu Ramen", "24-hr rich pork marrow broth, black truffle emulsion, tender chashu pork, and soft ajitama egg.", "Japanese", "v_tokyo_01", 0.15, 0.20, 0.98, 0.15, 0.85),
    ("Spicy Garlic Miso Ramen", "Fermented red miso with toasted chili oil, garlic chips, springy wavy noodles, and charred sweet corn.", "Japanese", "v_tokyo_01", 0.85, 0.25, 0.88, 0.20, 0.80),
    ("Otoro Fatty Tuna Nigiri", "A5 bluefin tuna belly brushed with aged nikiri soy, fresh grated wasabi on warm seasoned shari rice.", "Japanese", "v_tokyo_02", 0.20, 0.35, 0.95, 0.25, 0.85),
    ("Uni & Ikura Donburi", "Hokkaido sea urchin and soy-cured salmon roe popping over warm sushi rice with nori flakes.", "Japanese", "v_tokyo_02", 0.10, 0.30, 0.96, 0.30, 0.80),
    ("Crispy Chicken Karaage", "Twice-fried sake-ginger marinated chicken thigh bites served with Japanese kewpie mayo and fresh lemon.", "Japanese", "v_tokyo_01", 0.25, 0.50, 0.85, 0.20, 0.95),
    ("A5 Miyazaki Wagyu Sukiyaki", "Paper-thin marbled beef simmered in sweet mirin-soy warishita with shiitake mushrooms and fresh egg dip.", "Japanese", "v_tokyo_02", 0.10, 0.20, 0.95, 0.70, 0.75),
    ("Matcha Lava Fondant Cake", "Uji green tea warm molten cake with bittersweet dark chocolate and vanilla bean gelato.", "Japanese", "v_tokyo_01", 0.00, 0.15, 0.40, 0.85, 0.80),
    ("Crispy Shrimp & Shiso Tempura", "Light airy tempura batter encasing sweet tiger prawns and aromatic shiso leaf with tentsuyu broth.", "Japanese", "v_tokyo_02", 0.10, 0.25, 0.80, 0.20, 0.98),
    ("Osaka Style Okonomiyaki", "Savory shredded cabbage pancake griddled with pork belly, drizzled with sweet bulldog sauce and bonito flakes.", "Japanese", "v_tokyo_01", 0.20, 0.35, 0.90, 0.60, 0.75),
    ("Tsukemen Dipping Noodles", "Ultra-thick chilled noodles dipped into a concentrated, boiling pork-seafood reduction.", "Japanese", "v_tokyo_01", 0.40, 0.35, 0.98, 0.25, 0.90),
    ("Smoked Eel Unadon", "Charcoal-glazed freshwater unagi lacquered in caramelized tare over steamed koshihikari rice with sansho pepper.", "Japanese", "v_tokyo_02", 0.15, 0.20, 0.92, 0.75, 0.80),
    ("Yuzu Shio Chashu Ramen", "Clear golden chicken broth infused with aromatic Japanese yuzu citrus and delicate bamboo shoots.", "Japanese", "v_tokyo_01", 0.20, 0.80, 0.85, 0.15, 0.70),

    # ── Mexican (12) ──
    ("Al Pastor Tacos Con Piña", "Spit-roasted achiote marinated pork, caramelized pineapple, charred habanero salsa, and handmade corn tortillas.", "Mexican", "v_cdmx_01", 0.75, 0.80, 0.70, 0.45, 0.65),
    ("Slow-Braised Beef Birria Quesatacos", "Crispy griddled corn tortillas soaked in beef consommé, melted Oaxaca cheese, cilantro, and fiery lime dipping broth.", "Mexican", "v_cdmx_01", 0.80, 0.65, 0.92, 0.10, 0.90),
    ("Oaxacan Mole Negro with Duck", "Complex 30-ingredient mole with Mexican chocolate, charred chilis, raisins, and pumpkin seeds over pan-roasted duck.", "Mexican", "v_cdmx_02", 0.60, 0.40, 0.95, 0.55, 0.70),
    ("Michoacán Pork Carnitas", "Copper-pot braised pork shoulder with crispy golden edges, pickled red onions, and charred salsa verde.", "Mexican", "v_cdmx_01", 0.50, 0.70, 0.88, 0.15, 0.85),
    ("Chiles en Nogada", "Poblano pepper stuffed with spiced picadillo meat, smothered in velvety goat cheese walnut sauce and pomegranate arils.", "Mexican", "v_cdmx_02", 0.45, 0.50, 0.75, 0.60, 0.70),
    ("Sinaloa Shrimp Aguachile Verde", "Raw butterflied shrimp flash-cured in pulverized lime-serrano water with crisp cucumber ribbons and red onion.", "Mexican", "v_cdmx_01", 0.95, 0.98, 0.65, 0.10, 0.80),
    ("Oaxaca Giant Tlayuda", "Toasted thin 14-inch crispy tortilla smeared with asiento lard, black bean purée, quesillo strings, and cecina beef.", "Mexican", "v_cdmx_01", 0.55, 0.40, 0.85, 0.15, 0.95),
    ("Guajillo Red Pozole", "Hominy corn soup with slow-cooked pork shank, radishes, Mexican oregano, and fried tortilla tostadas.", "Mexican", "v_cdmx_02", 0.70, 0.60, 0.85, 0.10, 0.75),
    ("Enmoladas de Pollo", "Shredded chicken wrapped in corn tortillas, drenched in velvety Puebla mole poblano and toasted sesame seeds.", "Mexican", "v_cdmx_02", 0.55, 0.35, 0.90, 0.50, 0.65),
    ("Cinnamon Sugar Churros con Dulce de Leche", "Piping hot extruded pastry fried crisp, dusted in Ceylon cinnamon sugar with warm goat milk caramel.", "Mexican", "v_cdmx_01", 0.05, 0.05, 0.25, 0.95, 0.92),
    ("Charred Street Corn Esquites", "Sweet roasted corn kernels sauteed in epazote butter, tossed with cotija cheese, chili lime powder, and crema.", "Mexican", "v_cdmx_01", 0.60, 0.75, 0.70, 0.60, 0.70),
    ("Baja Crispy Fish Tacos", "Beer-battered cod, chipotle crema, shredded crunchy cabbage, and salsa bandera on fresh flour tortillas.", "Mexican", "v_cdmx_01", 0.50, 0.70, 0.65, 0.15, 0.95),

    # ── Italian (12) ──
    ("Rigatoni Cacio e Pepe", "Bronze-cut rigatoni, 36-month Pecorino Romano, toasted Sarawak black peppercorns, glossy starchy emulsion.", "Italian", "v_rome_01", 0.35, 0.15, 0.90, 0.10, 0.85),
    ("Spaghetti alla Carbonara Autentica", "Crisp guanciale, rich egg yolks, aged pecorino, cracked Tellicherry pepper, and al dente spaghetti.", "Italian", "v_rome_01", 0.30, 0.10, 0.96, 0.10, 0.80),
    ("Burrata & San Marzano Wood-Fired Pizza", "Charred blistered crust, sweet San Marzano tomato coulis, creamy burrata center, and torn Genovese basil.", "Italian", "v_nyc_01", 0.10, 0.60, 0.82, 0.35, 0.80),
    ("Slow-Braised Osso Buco alla Milanese", "Veal shank slow-braised with white wine and mirepoix, topped with lemon-garlic gremolata over saffron risotto.", "Italian", "v_nyc_01", 0.15, 0.45, 0.98, 0.20, 0.75),
    ("Tagliolini al Tartufo Bianco", "Handmade egg ribbon pasta tossed in cultured Alpine butter, parmesan cream, and shaved Alba white truffle.", "Italian", "v_nyc_01", 0.05, 0.15, 0.99, 0.10, 0.80),
    ("Florentine T-Bone Bistecca", "Thick dry-aged Chianina porterhouse seared over oak coals with rosemary brush, sea salt, and extra virgin olive oil.", "Italian", "v_nyc_01", 0.10, 0.15, 0.95, 0.05, 0.85),
    ("Classic Venetian Tiramisu", "Savoiardi ladyfingers soaked in dark espresso and marsala wine, whipped mascarpone cream, and Dutch cocoa.", "Italian", "v_rome_01", 0.05, 0.15, 0.30, 0.88, 0.70),
    ("Sicilian Pistachio Cannoli", "Crisp fried pastry shell filled with sweet sheep milk ricotta, candied orange peel, and crushed Bronte pistachios.", "Italian", "v_rome_01", 0.00, 0.15, 0.35, 0.90, 0.95),
    ("Crispy Saffron Arancini", "Deep-fried golden rice croquettes stuffed with rich beef ragù and molten mozzarella core.", "Italian", "v_rome_01", 0.20, 0.30, 0.85, 0.15, 0.95),
    ("Spaghetti alle Vongole Veraci", "Sweet baby clams sautéed with garlic cloves, white Falanghina wine, fresh parsley, and spicy peperoncino.", "Italian", "v_nyc_01", 0.40, 0.55, 0.90, 0.10, 0.75),
    ("Tuscan Pappardelle al Cinghiale", "Wide handmade pasta tossed with 12-hour braised wild boar ragù, juniper berries, and aged parmigiano.", "Italian", "v_rome_01", 0.25, 0.30, 0.95, 0.15, 0.85),
    ("Fresh Buffalo Mozzarella Caprese", "Creamy buffalo mozzarella, heirloom vine-ripened tomatoes, aged balsamic reduction, and cold-pressed olive oil.", "Italian", "v_nyc_01", 0.05, 0.75, 0.70, 0.35, 0.65),

    # ── Thai (12) ──
    ("Fiery Green Papaya Salad (Som Tum Pok Pok)", "Pounded green papaya with bird’s eye chilis, sour lime juice, tamarind, palm sugar, dried shrimp, and peanuts.", "Thai", "v_bkk_01", 0.95, 0.95, 0.65, 0.40, 0.90),
    ("Khao Soi Chiang Mai Curry Noodles", "Fragrant golden curry noodles, tender braised chicken leg, pickled mustard greens, lime, and crispy bird nest noodles.", "Thai", "v_bkk_01", 0.75, 0.70, 0.85, 0.45, 0.85),
    ("Tom Yum Goong Mae Nam", "Hot and sour river prawn broth with galangal, crushed lemongrass stalks, kaffir lime leaves, and roasted chili jam.", "Thai", "v_bkk_01", 0.92, 0.92, 0.90, 0.30, 0.60),
    ("Golden Thai Crab Omelette", "Giant crispy-edged deep-fried egg roll stuffed with sweet jumbo lump blue crab meat, served with sriracha.", "Thai", "v_bkk_02", 0.40, 0.30, 0.92, 0.25, 0.95),
    ("Spicy Holy Basil Pad Kra Pao", "Minced pork wok-fried with holy basil leaves, bird’s eye chilies, fish sauce, topped with crispy fried egg.", "Thai", "v_bkk_02", 0.90, 0.40, 0.88, 0.20, 0.75),
    ("Massaman Lamb Shank Curry", "Slow-cooked lamb shank falling off the bone in rich cardamom-peanut-coconut curry with charred shallots.", "Thai", "v_bkk_01", 0.55, 0.45, 0.92, 0.65, 0.70),
    ("Mango Sticky Rice (Khao Niew Mamuang)", "Warm coconut milk infused sweet sticky rice served with sliced honey mango and salty coconut cream drizzle.", "Thai", "v_bkk_02", 0.00, 0.25, 0.30, 0.95, 0.75),
    ("Traditional Pad Thai with Giant Prawns", "Chewy rice noodles wok-charred in sour tamarind paste, dried baby shrimp, pressed tofu, crushed peanuts, and fresh chives.", "Thai", "v_bkk_02", 0.45, 0.75, 0.75, 0.60, 0.75),
    ("Spicy Isan Minced Pork Larb", "Warm minced pork salad tossed with toasted ground sticky rice powder, fresh mint, shallots, and lime juice.", "Thai", "v_bkk_01", 0.88, 0.85, 0.75, 0.15, 0.70),
    ("Green Curry with Thai Eggplant", "Aromatic green chili paste simmered with sweet basil, round Thai eggplants, coconut milk, and tender chicken.", "Thai", "v_bkk_01", 0.80, 0.35, 0.80, 0.50, 0.65),
    ("Crispy Pork Belly (Moo Krob)", "Triple-cooked pork belly with crackling puffed skin, tender meat, served with spicy sweet dark soy dip.", "Thai", "v_bkk_02", 0.35, 0.30, 0.88, 0.40, 0.98),
    ("Drunken Noodles with Seafood (Pad Kee Mao)", "Smoky wok-charred wide flat rice noodles with squids, mussels, holy basil, young green peppercorns, and red chili.", "Thai", "v_bkk_02", 0.92, 0.40, 0.85, 0.25, 0.80),

    # ── Indian (12) ──
    ("Old Delhi Butter Chicken (Murgh Makhani)", "Tandoor-charred chicken thigh in a velvety fenugreek-infused tomato butter gravy, served with garlic naan.", "Indian", "v_delhi_01", 0.60, 0.50, 0.85, 0.40, 0.60),
    ("Dum Pukht Hyderabadi Mutton Biryani", "Fragrant long-grain basmati rice and marinated goat slow-cooked in a sealed dough pot with saffron and rose water.", "Indian", "v_delhi_02", 0.75, 0.35, 0.92, 0.20, 0.80),
    ("Goan Prawn Vindaloo", "Jumbo prawns braised in aged palm vinegar, fiery Kashmiri chilies, toasted cinnamon, and roasted cumin.", "Indian", "v_delhi_01", 0.96, 0.85, 0.75, 0.20, 0.55),
    ("Creamy Black Dal Bukhara", "Whole black lentils slow-cooked over wood charcoal for 18 hours with vine-ripened tomatoes, butter, and ginger.", "Indian", "v_delhi_02", 0.30, 0.40, 0.95, 0.25, 0.65),
    ("Crispy Delhi Samosa Chaat", "Crushed spiced potato samosas smothered in warm chickpea ragda, mint chutney, sweet tamarind, and crispy sev.", "Indian", "v_delhi_01", 0.65, 0.80, 0.70, 0.65, 0.90),
    ("Smoked Lamb Seekh Kebab", "Minced spiced lamb scented with mint, garam masala, and roasted coriander, charred in an earthen tandoor.", "Indian", "v_delhi_02", 0.70, 0.30, 0.90, 0.15, 0.75),
    ("Crispy Masala Dosa with Sambar", "Fermented rice and lentil crepe crisp as paper, filled with spiced mustard potato, served with coconut chutney.", "Indian", "v_delhi_01", 0.50, 0.60, 0.70, 0.15, 0.95),
    ("Kashmiri Rogan Josh", "Tender lamb shanks braised in aromatic gravy of Kashmiri chilies, mace, fennel seed, and warm mountain yogurt.", "Indian", "v_delhi_02", 0.80, 0.45, 0.90, 0.15, 0.65),
    ("Pani Puri Explosion (Golgappa)", "Crisp hollow semolina spheres filled with spiced potato and drowned in icy tangy mint-tamarind water.", "Indian", "v_delhi_01", 0.85, 0.95, 0.55, 0.50, 0.92),
    ("Warm Cardamom Gulab Jamun", "Caramelized milk dumplings fried in pure ghee, soaked in warm rosewater and saffron sugar syrup.", "Indian", "v_delhi_01", 0.00, 0.05, 0.25, 0.98, 0.70),
    ("Palak Paneer with Charred Garlic", "Fresh creamy cottage cheese cubes folded into velvet spinach purée with roasted garlic and fenugreek.", "Indian", "v_delhi_01", 0.45, 0.35, 0.80, 0.20, 0.65),
    ("Amritsari Kulcha with Chole", "Layered flaky tandoor bread stuffed with spiced potatoes and onions, served with tangy dark chickpea curry.", "Indian", "v_delhi_02", 0.60, 0.65, 0.75, 0.20, 0.85),

    # ── French (10) ──
    ("Salted Caramel Paris-Brest", "Delicate choux pastry ring filled with roasted hazelnut praline mousseline and fleur de sel caramel crunch.", "French", "v_paris_01", 0.05, 0.10, 0.35, 0.95, 0.85),
    ("Grand Cru Dark Chocolate Mille-Feuille", "Caramelized puff pastry sheets layered with 70% Guanaja chocolate ganache and candied cacao nibs.", "French", "v_paris_01", 0.05, 0.20, 0.40, 0.88, 0.95),
    ("Boeuf Bourguignon de Tradition", "Prime beef cheeks braised for 8 hours in Pinot Noir with lardons, button mushrooms, and pearl onions.", "French", "v_paris_02", 0.20, 0.45, 0.98, 0.25, 0.70),
    ("Crispy Skin Duck Confit", "Slow-cured Moulard duck leg cooked in its own rendered fat, served with garlic sarladaise potatoes.", "French", "v_paris_02", 0.15, 0.25, 0.94, 0.10, 0.90),
    ("Classic French Onion Soup Gratinée", "Rich beef bone broth loaded with deeply caramelized onions, croutons, and melted Comté cheese crust.", "French", "v_paris_02", 0.15, 0.35, 0.95, 0.45, 0.80),
    ("Butter Basted Escargots de Bourgogne", "Plump Burgundy snails swimming in garlic, flat-leaf parsley, and white wine butter sauce.", "French", "v_paris_02", 0.10, 0.25, 0.90, 0.10, 0.75),
    ("Vanilla Bean Crème Brûlée", "Silky egg custard infused with Bourbon vanilla, capped with a glass-hard torch-caramelized sugar disc.", "French", "v_paris_01", 0.00, 0.05, 0.30, 0.92, 0.85),
    ("Pan-Seared Foie Gras with Brioche", "Flash-seared duck foie gras with caramelized fig compote on toasted butter brioche.", "French", "v_paris_02", 0.10, 0.30, 0.98, 0.60, 0.75),
    ("Provençal Ratatouille", "Tender stewed zucchini, eggplant, bell peppers, and tomatoes simmered with fresh thyme and olive oil.", "French", "v_paris_02", 0.10, 0.65, 0.70, 0.40, 0.60),
    ("Croque Monsieur with Truffle Béchamel", "Toasted levain bread filled with Paris ham, Dijon mustard, and bubbling gruyère truffle mornay.", "French", "v_paris_02", 0.15, 0.25, 0.90, 0.20, 0.85),

    # ── Korean (10) ──
    ("Charcoal Grilled Hanwoo Galbi", "Prime short rib marinated in Asian pear, soy sauce, and sesame, grilled over binchotan with ssamjang and garlic.", "Korean", "v_seoul_01", 0.30, 0.25, 0.95, 0.55, 0.80),
    ("Double-Fried Yangnyeom Chicken", "Ultra-crispy fried chicken drumettes glazed in sticky sweet-and-spicy gochujang sauce and crushed peanuts.", "Korean", "v_seoul_01", 0.70, 0.35, 0.75, 0.65, 0.98),
    ("Aged Kimchi Jjigae with Pork Belly", "Fermented 2-year old sour kimchi boiled with fatty pork belly, silky tofu, and anchovy dashima broth.", "Korean", "v_seoul_02", 0.85, 0.85, 0.90, 0.20, 0.65),
    ("Sizzling Stone Bowl Dolsot Bibimbap", "Crispy crust rice bowl topped with seasoned namul vegetables, marinated beef, egg yolk, and gochujang paste.", "Korean", "v_seoul_02", 0.65, 0.35, 0.80, 0.40, 0.88),
    ("Spicy Seafood Sundubu Jjigae", "Bubbling soft uncurdled tofu stew packed with clams, shrimp, chili oil, and a freshly cracked egg.", "Korean", "v_seoul_02", 0.90, 0.35, 0.90, 0.15, 0.60),
    ("Crispy Seafood Scallion Pajeon", "Golden pan-fried savory pancake studded with scallions, squid, shrimp, served with tangy soy vinegar.", "Korean", "v_seoul_02", 0.35, 0.45, 0.80, 0.20, 0.90),
    ("Spicy Rice Cakes Tteokbokki", "Chewy rice cakes and fish cakes simmered in sweet red chili gochujang sauce topped with mozzarella cheese.", "Korean", "v_seoul_02", 0.80, 0.25, 0.75, 0.65, 0.85),
    ("Grilled Thick Samgyeopsal", "Thick pork belly seared table-side, wrapped in perilla leaves with roasted garlic and fermented soybean ssamjang.", "Korean", "v_seoul_01", 0.35, 0.30, 0.92, 0.15, 0.85),
    ("Korean Cold Buckwheat Naengmyeon", "Chewy arrowroot noodles in icy beef and dongchimi radish broth, topped with Asian pear and hot mustard.", "Korean", "v_seoul_02", 0.55, 0.90, 0.75, 0.35, 0.80),
    ("Spicy Stir-Fried Pork Bulgogi (Jeyuk Bokkeum)", "Thin sliced pork shoulder marinated in spicy chili pepper paste, charred with scallions and sesame seeds.", "Korean", "v_seoul_01", 0.85, 0.25, 0.85, 0.50, 0.75),

    # ── American (10) ──
    ("Texas Smoked Prime Brisket", "14-hour post oak smoked brisket with peppery dark bark, rendered fat cap, and tangy dill pickles.", "American", "v_austin_01", 0.45, 0.30, 0.92, 0.15, 0.70),
    ("Nashville Hot Fried Chicken Sandwich", "Double-fried chicken thigh dipped in cayenne chili oil, topped with coleslaw and pickles on a brioche bun.", "American", "v_austin_01", 0.92, 0.50, 0.75, 0.30, 0.95),
    ("Dry-Aged Wagyu Smashburger", "Lacy crispy-edged double beef patties, melted American cheese, caramelized onions, and house special sauce.", "American", "v_nyc_02", 0.25, 0.40, 0.92, 0.35, 0.85),
    ("Maine Butter Poached Lobster Roll", "Sweet chilled claw and knuckle lobster meat warmed in clarified butter inside a griddled split-top brioche.", "American", "v_nyc_02", 0.10, 0.35, 0.88, 0.40, 0.80),
    ("New England Clam Chowder in Bread Bowl", "Velvety cream broth loaded with tender quahog clams, diced potatoes, smoky bacon lardons, and oyster crackers.", "American", "v_nyc_02", 0.15, 0.20, 0.90, 0.25, 0.75),
    ("Smoked St. Louis Baby Back Ribs", "Dry-rubbed ribs glazed with tangy brown sugar molasses barbecue sauce, tender to the clean bone.", "American", "v_austin_01", 0.50, 0.45, 0.88, 0.70, 0.75),
    ("Four Cheese Truffle Macaroni", "Cavatappi pasta baked in sharp aged cheddar, Gruyère, and Fontina cheese with crunchy herb panko topping.", "American", "v_nyc_02", 0.15, 0.15, 0.92, 0.20, 0.85),
    ("Key West Lime Tart", "Graham cracker crust filled with tart Florida key lime custard, topped with toasted Swiss meringue peaks.", "American", "v_nyc_02", 0.00, 0.95, 0.20, 0.85, 0.75),
    ("Creole Seafood Gumbo", "Dark roux stew loaded with Gulf blue crab, andouille sausage, okra, and served over steamed Carolina rice.", "American", "v_austin_01", 0.70, 0.40, 0.95, 0.15, 0.70),
    ("Southern Cast-Iron Peach Cobbler", "Sweet stewed Georgia peaches baked under a buttery drop biscuit crust, served with vanilla bean ice cream.", "American", "v_austin_01", 0.05, 0.35, 0.20, 0.95, 0.75),

    # ── Chinese (10) ──
    ("Sichuan Dan Dan Noodles", "Springy wheat noodles tossed in numbing Sichuan peppercorn chili oil, crispy spiced pork crumble, and black vinegar.", "Chinese", "v_chengdu_01", 0.92, 0.55, 0.88, 0.15, 0.80),
    ("Mapo Tofu with Minced Beef", "Silken tofu simmered in fermented broad bean paste, ground beef, chili oil, and numbing roasted Sichuan peppercorn.", "Chinese", "v_chengdu_01", 0.95, 0.35, 0.92, 0.15, 0.60),
    ("Shanghainese Soup Dumplings (Xiao Long Bao)", "Delicate pleated wrappers bursting with steaming savory pork broth and ground Kurobuta pork.", "Chinese", "v_chengdu_01", 0.15, 0.45, 0.95, 0.25, 0.75),
    ("Crispy Skin Peking Roast Duck", "Lacquered roast duck with glass-shattered skin, carved tableside with thin steamed pancakes, scallions, and hoisin.", "Chinese", "v_chengdu_01", 0.10, 0.25, 0.95, 0.60, 0.85),
    ("Chongqing Mala Chili Chicken (La Zi Ji)", "Crispy diced chicken morsels buried in a mountain of dried red lantern chilies and tingling peppercorns.", "Chinese", "v_chengdu_01", 0.98, 0.20, 0.80, 0.10, 0.95),
    ("Steamed Cantonese Siu Mai", "Open-topped yellow wrapper dumplings filled with pork, tiger shrimp, shiitake mushrooms, and orange tobiko.", "Chinese", "v_chengdu_01", 0.10, 0.20, 0.90, 0.30, 0.80),
    ("Cantonese Honey Glazed Char Siu", "Pork neck roasted on hooks with maltose sugar, five spice powder, and fermented red bean curd.", "Chinese", "v_chengdu_01", 0.15, 0.20, 0.88, 0.80, 0.75),
    ("Hand-Pulled Shaanxi Biang Biang Noodles", "Wide belt noodles hand-ripped and splashed with sizzling hot chili oil, raw garlic, and black vinegar.", "Chinese", "v_chengdu_01", 0.85, 0.65, 0.80, 0.15, 0.90),
    ("Sichuan Boiled Beef in Chili Broth (Shui Zhu Niu)", "Tender sliced flank steak floating in a volcanic red chili and bean paste soup with bean sprouts.", "Chinese", "v_chengdu_01", 0.96, 0.40, 0.92, 0.10, 0.65),
    ("Crispy Pork Wontons in Sweet Chili Jam", "Deep-fried golden wontons filled with minced pork and scallions, served with tangy plum chili dip.", "Chinese", "v_chengdu_01", 0.50, 0.60, 0.75, 0.55, 0.95),

    # ── Mediterranean & Middle Eastern (10) ──
    ("Smoked Eggplant Mutabbal & Fresh Pita", "Wood-roasted eggplant whipped with nutty sesame tahini, pomegranate molasses, sumac, and warm puffed bread.", "Middle Eastern", "v_beirut_01", 0.20, 0.60, 0.75, 0.25, 0.70),
    ("Charcoal Lamb Shish Kebab", "Tender cubes of lamb shoulder marinated with Aleppo pepper, allspice, and garlic, grilled over charcoal with flatbread.", "Middle Eastern", "v_beirut_01", 0.60, 0.30, 0.90, 0.15, 0.80),
    ("Crispy Golden Falafel Platter", "Herb-packed ground chickpea fritters fried to dark golden perfection, served with lemon tahini and pickled turnips.", "Middle Eastern", "v_beirut_01", 0.35, 0.65, 0.70, 0.15, 0.95),
    ("Shakshuka with Soft Poached Eggs", "Eggs poached in a spiced simmering skillet of bell peppers, San Marzano tomatoes, cumin, and crumbled feta cheese.", "Middle Eastern", "v_beirut_01", 0.65, 0.70, 0.75, 0.30, 0.65),
    ("Creamy Hummus with Spiced Ground Lamb", "Warm silky chickpea puree topped with sizzling olive oil spiced ground lamb, toasted pine nuts, and sumac.", "Middle Eastern", "v_beirut_01", 0.30, 0.55, 0.90, 0.15, 0.70),
    ("Golden Cheese Knafeh with Rose Syrup", "Spun pastry Kataifi crust filled with stretchy sweet cheese, soaked in fragrant rose water syrup and crushed pistachios.", "Middle Eastern", "v_beirut_01", 0.00, 0.05, 0.25, 0.96, 0.85),
    ("Greek Souvlaki with Garlic Tzatziki", "Marinated pork tenderloin skewers wrapped in grilled pita with ripe tomatoes, red onions, and cool cucumber tzatziki.", "Greek", "v_athens_01", 0.25, 0.70, 0.80, 0.15, 0.80),
    ("Baked Greek Moussaka", "Layers of roasted eggplant, spiced cinnamon minced beef, sliced potatoes, topped with thick golden béchamel.", "Greek", "v_athens_01", 0.20, 0.30, 0.88, 0.25, 0.75),
    ("Crispy Flaky Spanakopita", "Butter-brushed phyllo pastry triangles packed with sautéed wild spinach, dill, scallions, and sharp barrel-aged feta.", "Greek", "v_athens_01", 0.15, 0.50, 0.75, 0.10, 0.95),
    ("Traditional Lebanese Fattoush Salad", "Crispy fried sumac flatbread chips tossed with crisp romaine, radishes, cucumbers, and pomegranate molasses dressing.", "Middle Eastern", "v_beirut_01", 0.20, 0.92, 0.50, 0.35, 0.90),

    # ── Vietnamese (10) ──
    ("Hanoi Beef Phở (Phở Bò Tái Nạm)", "Star anise and roasted ginger bone broth, silky flat rice noodles, rare flank steak, lime wedges, and bird chilis.", "Vietnamese", "v_hanoi_01", 0.40, 0.55, 0.90, 0.20, 0.60),
    ("Saigon Crispy Pork Belly Bánh Mì", "Crusty French baguette stuffed with roasted pork belly, liver pâté, pickled daikon-carrot, cucumber, and cilantro.", "Vietnamese", "v_hanoi_01", 0.50, 0.75, 0.80, 0.30, 0.95),
    ("Hanoi Charcoal Grilled Bún Chả", "Pork patties and belly slices charred over coals in sweet-savory fish sauce broth, served with vermicelli and herbs.", "Vietnamese", "v_hanoi_01", 0.45, 0.70, 0.85, 0.50, 0.70),
    ("Crispy Sizzling Bánh Xèo Crepe", "Turmeric and coconut milk crispy lace pancake stuffed with pork, shrimp, bean sprouts, wrapped in mustard leaves.", "Vietnamese", "v_hanoi_01", 0.35, 0.65, 0.75, 0.25, 0.95),
    ("Shaking Beef (Bò Lúc Lắc)", "Wok-seared tenderloin beef cubes tossed in garlic soy glaze over watercress and a black pepper lime dip.", "Vietnamese", "v_hanoi_01", 0.40, 0.65, 0.88, 0.35, 0.80),
    ("Fresh Shrimp Gỏi Cuốn Spring Rolls", "Translucent rice paper rolls filled with poached prawns, pork, herbs, and rice vermicelli, dipped in peanut hoisin.", "Vietnamese", "v_hanoi_01", 0.25, 0.45, 0.65, 0.50, 0.75),
    ("Caramelized Claypot Pork (Thịt Kho Tàu)", "Pork belly and hard-boiled eggs braised in reduced coconut water and fish sauce until fork-tender.", "Vietnamese", "v_hanoi_01", 0.30, 0.25, 0.92, 0.70, 0.65),
    ("Hanoi Egg Coffee (Cà Phê Trứng)", "Intense dark robusta espresso topped with an airy, meringue-like whipped egg yolk and condensed milk custard.", "Vietnamese", "v_hanoi_01", 0.00, 0.10, 0.30, 0.92, 0.70),
    ("Spicy Royal Beef Noodle Soup (Bún Bò Huế)", "Fiery lemongrass, shrimp paste, and beef shank noodle soup with thick cylindrical noodles and chili oil.", "Vietnamese", "v_hanoi_01", 0.92, 0.55, 0.90, 0.20, 0.70),
    ("Lemongrass Grilled Pork Chops", "Thin bone-in pork chops marinated in shallots, fish sauce, and caramelized sugar, grilled over hot coals.", "Vietnamese", "v_hanoi_01", 0.45, 0.35, 0.88, 0.45, 0.80),

    # ── Spanish (10) ──
    ("Traditional Seafood Paella Valenciana", "Bomba rice cooked in saffron seafood broth with jumbo prawns, calamari, mussels, and a crispy bottom socarrat.", "Spanish", "v_madrid_01", 0.25, 0.35, 0.95, 0.20, 0.90),
    ("Sizzling Gambas al Ajillo", "Plump wild prawns sizzling in olive oil infused with sliced garlic cloves, dried guindilla peppers, and sherry.", "Spanish", "v_madrid_01", 0.65, 0.30, 0.90, 0.10, 0.80),
    ("Acorn-Fed Jamón Ibérico de Bellota", "Paper-thin slices of 48-month cured Iberian ham glistening with healthy nutty fat that melts on the tongue.", "Spanish", "v_madrid_01", 0.05, 0.20, 0.99, 0.15, 0.75),
    ("Crispy Patatas Bravas con Alioli", "Golden fried potato cubes smothered in spicy pimentón tomato salsa and rich garlic-infused alioli emulsion.", "Spanish", "v_madrid_01", 0.60, 0.50, 0.75, 0.20, 0.95),
    ("Galician Style Pulpo a la Gallega", "Tender boiled octopus coins over sliced potatoes, dusted with sweet smoked paprika and coarse sea salt.", "Spanish", "v_madrid_01", 0.30, 0.25, 0.90, 0.15, 0.85),
    ("Creamy Jamón Croquetas", "Crisp breaded croquettes with a velvety molten béchamel interior packed with cured ham shreds.", "Spanish", "v_madrid_01", 0.15, 0.15, 0.88, 0.20, 0.92),
    ("Chorizo al Vino Tinto", "Spicy Spanish paprika pork sausages poached in robust Rioja red wine until glazed and rich.", "Spanish", "v_madrid_01", 0.70, 0.45, 0.90, 0.25, 0.80),
    ("Traditional Tortilla Española", "Classic thick Spanish omelette made with tender slow-poached potatoes, sweet onions, and soft egg center.", "Spanish", "v_madrid_01", 0.10, 0.15, 0.80, 0.30, 0.70),
    ("Crispy Boquerones Fritos", "Fresh anchovies lightly dusted in flour and flash-fried crisp, served with charred lemon halves.", "Spanish", "v_madrid_01", 0.10, 0.70, 0.85, 0.05, 0.95),
    ("Basque Burnt Cheesecake", "Crustless caramelized cheesecake with an almost-burnt mahogany exterior and warm creamy molten center.", "Spanish", "v_madrid_01", 0.00, 0.20, 0.35, 0.88, 0.85),

    # ── Peruvian (8) ──
    ("Clásico Sea Bass Ceviche", "Fresh sea bass cured in vibrant leche de tigre, ají limo peppers, red onion, sweet glazed yam, and crispy canchita corn.", "Peruvian", "v_lima_01", 0.65, 0.98, 0.60, 0.25, 0.85),
    ("Lomo Saltado con Papas Fritas", "Flambéed beef tenderloin strips wok-tossed with red onions, tomatoes, soy sauce, and crispy hand-cut french fries.", "Peruvian", "v_lima_01", 0.45, 0.60, 0.90, 0.20, 0.80),
    ("Causa Limeña con Cangrejo", "Chilled yellow potato terrine seasoned with spicy ají amarillo paste and lime, layered with sweet lump crab salad.", "Peruvian", "v_lima_01", 0.50, 0.80, 0.70, 0.30, 0.70),
    ("Anticuchos de Corazón", "Skewered beef heart marinated in smoky ají panca, cumin, and red wine vinegar, charred over high heat.", "Peruvian", "v_lima_01", 0.70, 0.50, 0.92, 0.15, 0.80),
    ("Ají de Gallina", "Shredded chicken in a velvety, mildly spiced ají amarillo and evaporated milk sauce, topped with botija olives.", "Peruvian", "v_lima_01", 0.50, 0.25, 0.85, 0.35, 0.65),
    ("Crispy Chicharrón de Calamar", "Golden cornstarch-fried calamari rings served with yuca fries and spicy criolla lime-onion slaw.", "Peruvian", "v_lima_01", 0.45, 0.75, 0.75, 0.15, 0.95),
    ("Arroz con Mariscos a la Criolla", "Peruvian spiced rice braised in shellfish broth, ají panca, white wine, with scallops, octopus, and prawns.", "Peruvian", "v_lima_01", 0.45, 0.45, 0.95, 0.20, 0.80),
    ("Tiradito de Salmón con Maracuyá", "Thin sashimi slices of salmon bathed in a tart passion fruit and yellow chili leche de tigre reduction.", "Peruvian", "v_lima_01", 0.55, 0.95, 0.70, 0.55, 0.75),

    # ── Ethiopian (6) ──
    ("Doro Wat on Sourdough Injera", "Rich slow-simmered chicken stew with berbere spice, spiced niter kibbeh butter, hard-boiled egg, on tangy teff injera.", "Ethiopian", "v_addis_01", 0.88, 0.65, 0.85, 0.15, 0.65),
    ("Spicy Misir Wat (Red Lentil Stew)", "Red lentils stewed in spicy berbere chili paste, garlic, cardamom, and caramelized red onions.", "Ethiopian", "v_addis_01", 0.85, 0.50, 0.75, 0.15, 0.60),
    ("Sizzling Beef Tibs", "Tender beef chunks sautéed with rosemary, sliced jalapeños, onions, and seasoned spiced clarified butter.", "Ethiopian", "v_addis_01", 0.75, 0.35, 0.90, 0.15, 0.80),
    ("Shiro Tegabino Claypot", "Finely powdered chickpeas and broad beans whipped with garlic and berbere, bubbling hot in a clay pot.", "Ethiopian", "v_addis_01", 0.60, 0.40, 0.82, 0.15, 0.65),
    ("Fresh Kitfo with Ayib Cheese", "Minced lean raw beef tossed in warming mitmita chili powder and spiced niter kibbeh, served with fresh mild cheese.", "Ethiopian", "v_addis_01", 0.92, 0.35, 0.88, 0.10, 0.75),
    ("Gomen Wat Collard Greens", "Collard greens gently braised with ginger, garlic, nigella seeds, and mild Ethiopian green peppers.", "Ethiopian", "v_addis_01", 0.35, 0.40, 0.65, 0.15, 0.65),

    # ── Caribbean & Latin (6) ──
    ("Classic Pressed Cuban Sandwich", "Crisp toasted Cuban bread pressed flat with roast pork mojo, sweet ham, Swiss cheese, mustard, and dill pickles.", "Cuban", "v_havana_01", 0.25, 0.70, 0.85, 0.20, 0.92),
    ("Authentic Jamaican Jerk Chicken", "Bone-in chicken marinated in fiery Scotch bonnet peppers, allspice berries, and thyme, smoked over pimento wood.", "Jamaican", "v_kingston_01", 0.98, 0.50, 0.88, 0.30, 0.85),
    ("Slow-Braised Jamaican Oxtail", "Tender gelatinous oxtail braised in dark brown sauce with broad butter beans, scallions, and allspice.", "Jamaican", "v_kingston_01", 0.65, 0.30, 0.96, 0.35, 0.75),
    ("Puerto Rican Mofongo con Camarones", "Garlic and crispy pork chicharrón mashed plantains topped with jumbo prawns in creole tomato sauce.", "Caribbean", "v_havana_01", 0.45, 0.50, 0.88, 0.35, 0.85),
    ("Crispy Fried Sweet Plantains (Maduros)", "Deep-fried ripe plantains with caramelized golden sweet edges and custardy soft interior.", "Caribbean", "v_havana_01", 0.00, 0.15, 0.20, 0.95, 0.75),
    ("Cuban Slow-Cooked Ropa Vieja", "Tender shredded flank steak simmered in sweet bell pepper, Spanish onion, tomato, and green olive sofrito.", "Cuban", "v_havana_01", 0.30, 0.60, 0.88, 0.30, 0.70),
]

def generate_sql():
    print(f"Total dishes to generate: {len(RAW_DISHES)}")
    
    # Map venue IDs to deterministic UUIDs
    venue_id_map = {}
    for i, v in enumerate(VENUES):
        venue_id_map[v[0]] = f"10000000-0000-4000-8000-{str(i+1).zfill(12)}"
        
    sql_lines = [
        "-- ============================================================================",
        f"-- JustAteIt FYP Recommendation Algorithm Dataset ({len(RAW_DISHES)} Global Dishes)",
        "-- ============================================================================",
        "",
        "-- 1. USERS & DIVERSE FLAVOR PROFILES",
    ]
    
    for u in USERS:
        clean_bio = u[4].replace("'", "''")
        clean_name = u[2].replace("'", "''")
        sql_lines.append(
            f"INSERT INTO users (id, username, display_name, avatar_url, bio, created_at, updated_at) "
            f"VALUES ('{u[0]}', '{u[1]}', '{clean_name}', '{u[3]}', '{clean_bio}', now(), now()) "
            f"ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;"
        )
        sql_lines.append(
            f"INSERT INTO flavor_profiles (user_id, spice, acid, umami, sweet, texture, review_count, last_updated_at) "
            f"VALUES ('{u[0]}', {u[5]}, {u[6]}, {u[7]}, {u[8]}, {u[9]}, 25, now()) "
            f"ON CONFLICT (user_id) DO UPDATE SET spice = EXCLUDED.spice, acid = EXCLUDED.acid, umami = EXCLUDED.umami, sweet = EXCLUDED.sweet, texture = EXCLUDED.texture;"
        )
    sql_lines.append("")
    
    # 2. Venues
    sql_lines.append("-- 2. GLOBAL FOOD DESTINATIONS & RESTAURANTS")
    for i, v in enumerate(VENUES):
        vid = venue_id_map[v[0]]
        clean_vname = v[2].replace("'", "''")
        clean_vicinity = v[3].replace("'", "''")
        sql_lines.append(
            f"INSERT INTO venues (id, google_place_id, name, vicinity, lat, lng, created_at) "
            f"VALUES ('{vid}', '{v[0]}', '{clean_vname}', '{clean_vicinity}', {v[4]}, {v[5]}, now()) "
            f"ON CONFLICT (id) DO NOTHING;"
        )
    sql_lines.append("")
    
    # 3. Dishes
    sql_lines.append(f"-- 3. {len(RAW_DISHES)} AUTHENTIC DISHES WITH 5D FLAVOR COORDINATES")
    dish_id_map = []
    for i, d in enumerate(RAW_DISHES):
        dish_uuid = f"20000000-0000-4000-8000-{str(i+1).zfill(12)}"
        dish_id_map.append(dish_uuid)
        vid = venue_id_map[d[3]]
        name = d[0].replace("'", "''")
        desc = d[1].replace("'", "''")
        cuisine = d[2]
        spice, acid, umami, sweet, texture = d[4], d[5], d[6], d[7], d[8]
        
        sql_lines.append(
            f"INSERT INTO dishes (id, venue_id, name, description, cuisine, base_spice, base_acid, base_umami, base_sweet, base_texture, created_at) "
            f"VALUES ('{dish_uuid}', '{vid}', '{name}', '{desc}', '{cuisine}', {spice}, {acid}, {umami}, {sweet}, {texture}, now() - interval '{i*2} hours') "
            f"ON CONFLICT (id) DO NOTHING;"
        )
    sql_lines.append("")
    
    # 4. Reviews & Media
    sql_lines.append("-- 4. REVIEWS & HIGH RESOLUTION PHOTOGRAPHY")
    user_keys = [u[0] for u in USERS]
    sample_comments = [
        "Absolutely blew my mind. The balance of flavors is unmatched.",
        "Unbelievable depth. Will definitely be dreaming about this one.",
        "The texture and seasoning were spot on. A true masterpiece.",
        "Crispy, rich, and wonderfully seasoned. Highly recommended!",
        "Every bite felt like a warm hug. Perfect execution.",
        "Top tier. The aromatic profile hits you before the first bite.",
        "Bold, punchy, and utterly satisfying. 10/10.",
        "The ingredients were super fresh and the complexity was incredible."
    ]
    
    for i, d in enumerate(RAW_DISHES):
        dish_uuid = dish_id_map[i]
        vid = venue_id_map[d[3]]
        review_uuid = f"30000000-0000-4000-8000-{str(i+1).zfill(12)}"
        media_uuid = f"40000000-0000-4000-8000-{str(i+1).zfill(12)}"
        
        assigned_user = user_keys[i % len(user_keys)]
        rating = round(4.0 + ((i % 10) * 0.1), 1)
        comment = sample_comments[i % len(sample_comments)].replace("'", "''")
        img_url = IMAGES[i % len(IMAGES)]
        
        sql_lines.append(
            f"INSERT INTO reviews (id, user_id, dish_id, venue_id, rating, comment, created_at) "
            f"VALUES ('{review_uuid}', '{assigned_user}', '{dish_uuid}', '{vid}', {rating}, '{comment}', now() - interval '{i*3} hours') "
            f"ON CONFLICT (id) DO NOTHING;"
        )
        sql_lines.append(
            f"INSERT INTO media (id, review_id, media_url, media_type, created_at) "
            f"VALUES ('{media_uuid}', '{review_uuid}', '{img_url}', 'image', now() - interval '{i*3} hours') "
            f"ON CONFLICT (id) DO NOTHING;"
        )
    sql_lines.append("")
    
    sql_text = "\n".join(sql_lines)
    return sql_text

if __name__ == "__main__":
    sql_content = generate_sql()
    with open("backend/populate_db.sql", "w", encoding="utf-8") as f:
        f.write(sql_content)
    print("SUCCESS: Generated backend/populate_db.sql with 150 dishes!")
