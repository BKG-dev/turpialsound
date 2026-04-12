// Marketplace mock data for development without database connection
// Generated to respect the Prisma schema for MpListing and MpUser

import type { MpListingStatus } from '../../generated/prisma/enums';

export interface MockMpUser {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isSeller: boolean;
  sellerRating: number | null;
  totalSales: number;
  totalPurchases: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockMpListing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  price: number;
  currency: string;
  coverImageUrl: string | null;
  mediaUrls: string[];
  hasInventory: boolean;
  inventory: number | null;
  status: MpListingStatus;
  slug: string;
  viewCount: number;
  favoriteCount: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

// Mock users (sellers)
export const mockUsers: MockMpUser[] = [
  {
    id: 'usr_1a2b3c4d',
    email: 'producer@example.com',
    emailVerified: true,
    displayName: 'Carlos Mendoza',
    bio: 'Music producer with 10+ years experience. Specialized in Latin urban genres.',
    avatarUrl: '/images/artista1.jpg',
    isVerified: true,
    isSeller: true,
    sellerRating: 4.8,
    totalSales: 42,
    totalPurchases: 5,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2025-03-10T14:20:00Z'),
  },
  {
    id: 'usr_5e6f7g8h',
    email: 'beatmaker@example.com',
    emailVerified: true,
    displayName: 'Valeria Rojas',
    bio: 'Beatmaker and sound designer. Creating unique textures for film and games.',
    avatarUrl: '/images/artista2.jpg',
    isVerified: true,
    isSeller: true,
    sellerRating: 4.9,
    totalSales: 28,
    totalPurchases: 12,
    createdAt: new Date('2024-02-20T09:15:00Z'),
    updatedAt: new Date('2025-03-12T11:45:00Z'),
  },
  {
    id: 'usr_9i0j1k2l',
    email: 'mixmaster@example.com',
    emailVerified: true,
    displayName: 'Andrés Villegas',
    bio: 'Mixing and mastering engineer. Grammy-nominated for Latin jazz projects.',
    avatarUrl: '/images/artista3.jpg',
    isVerified: true,
    isSeller: true,
    sellerRating: 5.0,
    totalSales: 67,
    totalPurchases: 3,
    createdAt: new Date('2023-11-05T16:40:00Z'),
    updatedAt: new Date('2025-03-08T09:30:00Z'),
  },
];

// Mock listings (5 items as requested)
export const mockListings: MockMpListing[] = [
  {
    id: 'lst_abc123',
    sellerId: 'usr_1a2b3c4d',
    title: 'Professional Reggaeton Beat Pack - 2025',
    description: '10 exclusive reggaeton beats with stems, mixed and ready for vocals. Includes MIDI files and mixing presets.',
    category: 'beats',
    tags: ['reggaeton', 'latin', 'urban', 'stems', 'professional'],
    price: 299.99,
    currency: 'USD',
    coverImageUrl: '/images/artista10.jpg',
    mediaUrls: [
      '/audio/preview1.mp3',
      '/audio/preview2.mp3',
      '/images/artista11.jpg',
    ],
    hasInventory: false,
    inventory: null,
    status: 'ACTIVE',
    slug: 'professional-reggaeton-beat-pack-2025',
    viewCount: 1245,
    favoriteCount: 89,
    createdAt: new Date('2025-01-10T08:00:00Z'),
    updatedAt: new Date('2025-03-01T12:30:00Z'),
    publishedAt: new Date('2025-01-12T10:00:00Z'),
  },
  {
    id: 'lst_def456',
    sellerId: 'usr_5e6f7g8h',
    title: 'Custom Sound Design for Film',
    description: 'Tailored sound design services for short films, documentaries, and indie projects. Includes foley, ambience, and SFX.',
    category: 'services',
    tags: ['sound-design', 'film', 'foley', 'sfx', 'custom'],
    price: 850.00,
    currency: 'USD',
    coverImageUrl: '/images/artista12.jpg',
    mediaUrls: [
      '/video/showreel.mp4',
      '/audio/portfolio1.mp3',
    ],
    hasInventory: true,
    inventory: 3,
    status: 'ACTIVE',
    slug: 'custom-sound-design-for-film',
    viewCount: 567,
    favoriteCount: 34,
    createdAt: new Date('2025-02-14T14:20:00Z'),
    updatedAt: new Date('2025-03-05T16:45:00Z'),
    publishedAt: new Date('2025-02-15T09:00:00Z'),
  },
  {
    id: 'lst_ghi789',
    sellerId: 'usr_9i0j1k2l',
    title: 'Mixing & Mastering Package (Single Track)',
    description: 'Professional mixing and mastering for a single track. Includes unlimited revisions, reference tracks, and delivery in all formats.',
    category: 'services',
    tags: ['mixing', 'mastering', 'audio-engineering', 'professional'],
    price: 199.00,
    currency: 'USD',
    coverImageUrl: '/images/artista13.jpg',
    mediaUrls: [],
    hasInventory: true,
    inventory: 10,
    status: 'ACTIVE',
    slug: 'mixing-mastering-package-single-track',
    viewCount: 892,
    favoriteCount: 56,
    createdAt: new Date('2025-01-22T11:10:00Z'),
    updatedAt: new Date('2025-03-10T08:15:00Z'),
    publishedAt: new Date('2025-01-23T12:00:00Z'),
  },
  {
    id: 'lst_jkl012',
    sellerId: 'usr_1a2b3c4d',
    title: 'Vintage Synth Presets - Juno 106',
    description: 'Collection of 50 custom presets for Roland Juno 106, perfect for synthwave, pop, and retro productions.',
    category: 'presets',
    tags: ['synth', 'vintage', 'presets', 'juno106', 'retro'],
    price: 49.99,
    currency: 'USD',
    coverImageUrl: '/images/artista14.jpg',
    mediaUrls: [
      '/audio/preset-demo.mp3',
      '/images/artista15.jpg',
    ],
    hasInventory: false,
    inventory: null,
    status: 'PAUSED',
    slug: 'vintage-synth-presets-juno-106',
    viewCount: 321,
    favoriteCount: 23,
    createdAt: new Date('2025-02-28T13:45:00Z'),
    updatedAt: new Date('2025-03-11T10:20:00Z'),
    publishedAt: new Date('2025-03-01T08:30:00Z'),
  },
  {
    id: 'lst_mno345',
    sellerId: 'usr_5e6f7g8h',
    title: 'Live Session Drum Recording',
    description: 'Record live drums in our studio with professional equipment and engineer. Includes editing and mixing.',
    category: 'services',
    tags: ['drums', 'recording', 'studio', 'live', 'session'],
    price: 1200.00,
    currency: 'USD',
    coverImageUrl: '/images/artista16.jpg',
    mediaUrls: [
      '/video/studio-tour.mp4',
      '/audio/drum-sample.mp3',
    ],
    hasInventory: true,
    inventory: 1,
    status: 'ACTIVE',
    slug: 'live-session-drum-recording',
    viewCount: 234,
    favoriteCount: 12,
    createdAt: new Date('2025-03-05T09:30:00Z'),
    updatedAt: new Date('2025-03-12T14:00:00Z'),
    publishedAt: new Date('2025-03-06T10:00:00Z'),
  },
];

// Combined export for easy use
export const marketplaceMockData = {
  users: mockUsers,
  listings: mockListings,
};

export default marketplaceMockData;