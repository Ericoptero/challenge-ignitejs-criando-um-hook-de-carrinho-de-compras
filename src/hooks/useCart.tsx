import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: productData } = await api.get<Product>(`products/${productId}`);
      const { data: productStock} = await api.get<Stock>(`stock/${productId}`);
      
      let newCartArray: Product[] = [];
      const hasSameProductInArray = cart.findIndex(product => product.id === productData.id)

      if (hasSameProductInArray < 0) {
        newCartArray = [...cart, { ...productData, amount: 1 }]
      } else {
        const hasStock = cart[hasSameProductInArray].amount < productStock.amount;
        if (!hasStock) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        newCartArray = cart.map(product => 
          product.id === productData.id 
          ? { ...product, amount: product.amount + 1 } 
          : product
        )
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCartArray));
      setCart(newCartArray);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const checksIfProductExists = cart.findIndex(product => product.id === productId);
      if (checksIfProductExists < 0) {
        throw Error;
      }

      const newCartArray = cart.filter(product => product.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCartArray));
      setCart(newCartArray)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: productStock} = await api.get<Stock>(`stock/${productId}`);

      if (amount <= 0) {
        toast.error('A quantidade não pode ser menor do que zero.');
        return;
      }

      const hasStock = amount < productStock.amount;
      if (!hasStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCartArray = cart.map(product => 
        product.id === productId
        ? { ...product, amount: amount }
        : product
      );
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCartArray));
      setCart(newCartArray)
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
