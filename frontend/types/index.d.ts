interface Dish {
    id: string;
    title: string;
    restaurant: string;
    date: string;
    rating: number,
    image: any; // number = require(), string = URL
    location: string;
    tastingNotes: string;
    chemistryInsight: string;
    tags: string[];
    onUpdated?: () => void;
    onDeleted?: () => void;
}