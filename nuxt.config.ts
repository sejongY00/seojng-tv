// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss', '@vueuse/nuxt', '@pinia/nuxt'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin',
    maxRoomMembers: Number(process.env.MAX_ROOM_MEMBERS || 8),
    maxConcurrentStreams: Number(process.env.MAX_CONCURRENT_STREAMS || 4),
    roomAccessTtlDays: Number(process.env.ROOM_ACCESS_TTL_DAYS || 7),
    public: {
      maxRoomMembers: Number(process.env.MAX_ROOM_MEMBERS || 8),
      maxConcurrentStreams: Number(process.env.MAX_CONCURRENT_STREAMS || 4),
    },
  },

  nitro: {
    experimental: {
      websocket: true,
    },
  },

  app: {
    head: {
      title: 'Sejong TV',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '멀티 스크린 화면 공유 플랫폼' },
      ],
    },
  },
})
