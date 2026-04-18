import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  product_id: string
  name: string
  price_sgd: number
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (product: any, quantity: number) => void
  removeItem: (product_id: string) => void
  updateQuantity: (product_id: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product, quantity) => set((state) => {
        const existing = state.items.find(item => item.product_id === product.id)
        if (existing) {
          return {
            items: state.items.map(item =>
              item.product_id === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
          }
        }
        return {
          items: [...state.items, {
            product_id: product.id,
            name: product.name,
            price_sgd: product.price_sgd,
            quantity
          }]
        }
      }),
      
      removeItem: (product_id) => set((state) => ({
        items: state.items.filter(item => item.product_id !== product_id)
      })),
      
      updateQuantity: (product_id, quantity) => set((state) => ({
        items: state.items
          .map(item =>
            item.product_id === product_id
              ? { ...item, quantity }
              : item
          )
          .filter(item => item.quantity > 0)
      })),
      
      clearCart: () => set({ items: [] }),
      
      getTotal: () => {
        return get().items.reduce((sum, item) => sum + (item.price_sgd * item.quantity), 0)
      }
    }),
    {
      name: 'cart-storage'
    }
  )
)