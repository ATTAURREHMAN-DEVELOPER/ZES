import { getAllProducts, addProduct, getAllCustomers, addCustomer } from '@/lib/db';

export async function seedIfEmpty() {
  const [products, customers] = await Promise.all([getAllProducts(), getAllCustomers()]);

  if (products.length === 0) {
    await Promise.all([
      addProduct({ name: 'LED Bulb 12W', category: 'Bulbs', unit: 'piece', pricePerUnit: 350, stock: 120, watts: '12W' }),
      addProduct({ name: 'LED Bulb 18W', category: 'Bulbs', unit: 'piece', pricePerUnit: 520, stock: 80, watts: '18W' }),
      addProduct({ name: 'LED Tube Light 20W', category: 'Bulbs', unit: 'piece', pricePerUnit: 950, stock: 60, watts: '20W' }),
      addProduct({ name: 'Copper Wire 1.5mm', category: 'Wires', unit: 'meter', pricePerUnit: 120, stock: 1000 }),
      addProduct({ name: 'Copper Wire 2.5mm (Pack of 90m)', category: 'Wires', unit: 'pack', pricePerUnit: 9500, stock: 15 }),
      addProduct({ name: 'Switch 2-Gang', category: 'Switches', unit: 'piece', pricePerUnit: 280, stock: 200 }),
    ]);
  }

  if (customers.length === 0) {
    await Promise.all([
      addCustomer({ name: 'Ahmad Ali', phone: '03001234567', address: 'Lahore' }),
      addCustomer({ name: 'Sara Khan', phone: '03017654321', address: 'Faisalabad' }),
      addCustomer({ name: 'Hassan Raza', phone: '03005551234', address: 'Multan' }),
    ]);
  }
}


