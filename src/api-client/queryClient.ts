import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 min — feed data stays fresh
      gcTime: 1000 * 60 * 10,         // 10 min cache
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
})

queryClient.setQueryDefaults(['timeline'], { staleTime: 30_000 })
queryClient.setQueryDefaults(['conversations'], { staleTime: 15_000 })
queryClient.setQueryDefaults(['notifications'], { staleTime: 15_000 })
queryClient.setQueryDefaults(['stories'], { staleTime: 30_000 })
queryClient.setQueryDefaults(['members', 'active'], { staleTime: 30_000 })
