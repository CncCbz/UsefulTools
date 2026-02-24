import { ref, watch } from 'vue'

const STORAGE_KEY = 'usefultools-favorites'

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function save(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

const favoriteIds = ref(load())

export function useFavorites() {
  function isFavorite(id: string) {
    return favoriteIds.value.has(id)
  }

  function toggleFavorite(id: string) {
    const next = new Set(favoriteIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    favoriteIds.value = next
  }

  watch(favoriteIds, (val) => save(val), { deep: true })

  return { favoriteIds, isFavorite, toggleFavorite }
}

