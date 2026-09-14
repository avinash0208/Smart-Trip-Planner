import React, { useState } from 'react'
import {
  Search,
  MapPin,
  Star,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export const Explore: React.FC = () => {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const categories = ['All', 'City Lights', 'Beaches', 'Mountain & Hiking', 'Historic & Culture', 'Culinary']

  const destinations = [
    {
      id: 'dest-1',
      city: 'Kyoto',
      country: 'Japan',
      category: 'Historic & Culture',
      rating: 4.9,
      reviews: 1420,
      image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop&q=80',
      description: 'Ancient shrines, geisha quarters in Gion, and bamboo groves in Arashiyama.',
      tag: 'Best in Spring/Fall',
    },
    {
      id: 'dest-2',
      city: 'Santorini',
      country: 'Greece',
      category: 'Beaches',
      rating: 4.8,
      reviews: 980,
      image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&auto=format&fit=crop&q=80',
      description: 'Whitewashed cliffside villas, cobalt-blue domes, and dramatic Aegean sunset vistas.',
      tag: 'Romantic Escape',
    },
    {
      id: 'dest-3',
      city: 'Reykjavik & Vik',
      country: 'Iceland',
      category: 'Mountain & Hiking',
      rating: 4.9,
      reviews: 830,
      image: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=600&auto=format&fit=crop&q=80',
      description: 'Aurora Borealis, volcanic glaciers, black sand shores, and geothermal hot springs.',
      tag: 'Adventure Pick',
    },
    {
      id: 'dest-4',
      city: 'Oaxaca',
      country: 'Mexico',
      category: 'Culinary',
      rating: 4.7,
      reviews: 620,
      image: 'https://images.unsplash.com/photo-1512813195386-6cf811ad3542?w=600&auto=format&fit=crop&q=80',
      description: 'Artisanal mezcal distilleries, sacred mole recipes, and indigenous textile crafts.',
      tag: 'Foodie Haven',
    },
  ]

  const filtered = destinations.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
    const matchesSearch =
      item.city.toLowerCase().includes(search.toLowerCase()) ||
      item.country.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Destination Explorer</h1>
          <p className="text-sm text-muted-foreground">
            Discover breathtaking cities, cultural landmarks, and hidden gems worldwide
          </p>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search country, city, or landmark..."
            className="pl-10 h-10 rounded-xl bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Horizontal Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Destination Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((dest) => (
          <Card
            key={dest.id}
            className="overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-border/80 rounded-2xl flex flex-col justify-between group bg-card/90"
          >
            <div>
              <div className="relative h-52 w-full overflow-hidden bg-muted">
                <img
                  src={dest.image}
                  alt={dest.city}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-3.5 left-3.5">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold">
                    {dest.tag}
                  </span>
                </div>
                <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
                  <div className="inline-flex items-center gap-1.5 text-xs text-teal-300 font-medium mb-0.5">
                    <MapPin className="h-3 w-3 text-teal-400" />
                    <span>{dest.country}</span>
                  </div>
                  <h3 className="font-extrabold text-lg leading-tight drop-shadow-sm">{dest.city}</h3>
                </div>
              </div>

              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="h-3.5 w-3.5 fill-amber-500" />
                    <span>{dest.rating}</span>
                    <span className="text-muted-foreground font-normal">({dest.reviews})</span>
                  </div>
                  <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold bg-teal-500/10 px-2 py-0.5 rounded-md">
                    {dest.category}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {dest.description}
                </p>
              </CardContent>
            </div>

            <div className="p-4 pt-0">
              <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs font-semibold rounded-xl hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-teal-300">
                <Plus className="h-3.5 w-3.5" />
                <span>Add to My Trip</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
