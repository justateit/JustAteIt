interface Dish {
    id: string;
    title: string;
    restaurant: string;
    date: string;
    rating: number,
    image: string | number; // number = require(), string = URL
    location: string;
}